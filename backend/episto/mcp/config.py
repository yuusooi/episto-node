"""Extensions configuration for MCP servers.

Simplified version of DeerFlow's ExtensionsConfig — supports only the
fields we need: stdio-based MCP servers with command/args/env.

Reference: DeerFlow backend/packages/harness/deerflow/config/extensions_config.py
"""

import json
import logging
import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)


class McpServerConfig(BaseModel):
    """Configuration for a single MCP server."""

    enabled: bool = Field(default=True, description="Whether this MCP server is enabled")
    type: str = Field(default="stdio", description="Transport type: 'stdio', 'sse', or 'http'")
    command: str | None = Field(default=None, description="Command to execute (for stdio type)")
    args: list[str] = Field(default_factory=list, description="Arguments for the command (for stdio type)")
    env: dict[str, str] = Field(default_factory=dict, description="Environment variables for the server")
    url: str | None = Field(default=None, description="URL of the MCP server (for sse/http type)")
    description: str = Field(default="", description="Human-readable description")
    model_config = ConfigDict(extra="allow")


class ExtensionsConfig(BaseModel):
    """Unified configuration for MCP servers.

    Reference: DeerFlow uses the same structure with alias='mcpServers'
    so that the JSON file can use camelCase keys.
    """

    mcp_servers: dict[str, McpServerConfig] = Field(
        default_factory=dict,
        description="Map of MCP server name to configuration",
        alias="mcpServers",
    )
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    @classmethod
    def resolve_config_path(cls, config_path: str | None = None) -> Path | None:
        """Resolve the extensions config file path.

        Priority:
        1. Explicit config_path argument
        2. EPISTO_EXTENSIONS_CONFIG_PATH environment variable
        3. extensions_config.json in project root (parent of backend/)
        4. extensions_config.json in backend/ directory
        5. If not found, return None (extensions are optional)

        Args:
            config_path: Optional path to extensions config file.

        Returns:
            Path to the config file if found, otherwise None.
        """
        if config_path:
            path = Path(config_path)
            if not path.exists():
                raise FileNotFoundError(
                    f"Extensions config file not found at {path}"
                )
            return path

        env_path = os.getenv("EPISTO_EXTENSIONS_CONFIG_PATH")
        if env_path:
            path = Path(env_path)
            if not path.exists():
                raise FileNotFoundError(
                    f"Extensions config file not found at {path}"
                )
            return path

        # Search default locations
        # episto/mcp/config.py -> episto/mcp/ -> episto/ -> backend/ -> project_root/
        backend_dir = Path(__file__).resolve().parents[2]
        project_root = backend_dir.parent

        for candidate in (
            project_root / "extensions_config.json",
            backend_dir / "extensions_config.json",
        ):
            if candidate.exists():
                return candidate

        return None

    @classmethod
    def from_file(cls, config_path: str | None = None) -> "ExtensionsConfig":
        """Load extensions config from JSON file.

        Args:
            config_path: Optional path to the config file.

        Returns:
            ExtensionsConfig instance, or empty config if file not found.
        """
        resolved_path = cls.resolve_config_path(config_path)
        if resolved_path is None:
            logger.info("No extensions_config.json found, using empty config")
            return cls(mcp_servers={})

        try:
            with open(resolved_path, encoding="utf-8") as f:
                config_data = json.load(f)
            cls.resolve_env_variables(config_data)
            return cls.model_validate(config_data)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Extensions config file at {resolved_path} is not valid JSON: {e}"
            ) from e
        except Exception as e:
            raise RuntimeError(
                f"Failed to load extensions config from {resolved_path}: {e}"
            ) from e

    @classmethod
    def resolve_env_variables(cls, config: dict[str, Any]) -> dict[str, Any]:
        """Recursively resolve environment variables in config values.

        Values starting with '$' are replaced by the corresponding
        environment variable.  Example: "$GITHUB_TOKEN"

        Args:
            config: The config dict to resolve.

        Returns:
            The config with environment variables resolved.
        """
        for key, value in config.items():
            if isinstance(value, str):
                if value.startswith("$"):
                    env_value = os.getenv(value[1:])
                    config[key] = env_value if env_value is not None else ""
            elif isinstance(value, dict):
                config[key] = cls.resolve_env_variables(value)
            elif isinstance(value, list):
                config[key] = [
                    cls.resolve_env_variables(item) if isinstance(item, dict) else item
                    for item in value
                ]
        return config

    def get_enabled_mcp_servers(self) -> dict[str, McpServerConfig]:
        """Return only the enabled MCP servers."""
        return {
            name: cfg for name, cfg in self.mcp_servers.items() if cfg.enabled
        }


# ---------------------------------------------------------------------------
# Singleton accessors (same pattern as DeerFlow)
# ---------------------------------------------------------------------------

_extensions_config: ExtensionsConfig | None = None


def get_extensions_config() -> ExtensionsConfig:
    """Get the cached singleton ExtensionsConfig instance.

    Loads from file on first call. Use reset_extensions_config() to
    force a reload.
    """
    global _extensions_config
    if _extensions_config is None:
        _extensions_config = ExtensionsConfig.from_file()
    return _extensions_config


def reset_extensions_config() -> None:
    """Clear the cached config, forcing a reload on next access."""
    global _extensions_config
    _extensions_config = None
