#!/bin/bash
PROXY_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${GITLAB_PROXY_PORT:-3456}"
PID_FILE="$PROXY_DIR/.proxy.pid"
LOG_FILE="$PROXY_DIR/.proxy.log"

is_running() {
  if [ -f "$PID_FILE" ]; then
    kill -0 "$(cat "$PID_FILE")" 2>/dev/null && return 0
  fi
  curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1
}

start_proxy() {
  cd "$PROXY_DIR" || exit 1
  setsid npx tsx --env-file=.env src/server.ts > "$LOG_FILE" 2>&1 &
  disown $! 2>/dev/null
  echo $! > "$PID_FILE"
  for i in 1 2 3 4 5; do
    sleep 1
    if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
      return 0
    fi
  done
  echo "Failed to start proxy (check $LOG_FILE)" >&2
  return 1
}

case "${1:-}" in
  stop)
    [ -f "$PID_FILE" ] && kill "$(cat "$PID_FILE")" 2>/dev/null && rm -f "$PID_FILE"
    echo "Proxy stopped"
    ;;
  status)
    is_running && echo "Running (port $PORT)" || echo "Not running"
    ;;
  logs)
    tail -f "$LOG_FILE"
    ;;
  *)
    if is_running; then
      echo "Proxy already running on port $PORT"
    else
      echo "Starting GitLab Duo proxy..."
      start_proxy || exit 1
      echo "Proxy running on port $PORT"
    fi
    ;;
esac
