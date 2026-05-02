"""Centralized dependency injection for the Episto FastAPI application.

Following DeerFlow's ``backend/app/gateway/deps.py`` pattern:
- The LangGraph CompiledStateGraph is created once and stored on ``app.state``
- Router handler functions access it via getter functions
- Getters raise HTTPException(503) if the dependency is not available

Why dependency injection?
- Avoid rebuilding the graph on every HTTP request (expensive: MCP init,
  model instantiation, tool registration)
- Enable clean testing by swapping the graph with a mock
- Follow the separation of concerns principle: FastAPI handles HTTP,
  the graph handles business logic
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request

# Type alias — CompiledStateGraph from LangGraph
from langgraph.graph.state import CompiledStateGraph


@asynccontextmanager
async def episto_graph_lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize the Episto LangGraph on application startup.

    Builds the graph once via ``make_graph()`` and stores the compiled
    graph on ``app.state.graph``. This runs during FastAPI's lifespan
    startup phase, before any requests are served.

    The graph (and its MemorySaver checkpointer) is shared across all
    requests — state isolation is handled by thread_id, not by creating
    separate graph instances.

    Usage in main.py::
        app = FastAPI(lifespan=episto_graph_lifespan)
    """
    from episto.graph import make_graph

    print("[Startup] Building Episto LangGraph...")
    graph = make_graph()
    app.state.graph = graph
    print("[Startup] Episto LangGraph ready")

    yield

    # Cleanup: nothing to explicitly close for MemorySaver
    print("[Shutdown] Episto LangGraph shutting down")


# Getter functions — called by routers per-request
def get_graph(request: Request) -> CompiledStateGraph:
    """Return the shared LangGraph instance from app.state.

    Raises:
        HTTPException(503): If the graph hasn't been initialized
            (e.g. during startup failure).
    """
    graph = getattr(request.app.state, "graph", None)
    if graph is None:
        raise HTTPException(
            status_code=503,
            detail="Episto graph not available. Service may be starting up.",
        )
    return graph
