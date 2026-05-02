"""Pydantic schemas for the Episto FastAPI endpoints.

Defines request/response models with clear field descriptions for automatic
Swagger UI documentation. Follows DeerFlow's pattern of separating data
contracts from business logic.

Reference: DeerFlow backend/app/gateway/routers/thread_runs.py
    uses similar Pydantic request/response models with Field descriptions.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

# Chat endpoint
class ChatRequest(BaseModel):
    """Request body for the /api/chat endpoint.

    The user sends a message along with a thread_id that scopes the
    conversation state. LangGraph's MemorySaver uses thread_id to
    persist and restore conversation history across requests.
    """

    thread_id: str = Field(
        description="Unique identifier for the conversation thread. "
        "LangGraph uses this to scope state in MemorySaver. "
        "Use a consistent value (e.g. 'user_001') to maintain context.",
        examples=["user_001", "student_abc123"],
    )
    message: str = Field(
        description="The user's message to the Episto agent. "
        "Can be any natural language request — the Lead Agent will "
        "route it to the appropriate sub-agent (Examiner, Tutor, etc.).",
        examples=[
            "给我出两道关于 React Hooks 的题",
            "帮我复习一下 JavaScript 闭包",
        ],
    )


class ChatResponse(BaseModel):
    """Response body for the /api/chat endpoint.

    Returns the agent's reply and the current exam paper (if generated).
    The exam_paper is None unless the Examiner sub-agent was triggered.
    When an exam is generated, the graph suspends via goto=END and waits
    for the user to submit answers via /api/submit_exam.
    """

    reply: str = Field(
        description="The agent's text response to the user's message.",
    )
    exam_paper: dict | None = Field(
        default=None,
        description="The generated exam paper (if any). Populated when "
        "the Examiner sub-agent generates questions. Contains title, "
        "difficulty, and a list of questions with options and answers.",
    )
    documents_loaded: list[str] = Field(
        default_factory=list,
        description="List of documents that have been loaded into the "
        "vector store during this conversation.",
    )


# Submit exam endpoint
class SubmitExamRequest(BaseModel):
    """Request body for the /api/submit_exam endpoint.

    After the Examiner generates an exam paper (returned in ChatResponse),
    the user submits their answers via this endpoint. The same thread_id
    must be used so that LangGraph can resume the suspended graph and
    the Grader sub-agent can access the exam paper from state.
    """

    thread_id: str = Field(
        description="Must match the thread_id used when requesting the exam. "
        "This is how LangGraph's MemorySaver reconnects to the suspended "
        "graph state containing the exam paper.",
        examples=["user_001"],
    )
    answers: dict[str, str] = Field(
        description="User's answers as a mapping of question number to "
        "selected option letter. Keys are question numbers (1-indexed), "
        "values are the selected option letters (A/B/C/D).",
        examples=[{"1": "A", "2": "C", "3": "B"}],
    )


class GradingResult(BaseModel):
    """Result for a single graded question."""

    question_number: int = Field(description="Question number (1-indexed).")
    question_text: str = Field(description="The question text.")
    user_answer: str = Field(description="The user's submitted answer.")
    correct_answer: str = Field(description="The correct answer.")
    is_correct: bool = Field(description="Whether the user's answer is correct.")
    topic: str = Field(default="", description="Knowledge topic tested.")
    explanation: str = Field(default="", description="Why the answer is correct.")


class SubmitExamResponse(BaseModel):
    """Response body for the /api/submit_exam endpoint.

    Returns detailed grading results including per-question breakdown,
    overall score, and a feedback summary. Wrong answers are automatically
    persisted to the SQLite wrong_questions table.
    """

    reply: str = Field(
        description="The agent's grading feedback message.",
    )
    score: str = Field(
        default="",
        description="Score in 'correct/total' format (e.g. '3/5').",
    )
    results: list[GradingResult] = Field(
        default_factory=list,
        description="Per-question grading results.",
    )
    feedback: str = Field(
        default="",
        description="Overall feedback and encouragement from the Grader.",
    )
    wrong_questions_count: int = Field(
        default=0,
        description="Number of wrong answers written to the error notebook.",
    )


# Health check
class HealthResponse(BaseModel):
    """Response for the health check endpoint."""

    status: str = Field(default="ok", description="Service health status.")
    service: str = Field(default="episto-node", description="Service name.")


# Documents endpoint
class DocumentItem(BaseModel):
    """A single document record from the vault."""

    id: str = Field(description="Unique document ID.")
    name: str = Field(description="File name, e.g. 'React 学习笔记.md'.")
    file_type: str = Field(description="File extension: 'md' or 'pdf'.")
    vector_status: str = Field(default="Pending", description="Vectorization status.")
    content: str = Field(default="", description="File content (for md files).")


class DocumentsResponse(BaseModel):
    """Response for GET /api/documents."""

    documents: list[DocumentItem] = Field(default_factory=list)


# Upload endpoint
class UploadResponse(BaseModel):
    """Response for POST /api/upload."""

    id: str = Field(description="Unique document ID assigned by backend.")
    name: str = Field(description="Uploaded file name.")
    file_type: str = Field(description="'md' or 'pdf'.")
    chunks: int = Field(default=0, description="Number of vector chunks created.")
    vector_status: str = Field(default="Success")


# Ingest endpoint
class IngestRequest(BaseModel):
    """Request to re-ingest a document into vector store."""

    document_id: str = Field(description="ID of the document to re-ingest.")
    name: str = Field(description="File name for metadata.")


class IngestResponse(BaseModel):
    """Response for POST /api/ingest."""

    document_id: str
    chunks: int = Field(default=0, description="Number of vector chunks created.")
    status: str = Field(default="Success")


# Dashboard endpoint
class ReviewTaskItem(BaseModel):
    """A concept due for review."""

    id: str
    concept: str
    due_label: str
    agent: str = Field(default="tutor")
    action: str = Field(default="开始复习")


class DashboardResponse(BaseModel):
    """Response for GET /api/dashboard."""

    review_tasks: list[ReviewTaskItem] = Field(default_factory=list)
    wrong_question_count: int = Field(default=0)
    wrong_question_knowledge_point: str = Field(default="")
    total_documents: int = Field(default=0)
    total_slices: int = Field(default=0)
    last_ingest: str = Field(default="")


# Wrong questions endpoint
class WrongQuestionItem(BaseModel):
    """A single wrong question from the error notebook."""

    id: int = Field(description="Record ID.")
    topic: str = Field(description="Knowledge topic.")
    question_text: str = Field(description="The question text.")
    user_answer: str = Field(description="User's submitted answer.")
    correct_answer: str = Field(description="The correct answer.")
    explanation: str = Field(default="", description="Explanation for the correct answer.")
    created_at: str = Field(default="", description="ISO timestamp.")


class WrongQuestionsResponse(BaseModel):
    """Response for GET /api/wrong_questions."""

    questions: list[WrongQuestionItem] = Field(default_factory=list)
    total: int = Field(default=0)
