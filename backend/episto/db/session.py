"""Database session management for Episto SQLite storage.

Provides a SQLAlchemy engine + sessionmaker bound to episto.db.
Uses lazy initialization — the engine is created on first call to
get_session(), not at import time.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Default DB path: backend/episto/db/episto.db
_DEFAULT_DB_PATH = Path(__file__).resolve().parent / "episto.db"

_engine = None
_SessionFactory = None


def _get_engine():
    """Lazy-initialize the SQLAlchemy engine."""
    global _engine, _SessionFactory
    if _engine is None:
        db_path = os.getenv("EPISTO_DB_PATH", str(_DEFAULT_DB_PATH))
        _engine = create_engine(
            f"sqlite:///{db_path}",
            echo=False,
        )
        _SessionFactory = sessionmaker(bind=_engine)
    return _engine


def get_session() -> Session:
    """Return a new SQLAlchemy Session.

    Usage::

        from episto.db.session import get_session

        with get_session() as session:
            session.add(WrongQuestion(...))
            session.commit()
    """
    _get_engine()  # ensure engine is initialized
    return _SessionFactory()


def init_db() -> None:
    """Create all tables if they don't exist yet."""
    from episto.db.models import Base
    engine = _get_engine()
    Base.metadata.create_all(engine)
