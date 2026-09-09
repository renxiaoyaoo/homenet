#!/bin/sh
set -eu

SCRIPT_PATH="$(readlink -f "$0" 2>/dev/null || printf '%s' "$0")"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$SCRIPT_PATH")" && pwd)"
WORKSPACE="${HOMENET_WORKSPACE:-$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)}"
if [ -f "$WORKSPACE/docker-compose.yml" ]; then
  COMPOSE_FILE="$WORKSPACE/docker-compose.yml"
else
  COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
fi
SERVICE="homenet-ops"
URL="${HOMENET_OPS_URL:-http://127.0.0.1:9999}"

compose() {
  docker-compose -f "$COMPOSE_FILE" "$@"
}

usage() {
  cat <<EOF
Usage: homenet-ops <build|start|view|stop|restart|status|logs|url>

Commands:
  build    Build or rebuild the HomeNet Ops image
  start    Start existing HomeNet Ops image in background and print URL
  view     Start existing image in foreground; Ctrl-C stops the container
  stop     Stop HomeNet Ops
  restart  Restart in background
  status   Show container status
  logs     Follow logs
  url      Print dashboard URL
EOF
}

start() {
  compose up -d --no-build "$SERVICE"
  echo "HomeNet Ops: $URL"
}

view() {
  cleanup() {
    compose stop "$SERVICE" >/dev/null 2>&1 || true
  }
  trap cleanup INT TERM EXIT

  echo "HomeNet Ops: $URL"
  echo "Press Ctrl-C to stop."
  compose up --no-build "$SERVICE"
}

build() {
  compose build "$SERVICE"
}

stop() {
  compose stop "$SERVICE"
}

status() {
  compose ps "$SERVICE"
}

logs() {
  compose logs -f --tail=100 "$SERVICE"
}

case "${1:-}" in
  build)
    build
    ;;
  start)
    start
    ;;
  view)
    view
    ;;
  stop)
    stop
    ;;
  restart)
    stop >/dev/null 2>&1 || true
    start
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  url)
    echo "$URL"
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
