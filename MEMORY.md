# GitLab Duo Proxy — Session Memory (2026-03-11)

## What
Node.js proxy translating Anthropic Messages API → GitLab Duo via `gitlab-ai-provider` v5.0.0.
Allows CCS to use GitLab Duo tokens as LLM provider.

## Bugs Fixed
1. **PayloadTooLargeError**: Express default 100KB → `express.json({ limit: '50mb' })`. CCS sends ~20MB workspace context.
2. **AI_InvalidPromptError**: CCS sends `system` as `[{type:"text",text:"..."}]`. Added `extractSystem()` to flatten to string.
3. **Auth conflict**: `ANTHROPIC_API_KEY` env conflicts with `ANTHROPIC_AUTH_TOKEN`. Fix: `unset ANTHROPIC_API_KEY` in `ccs-gitlab.sh`.
4. **Zombie processes**: `setsid` + `disown` for daemonization. Kill by PID from `ps aux`.
5. **Cross-container localhost**: Each container needs its own proxy instance. `HOST=0.0.0.0` for flexibility.

## Models (11)
Anthropic: opus-4-6, sonnet-4-6, opus-4-5, sonnet-4-5, haiku-4-5
OpenAI: gpt-5-1, gpt-5-2, gpt-5-mini, gpt-5-codex, gpt-5-2-codex, gpt-5-3-codex
Plus 29 aliases (opus, sonnet, haiku, codex, etc.)

## Key Decisions
- `gitlab-ai-provider` v5.0.0 (renamed from `@gitlab/gitlab-ai-provider` which is deprecated)
- Auth: GitLab PAT (`glpat-*`) via `x-api-key` header or `GITLAB_TOKEN` env var
- OpenSpec change: `openspec/changes/gitlab-duo-proxy/`
