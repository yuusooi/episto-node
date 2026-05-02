"""FastAPI application for the Episto multi-agent system.

Exposes the LangGraph-based agent as a RESTful API with two core endpoints:

    POST /api/chat         — Send a message, get a reply (may include exam paper)
    POST /api/submit_exam  — Submit answers to a previously generated exam

Architecture:
    ┌──────────┐     HTTP      ┌──────────┐    invoke    ┌──────────────────┐
    │ Frontend │  ──────────►  │ FastAPI   │  ────────►  │ LangGraph        │
    │ (React)  │  ◄──────────  │ (here)    │  ◄────────  │ (make_graph)     │
    └──────────┘     JSON      └──────────┘    state     └──────────────────┘

Separation of concerns (following DeerFlow's gateway pattern):
    - FastAPI: receives HTTP, unpacks JSON, extracts thread_id, returns clean JSON
    - LangGraph: takes thread_id, restores state from MemorySaver, runs LLM, returns state
    - NO business logic in route handlers (no ChromaDB queries, no LLM calls)

Thread persistence:
    LangGraph's MemorySaver stores state keyed by thread_id. The graph
    suspends after exam generation (goto=END in delegate_to_examiner).
    When /api/submit_exam is called with the same thread_id, the graph
    resumes from its checkpoint and the Lead Agent routes the "answers"
    message to the Grader sub-agent.

Reference: DeerFlow backend/app/gateway/app.py (lifespan + CORS + routers)
"""

import logging
import os
import re
import traceback
import json
import uuid

# Fix: conda env sets SSL_CERT_FILE to a non-existent path
os.environ.pop("SSL_CERT_FILE", None)

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from episto.deps import episto_graph_lifespan, get_graph
from episto.schemas import (
    ChatRequest,
    ChatResponse,
    DashboardResponse,
    DocumentsResponse,
    DocumentItem,
    GradingResult,
    HealthResponse,
    IngestRequest,
    IngestResponse,
    ReviewTaskItem,
    SubmitExamRequest,
    SubmitExamResponse,
    UploadResponse,
    WrongQuestionItem,
    WrongQuestionsResponse,
)

load_dotenv()

# Initialize SQLite tables on import
from episto.db.session import init_db
init_db()

