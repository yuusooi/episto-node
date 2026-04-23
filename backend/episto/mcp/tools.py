"""Load MCP tools using langchain-mcp-adapters.

Provides get_mcp_tools() which connects to all configured MCP servers,
discovers their tools, and returns them as LangChain BaseTool instances.

The tools are patched to support synchronous invocation (our graph runs
synchronously via graph.stream) and cached for reuse across calls.

Reference: DeerFlow backend/packages/harness/deerflow/mcp/tools.py
"""

import asyncio
import atexit
import concurrent.futures
import logging
import os
from collections.abc import Callable
from pathlib import Path
from typing import Any

from langchain_core.tools import BaseTool

from episto.mcp.client import build_servers_config
from episto.mcp.config import ExtensionsConfig

logger = logging.getLogger(__name__)

# Thread pool for sync tool invocation in async environments
_SYNC_TOOL_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=4, thread_name_prefix="mcp-sync-tool"
)
atexit.register(lambda: _SYNC_TOOL_EXECUTOR.shutdown(wait=False))

# Module-level cache for loaded MCP tools
_cached_tools: list[BaseTool] | None = None

# Project root: backend/episto/mcp/tools.py -> parents[3]
_PROJECT_ROOT = Path(__file__).resolve().parents[3]


# ---------------------------------------------------------------------------
# Notes directory resolution
# ---------------------------------------------------------------------------


def get_notes_dir() -> str:
    """Get the resolved notes directory from MCP server config.

    Reads extensions_config.json, finds the filesystem server, and
    extracts its directory path (the last non-flag arg). Falls back
    to ``<project_root>/notes`` if no filesystem server is configured.

    Returns:
        Absolute path to the notes directory.
    """
    config = ExtensionsConfig.from_file()
    for _name, server_cfg in config.get_enabled_mcp_servers().items():
        if server_cfg.type == "stdio" and server_cfg.args:
            # Find the last non-flag arg (that's the directory path)
            for arg in reversed(server_cfg.args):
                if not arg.startswith("-"):
                    if arg.startswith("./") or arg.startswith("../"):
                        return str((_PROJECT_ROOT / arg).resolve())
                    return os.path.abspath(arg)

    # Fallback: project_root/notes
    return str((_PROJECT_ROOT / "notes").resolve())


# ---------------------------------------------------------------------------
# Sync wrapper for async tools
# ---------------------------------------------------------------------------


def _make_sync_tool_wrapper(
    coro: Callable[..., Any], tool_name: str
) -> Callable[..., Any]:
    """Build a synchronous wrapper for an async tool coroutine.

    Handles nested event loops by running the coroutine in a
    separate thread when called from an already-running loop.

    Args:
        coro: The tool's async coroutine.
        tool_name: Name of the tool (for logging).

    Returns:
        A synchronous function that invokes the coroutine safely.
    """

    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        try:
            if loop is not None and loop.is_running():
                future = _SYNC_TOOL_EXECUTOR.submit(
                    asyncio.run, coro(*args, **kwargs)
                )
                return future.result()
            else:
                return asyncio.run(coro(*args, **kwargs))
        except Exception as e:
            logger.error(
                "Error invoking MCP tool '%s' via sync wrapper: %s",
                tool_name,
                e,
                exc_info=True,
            )
            raise

    return sync_wrapper


# ---------------------------------------------------------------------------
# MCP tool loading
# ---------------------------------------------------------------------------


async def get_mcp_tools() -> list[BaseTool]:
    """Get all tools from enabled MCP servers.

    Reads extensions_config.json, builds server parameters, connects
    via MultiServerMCPClient, and returns discovered tools.

    Returns:
        List of LangChain tools from all enabled MCP servers.
    """
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
    except ImportError:
        logger.warning(
            "langchain-mcp-adapters not installed. "
            "Install it to enable MCP tools: pip install langchain-mcp-adapters"
        )
        return []

    # Always read the latest configuration from disk
    extensions_config = ExtensionsConfig.from_file()
    servers_config = build_servers_config(extensions_config)

    if not servers_config:
        logger.info("No enabled MCP servers configured")
        return []

    try:
        logger.info(
            "Initializing MCP client with %d server(s)", len(servers_config)
        )

        client = MultiServerMCPClient(servers_config, tool_name_prefix=True)
        tools = await client.get_tools()
        logger.info("Successfully loaded %d tool(s) from MCP servers", len(tools))

        # Patch async-only tools with sync wrappers
        for tool in tools:
            if getattr(tool, "func", None) is None and getattr(
                tool, "coroutine", None
            ):
                tool.func = _make_sync_tool_wrapper(tool.coroutine, tool.name)

        return tools

    except Exception as e:
        logger.error("Failed to load MCP tools: %s", e, exc_info=True)
        return []


def get_mcp_tools_sync() -> list[BaseTool]:
    """Synchronous wrapper for get_mcp_tools().

    Handles the async-to-sync conversion, running the coroutine
    in a separate thread if called from an existing event loop.

    Returns:
        List of LangChain tools from all enabled MCP servers.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    try:
        if loop is not None and loop.is_running():
            future = _SYNC_TOOL_EXECUTOR.submit(asyncio.run, get_mcp_tools())
            return future.result()
        else:
            return asyncio.run(get_mcp_tools())
    except Exception as e:
        logger.error("Failed to get MCP tools synchronously: %s", e)
        return []


# ---------------------------------------------------------------------------
# Cached access (DeerFlow pattern: lazy init, module-level cache)
# ---------------------------------------------------------------------------


def get_cached_mcp_tools() -> list[BaseTool]:
    """Get cached MCP tools with lazy initialization.

    On the first call, loads tools via get_mcp_tools_sync() and caches
    the result. Subsequent calls return the cached list directly.

    Returns:
        List of cached LangChain MCP tools.
    """
    global _cached_tools
    if _cached_tools is None:
        logger.info("MCP tools not cached, performing lazy initialization...")
        _cached_tools = get_mcp_tools_sync()
        logger.info("Cached %d MCP tool(s)", len(_cached_tools))
    return _cached_tools


def reset_mcp_tools_cache() -> None:
    """Clear the cached MCP tools, forcing a reload on next access."""
    global _cached_tools
    _cached_tools = None
    logger.info("MCP tools cache reset")
