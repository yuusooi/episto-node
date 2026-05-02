"""Delegate tools for routing user intent to specialized sub-agents.

These tools implement the Tool-Based Delegation pattern: instead of using
hard-coded if-else routing, the LLM reads each tool's docstring to decide
which sub-agent should handle the user's request.

delegate_to_ingestor: Fully implemented — uses MCP tools (loaded via
    langchain-mcp-adapters) to read files, chunks text, stores vectors
    in ChromaDB, and updates graph state via Command.
delegate_to_tutor: RAG + Socratic skill prompt + conversation history.
delegate_to_examiner: RAG + Skill prompt + structured output (ExamPaper)
    + Command(goto=END) to stop execution and wait for user answers.
delegate_to_grader: Extracts exam_paper from state, grades user answers
    via LLM, writes wrong questions to SQLite, clears exam_paper.

Reference: DeerFlow present_file_tool.py uses the same Command(update={...})
    pattern to modify graph state from within a tool.
"""

import logging
import os

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_core.exceptions import OutputParserException
from langchain_openai import ChatOpenAI
from pydantic import ValidationError
from langgraph.prebuilt.tool_node import ToolRuntime
from langgraph.graph import END
from langgraph.types import Command

logger = logging.getLogger(__name__)


def _read_file_via_mcp(file_name: str) -> str:
    """Read a file through the MCP filesystem server.

    Uses cached MCP tools (loaded via langchain-mcp-adapters) to call
    the filesystem server's read_file tool. The file_name is resolved
    to an absolute path within the notes directory.

    Args:
        file_name: Name of the file within the notes directory.

    Returns:
        The file's text content.

    Raises:
        RuntimeError: If the MCP read_file tool is not available.
    """
    from episto.mcp.tools import get_cached_mcp_tools, get_notes_dir

    mcp_tools = get_cached_mcp_tools()

    # Find the read_file tool (prefixed with server name by MultiServerMCPClient)
    read_tool = next(
        (t for t in mcp_tools if "read_file" in t.name), None
    )
    if read_tool is None:
        raise RuntimeError(
            "MCP read_file tool not found. Check extensions_config.json."
        )

    # MCP filesystem server requires absolute paths
    notes_dir = get_notes_dir()
    abs_path = os.path.join(notes_dir, file_name)

    # Invoke the MCP tool (sync wrapper handles async internally)
    result = read_tool.invoke({"path": abs_path})

    # MCP tools return results in various formats depending on the adapter:
    # 1. Plain string
    # 2. List of dicts: [{'type': 'text', 'text': 'content', 'id': '...'}]
    # 3. List of objects with .text attribute
    if isinstance(result, str):
        return result

    if isinstance(result, list):
        text_parts = []
        for item in result:
            if isinstance(item, dict) and "text" in item:
                text_parts.append(item["text"])
            elif hasattr(item, "text"):
                text_parts.append(item.text)
            else:
                text_parts.append(str(item))
        return "\n".join(text_parts)

    return str(result)


@tool("delegate_to_ingestor")
def delegate_to_ingestor(
    runtime: ToolRuntime,
    file_name: str,
    description: str = "",
) -> Command:
    """Delegate document ingestion tasks to the Ingestor sub-agent.

    Reads a file from the notes directory via MCP (using langchain-mcp-adapters),
    splits it into chunks, stores the embeddings in ChromaDB, and updates
    the graph's ``documents_loaded`` state.

    When to use this tool:
    - User mentions uploading or processing a document / PDF / file
    - User wants to "import" or "load" study materials
    - User provides a file name and asks to analyze its contents
    - User says things like "帮我处理一下这份PDF" or "导入这个文档"

    Args:
        file_name: Name of the file within the notes directory
            (e.g. "react_hooks.md", "机器学习笔记.txt").
        description: Optional short description of what the user wants to do
            with the document (e.g. "extract key concepts from chapter 3").
    """
    from episto.vectorstore.chroma import add_documents

    tool_call_id = runtime.tool_call_id

    try:
        # Step 1: Read file content via MCP tools (langchain-mcp-adapters)
        content = _read_file_via_mcp(file_name)
        if not content.strip():
            return Command(
                update={
                    "messages": [
                        ToolMessage(
                            f"文件 '{file_name}' 内容为空，无法入库。",
                            tool_call_id=tool_call_id,
                        )
                    ],
                },
            )

        # Step 2: Chunk text and store embeddings in ChromaDB
        chunk_count = add_documents(text=content, source=file_name)

        # Step 3: Return Command to update graph state
        success_msg = (
            f"[Ingestor] 文件 '{file_name}' 入库成功！"
            f"共切分为 {chunk_count} 个文本块，已存入向量数据库。"
        )
        logger.info("Ingested '%s': %d chunks", file_name, chunk_count)

        return Command(
            update={
                "messages": [ToolMessage(success_msg, tool_call_id=tool_call_id)],
                "documents_loaded": [file_name],
            },
        )

    except Exception as e:
        error_msg = f"[Ingestor] 处理文件 '{file_name}' 时出错: {e}"
        logger.error("Ingestor error for '%s': %s", file_name, e)
        return Command(
            update={
                "messages": [ToolMessage(error_msg, tool_call_id=tool_call_id)],
            },
        )


