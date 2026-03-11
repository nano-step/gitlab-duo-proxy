# GitLab Duo Proxy

Local proxy server that exposes GitLab Duo AI models via standard Anthropic and OpenAI APIs — with built-in usage tracking and a real-time management dashboard.

## Features

- **Dual API Support** — Anthropic Messages API (`/v1/messages`) and OpenAI Chat Completions (`/v1/chat/completions`)
- **11 Models** — Claude (Opus 4.6, Sonnet 4.6/4.5, Haiku 4.5) + GPT-5 variants via GitLab Duo
- **Streaming & Non-Streaming** — SSE streaming in native format for each API, plus `"stream": false` for JSON responses
- **Proxy API Key** — Optional authentication layer to secure the proxy with a single key
- **Management Dashboard** — Real-time web dashboard at `/dashboard` with usage stats, per-model metrics, and request history
- **Usage Tracking** — In-memory request statistics: tokens, latency, success/error rates per model
- **Model Aliases** — Use `sonnet`, `opus`, `haiku`, `codex` shortcuts instead of full model names
- **Large Payloads** — 50MB request body limit for workspace context
- **CLIProxyAPI Compatible** — Works as an `openai-compatibility` provider in [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/nano-step/gitlab-duo-proxy.git
cd gitlab-duo-proxy
npm install

# 2. Configure
cp .env.example .env
# Edit .env — set your GITLAB_TOKEN and optionally PROXY_API_KEY

# 3. Run
npm run dev
```

The server starts on `http://localhost:3456`. Open `http://localhost:3456/dashboard` to see the management panel.

## Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `GITLAB_TOKEN` | — | **Required.** GitLab Personal Access Token (scope: `api`) |
| `GITLAB_INSTANCE_URL` | `https://gitlab.com` | GitLab instance URL |
| `PORT` | `3456` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `PROXY_API_KEY` | — | Optional. When set, all API requests must include this key |

### Getting a GitLab Token

1. Go to **GitLab → Settings → Access Tokens**
2. Create a token with the `api` scope
3. Add it to your `.env` file as `GITLAB_TOKEN`

## API Endpoints

### Health Check

```bash
curl http://localhost:3456/health
# {"status":"ok"}
```

### List Models

```bash
curl http://localhost:3456/v1/models
```

### Anthropic Messages API

```bash
curl -X POST http://localhost:3456/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $PROXY_API_KEY" \
  -d '{
    "model": "sonnet",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 200,
    "stream": false
  }'
```

### OpenAI Chat Completions API

```bash
curl -X POST http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -d '{
    "model": "sonnet",
    "messages": [
      {"role": "system", "content": "You are helpful."},
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 200,
    "stream": false
  }'
```

> Set `"stream": true` for Server-Sent Events streaming.

## Proxy Authentication

When `PROXY_API_KEY` is set in `.env`, all requests to `/v1/messages` and `/v1/chat/completions` must include the key via one of:

| Method | Header |
|--------|--------|
| Anthropic style | `x-api-key: <your-proxy-key>` |
| OpenAI style | `Authorization: Bearer <your-proxy-key>` |

The `/health`, `/v1/models`, and `/dashboard` endpoints remain public.

If `PROXY_API_KEY` is not set, the proxy operates without authentication (backward compatible).

## Management Dashboard

Access the real-time dashboard at:

```
http://localhost:3456/dashboard
```

The dashboard displays:

- **Summary Cards** — Total requests, success rate, total tokens, average latency
- **Model Table** — Per-model breakdown with request count, token usage, average latency, and error count (color-coded by provider: Anthropic/OpenAI)
- **Daily Activity Chart** — Bar chart showing requests per day over the last 14 days
- **Recent Requests** — Last 20 requests with timestamp, model, endpoint, status, tokens, and latency

Data auto-refreshes every 5 seconds. No external dependencies — everything is self-contained.

### Dashboard API

Raw JSON data is available at:

```bash
# Usage statistics snapshot
curl http://localhost:3456/dashboard/api/stats

# Model list with per-model stats
curl http://localhost:3456/dashboard/api/models
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

## CLIProxyAPI Integration

This proxy works as an `openai-compatibility` provider in [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI). Add to your `config.yaml`:

```yaml
openai-compatibility:
  - name: "gitlab-duo"
    base-url: "http://localhost:3456/v1"
    api-key-entries:
      - api-key: "your-proxy-api-key"
    models:
      - name: "duo-chat-sonnet-4-5"
        alias: "gitlab-sonnet"
      - name: "duo-chat-opus-4-6"
        alias: "gitlab-opus"
      - name: "duo-chat-haiku-4-5"
        alias: "gitlab-haiku"
      - name: "duo-chat-gpt-5-2-codex"
        alias: "gitlab-codex"
```

## Running as a Service

### Using start.sh (daemon mode)

```bash
chmod +x start.sh
./start.sh          # Start in background
./start.sh status   # Check status
./start.sh logs     # View logs
./start.sh stop     # Stop
```

### Using npm

```bash
npm run dev          # Development (tsx, auto-reload)
npm run build        # Compile TypeScript
npm start            # Production (compiled JS)
```

## Architecture

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│   Client    │────▶│   GitLab Duo Proxy  │────▶│  GitLab AI  │
│ (CCS/curl)  │◀────│    localhost:3456    │◀────│   Gateway   │
└─────────────┘     └─────────────────────┘     └─────────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
         /v1/messages   /v1/chat/      /dashboard
         (Anthropic)    completions    (Management UI)
                        (OpenAI)
```

## License

MIT
