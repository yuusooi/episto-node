"""MCP client using langchain-mcp-adapters.

Converts ExtensionsConfig into the parameters dict expected by
MultiServerMCPClient, then delegates tool discovery and invocation
to the adapter library.

Relative paths in server args (e.g. "./notes") are resolved to
absolute paths relative to the project root before being passed
to the MCP server process.

Reference: DeerFlow backend/packages/harness/deerflow/mcp/client.py
"""

import logging
import os
from pathlib import Path
from typing import Any

from episto.mcp.config import ExtensionsConfig, McpServerConfig

logger = logging.getLogger(__name__)

# Project root: backend/episto/mcp/client.py -> parents[3]
_PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _resolve_relative_args(args: list[str]) -> list[str]:
    """Resolve relative paths in server args to absolute paths.

    Any arg starting with './' or '../' is resolved relative to
    the project root directory.

    Args:
        args: Original argument list from the config.

    Returns:
        Argument list with relative paths resolved to absolute.
    """
    resolved = []
    for arg in args:
        if arg.startswith("./") or arg.startswith("../"):
            resolved.append(str((_PROJECT_ROOT / arg).resolve()))
        else:
            resolved.append(arg)
    return resolved


def build_server_params(server_name: str, config: McpServerConfig) -> dict[str, Any]:
    """Build server parameters for MultiServerMCPClient.

    Args:
        server_name: Name of the MCP server.
        config: Configuration for the MCP server.

    Returns:
        Dictionary of server parameters for langchain-mcp-adapters.

    Raises:
        ValueError: If required fields are missing for the transport type.
    """
    transport_type = config.type or "stdio"
    params: dict[str, Any] = {"transport": transport_type}

    if transport_type == "stdio":
        if not config.command:
            raise ValueError(
                f"MCP server '{server_name}' with stdio transport requires 'command'"
            )
        params["command"] = config.command
        params["args"] = _resolve_relative_args(config.args)
        if config.env:
            params["env"] = config.env
    elif transport_type in ("sse", "http"):
        if not config.url:
            raise ValueError(
                f"MCP server '{server_name}' with {transport_type} transport requires 'url'"
            )
        params["url"] = config.url
    else:
        raise ValueError(
            f"MCP server '{server_name}' has unsupported transport type: {transport_type}"
        )

    return params


def build_servers_config(
    extensions_config: ExtensionsConfig,
) -> dict[str, dict[str, Any]]:
    """Build the full servers configuration dict for MultiServerMCPClient.

    Iterates over enabled MCP servers and converts each one into the
    parameter dict expected by langchain-mcp-adapters.

    Args:
        extensions_config: Loaded ExtensionsConfig instance.

    Returns:
        Dictionary mapping server names to their parameters.
    """
    enabled_servers = extensions_config.get_enabled_mcp_servers()

    if not enabled_servers:
        logger.info("No enabled MCP servers found")
        return {}

    servers_config: dict[str, dict[str, Any]] = {}
    for server_name, server_config in enabled_servers.items():
        try:
            servers_config[server_name] = build_server_params(
                server_name, server_config
            )
            logger.info("Configured MCP server: %s", server_name)
        except Exception as e:
            logger.error("Failed to configure MCP server '%s': %s", server_name, e)

    return servers_config