@tool("delegate_to_tutor")
def delegate_to_tutor(
    runtime: ToolRuntime,
    topic: str,
    question: str = "",
) -> Command:
    """Delegate tutoring and explanation tasks to the Tutor sub-agent.

    Performs RAG retrieval on the topic, loads the Socratic tutor skill prompt,
    and uses a sub-agent LLM to guide the student through probing questions.
    Recent conversation history is included so the tutor can maintain context.

    When to use this tool:
    - User asks "explain ..." or "what is ..."
    - User wants to understand a concept from their study materials
    - User says "我不太理解XXX" or "给我讲讲YYY"
    - User requests a summary of specific topics
    - User asks for study advice or learning strategies

    When NOT to use this tool:
    - User wants to be tested or quizzed -> use delegate_to_examiner
    - User wants to upload a document -> use delegate_to_ingestor

    Args:
        topic: The knowledge topic or concept the user wants explained
            (e.g. "gradient descent", "TCP三次握手").
        question: Optional specific question the user has about the topic.
    """
    from episto.skills.loader import SkillLoader
    from episto.vectorstore.chroma import similarity_search

    load_dotenv()
    tool_call_id = runtime.tool_call_id

    try:
        # Step 1: RAG — retrieve relevant knowledge
        docs = similarity_search(topic, k=4)
        reference = ""
        if docs:
            reference = "\n\n".join(
                f"[参考资料 {i+1}]\n{doc.page_content}"
                for i, doc in enumerate(docs)
            )

        # Step 2: Load Socratic tutor skill prompt
        loader = SkillLoader()
        skill = loader.load("socratic_tutor")

        # Step 3: Build sub-agent messages
        # Include recent conversation history for context awareness
        messages_list = runtime.state.get("messages", [])
        recent_history = messages_list[-6:] if len(messages_list) > 6 else messages_list

        system_content = skill.content
        if reference:
            system_content += (
                f"\n\n## 参考资料\n\n以下是用户正在学习的相关资料，"
                f"你可以据此设计引导性问题，但不要直接引用或透露来源：\n\n{reference}"
            )

        sub_messages = [SystemMessage(content=system_content)]

        # Add recent conversation history (skip system messages)
        for msg in recent_history:
            msg_type = getattr(msg, "type", "")
            if msg_type in ("human", "ai") and msg.content:
                if msg_type == "human":
                    sub_messages.append(HumanMessage(content=msg.content))
                else:
                    sub_messages.append(AIMessage(content=msg.content))

        # Add the current user query
        user_query = question if question else f"我想学习关于 {topic} 的知识"
        sub_messages.append(HumanMessage(content=user_query))

        # Step 4: Invoke sub-agent (no structured output — free-form Socratic dialogue)
        model = ChatOpenAI(
            model="deepseek-chat",
            openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
            openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
        )
        response = model.invoke(sub_messages)

        logger.info("Tutor responded on topic '%s': %d chars", topic, len(response.content))

        return Command(
            update={
                "messages": [
                    ToolMessage(response.content, tool_call_id=tool_call_id)
                ],
            },
        )

    except Exception as e:
        error_msg = f"[Tutor] 辅导失败: {e}"
        logger.error("Tutor error: %s", e)
        return Command(
            update={
                "messages": [ToolMessage(error_msg, tool_call_id=tool_call_id)],
            },
        )


