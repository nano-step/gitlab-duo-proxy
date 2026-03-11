# GitLab Duo Proxy

Local proxy server that exposes GitLab Duo AI models via standard Anthropic and OpenAI APIs.

## Features

- **Dual API Support**: Both Anthropic Messages API (`/v1/messages`) and OpenAI Chat Completions (`/v1/chat/completions`)
- **11 Models**: Claude (Opus, Sonnet, Haiku) + GPT-5 variants via GitLab Duo
- **Streaming**: Server-Sent Events in native format for each API
- **Large Payloads**: 50MB request body limit for workspace context
- **Model Aliases**: Use `sonnet`, `opus`, `haiku`, `codex` shortcuts

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
export GITLAB_TOKEN="glpat-your-token-here"

# 3. Run
npm run dev
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3456/health
```

### List Models
```bash
curl http://localhost:3456/v1/models
```

### Anthropic Messages API
```bash
curl -X POST http://localhost:3456/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $GITLAB_TOKEN" \
  -d '{
    "model": "sonnet",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100,
    "stream": true
  }'
```

### OpenAI Chat Completions API
```bash
curl -X POST http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GITLAB_TOKEN" \
  -d '{
    "model": "sonnet",
    "messages": [
      {"role": "system", "content": "You are helpful."},
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100,
    "stream": true
  }'
```

## Models

| Duo Model | Provider | Backend | Aliases |
|-----------|----------|---------|---------|
| duo-chat-opus-4-6 | Anthropic | claude-opus-4-6 | `opus`, `opus-4-6` |
| duo-chat-sonnet-4-6 | Anthropic | claude-sonnet-4-6 | `sonnet-4-6` |
| duo-chat-opus-4-5 | Anthropic | claude-opus-4-5-20251101 | `opus-4-5` |
| duo-chat-sonnet-4-5 | Anthropic | claude-sonnet-4-5-20250929 | `sonnet`, `sonnet-4-5` |
| duo-chat-haiku-4-5 | Anthropic | claude-haiku-4-5-20251001 | `haiku`, `haiku-4-5` |
| duo-chat-gpt-5-1 | OpenAI | gpt-5.1-2025-11-13 | `gpt-5.1`, `gpt-5-1` |
| duo-chat-gpt-5-2 | OpenAI | gpt-5.2-2025-12-11 | `gpt-5.2`, `gpt-5-2` |
| duo-chat-gpt-5-mini | OpenAI | gpt-5-mini-2025-08-07 | `gpt-5-mini` |
| duo-chat-gpt-5-codex | OpenAI | gpt-5-codex | `gpt-5-codex` |
| duo-chat-gpt-5-2-codex | OpenAI | gpt-5.2-codex | `codex`, `gpt-5.2-codex` |
| duo-chat-gpt-5-3-codex | OpenAI | gpt-5.3-codex | `gpt-5.3-codex` |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GITLAB_TOKEN` | - | GitLab Personal Access Token (required) |
| `GITLAB_INSTANCE_URL` | `https://gitlab.com` | GitLab instance URL |
| `PORT` | `3456` | Server port |
| `HOST` | `0.0.0.0` | Bind address |

## Authentication

Token can be provided via (in priority order):
1. `x-api-key` header
2. `Authorization: Bearer <token>` header
3. `GITLAB_TOKEN` environment variable

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Client    │────▶│  GitLab Duo     │────▶│  GitLab AI  │
│ (CCS/curl)  │◀────│     Proxy       │◀────│   Gateway   │
└─────────────┘     └─────────────────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         /v1/messages  /v1/chat/   /v1/models
         (Anthropic)   completions    (list)
                       (OpenAI)
```

## License

MIT
