"""Delegate tools for routing user intent to specialized sub-agents.

These tools implement the Tool-Based Delegation pattern: instead of using
hard-coded if-else routing, the LLM reads each tool's docstring to decide
which sub-agent should handle the user's request.

delegate_to_ingestor: Fully implemented — uses MCP tools (loaded via
    langchain-mcp-adapters) to read files, chunks text, stores vectors
    in ChromaDB, and updates graph state via Command.
delegate_to_tutor: Stub (future phase).
delegate_to_examiner: Stub (future phase).

Reference: DeerFlow present_file_tool.py uses the same Command(update={...})
    pattern to modify graph state from within a tool.
"""

import logging
import os

from langchain_core.messages import ToolMessage
from langchain_core.tools import tool
from langgraph.prebuilt.tool_node import ToolRuntime
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
def delegate_to_tutor(topic: str, question: str = "") -> str:
    """Delegate tutoring and explanation tasks to the Tutor sub-agent.

    Call this tool when the user asks for an explanation of a concept, wants
    to understand a topic in depth, or needs help learning something. The
    Tutor provides clear, pedagogical explanations tailored to the user's
    level.

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
    return "[路由成功] 已将任务移交给 Tutor（导师）。"


@tool("delegate_to_examiner")
def delegate_to_examiner(
    topics: list[str],
    num_questions: int = 5,
    difficulty: str = "medium",
) -> str:
    """Delegate exam / quiz generation tasks to the Examiner sub-agent.

    Call this tool when the user wants to be tested, quizzed, or wants
    practice questions generated. The Examiner creates questions based on the
    specified topics and difficulty level, evaluates the user's answers, and
    records any wrong answers to the error notebook (wrong_questions state).

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
    return "[路由成功] 已将任务移交给 Examiner（出卷考官）。"
