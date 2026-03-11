# GitLab Duo Proxy — Session Memory (2026-03-11)

## Repo
https://github.com/nano-step/gitlab-duo-proxy (transferred from kokorolx)
Local: `/Users/tamlh/workspaces/self/AI/Tools/gitlab-duo-proxy/`

## What
Node.js proxy translating both Anthropic Messages API and OpenAI Chat Completions API → GitLab Duo via `gitlab-ai-provider` v5.0.0.

## Endpoints
- `POST /v1/messages` — Anthropic format (for CCS/Claude Code)
- `POST /v1/chat/completions` — OpenAI format (streaming + non-streaming)
- `GET /v1/models` — list all 11 models + 29 aliases
- `GET /health` — health check

## Bugs Fixed
1. **PayloadTooLargeError**: `express.json({ limit: '50mb' })`. CCS sends ~20MB workspace context.
2. **AI_InvalidPromptError**: `extractSystem()` flattens array system prompt to string.
3. **Auth conflict**: `unset ANTHROPIC_API_KEY` in `ccs-gitlab.sh` wrapper.
4. **Zombie processes**: `setsid` + `disown` for daemonization. Kill by PID.
5. **Cross-container localhost**: `HOST=0.0.0.0` for flexibility.

## Models (11)
Anthropic: opus-4-6, sonnet-4-6, opus-4-5, sonnet-4-5, haiku-4-5
OpenAI: gpt-5-1, gpt-5-2, gpt-5-mini, gpt-5-codex, gpt-5-2-codex, gpt-5-3-codex
Plus 29 aliases (opus, sonnet, haiku, codex, etc.)

## Key Files
- `src/server.ts` — Express server, both endpoints
- `src/translate.ts` + `src/stream.ts` — Anthropic translation
- `src/openai-translate.ts` + `src/openai-stream.ts` — OpenAI translation
- `src/models.ts` — 11 models + 29 aliases
- `start.sh` — daemon manager, `ccs-gitlab.sh` — auto-start wrapper
- `~/.ccs/gitlab.settings.json` — CCS profile
- `/home/agent/.bashrc` — ccs() wrapper function

## Key Decisions
- `gitlab-ai-provider` v5.0.0 (renamed from `@gitlab/gitlab-ai-provider`)
- Auth: GitLab PAT (`glpat-*`) via `x-api-key` or `Authorization: Bearer` header
- Author: kokorolx, org: nano-step