@tool("delegate_to_examiner")
def delegate_to_examiner(
    runtime: ToolRuntime,
    topics: list[str],
    num_questions: int = 5,
    difficulty: str = "medium",
) -> Command:
    """Delegate exam / quiz generation tasks to the Examiner sub-agent.

    Performs RAG retrieval on the specified topics, loads the examiner skill
    prompt, and uses a sub-agent LLM with structured output (ExamPaper) to
    generate multiple-choice questions.

    When to use this tool:
    - User asks for a quiz, test, or exam
    - User says "给我出题" or "考考我"
    - User wants to practice with exercises
    - User says "生成练习题" or "帮我复习"

    When NOT to use this tool:
    - User just wants an explanation -> use delegate_to_tutor
    - User wants to upload a document -> use delegate_to_ingestor

    Args:
        topics: List of knowledge topics to cover in the exam
            (e.g. ["机器学习", "线性回归", "梯度下降"]).
        num_questions: Number of questions to generate. Defaults to 5.
        difficulty: Difficulty level, one of "easy", "medium", "hard".
            Defaults to "medium".
    """
    from episto.agent.state import ExamPaper
    from episto.skills.loader import SkillLoader
    from episto.vectorstore.chroma import similarity_search

    load_dotenv()
    tool_call_id = runtime.tool_call_id

    try:
        # Step 1: RAG — retrieve relevant knowledge from vector store
        query = "、".join(topics)
        docs = similarity_search(query, k=6)
        if not docs:
            return Command(
                update={
                    "messages": [
                        ToolMessage(
                            "知识库中未找到与指定主题相关的资料。请先上传文档再出题。",
                            tool_call_id=tool_call_id,
                        )
                    ],
                },
            )

        reference = "\n\n".join(
            f"[参考资料 {i+1}]\n{doc.page_content}"
            for i, doc in enumerate(docs)
        )

        # Step 2: Load examiner skill prompt
        loader = SkillLoader()
        skill = loader.load("examiner")

        # Step 3: Build sub-agent messages
        system_msg = SystemMessage(content=skill.content)
        human_msg = HumanMessage(
            content=(
                f"请根据以下参考资料生成 {num_questions} 道难度为 {difficulty} 的选择题。\n"
                f"主题范围：{query}\n\n"
                f"--- 参考资料 ---\n{reference}"
            )
        )

        # Step 4: Invoke sub-agent with structured output + retry on validation errors
        # NOTE: DeepSeek does NOT support response_format (json_schema),
        # so we use method="function_calling" which sends the schema as a tool.
        model = ChatOpenAI(
            model="deepseek-chat",
            openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
            openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
        )
        structured_model = model.with_structured_output(ExamPaper, method="function_calling")

        MAX_RETRIES = 2
        exam: ExamPaper | None = None
        retry_messages = [system_msg, human_msg]

        for attempt in range(MAX_RETRIES + 1):
            try:
                exam = structured_model.invoke(retry_messages)
                # Validate basic structure
                if not exam.questions or len(exam.questions) == 0:
                    raise ValueError("ExamPaper 必须至少包含 1 道题")
                for i, q in enumerate(exam.questions):
                    if len(q.options) != 4:
                        raise ValueError(
                            f"第 {i+1} 题必须有 4 个选项，实际 {len(q.options)} 个"
                        )
                    if not q.answer or q.answer not in "ABCD":
                        raise ValueError(
                            f"第 {i+1} 题答案必须是 A/B/C/D，实际 '{q.answer}'"
                        )
                break  # Success
            except (ValidationError, OutputParserException, ValueError) as e:
                if attempt < MAX_RETRIES:
                    logger.warning(
                        "Examiner 第 %d/%d 次尝试失败: %s",
                        attempt + 1, MAX_RETRIES + 1, e,
                    )
                    retry_messages.append(HumanMessage(
                        content=(
                            f"你上一次的输出格式有误。错误信息：{e}\n\n"
                            f"请重新生成，确保：\n"
                            f"1. 每道题恰好 4 个选项\n"
                            f"2. 正确答案是 A/B/C/D 中的一个字母\n"
                            f"3. 每道题都有 question、options、answer、explanation\n"
                            f"4. 生成 {num_questions} 道题"
                        )
                    ))
                else:
                    raise

        logger.info(
            "Examiner generated '%s': %d questions, difficulty=%s",
            exam.title, len(exam.questions), exam.difficulty,
        )

        # Step 5: Format result for the Lead Agent to present to user
        questions_text = []
        for i, q in enumerate(exam.questions, 1):
            options_str = "\n".join(
                f"  {chr(65+j)}. {opt}" for j, opt in enumerate(q.options)
            )
            questions_text.append(
                f"**第 {i} 题**: {q.question}\n{options_str}"
            )

        result_msg = (
            f"**{exam.title}** (难度: {exam.difficulty})\n\n"
            + "\n\n".join(questions_text)
        )

        # goto=END: stop agent execution immediately after generating the exam.
        # The agent should NOT continue thinking — control returns to the user
        # so they can read the questions and submit answers.
        # Reference: DeerFlow clarification_middleware.py line 144
        return Command(
            update={
                "messages": [ToolMessage(result_msg, tool_call_id=tool_call_id)],
                "exam_paper": exam.model_dump(),
            },
            goto=END,
        )

    except Exception as e:
        error_msg = (
            f"[Examiner] 出题失败（已重试 {MAX_RETRIES} 次）。"
            f"请稍后再试，或换一个知识点。"
        )
        logger.error("Examiner error after %d retries: %s", MAX_RETRIES, e)
        return Command(
            update={
                "messages": [ToolMessage(error_msg, tool_call_id=tool_call_id)],
            },
        )


