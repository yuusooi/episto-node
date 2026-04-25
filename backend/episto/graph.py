"""Main graph for the Episto multi-agent system.

Uses create_react_agent to build a tool-based delegation graph. The LLM
reads each delegate tool's docstring and decides which sub-agent should
handle the user's request — no hard-coded if-else routing required.

MCP tools are loaded via langchain-mcp-adapters (following DeerFlow's
pattern) and pre-initialized on graph construction so they are ready
when the delegate tools need them.

Internally, create_react_agent creates a StateGraph with two nodes:
  1. "agent" — calls the LLM to decide which tool to use (or to respond directly)
  2. "tools" — executes the selected tool

A conditional edge connects them: if the LLM requests a tool call, flow goes
to "tools"; otherwise the graph ends (END).

Reference: DeerFlow make_lead_agent in
  backend/packages/harness/deerflow/agents/lead_agent/agent.py
"""

import os
import sys

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

# Fix: conda env sets SSL_CERT_FILE to a non-existent path
os.environ.pop("SSL_CERT_FILE", None)

# Ensure the backend package is importable when running directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from episto.agent.state import EpistoState  # noqa: E402
from episto.mcp.tools import get_cached_mcp_tools  # noqa: E402
from episto.tools.builtins.delegate import (  # noqa: E402
    delegate_to_examiner,
    delegate_to_grader,
    delegate_to_ingestor,
    delegate_to_tutor,
)

# ---------------------------------------------------------------------------
# System prompt — injected into the LLM as its "persona"
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
你是 Episto Node 的主控调度员。你的职责是根据用户的意图，
调用相应的 delegate 工具将任务交接给专门的子智能体。

## 核心规则

1. **绝对不要自己回答学术问题**。即使用户问了一个你知道答案的问题，
   你也必须通过调用 delegate_to_tutor 将其转交给导师。
2. 根据用户意图选择正确的 delegate 工具：
   - 用户想上传/处理/解析文档 -> delegate_to_ingestor
   - 用户想学习/理解某个知识点 -> delegate_to_tutor
   - 用户想做题/考试/练习 -> delegate_to_examiner
   - 用户在回答题目/提交答案 -> delegate_to_grader
3. 如果用户的意图不明确，先用自然语言追问清楚，再调用工具。
4. 调用工具时，尽量从用户的话语中提取关键参数（文件路径、知识点、题数等）。

## 判断用户是否在交答案

如果系统刚出过考卷（state 中有 exam_paper），且用户的消息看起来像是在
回答题目（如 "1.A, 2.B, 3.C" 或 "第一题选A" 等），你应该立刻调用
delegate_to_grader，而不是自己评判对错。
"""

# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------


def make_graph() -> "CompiledStateGraph":
    """Build and return the Episto main graph.

    Pattern mirrors DeerFlow's make_lead_agent:
      - model: DeepSeek deepseek-chat via ChatOpenAI compatible interface
      - tools: three delegate stubs (ingestor, tutor, examiner) + MCP tools
      - state_schema: EpistoState with custom reducers
      - prompt: system prompt injected via create_react_agent's prompt parameter

    MCP tools are pre-loaded via get_cached_mcp_tools() so that
    delegate_to_ingestor can use them without re-initializing.
    """
    load_dotenv()

    # Pre-load MCP tools (connects to MCP servers, caches tools)
    # MCP tools are NOT exposed to the agent directly — they are used
    # internally by delegate_to_ingestor. Pre-loading ensures the MCP
    # connection is ready when the delegate tool calls get_cached_mcp_tools().
    mcp_tools = get_cached_mcp_tools()
    print(f"[MCP] 已预加载 {len(mcp_tools)} 个 MCP 工具（仅供内部使用）")

    model = ChatOpenAI(
        model="deepseek-chat",
        openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
        openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
    )

    # Only expose delegate tools to the agent (not MCP tools directly)
    tools = [delegate_to_ingestor, delegate_to_tutor, delegate_to_examiner, delegate_to_grader]

    graph = create_react_agent(
        model=model,
        tools=tools,
        state_schema=EpistoState,
        prompt=SYSTEM_PROMPT,
        checkpointer=MemorySaver(),
    )

    return graph


# ---------------------------------------------------------------------------
# CLI interactive loop
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 50)
    print("  Episto Node 主控调度系统")
    print("  输入 'quit' 或 'exit' 退出")
    print("=" * 50)

    graph = make_graph()

    # MemorySaver requires a thread_id to scope state per conversation
    config = {"configurable": {"thread_id": "user_1"}}

    while True:
        try:
            user_input = input("\n你: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n再见！")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            print("再见！")
            break

        # Wrap user input into the messages field of EpistoState
        init_state = {"messages": [("user", user_input)]}

        print("\n--- 开始处理 ---")
        for event in graph.stream(init_state, config=config, stream_mode="values"):
            messages = event.get("messages", [])
            if messages:
                last_msg = messages[-1]
                # Print AI messages and tool results
                if hasattr(last_msg, "content") and last_msg.content:
                    role = getattr(last_msg, "type", "unknown")
                    if role == "ai":
                        print(f"AI: {last_msg.content}")
                    elif role == "tool":
                        print(f"工具结果: {last_msg.content}")
        print("--- 处理完毕 ---")
