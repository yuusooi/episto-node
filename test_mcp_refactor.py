"""Test script for MCP refactoring (langchain-mcp-adapters pattern)."""
import os
import sys

os.environ.pop("SSL_CERT_FILE", None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

# Test 1: Config loading
print("=" * 50)
print("Test 1: Config loading")
print("=" * 50)
from episto.mcp.config import get_extensions_config

config = get_extensions_config()
print(f"  MCP servers: {list(config.mcp_servers.keys())}")
enabled = config.get_enabled_mcp_servers()
print(f"  Enabled: {list(enabled.keys())}")
for name, cfg in enabled.items():
    print(f"    {name}: command={cfg.command}, args={cfg.args}")

# Test 2: Client build
print("\n" + "=" * 50)
print("Test 2: Client build")
print("=" * 50)
from episto.mcp.client import build_servers_config

servers = build_servers_config(config)
print(f"  Built {len(servers)} server config(s)")
for name, sc in servers.items():
    print(f"    {name}: {sc}")

# Test 3: Notes dir resolution
print("\n" + "=" * 50)
print("Test 3: Notes dir resolution")
print("=" * 50)
from episto.mcp.tools import get_notes_dir

notes_dir = get_notes_dir()
print(f"  Notes dir: {notes_dir}")
print(f"  Exists: {os.path.exists(notes_dir)}")

# Test 4: Load MCP tools
print("\n" + "=" * 50)
print("Test 4: Load MCP tools (langchain-mcp-adapters)")
print("=" * 50)
from episto.mcp.tools import get_cached_mcp_tools

mcp_tools = get_cached_mcp_tools()
print(f"  Loaded {len(mcp_tools)} MCP tool(s)")
for t in mcp_tools:
    print(f"    - {t.name}: {t.description[:80]}...")

# Test 5: Read file via MCP tool
print("\n" + "=" * 50)
print("Test 5: Read file via MCP tool")
print("=" * 50)
from episto.tools.builtins.delegate import _read_file_via_mcp

content = _read_file_via_mcp("test.md")
print(f"  Content: {repr(content[:100])}")

# Test 6: Full end-to-end with graph
print("\n" + "=" * 50)
print("Test 6: Full graph test (delegate_to_ingestor)")
print("=" * 50)
from dotenv import load_dotenv
load_dotenv()

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from episto.agent.state import EpistoState
from episto.tools.builtins.delegate import (
    delegate_to_ingestor, delegate_to_tutor, delegate_to_examiner,
)

model = ChatOpenAI(
    model="deepseek-chat",
    openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
    openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
)

tools = [delegate_to_ingestor, delegate_to_tutor, delegate_to_examiner]
# MCP tools are pre-loaded in cache for internal use by delegate_to_ingestor
graph = create_react_agent(
    model=model,
    tools=tools,
    state_schema=EpistoState,
    prompt="你是 Episto Node 的主控调度员。",
)

init_state = {"messages": [("user", "帮我把笔记目录下的 ml_intro.md 读一下存进库里")]}
for event in graph.stream(init_state, stream_mode="values"):
    messages = event.get("messages", [])
    if messages:
        last_msg = messages[-1]
        if hasattr(last_msg, "content") and last_msg.content:
            role = getattr(last_msg, "type", "unknown")
            # Safely encode for Windows console (avoid GBK errors)
            text = str(last_msg.content)[:200]
            try:
                print(f"  [{role}] {text}")
            except UnicodeEncodeError:
                print(f"  [{role}] {text.encode('ascii', 'replace').decode()}")
    if "documents_loaded" in event:
        print(f"  [state] documents_loaded = {event['documents_loaded']}")

print("\nAll tests passed!")