@tool("delegate_to_grader")
def delegate_to_grader(
    runtime: ToolRuntime,
    user_answers: str,
) -> Command:
    """Delegate answer grading tasks to the Grader sub-agent.

    Compares the user's submitted answers against the exam paper stored in state,
    generates detailed feedback, writes wrong answers to the SQLite database,
    and clears the exam_paper field to signal the exam session is over.

    When to use this tool:
    - User submits answers after an exam (e.g. "1.A, 2.B, 3.C")
    - User says things like "我的答案是..." or "选A、B、C"
    - User is replying to questions that were just generated by the Examiner

    When NOT to use this tool:
    - User wants a new exam -> use delegate_to_examiner
    - User wants an explanation -> use delegate_to_tutor
    - User wants to upload a document -> use delegate_to_ingestor

    Args:
        user_answers: The user's answers in free-form text
            (e.g. "1.A, 2.B, 3.C" or "第一题选A，第二题选C").
    """
    from episto.agent.state import WrongQuestionData
    from episto.db.models import ConceptMastery, WrongQuestion
    from episto.db.session import get_session, init_db

    load_dotenv()
    tool_call_id = runtime.tool_call_id
    state = runtime.state

    try:
        # Step 1: Extract exam paper from state
        exam_paper = state.get("exam_paper")
        if not exam_paper or not exam_paper.get("questions"):
            return Command(
                update={
                    "messages": [
                        ToolMessage(
                            "当前没有待批改的考卷。请先让系统出题再提交答案。",
                            tool_call_id=tool_call_id,
                        )
                    ],
                },
            )

        questions = exam_paper["questions"]
        title = exam_paper.get("title", "")
        difficulty = exam_paper.get("difficulty", "")

        # Step 2: Ask LLM to parse user answers and compare with correct ones
        exam_text = []
        for i, q in enumerate(questions, 1):
            options_str = ", ".join(f"{chr(65+j)}={opt}" for j, opt in enumerate(q["options"]))
            exam_text.append(
                f"第{i}题: {q['question']}\n"
                f"  选项: {options_str}\n"
                f"  正确答案: {q['answer']}\n"
                f"  解析: {q['explanation']}"
            )

        grading_prompt = f"""请批改以下考卷。用户提交的答案是: {user_answers}

考卷内容:
{chr(10).join(exam_text)}

请逐题批改，输出格式为 JSON:
```json
{{
  "results": [
    {{
      "question_number": 1,
      "question_text": "...",
      "user_answer": "A",
      "correct_answer": "B",
      "is_correct": false,
      "topic": "知识点",
      "explanation": "解析说明"
    }}
  ],
  "score": "2/3",
  "feedback": "整体评价"
}}
```

注意：
- 仔细从用户的自由文本中提取每道题的答案
- 如果用户没答某道题，user_answer 填 "未作答"，is_correct 填 false
- topic 从题目内容推断知识点
- feedback 用中文写，鼓励性的"""

        model = ChatOpenAI(
            model="deepseek-chat",
            openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
            openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
        )
        response = model.invoke([HumanMessage(content=grading_prompt)])

        # Step 3: Parse LLM response and extract results
        import json
        import re

        response_text = response.content
        # Try to extract JSON from response (may be wrapped in ```json ... ```)
        json_match = re.search(r"```json\s*(.*?)\s*```", response_text, re.DOTALL)
        if json_match:
            grading_result = json.loads(json_match.group(1))
        else:
            # Try parsing the whole response as JSON
            try:
                grading_result = json.loads(response_text)
            except json.JSONDecodeError:
                # LLM didn't return valid JSON, return raw feedback
                return Command(
                    update={
                        "messages": [ToolMessage(response_text, tool_call_id=tool_call_id)],
                        "exam_paper": None,
                    },
                    goto=END,
                )

        results = grading_result.get("results", [])
        score = grading_result.get("score", "?")
        feedback = grading_result.get("feedback", "")

        # Step 4: Write wrong questions to SQLite and build state update
        init_db()
        session = get_session()
        wrong_questions_update: dict[str, WrongQuestionData] = {}

        for r in results:
            if not r.get("is_correct", True):
                # Write to DB
                wq = WrongQuestion(
                    topic=r.get("topic", ""),
                    question_text=r.get("question_text", ""),
                    user_answer=r.get("user_answer", ""),
                    correct_answer=r.get("correct_answer", ""),
                    explanation=r.get("explanation", ""),
                )
                session.add(wq)

                # Update concept mastery
                topic = r.get("topic", "")
                if topic:
                    existing = session.query(ConceptMastery).filter_by(
                        concept_name=topic
                    ).first()
                    if existing:
                        existing.error_count += 1
                    else:
                        session.add(ConceptMastery(concept_name=topic, error_count=1))

                # Build state update for wrong_questions reducer
                q_num = r.get("question_number", 0)
                wrong_questions_update[f"q{q_num}"] = WrongQuestionData(
                    content=r.get("question_text", ""),
                    user_answer=r.get("user_answer", ""),
                    correct_answer=r.get("correct_answer", ""),
                )

        session.commit()
        session.close()

        logger.info(
            "Grader: score=%s, wrong=%d, written to DB",
            score, len(wrong_questions_update),
        )

        # Step 5: Format result message
        result_lines = [f"**{title} 批改结果**  得分: {score}\n"]
        for r in results:
            mark = "✅" if r.get("is_correct") else "❌"
            result_lines.append(
                f"{mark} 第{r.get('question_number')}题: "
                f"你选了 {r.get('user_answer')}，"
                f"正确答案 {r.get('correct_answer')}"
            )
            if not r.get("is_correct"):
                result_lines.append(f"   解析: {r.get('explanation', '')}")

        if feedback:
            result_lines.append(f"\n{feedback}")

        if wrong_questions_update:
            result_lines.append(f"\n错题已记入错题本 ({len(wrong_questions_update)} 题)")

        result_msg = "\n".join(result_lines)

        # Step 6: Return Command — clear exam_paper, store grading_data, update wrong_questions
        return Command(
            update={
                "messages": [ToolMessage(result_msg, tool_call_id=tool_call_id)],
                "exam_paper": None,  # Clear: exam session is over
                "grading_data": {
                    "results": results,
                    "score": score,
                    "feedback": feedback,
                },
                "wrong_questions": wrong_questions_update,
            },
            goto=END,
        )

    except Exception as e:
        error_msg = f"[Grader] 批改失败: {e}"
        logger.error("Grader error: %s", e)
        return Command(
            update={
                "messages": [ToolMessage(error_msg, tool_call_id=tool_call_id)],
            },
        )
