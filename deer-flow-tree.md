# DeerFlow 项目完整目录树

> 生成时间: 2026-04-19
> 排除目录: `.git`, `node_modules`, `.next`, `.venv`, `__pycache__`
> 排除文件: `uv.lock`, `package-lock.json`, `pnpm-lock.yaml`, `*.pyc`

```
deer-flow/
├── .agent/
│   └── skills/
│       └── smoke-test/
│           ├── references/
│           │   ├── SOP.md
│           │   └── troubleshooting.md
│           ├── scripts/
│           │   ├── check_docker.sh
│           │   ├── check_local_env.sh
│           │   ├── deploy_docker.sh
│           │   ├── deploy_local.sh
│           │   ├── frontend_check.sh
│           │   ├── health_check.sh
│           │   └── pull_code.sh
│           ├── templates/
│           │   ├── report.docker.template.md
│           │   └── report.local.template.md
│           └── SKILL.md
├── .dockerignore
├── .env.example
├── .gitattributes
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── runtime-information.yml
│   ├── workflows/
│   │   ├── backend-unit-tests.yml
│   │   ├── frontend-unit-tests.yml
│   │   └── lint-check.yml
│   └── copilot-instructions.md
├── .gitignore
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── deer-flow.code-workspace
├── LICENSE
├── Makefile
├── README.md
├── README_fr.md
├── README_ja.md
├── README_ru.md
├── README_zh.md
├── SECURITY.md
├── config.example.yaml
├── extensions_config.example.json
├── Install.md
│
├── backend/
│   ├── .gitignore
│   ├── .python-version
│   ├── .vscode/
│   │   ├── extensions.json
│   │   └── settings.json
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── CONTRIBUTING.md
│   ├── Dockerfile
│   ├── Makefile
│   ├── README.md
│   ├── debug.py
│   ├── langgraph.json
│   ├── pyproject.toml
│   ├── ruff.toml
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── channels/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── commands.py
│   │   │   ├── discord.py
│   │   │   ├── feishu.py
│   │   │   ├── manager.py
│   │   │   ├── message_bus.py
│   │   │   ├── service.py
│   │   │   ├── slack.py
│   │   │   ├── store.py
│   │   │   ├── telegram.py
│   │   │   ├── wechat.py
│   │   │   └── wecom.py
│   │   └── gateway/
│   │       ├── __init__.py
│   │       ├── app.py
│   │       ├── config.py
│   │       ├── deps.py
│   │       ├── path_utils.py
│   │       ├── services.py
│   │       └── routers/
│   │           ├── __init__.py
│   │           ├── agents.py
│   │           ├── artifacts.py
│   │           ├── assistants_compat.py
│   │           ├── channels.py
│   │           ├── mcp.py
│   │           ├── memory.py
│   │           ├── models.py
│   │           ├── runs.py
│   │           ├── skills.py
│   │           ├── suggestions.py
│   │           ├── thread_runs.py
│   │           ├── threads.py
│   │           └── uploads.py
│   │
│   ├── docs/
│   │   ├── API.md
│   │   ├── APPLE_CONTAINER.md
│   │   ├── ARCHITECTURE.md
│   │   ├── AUTO_TITLE_GENERATION.md
│   │   ├── CONFIGURATION.md
│   │   ├── FILE_UPLOAD.md
│   │   ├── GUARDRAILS.md
│   │   ├── HARNESS_APP_SPLIT.md
│   │   ├── MCP_SERVER.md
│   │   ├── MEMORY_IMPROVEMENTS.md
│   │   ├── MEMORY_IMPROVEMENTS_SUMMARY.md
│   │   ├── MEMORY_SETTINGS_REVIEW.md
│   │   ├── PATH_EXAMPLES.md
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   ├── STREAMING.md
│   │   ├── TITLE_GENERATION_IMPLEMENTATION.md
│   │   ├── TODO.md
│   │   ├── memory-settings-sample.json
│   │   ├── middleware-execution-flow.md
│   │   ├── plan_mode_usage.md
│   │   ├── rfc-create-deerflow-agent.md
│   │   ├── rfc-extract-shared-modules.md
│   │   ├── rfc-grep-glob-tools.md
│   │   ├── summarization.md
│   │   └── task_tool_improvements.md
│   │
│   ├── packages/
│   │   └── harness/
│   │       ├── pyproject.toml
│   │       └── deerflow/
│   │           ├── __init__.py
│   │           ├── client.py
│   │           │
│   │           ├── agents/
│   │           │   ├── __init__.py
│   │           │   ├── factory.py                  # ★ create_deerflow_agent() SDK 工厂
│   │           │   ├── features.py                 # ★ RuntimeFeatures 声明式 Feature Flags
│   │           │   ├── thread_state.py             # ★ ThreadState 全局状态 + Reducer
│   │           │   │
│   │           │   ├── checkpointer/
│   │           │   │   ├── __init__.py
│   │           │   │   ├── async_provider.py
│   │           │   │   └── provider.py
│   │           │   │
│   │           │   ├── lead_agent/
│   │           │   │   ├── __init__.py
│   │           │   │   ├── agent.py                # ★ make_lead_agent() 主控入口
│   │           │   │   └── prompt.py               # ★ SYSTEM_PROMPT + Skills/Memory 注入
│   │           │   │
│   │           │   ├── memory/
│   │           │   │   ├── __init__.py
│   │           │   │   ├── prompt.py
│   │           │   │   ├── queue.py
│   │           │   │   ├── storage.py
│   │           │   │   └── updater.py
│   │           │   │
│   │           │   └── middlewares/
│   │           │       ├── __init__.py
│   │           │       ├── clarification_middleware.py  # ★ HITL 中断 (Command goto=END)
│   │           │       ├── dangling_tool_call_middleware.py
│   │           │       ├── deferred_tool_filter_middleware.py
│   │           │       ├── llm_error_handling_middleware.py
│   │           │       ├── loop_detection_middleware.py
│   │           │       ├── memory_middleware.py
│   │           │       ├── sandbox_audit_middleware.py
│   │           │       ├── subagent_limit_middleware.py
│   │           │       ├── thread_data_middleware.py
│   │           │       ├── title_middleware.py
│   │           │       ├── todo_middleware.py
│   │           │       ├── token_usage_middleware.py
│   │           │       ├── tool_error_handling_middleware.py
│   │           │       ├── uploads_middleware.py
│   │           │       └── view_image_middleware.py
│   │           │
│   │           ├── community/
│   │           │   ├── aio_sandbox/
│   │           │   │   ├── __init__.py
│   │           │   │   ├── aio_sandbox.py
│   │           │   │   ├── aio_sandbox_provider.py
│   │           │   │   ├── backend.py
│   │           │   │   ├── local_backend.py
│   │           │   │   ├── remote_backend.py
│   │           │   │   └── sandbox_info.py
│   │           │   ├── ddg_search/
│   │           │   │   ├── __init__.py
│   │           │   │   └── tools.py
│   │           │   ├── exa/
│   │           │   │   └── tools.py
│   │           │   ├── firecrawl/
│   │           │   │   └── tools.py
│   │           │   ├── image_search/
│   │           │   │   ├── __init__.py
│   │           │   │   └── tools.py
│   │           │   ├── infoquest/
│   │           │   │   ├── infoquest_client.py
│   │           │   │   └── tools.py
│   │           │   ├── jina_ai/
│   │           │   │   ├── jina_client.py
│   │           │   │   └── tools.py
│   │           │   └── tavily/
│   │           │       └── tools.py
│   │           │
│   │           ├── config/
│   │           │   ├── __init__.py
│   │           │   ├── acp_config.py
│   │           │   ├── agents_config.py
│   │           │   ├── app_config.py               # ★ 主配置入口
│   │           │   ├── checkpointer_config.py
│   │           │   ├── extensions_config.py
│   │           │   ├── guardrails_config.py
│   │           │   ├── memory_config.py
│   │           │   ├── model_config.py
│   │           │   ├── paths.py
│   │           │   ├── sandbox_config.py
│   │           │   ├── skill_evolution_config.py
│   │           │   ├── skills_config.py
│   │           │   ├── stream_bridge_config.py
│   │           │   ├── subagents_config.py
│   │           │   ├── summarization_config.py
│   │           │   ├── title_config.py
│   │           │   ├── token_usage_config.py
│   │           │   ├── tool_config.py
│   │           │   ├── tool_search_config.py
│   │           │   └── tracing_config.py
│   │           │
│   │           ├── guardrails/
│   │           │   ├── __init__.py
│   │           │   ├── builtin.py
│   │           │   ├── middleware.py
│   │           │   └── provider.py
│   │           │
│   │           ├── mcp/
│   │           │   ├── __init__.py
│   │           │   ├── cache.py
│   │           │   ├── client.py
│   │           │   ├── oauth.py
│   │           │   └── tools.py
│   │           │
│   │           ├── models/
│   │           │   ├── __init__.py
│   │           │   ├── claude_provider.py
│   │           │   ├── credential_loader.py
│   │           │   ├── factory.py                  # ★ create_chat_model()
│   │           │   ├── openai_codex_provider.py
│   │           │   ├── patched_deepseek.py
│   │           │   ├── patched_minimax.py
│   │           │   ├── patched_openai.py
│   │           │   └── vllm_provider.py
│   │           │
│   │           ├── reflection/
│   │           │   ├── __init__.py
│   │           │   └── resolvers.py
│   │           │
│   │           ├── runtime/
│   │           │   ├── __init__.py
│   │           │   ├── serialization.py
│   │           │   ├── runs/
│   │           │   │   ├── __init__.py
│   │           │   │   ├── manager.py
│   │           │   │   ├── schemas.py
│   │           │   │   └── worker.py
│   │           │   ├── store/
│   │           │   │   ├── __init__.py
│   │           │   │   ├── _sqlite_utils.py
│   │           │   │   ├── async_provider.py
│   │           │   │   └── provider.py
│   │           │   └── stream_bridge/
│   │           │       ├── __init__.py
│   │           │       ├── async_provider.py
│   │           │       ├── base.py
│   │           │       └── memory.py
│   │           │
│   │           ├── sandbox/
│   │           │   ├── __init__.py
│   │           │   ├── exceptions.py
│   │           │   ├── file_operation_lock.py
│   │           │   ├── middleware.py
│   │           │   ├── sandbox.py
│   │           │   ├── sandbox_provider.py
│   │           │   ├── search.py
│   │           │   ├── security.py
│   │           │   ├── tools.py
│   │           │   └── local/
│   │           │       ├── __init__.py
│   │           │       ├── list_dir.py
│   │           │       ├── local_sandbox.py
│   │           │       └── local_sandbox_provider.py
│   │           │
│   │           ├── skills/
│   │           │   ├── __init__.py
│   │           │   ├── installer.py
│   │           │   ├── loader.py                   # ★ load_skills() 扫描目录
│   │           │   ├── manager.py
│   │           │   ├── parser.py                   # ★ parse_skill_file() 解析 YAML frontmatter
│   │           │   ├── security_scanner.py
│   │           │   ├── types.py                    # ★ Skill dataclass
│   │           │   └── validation.py
│   │           │
│   │           ├── subagents/
│   │           │   ├── __init__.py
│   │           │   ├── config.py
│   │           │   ├── executor.py                 # ★ SubagentExecutor 线程池执行
│   │           │   ├── registry.py
│   │           │   └── builtins/
│   │           │       ├── __init__.py
│   │           │       ├── bash_agent.py
│   │           │       └── general_purpose.py
│   │           │
│   │           ├── tools/
│   │           │   ├── __init__.py
│   │           │   ├── skill_manage_tool.py
│   │           │   ├── tools.py                    # ★ get_available_tools()
│   │           │   └── builtins/
│   │           │       ├── __init__.py
│   │           │       ├── clarification_tool.py   # ★ ask_clarification (HITL)
│   │           │       ├── invoke_acp_agent_tool.py
│   │           │       ├── present_file_tool.py
│   │           │       ├── setup_agent_tool.py
│   │           │       ├── task_tool.py
│   │           │       ├── tool_search.py
│   │           │       └── view_image_tool.py
│   │           │
│   │           ├── tracing/
│   │           │   ├── __init__.py
│   │           │   └── factory.py
│   │           │
│   │           ├── uploads/
│   │           │   ├── __init__.py
│   │           │   └── manager.py
│   │           │
│   │           └── utils/
│   │               ├── file_conversion.py
│   │               ├── network.py
│   │               └── readability.py
│   │
│   └── tests/
│       ├── conftest.py
│       ├── test_acp_config.py
│       ├── test_aio_sandbox.py
│       ├── test_aio_sandbox_local_backend.py
│       ├── test_aio_sandbox_provider.py
│       ├── test_app_config_reload.py
│       ├── test_artifacts_router.py
│       ├── test_channel_file_attachments.py
│       ├── test_channels.py
│       ├── test_checkpointer.py
│       ├── test_checkpointer_none_fix.py
│       ├── test_clarification_middleware.py
│       ├── test_claude_provider_oauth_billing.py
│       ├── test_cli_auth_providers.py
│       ├── test_client.py
│       ├── test_client_e2e.py
│       ├── test_client_live.py
│       ├── test_codex_provider.py
│       ├── test_config_version.py
│       ├── test_create_deerflow_agent.py
│       ├── test_create_deerflow_agent_live.py
│       ├── test_credential_loader.py
│       ├── test_custom_agent.py
│       ├── test_dangling_tool_call_middleware.py
│       ├── test_discord_channel.py
│       ├── test_docker_sandbox_mode_detection.py
│       ├── test_doctor.py
│       ├── test_exa_tools.py
│       ├── test_feishu_parser.py
│       ├── test_file_conversion.py
│       ├── test_firecrawl_tools.py
│       ├── test_gateway_services.py
│       ├── test_guardrail_middleware.py
│       ├── test_harness_boundary.py
│       ├── test_infoquest_client.py
│       ├── test_invoke_acp_agent_tool.py
│       ├── test_jina_client.py
│       ├── test_lead_agent_model_resolution.py
│       ├── test_lead_agent_prompt.py
│       ├── test_lead_agent_skills.py
│       ├── test_llm_error_handling_middleware.py
│       ├── test_local_bash_tool_loading.py
│       ├── test_local_sandbox_encoding.py
│       ├── test_local_sandbox_provider_mounts.py
│       ├── test_loop_detection_middleware.py
│       ├── test_mcp_client_config.py
│       ├── test_mcp_oauth.py
│       ├── test_mcp_sync_wrapper.py
│       ├── test_memory_prompt_injection.py
│       ├── test_memory_queue.py
│       ├── test_memory_router.py
│       ├── test_memory_storage.py
│       ├── test_memory_updater.py
│       ├── test_memory_upload_filtering.py
│       ├── test_model_config.py
│       ├── test_model_factory.py
│       ├── test_patched_deepseek.py
│       ├── test_patched_minimax.py
│       ├── test_patched_openai.py
│       ├── test_present_file_tool_core_logic.py
│       ├── test_provisioner_kubeconfig.py
│       ├── test_provisioner_pvc_volumes.py
│       ├── test_readability.py
│       ├── test_reflection_resolvers.py
│       ├── test_run_manager.py
│       ├── test_run_worker_rollback.py
│       ├── test_sandbox_audit_middleware.py
│       ├── test_sandbox_orphan_reconciliation.py
│       ├── test_sandbox_orphan_reconciliation_e2e.py
│       ├── test_sandbox_search_tools.py
│       ├── test_sandbox_tools_security.py
│       ├── test_security_scanner.py
│       ├── test_serialization.py
│       ├── test_serialize_message_content.py
│       ├── test_setup_wizard.py
│       ├── test_skill_manage_tool.py
│       ├── test_skills_archive_root.py
│       ├── test_skills_custom_router.py
│       ├── test_skills_installer.py
│       ├── test_skills_loader.py
│       ├── test_skills_parser.py
│       ├── test_skills_validation.py
│       ├── test_sse_format.py
│       ├── test_stream_bridge.py
│       ├── test_subagent_executor.py
│       ├── test_subagent_limit_middleware.py
│       ├── test_subagent_prompt_security.py
│       ├── test_subagent_timeout_config.py
│       ├── test_suggestions_router.py
│       ├── test_task_tool_core_logic.py
│       ├── test_thread_data_middleware.py
│       ├── test_threads_router.py
│       ├── test_title_generation.py
│       ├── test_title_middleware_core_logic.py
│       ├── test_todo_middleware.py
│       ├── test_token_usage.py
│       ├── test_tool_error_handling_middleware.py
│       ├── test_tool_output_truncation.py
│       ├── test_tool_search.py
│       ├── test_tracing_config.py
│       ├── test_tracing_factory.py
│       ├── test_uploads_manager.py
│       ├── test_uploads_middleware_core_logic.py
│       ├── test_uploads_router.py
│       ├── test_vllm_provider.py
│       └── test_wechat_channel.py
│
├── docker/
│   ├── docker-compose.yaml
│   ├── docker-compose-dev.yaml
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── nginx.local.conf
│   └── provisioner/
│       ├── Dockerfile
│       ├── README.md
│       └── app.py
│
├── docs/
│   ├── CODE_CHANGE_SUMMARY_BY_FILE.md
│   ├── SKILL_NAME_CONFLICT_FIX.md
│   ├── plans/
│   │   └── 2026-04-01-langfuse-tracing.md
│   └── pr-evidence/
│       ├── session-skill-manage-e2e-20260406-202745.png
│       └── skill-manage-e2e-20260406-194030.png
│
├── frontend/
│   ├── .env.example
│   ├── .gitignore
│   ├── .npmrc
│   ├── .prettierignore
│   ├── .vscode/
│   │   └── settings.json
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── Dockerfile
│   ├── Makefile
│   ├── README.md
│   ├── components.json
│   ├── eslint.config.js
│   ├── next.config.js
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   ├── postcss.config.js
│   ├── prettier.config.js
│   ├── scripts/
│   │   └── save-demo.js
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── images/
│   │   │   ├── deer.svg
│   │   │   ├── 21cfea46-34bd-4aa6-9e1f-3009452fbeb9.jpg
│   │   │   ├── 3823e443-4e2b-4679-b496-a9506eae462b.jpg
│   │   │   ├── 4f3e55ee-f853-43db-bfb3-7d1a411f03cb.jpg
│   │   │   ├── 7cfa5f8f-a2f8-47ad-acbd-da7137baf990.jpg
│   │   │   ├── ad76c455-5bf9-4335-8517-fc03834ab828.jpg
│   │   │   └── d3e5adaf-084c-4dd5-9d29-94f1d6bccd98.jpg
│   │   └── demo/
│   │       └── threads/
│   │           ├── 21cfea46-.../thread.json + user-data/outputs/doraemon-moe-comic.jpg
│   │           ├── 3823e443-.../thread.json + user-data/outputs/fei-fei-li-podcast-timeline.md
│   │           ├── 4f3e55ee-.../thread.json + user-data/outputs/darcy-proposal-*.{jpg,mp4}
│   │           ├── 5aa47db1-.../thread.json + user-data/outputs/jiangsu-football/{html,css,js}
│   │           ├── 7cfa5f8f-.../thread.json + user-data/outputs/{html,css,js}
│   │           ├── 7f9dc56c-.../thread.json + user-data/outputs/leica-*.jpg + .md
│   │           ├── 90040b36-.../thread.json + user-data/outputs/american-woman-*.jpg
│   │           ├── ad76c455-.../thread.json + user-data/outputs/titanic_summary.txt + visualizations/
│   │           ├── b83fbb2a-.../thread.json + user-data/outputs/caren-*.jpg + index.html
│   │           ├── c02bb4d5-.../thread.json + user-data/outputs/{html,css,js}
│   │           ├── d3e5adaf-.../thread.json + user-data/outputs/diana_hu_research.md
│   │           ├── f4125791-.../thread.json + user-data/outputs/index.html
│   │           └── fe3f7974-.../thread.json + user-data/outputs/index.html + research_*.md
│   │
│   └── src/
│       ├── env.js
│       ├── mdx-components.ts
│       ├── styles/
│       │   └── globals.css
│       ├── lib/
│       │   ├── ime.ts
│       │   └── utils.ts
│       ├── hooks/
│       │   ├── use-global-shortcuts.ts
│       │   └── use-mobile.ts
│       ├── typings/
│       │   └── md.d.ts
│       ├── server/
│       │   └── better-auth/
│       │       ├── client.ts
│       │       ├── config.ts
│       │       ├── index.ts
│       │       └── server.ts
│       │
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── [lang]/
│       │   │   └── docs/
│       │   │       ├── layout.tsx
│       │   │       └── [[...mdxPath]]/
│       │   │           └── page.tsx
│       │   ├── api/
│       │   │   ├── auth/[...all]/route.ts
│       │   │   └── memory/
│       │   │       ├── route.ts
│       │   │       └── [...path]/route.ts
│       │   ├── blog/
│       │   │   ├── layout.tsx
│       │   │   ├── [[...mdxPath]]/page.tsx
│       │   │   ├── posts/page.tsx
│       │   │   └── tags/[tag]/page.tsx
│       │   ├── mock/api/
│       │   │   ├── mcp/config/route.ts
│       │   │   ├── models/route.ts
│       │   │   ├── skills/route.ts
│       │   │   └── threads/
│       │   │       ├── search/route.ts
│       │   │       └── [thread_id]/
│       │   │           ├── artifacts/[[...artifact_path]]/route.ts
│       │   │           └── history/route.ts
│       │   └── workspace/
│       │       ├── layout.tsx
│       │       ├── page.tsx
│       │       ├── chats/
│       │       │   ├── page.tsx
│       │       │   └── [thread_id]/
│       │       │       ├── layout.tsx
│       │       │       └── page.tsx
│       │       └── agents/
│       │           ├── page.tsx
│       │           ├── new/page.tsx
│       │           └── [agent_name]/chats/[thread_id]/
│       │               ├── layout.tsx
│       │               └── page.tsx
│       │
│       ├── components/
│       │   ├── query-client-provider.tsx
│       │   ├── theme-provider.tsx
│       │   ├── ai-elements/
│       │   │   ├── artifact.tsx
│       │   │   ├── canvas.tsx
│       │   │   ├── chain-of-thought.tsx
│       │   │   ├── checkpoint.tsx
│       │   │   ├── code-block.tsx
│       │   │   ├── connection.tsx
│       │   │   ├── context.tsx
│       │   │   ├── controls.tsx
│       │   │   ├── conversation.tsx
│       │   │   ├── edge.tsx
│       │   │   ├── image.tsx
│       │   │   ├── loader.tsx
│       │   │   ├── message.tsx
│       │   │   ├── model-selector.tsx
│       │   │   ├── node.tsx
│       │   │   ├── open-in-chat.tsx
│       │   │   ├── panel.tsx
│       │   │   ├── plan.tsx
│       │   │   ├── prompt-input.tsx
│       │   │   ├── queue.tsx
│       │   │   ├── reasoning.tsx
│       │   │   ├── shimmer.tsx
│       │   │   ├── sources.tsx
│       │   │   ├── suggestion.tsx
│       │   │   ├── task.tsx
│       │   │   ├── toolbar.tsx
│       │   │   └── web-preview.tsx
│       │   ├── landing/
│       │   │   ├── footer.tsx
│       │   │   ├── header.tsx
│       │   │   ├── hero.tsx
│       │   │   ├── post-list.tsx
│       │   │   ├── progressive-skills-animation.tsx
│       │   │   ├── section.tsx
│       │   │   └── sections/
│       │   │       ├── case-study-section.tsx
│       │   │       ├── community-section.tsx
│       │   │       ├── sandbox-section.tsx
│       │   │       ├── skills-section.tsx
│       │   │       └── whats-new-section.tsx
│       │   ├── ui/
│       │   │   ├── alert.tsx
│       │   │   ├── aurora-text.tsx
│       │   │   ├── avatar.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── breadcrumb.tsx
│       │   │   ├── button.tsx
│       │   │   ├── button-group.tsx
│       │   │   ├── card.tsx
│       │   │   ├── carousel.tsx
│       │   │   ├── collapsible.tsx
│       │   │   ├── command.tsx
│       │   │   ├── confetti-button.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── dropdown-menu.tsx
│       │   │   ├── empty.tsx
│       │   │   ├── flickering-grid.tsx
│       │   │   ├── galaxy.css
│       │   │   ├── galaxy.jsx
│       │   │   ├── hover-card.tsx
│       │   │   ├── input.tsx
│       │   │   ├── input-group.tsx
│       │   │   ├── item.tsx
│       │   │   ├── magic-bento.css
│       │   │   ├── magic-bento.tsx
│       │   │   ├── number-ticker.tsx
│       │   │   ├── progress.tsx
│       │   │   ├── resizable.tsx
│       │   │   ├── scroll-area.tsx
│       │   │   ├── select.tsx
│       │   │   ├── separator.tsx
│       │   │   ├── sheet.tsx
│       │   │   ├── shine-border.tsx
│       │   │   ├── sidebar.tsx
│       │   │   ├── skeleton.tsx
│       │   │   ├── sonner.tsx
│       │   │   ├── spotlight-card.css
│       │   │   ├── spotlight-card.tsx
│       │   │   ├── switch.tsx
│       │   │   ├── tabs.tsx
│       │   │   ├── terminal.tsx
│       │   │   ├── textarea.tsx
│       │   │   ├── toggle.tsx
│       │   │   ├── toggle-group.tsx
│       │   │   ├── tooltip.tsx
│       │   │   └── word-rotate.tsx
│       │   └── workspace/
│       │       ├── agent-welcome.tsx
│       │       ├── code-editor.tsx
│       │       ├── command-palette.tsx
│       │       ├── copy-button.tsx
│       │       ├── export-trigger.tsx
│       │       ├── flip-display.tsx
│       │       ├── github-icon.tsx
│       │       ├── input-box.tsx
│       │       ├── mode-hover-guide.tsx
│       │       ├── overscroll.tsx
│       │       ├── recent-chat-list.tsx
│       │       ├── streaming-indicator.tsx
│       │       ├── thread-title.tsx
│       │       ├── todo-list.tsx
│       │       ├── token-usage-indicator.tsx
│       │       ├── tooltip.tsx
│       │       ├── welcome.tsx
│       │       ├── workspace-container.tsx
│       │       ├── workspace-header.tsx
│       │       ├── workspace-nav-chat-list.tsx
│       │       ├── workspace-nav-menu.tsx
│       │       ├── workspace-sidebar.tsx
│       │       ├── agents/
│       │       │   ├── agent-card.tsx
│       │       │   └── agent-gallery.tsx
│       │       ├── artifacts/
│       │       │   ├── artifact-file-detail.tsx
│       │       │   ├── artifact-file-list.tsx
│       │       │   ├── artifact-trigger.tsx
│       │       │   ├── context.tsx
│       │       │   └── index.ts
│       │       ├── chats/
│       │       │   ├── chat-box.tsx
│       │       │   ├── index.ts
│       │       │   ├── use-chat-mode.ts
│       │       │   └── use-thread-chat.ts
│       │       ├── citations/
│       │       │   ├── artifact-link.tsx
│       │       │   └── citation-link.tsx
│       │       ├── messages/
│       │       │   ├── context.ts
│       │       │   ├── index.ts
│       │       │   ├── markdown-content.tsx
│       │       │   ├── message-group.tsx
│       │       │   ├── message-list-item.tsx
│       │       │   ├── message-list.tsx
│       │       │   ├── skeleton.tsx
│       │       │   └── subtask-card.tsx
│       │       └── settings/
│       │           ├── about-content.ts
│       │           ├── about-settings-page.tsx
│       │           ├── about.md
│       │           ├── appearance-settings-page.tsx
│       │           ├── index.ts
│       │           ├── memory-settings-page.tsx
│       │           ├── notification-settings-page.tsx
│       │           ├── settings-dialog.tsx
│       │           ├── settings-section.tsx
│       │           ├── skill-settings-page.tsx
│       │           └── tool-settings-page.tsx
│       │
│       ├── content/
│       │   ├── en/
│       │   │   ├── _meta.ts
│       │   │   ├── index.mdx
│       │   │   ├── application/
│       │   │   │   ├── _meta.ts
│       │   │   │   ├── agents-and-threads.mdx
│       │   │   │   ├── configuration.mdx
│       │   │   │   ├── deployment-guide.mdx
│       │   │   │   ├── index.mdx
│       │   │   │   ├── operations-and-troubleshooting.mdx
│       │   │   │   ├── quick-start.mdx
│       │   │   │   └── workspace-usage.mdx
│       │   │   ├── harness/
│       │   │   │   ├── _meta.ts
│       │   │   │   ├── configuration.mdx
│       │   │   │   ├── customization.mdx
│       │   │   │   ├── design-principles.mdx
│       │   │   │   ├── index.mdx
│       │   │   │   ├── integration-guide.mdx
│       │   │   │   ├── memory.mdx
│       │   │   │   ├── quick-start.mdx
│       │   │   │   ├── sandbox.mdx
│       │   │   │   ├── skills.mdx
│       │   │   │   └── tools.mdx
│       │   │   ├── introduction/
│       │   │   │   ├── _meta.ts
│       │   │   │   ├── core-concepts.mdx
│       │   │   │   ├── harness-vs-app.mdx
│       │   │   │   └── why-deerflow.mdx
│       │   │   ├── posts/
│       │   │   │   ├── _meta.ts
│       │   │   │   └── weekly/2026-04-06.mdx
│       │   │   ├── reference/
│       │   │   │   ├── _meta.ts
│       │   │   │   ├── api-gateway-reference.mdx
│       │   │   │   ├── concepts-glossary.mdx
│       │   │   │   ├── configuration-reference.mdx
│       │   │   │   ├── runtime-flags-and-modes.mdx
│       │   │   │   └── source-map.mdx
│       │   │   └── tutorials/
│       │   │       ├── _meta.ts
│       │   │       ├── create-your-first-harness.mdx
│       │   │       ├── deploy-your-own-deerflow.mdx
│       │   │       ├── first-conversation.mdx
│       │   │       ├── use-tools-and-skills.mdx
│       │   │       └── work-with-memory.mdx
│       │   └── zh/
│       │       ├── _meta.ts
│       │       ├── index.mdx
│       │       └── posts/
│       │           ├── _meta.ts
│       │           ├── releases/2_0_rc.mdx
│       │           └── weekly/2026-04-06.mdx
│       │
│       ├── core/
│       │   ├── agents/
│       │   │   ├── api.ts
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   └── types.ts
│       │   ├── api/
│       │   │   ├── api-client.ts
│       │   │   ├── index.ts
│       │   │   └── stream-mode.ts
│       │   ├── artifacts/
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   ├── loader.ts
│       │   │   └── utils.ts
│       │   ├── blog/
│       │   │   └── index.ts
│       │   ├── config/
│       │   │   └── index.ts
│       │   ├── i18n/
│       │   │   ├── context.tsx
│       │   │   ├── cookies.ts
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   ├── locale.ts
│       │   │   ├── server.ts
│       │   │   ├── translations.ts
│       │   │   └── locales/
│       │   │       ├── en-US.ts
│       │   │       ├── index.ts
│       │   │       ├── types.ts
│       │   │       └── zh-CN.ts
│       │   ├── mcp/
│       │   │   ├── api.ts
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   └── types.ts
│       │   ├── memory/
│       │   │   ├── api.ts
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   └── types.ts
│       │   ├── messages/
│       │   │   ├── usage.ts
│       │   │   └── utils.ts
│       │   ├── models/
│       │   │   ├── api.ts
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   └── types.ts
│       │   ├── notification/
│       │   │   └── hooks.ts
│       │   ├── rehype/
│       │   │   └── index.ts
│       │   ├── settings/
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   ├── local.ts
│       │   │   └── store.ts
│       │   ├── skills/
│       │   │   ├── api.ts
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   └── type.ts
│       │   ├── streamdown/
│       │   │   ├── index.ts
│       │   │   └── plugins.ts
│       │   ├── tasks/
│       │   │   ├── context.tsx
│       │   │   ├── index.ts
│       │   │   └── types.ts
│       │   ├── threads/
│       │   │   ├── export.ts
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   ├── types.ts
│       │   │   └── utils.ts
│       │   ├── todos/
│       │   │   ├── index.ts
│       │   │   └── types.ts
│       │   ├── tools/
│       │   │   └── utils.ts
│       │   ├── uploads/
│       │   │   ├── api.ts
│       │   │   ├── file-validation.ts
│       │   │   ├── hooks.ts
│       │   │   ├── index.ts
│       │   │   └── prompt-input-files.ts
│       │   └── utils/
│       │       ├── datetime.ts
│       │       ├── files.tsx
│       │       ├── json.ts
│       │       ├── markdown.ts
│       │       └── uuid.ts
│       │
│       └── (pr-build/ directory omitted — PR build artifacts)
│
├── pr-build/                                     # PR 构建产物
│
└── skills/
    └── public/
        ├── academic-paper-review/
        │   └── SKILL.md
        ├── bootstrap/
        │   ├── SKILL.md
        │   ├── references/
        │   │   └── conversation-guide.md
        │   └── templates/
        │       └── SOUL.template.md
        ├── chart-visualization/
        │   ├── SKILL.md
        │   ├── scripts/
        │   │   └── generate.js
        │   └── references/
        │       ├── generate_area_chart.md
        │       ├── generate_bar_chart.md
        │       ├── generate_boxplot_chart.md
        │       ├── generate_column_chart.md
        │       ├── generate_district_map.md
        │       ├── generate_dual_axes_chart.md
        │       ├── generate_fishbone_diagram.md
        │       ├── generate_flow_diagram.md
        │       ├── generate_funnel_chart.md
        │       ├── generate_histogram_chart.md
        │       ├── generate_line_chart.md
        │       ├── generate_liquid_chart.md
        │       ├── generate_mind_map.md
        │       ├── generate_network_graph.md
        │       ├── generate_organization_chart.md
        │       ├── generate_path_map.md
        │       ├── generate_pie_chart.md
        │       ├── generate_pin_map.md
        │       ├── generate_radar_chart.md
        │       ├── generate_sankey_chart.md
        │       ├── generate_scatter_chart.md
        │       ├── generate_spreadsheet.md
        │       ├── generate_treemap_chart.md
        │       ├── generate_venn_chart.md
        │       ├── generate_violin_chart.md
        │       └── generate_word_cloud_chart.md
        ├── claude-to-deerflow/
        │   ├── SKILL.md
        │   └── scripts/
        │       ├── chat.sh
        │       └── status.sh
        ├── code-documentation/
        │   └── SKILL.md
        ├── consulting-analysis/
        │   └── SKILL.md
        ├── data-analysis/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── analyze.py
        ├── deep-research/
        │   └── SKILL.md
        ├── find-skills/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── install-skill.sh
        ├── frontend-design/
        │   ├── SKILL.md
        │   └── LICENSE.txt
        ├── github-deep-research/
        │   ├── SKILL.md
        │   ├── assets/
        │   │   └── report_template.md
        │   └── scripts/
        │       └── github_api.py
        ├── image-generation/
        │   ├── SKILL.md
        │   ├── scripts/
        │   │   └── generate.py
        │   └── templates/
        │       └── doraemon.md
        ├── newsletter-generation/
        │   └── SKILL.md
        ├── podcast-generation/
        │   ├── SKILL.md
        │   ├── scripts/
        │   │   └── generate.py
        │   └── templates/
        │       └── tech-explainer.md
        ├── ppt-generation/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── generate.py
        ├── skill-creator/
        │   ├── SKILL.md
        │   ├── LICENSE.txt
        │   ├── agents/
        │   │   ├── analyzer.md
        │   │   ├── comparator.md
        │   │   └── grader.md
        │   ├── assets/
        │   │   └── eval_review.html
        │   ├── eval-viewer/
        │   │   ├── generate_review.py
        │   │   └── viewer.html
        │   ├── references/
        │   │   ├── output-patterns.md
        │   │   ├── schemas.md
        │   │   └── workflows.md
        │   └── scripts/
        │       ├── aggregate_benchmark.py
        │       ├── generate_report.py
        │       ├── improve_description.py
        │       ├── init_skill.py
        │       ├── package_skill.py
        │       ├── quick_validate.py
        │       ├── run_eval.py
        │       ├── run_loop.py
        │       └── utils.py
        ├── surprise-me/
        │   └── SKILL.md
        ├── systematic-literature-review/
        │   ├── SKILL.md
        │   ├── evals/
        │   │   ├── evals.json
        │   │   └── trigger_eval_set.json
        │   ├── scripts/
        │   │   └── arxiv_search.py
        │   └── templates/
        │       ├── apa.md
        │       ├── bibtex.md
        │       └── ieee.md
        ├── vercel-deploy-claimable/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── deploy.sh
        ├── video-generation/
        │   ├── SKILL.md
        │   └── scripts/
        │       └── generate.py
        └── web-design-guidelines/
            └── SKILL.md
```

## 目录统计

| 模块 | Python 文件 | TypeScript/TSX 文件 | 其他 |
|------|------------|---------------------|------|
| backend/packages/harness/deerflow/ | ~120 | - | - |
| backend/app/ (Gateway + Channels) | ~34 | - | - |
| backend/tests/ | ~96 | - | - |
| frontend/src/ | - | ~180 | ~30 (.md/.css/.mdx) |
| skills/public/ | 6 (.py) | 2 (.js/.sh) | ~80 (.md) |
| **合计** | **~256** | **~182** | **~110** |
