"""SQLAlchemy 2.0 ORM models for Episto persistent storage.

Tables:
    WrongQuestion: Records of questions the user answered incorrectly.
        Used for error notebook and review scheduling.
    ConceptMastery: Tracks mastery level per concept for spaced repetition
        (Ebbinghaus forgetting curve).

Uses SQLAlchemy 2.0 declarative syntax with Mapped[] type annotations.
"""

from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all ORM models."""


class WrongQuestion(Base):
    """A single wrong question record persisted to SQLite.

    Written by the Grader sub-agent after comparing user answers
    against the exam paper's correct answers.
    """

    __tablename__ = "wrong_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(String(200), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    user_answer: Mapped[str] = mapped_column(String(50), nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(50), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return (
            f"<WrongQuestion(id={self.id}, topic='{self.topic}', "
            f"question='{self.question_text[:30]}...')>"
        )


class ConceptMastery(Base):
    """Mastery level per concept for spaced repetition scheduling.

    Tracks error count and review dates to support Ebbinghaus
    forgetting curve calculations.
    """

    __tablename__ = "concept_mastery"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    concept_name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    error_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_review_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    next_review_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<ConceptMastery(concept='{self.concept_name}', "
            f"errors={self.error_count})>"
        )
