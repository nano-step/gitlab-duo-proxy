#!/bin/bash
PROXY_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${GITLAB_PROXY_PORT:-3456}"

if ! curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  "$PROXY_DIR/start.sh" || exit 1
fi

unset ANTHROPIC_API_KEY
exec ccs gitlab "$@"
