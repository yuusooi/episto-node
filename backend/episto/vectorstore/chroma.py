"""ChromaDB vector store with local HuggingFace embeddings.

Provides zero-cost RAG by using BAAI/bge-large-zh-v1.5 — a top-tier open-source
Chinese embedding model that runs entirely locally after the first download.

Key design decisions:
    - Persistent storage via ChromaDB's PersistentClient (survives restarts)
    - RecursiveCharacterTextSplitter for intelligent chunking with overlap
    - Singleton pattern for the embedding model (avoid re-loading on every call)

Reference: DeerFlow uses a similar vectorstore abstraction pattern in
    backend/packages/harness/deerflow/config/app_config.py
"""

import logging
import os
from functools import lru_cache
from pathlib import Path

# Fix: conda env may set SSL_CERT_FILE to a non-existent path
os.environ.pop("SSL_CERT_FILE", None)

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Default configuration
# ---------------------------------------------------------------------------

DEFAULT_COLLECTION_NAME = "episto_documents"
DEFAULT_PERSIST_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "chroma_db"
)
DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 50
EMBEDDING_MODEL_NAME = "BAAI/bge-large-zh-v1.5"


# ---------------------------------------------------------------------------
# Embedding model (singleton — loaded once, reused across calls)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    """Return a cached HuggingFaceEmbeddings instance.

    Uses BAAI/bge-large-zh-v1.5 — the best open-source Chinese embedding
    model. First call will download ~1.3GB to the HuggingFace cache;
    subsequent calls are instant and fully offline.
    """
    logger.info("Loading embedding model: %s", EMBEDDING_MODEL_NAME)
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        # Use CPU for inference (zero-cost, no GPU required)
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


# ---------------------------------------------------------------------------
# Text splitter
# ---------------------------------------------------------------------------


def get_text_splitter(
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> RecursiveCharacterTextSplitter:
    """Return a configured text splitter.

    Why chunk_overlap? Without overlap, a sentence split across two chunks
    loses context during retrieval. Overlapping by 50 chars ensures that
    boundary content is searchable from both sides.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", "。", "！", "？", ".", " ", ""],
    )


# ---------------------------------------------------------------------------
# Vector store operations
# ---------------------------------------------------------------------------


def get_vectorstore(
    persist_dir: str | None = None,
    collection_name: str = DEFAULT_COLLECTION_NAME,
) -> Chroma:
    """Return a persistent Chroma vector store instance.

    Args:
        persist_dir: Directory for ChromaDB persistence. Defaults to
            ``<project_root>/chroma_db``.
        collection_name: ChromaDB collection name.
    """
    directory = persist_dir or DEFAULT_PERSIST_DIR
    Path(directory).mkdir(parents=True, exist_ok=True)

    return Chroma(
        collection_name=collection_name,
        embedding_function=get_embeddings(),
        persist_directory=directory,
    )


def add_documents(
    text: str,
    source: str,
    persist_dir: str | None = None,
    collection_name: str = DEFAULT_COLLECTION_NAME,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> int:
    """Split text into chunks and add them to the vector store.

    Args:
        text: Raw text content to ingest.
        source: Identifier for the source document (e.g. filename).
        persist_dir: ChromaDB persistence directory.
        collection_name: ChromaDB collection name.
        chunk_size: Maximum characters per chunk.
        chunk_overlap: Overlap characters between adjacent chunks.

    Returns:
        Number of chunks added.
    """
    splitter = get_text_splitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = splitter.split_text(text)

    documents = [
        Document(page_content=chunk, metadata={"source": source, "chunk_index": i})
        for i, chunk in enumerate(chunks)
    ]

    vectorstore = get_vectorstore(
        persist_dir=persist_dir, collection_name=collection_name
    )
    vectorstore.add_documents(documents)

    logger.info("Added %d chunks from '%s' to vector store", len(documents), source)
    return len(documents)


def similarity_search(
    query: str,
    k: int = 4,
    persist_dir: str | None = None,
    collection_name: str = DEFAULT_COLLECTION_NAME,
) -> list[Document]:
    """Search the vector store for documents similar to the query.

    Args:
        query: Search query text.
        k: Number of results to return.
        persist_dir: ChromaDB persistence directory.
        collection_name: ChromaDB collection name.

    Returns:
        List of matching Document objects, ranked by similarity.
    """
    vectorstore = get_vectorstore(
        persist_dir=persist_dir, collection_name=collection_name
    )
    results = vectorstore.similarity_search(query, k=k)
    return results


# ---------------------------------------------------------------------------
# Quick smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import tempfile

    logging.basicConfig(level=logging.INFO)

    # Use a temp directory so we don't pollute the real DB
    test_dir = tempfile.mkdtemp(prefix="episto_chroma_test_")

    print("=== ChromaDB Smoke Test ===\n")

    # 1. Add a document
    test_text = (
        "React 的 useEffect 用于处理副作用，例如数据获取、订阅或手动修改 DOM。"
        "它接收一个函数和一个依赖数组作为参数。"
        "当依赖项发生变化时，useEffect 会在组件渲染后重新执行。"
        "在 React 生命周期中，useEffect 可以替代 componentDidMount、"
        "componentDidUpdate 和 componentWillUnmount 这三个方法。"
    )
    count = add_documents(test_text, source="react_hooks.md", persist_dir=test_dir)
    print(f"Added {count} chunks.\n")

    # 2. Search with a different but related query
    print("Searching: 'React 生命周期'")
    results = similarity_search("React 生命周期", k=2, persist_dir=test_dir)
    for doc in results:
        print(f"  [source={doc.metadata['source']}] {doc.page_content[:100]}...")

    # 3. Verify persistence files exist
    db_files = list(Path(test_dir).iterdir())
    print(f"\nPersistence files: {[f.name for f in db_files]}")

    # Cleanup
    import shutil
    shutil.rmtree(test_dir, ignore_errors=True)

    print("\nSmoke test passed!")