# Configure logging so we can see graph errors in the console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# FastAPI application instance
app = FastAPI(
    title="Episto Node API",
    description=(
        "Episto 多智能体考试系统 RESTful API。\n\n"
        "核心功能：\n"
        "- 通过自然语言对话生成考卷\n"
        "- 提交答案并自动批改\n"
        "- 错题自动入库\n\n"
        "使用 thread_id 维持对话上下文和图状态。"
    ),
    version="0.1.0",
    lifespan=episto_graph_lifespan,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper: extract clean response from LangGraph state
def _extract_agent_reply(state: dict) -> str:
    """Extract the last AI text reply from the graph state.

    The graph returns the full EpistoState which includes all messages.
    We need to find the last meaningful AI response (not a tool message)
    to return to the frontend.

    Args:
        state: The full graph state dict returned by graph.invoke().

    Returns:
        The content of the last AI message, or a fallback string.
    """
    messages = state.get("messages", [])

    # Walk messages in reverse to find the last AI message with content
    for msg in reversed(messages):
        msg_type = getattr(msg, "type", "")
        if msg_type == "ai" and getattr(msg, "content", ""):
            return msg.content

    return ""


# Endpoints
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check endpoint for service monitoring."""
    return HealthResponse()


@app.post(
    "/api/chat/stream",
    tags=["Conversation"],
    summary="Send a message and stream the response via SSE",
)
async def chat_stream(
    request: ChatRequest,
    graph=Depends(get_graph),
):
    """Stream agent response as Server-Sent Events.

    Each SSE event is a JSON chunk:
        event: token
        data: {"content": "partial text", "done": false}

    Final event:
        event: done
        data: {"reply": "full text", "exam_paper": null, "documents_loaded": []}
    """
    import asyncio

    config = {"configurable": {"thread_id": request.thread_id}}
    human_msg = HumanMessage(content=request.message)

    logger.info(
        "Stream request: thread_id=%s, message=%s",
        request.thread_id,
        request.message[:100],
    )

    async def event_generator():
        try:
            # Run the graph synchronously in a thread to avoid blocking
            loop = asyncio.get_event_loop()

            def run_graph():
                return graph.invoke({"messages": [human_msg]}, config=config)

            result = await loop.run_in_executor(None, run_graph)

            reply = _extract_agent_reply(result)
            exam_paper = result.get("exam_paper")
            documents_loaded = result.get("documents_loaded", [])

            # Simulate streaming by sending the reply in chunks
            chunk_size = 4
            for i in range(0, len(reply), chunk_size):
                chunk = reply[i:i + chunk_size]
                data = json.dumps(
                    {"content": chunk, "done": False},
                    ensure_ascii=False,
                )
                yield f"event: token\ndata: {data}\n\n"
                await asyncio.sleep(0.02)

            # Send final done event with metadata
            done_data = json.dumps(
                {
                    "reply": reply,
                    "exam_paper": exam_paper,
                    "documents_loaded": documents_loaded or [],
                    "done": True,
                },
                ensure_ascii=False,
            )
            yield f"event: done\ndata: {done_data}\n\n"

        except Exception as exc:
            logger.error(
                "Stream failed for thread_id=%s:\n%s",
                request.thread_id,
                traceback.format_exc(),
            )
            # Retry with fallback thread_id
            fallback_id = f"{request.thread_id}_retry_{uuid.uuid4().hex[:8]}"
            fallback_config = {"configurable": {"thread_id": fallback_id}}
            logger.info("Stream retrying with thread_id=%s", fallback_id)

            try:
                result = await loop.run_in_executor(
                    None,
                    lambda: graph.invoke({"messages": [human_msg]}, config=fallback_config),
                )
                reply = _extract_agent_reply(result)
                exam_paper = result.get("exam_paper")
                documents_loaded = result.get("documents_loaded", [])

                chunk_size = 4
                for i in range(0, len(reply), chunk_size):
                    chunk = reply[i:i + chunk_size]
                    data = json.dumps(
                        {"content": chunk, "done": False},
                        ensure_ascii=False,
                    )
                    yield f"event: token\ndata: {data}\n\n"
                    await asyncio.sleep(0.02)

                done_data = json.dumps(
                    {
                        "reply": reply,
                        "exam_paper": exam_paper,
                        "documents_loaded": documents_loaded or [],
                        "done": True,
                    },
                    ensure_ascii=False,
                )
                yield f"event: done\ndata: {done_data}\n\n"

            except Exception as retry_exc:
                err = json.dumps(
                    {"error": str(retry_exc), "done": True},
                    ensure_ascii=False,
                )
                yield f"event: error\ndata: {err}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post(
    "/api/chat",
    response_model=ChatResponse,
    tags=["Conversation"],
    summary="Send a message to the Episto agent",
    description=(
        "发送消息给 Episto 智能体。支持出题、辅导、文档导入等意图。\n\n"
        "如果触发了出题，response.exam_paper 会包含生成的考卷 JSON，"
        "图会挂起等待用户提交答案。"
    ),
)
async def chat(
    request: ChatRequest,
    graph=Depends(get_graph),
):
    """Handle a user chat message via the LangGraph pipeline.

    Flow:
        1. Extract thread_id and message from request
        2. Build LangGraph config with thread_id for state scoping
        3. Wrap user message as HumanMessage and invoke the graph
        4. Extract the agent reply and exam_paper from the resulting state
        5. Return a clean ChatResponse to the frontend
    """
    config = {"configurable": {"thread_id": request.thread_id}}
    human_msg = HumanMessage(content=request.message)

    logger.info(
        "Chat request: thread_id=%s, message=%s",
        request.thread_id,
        request.message[:100],
    )

    # Invoke the graph — this runs the full Lead Agent → sub-agent pipeline
    try:
        result = graph.invoke({"messages": [human_msg]}, config=config)
    except Exception as exc:
        # Log the full traceback so we can see the root cause
        logger.error(
            "graph.invoke() failed for thread_id=%s:\n%s",
            request.thread_id,
            traceback.format_exc(),
        )
        # If the error looks like a checkpoint/state corruption issue,
        # try once more with a fresh thread_id as a fallback
        import uuid
        fallback_id = f"{request.thread_id}_retry_{uuid.uuid4().hex[:8]}"
        fallback_config = {"configurable": {"thread_id": fallback_id}}
        logger.info("Retrying with fallback thread_id=%s", fallback_id)
        try:
            result = graph.invoke({"messages": [human_msg]}, config=fallback_config)
        except Exception as retry_exc:
            logger.error(
                "Retry also failed:\n%s", traceback.format_exc(),
            )
            from fastapi import HTTPException
            raise HTTPException(
                status_code=500,
                detail=f"Agent error: {retry_exc}",
            )

    # Extract clean response from the full state
    reply = _extract_agent_reply(result)
    exam_paper = result.get("exam_paper")
    documents_loaded = result.get("documents_loaded", [])

    logger.info(
        "Chat response: thread_id=%s, reply_len=%d, has_exam=%s",
        request.thread_id,
        len(reply),
        exam_paper is not None,
    )

    return ChatResponse(
        reply=reply,
        exam_paper=exam_paper,
        documents_loaded=documents_loaded or [],
    )


@app.post(
    "/api/submit_exam",
    response_model=SubmitExamResponse,
    tags=["Exam"],
    summary="Submit answers to a previously generated exam",
    description=(
        "提交考卷答案进行自动批改。\n\n"
        "必须使用与生成考卷时相同的 thread_id，"
        "这样 LangGraph 才能从 MemorySaver 恢复之前的图状态（含考卷）。"
        "Lead Agent 收到答案后会自动路由给 Grader 子智能体批改。"
    ),
)
async def submit_exam(
    request: SubmitExamRequest,
    graph=Depends(get_graph),
):
    """Handle exam answer submission and grading.

    Flow:
        1. Use the same thread_id to resume the suspended graph
        2. Send the user's answers as a new HumanMessage
        3. LangGraph's MemorySaver restores the exam_paper from the checkpoint
        4. The Lead Agent recognizes the "answer submission" intent
        5. Routes to delegate_to_grader which grades, writes wrong questions to DB
        6. Extract and return the grading results

    This is the "breakpoint resume" pattern — the graph was suspended via
    goto=END after exam generation, and now resumes with the same thread_id.
    """
    config = {"configurable": {"thread_id": request.thread_id}}

    # Convert answers dict {"1": "A", "2": "C"} to "1.A, 2.C" for the grader
    answer_string = ", ".join(
        f"{k}.{v}" for k, v in sorted(request.answers.items(), key=lambda x: int(x[0]))
    )
    answer_msg = HumanMessage(content=f"我的答案是: {answer_string}")

    logger.info(
        "Submit exam: thread_id=%s, answers=%s",
        request.thread_id,
        answer_string,
    )

    # Resume the suspended graph with the answer message.
    # MemorySaver automatically restores the previous state (including exam_paper).
    # The Lead Agent sees the answer message + exam_paper in state,
    # recognizes the "submit answers" intent, and routes to delegate_to_grader.
    try:
        result = graph.invoke({"messages": [answer_msg]}, config=config)
    except Exception as exc:
        logger.error(
            "submit_exam graph.invoke() failed for thread_id=%s:\n%s",
            request.thread_id,
            traceback.format_exc(),
        )
        from fastapi import HTTPException
        raise HTTPException(
            status_code=500,
            detail=f"Agent error during grading: {exc}",
        )

    # Extract the grading reply from the agent
    reply = _extract_agent_reply(result)

    # Extract structured grading data from state (set by delegate_to_grader)
    grading_data = result.get("grading_data", {})
    grading_results = [
        GradingResult(**r) for r in grading_data.get("results", [])
    ]
    score = grading_data.get("score", "")
    feedback = grading_data.get("feedback", "")

    # Count wrong questions from state
    wrong_questions = result.get("wrong_questions", {})
    wrong_count = len(wrong_questions) if wrong_questions else 0

    logger.info(
        "Submit exam result: thread_id=%s, score=%s, wrong=%d",
        request.thread_id,
        score,
        wrong_count,
    )

    return SubmitExamResponse(
        reply=reply,
        score=score,
        results=grading_results,
        feedback=feedback,
        wrong_questions_count=wrong_count,
    )


# ============================================================
# Documents — list all uploaded files
# ============================================================

# In-memory document store (simple dict keyed by id)
# In production, this would be a proper DB table.
_document_store: dict[str, dict] = {}


@app.get(
    "/api/documents",
    response_model=DocumentsResponse,
    tags=["Documents"],
    summary="List all uploaded documents",
)
async def list_documents():
    """Return all documents stored in the vault."""
    docs = [
        DocumentItem(
            id=d["id"],
            name=d["name"],
            file_type=d["file_type"],
            vector_status=d.get("vector_status", "Pending"),
            content=d.get("content", ""),
        )
        for d in _document_store.values()
    ]
    return DocumentsResponse(documents=docs)


@app.post(
    "/api/upload",
    response_model=UploadResponse,
    tags=["Documents"],
    summary="Upload a file and ingest into vector store",
)
async def upload_document(file: UploadFile = File(...)):
    """Upload a file. If it's a text/markdown file, ingest it into ChromaDB.

    Returns the document metadata and number of chunks created.
    """
    import asyncio

    filename = file.filename or "untitled"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    file_type = "md" if ext in ("md", "txt", "markdown") else "pdf"

    raw_bytes = await file.read()
    content = ""

    if file_type == "md":
        content = raw_bytes.decode("utf-8", errors="replace")
    else:
        content = f"[Binary file: {filename}]"

    doc_id = str(uuid.uuid4())
    chunks = 0
    vector_status = "Pending"

    # Ingest text content into ChromaDB
    if file_type == "md" and content.strip():
        try:
            from episto.vectorstore.chroma import add_documents

            def _ingest():
                return add_documents(content, source=filename)

            chunks = await asyncio.get_event_loop().run_in_executor(None, _ingest)
            vector_status = "Success"
        except Exception as exc:
            logger.error("Ingestion failed for %s: %s", filename, exc)
            vector_status = "Failed"

    _document_store[doc_id] = {
        "id": doc_id,
        "name": filename,
        "file_type": file_type,
        "vector_status": vector_status,
        "content": content,
    }

    return UploadResponse(
        id=doc_id,
        name=filename,
        file_type=file_type,
        chunks=chunks,
        vector_status=vector_status,
    )


@app.post(
    "/api/ingest",
    response_model=IngestResponse,
    tags=["Documents"],
    summary="Re-ingest a document into vector store",
)
async def ingest_document(request: IngestRequest):
    """Re-run vectorization for a specific document."""
    import asyncio

    doc = _document_store.get(request.document_id)
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")

    content = doc.get("content", "")
    chunks = 0
    vector_status = "Pending"

    if content.strip():
        try:
            from episto.vectorstore.chroma import add_documents

            def _ingest():
                return add_documents(content, source=request.name)

            chunks = await asyncio.get_event_loop().run_in_executor(None, _ingest)
            vector_status = "Success"
        except Exception as exc:
            logger.error("Re-ingestion failed for %s: %s", request.name, exc)
            vector_status = "Failed"

    doc["vector_status"] = vector_status
    return IngestResponse(document_id=request.document_id, chunks=chunks, status=vector_status)


@app.get(
    "/api/wrong_questions",
    response_model=WrongQuestionsResponse,
    tags=["Exam"],
    summary="List all wrong questions from the error notebook",
)
async def list_wrong_questions():
    """Return all wrong questions stored in SQLite.

    Used by the frontend to display the error notebook and generate
    review exam papers based on weak knowledge points.
    """
    from episto.db.models import WrongQuestion
    from episto.db.session import get_session

    try:
        with get_session() as session:
            wqs = session.query(WrongQuestion).order_by(
                WrongQuestion.created_at.desc()
            ).all()
            return WrongQuestionsResponse(
                questions=[
                    WrongQuestionItem(
                        id=wq.id,
                        topic=wq.topic,
                        question_text=wq.question_text,
                        user_answer=wq.user_answer,
                        correct_answer=wq.correct_answer,
                        explanation=wq.explanation,
                        created_at=wq.created_at.isoformat() if wq.created_at else "",
                    )
                    for wq in wqs
                ],
                total=len(wqs),
            )
    except Exception as exc:
        logger.warning("Failed to query wrong questions: %s", exc)
        return WrongQuestionsResponse(questions=[], total=0)


@app.get(
    "/api/dashboard",
    response_model=DashboardResponse,
    tags=["System"],
    summary="Get dashboard data for the Command Center",
)
async def dashboard():
    """Return review tasks, wrong question stats, and KB stats.

    Pulls real data from SQLite (wrong questions, concept mastery)
    and ChromaDB (document/slice counts).
    """
    import asyncio
    from datetime import datetime, timezone
    from episto.db.models import WrongQuestion, ConceptMastery
    from episto.db.session import get_session

    # --- Wrong questions ---
    wrong_count = 0
    wrong_topic = ""
    try:
        with get_session() as session:
            wrong_questions = session.query(WrongQuestion).all()
            wrong_count = len(wrong_questions)
            if wrong_questions:
                # Most common topic
                from collections import Counter
                topics = Counter(wq.topic for wq in wrong_questions)
                wrong_topic = topics.most_common(1)[0][0] if topics else ""
    except Exception as exc:
        logger.warning("Failed to query wrong questions: %s", exc)

    # --- Review tasks from concept mastery ---
    review_tasks = []
    try:
        with get_session() as session:
            now = datetime.now(timezone.utc)
            due_concepts = session.query(ConceptMastery).filter(
                ConceptMastery.next_review_date <= now
            ).limit(5).all()

            for cm in due_concepts:
                review_tasks.append(ReviewTaskItem(
                    id=str(cm.id),
                    concept=cm.concept_name,
                    due_label="今日到期" if cm.next_review_date else "待复习",
                    agent="tutor",
                    action="开始苏格拉底提问",
                ))
    except Exception as exc:
        logger.warning("Failed to query concept mastery: %s", exc)

    # --- KB stats from ChromaDB ---
    total_docs = len(_document_store)
    total_slices = 0
    last_ingest = ""
    try:
        from episto.vectorstore.chroma import get_vectorstore

        def _count():
            vs = get_vectorstore()
            col = vs._collection
            return col.count()

        total_slices = await asyncio.get_event_loop().run_in_executor(None, _count)

        if _document_store:
            last_doc = list(_document_store.values())[-1]
            last_ingest = f"刚刚上传 {last_doc['name']}"
    except Exception as exc:
        logger.warning("Failed to get KB stats: %s", exc)

    return DashboardResponse(
        review_tasks=review_tasks,
        wrong_question_count=wrong_count,
        wrong_question_knowledge_point=wrong_topic,
        total_documents=total_docs,
        total_slices=total_slices,
        last_ingest=last_ingest or "暂无",
    )


# Run with: uvicorn episto.main:app --reload
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "episto.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
