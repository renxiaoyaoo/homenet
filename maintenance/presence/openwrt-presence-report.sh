#!/bin/sh
set -eu

AP_NAME="${AP_NAME:-main}"
RECEIVER="${RECEIVER:-http://presence-receiver.lan:9977/report}"
PRESENCE_MAC_MAP="${PRESENCE_MAC_MAP:-}"

INACTIVE_LIMIT_MS="${INACTIVE_LIMIT_MS:-120000}"
CHANGE_DELAY_SECONDS="${CHANGE_DELAY_SECONDS:-8}"
HEARTBEAT_SECONDS="${HEARTBEAT_SECONDS:-60}"
STATE_PREFIX="/tmp/presence-report-${AP_NAME}"
LOCK_DIR="${STATE_PREFIX}.lock"

mkdir "$LOCK_DIR" 2>/dev/null || exit 0
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT INT TERM

PEOPLE="$(iw dev 2>/dev/null | awk '
  /^[[:space:]]*Interface / { iface=$2 }
  /^[[:space:]]*type AP$/ && iface != "" { print iface }
' | while read -r iface; do
  iw dev "$iface" station dump 2>/dev/null | awk -v limit="$INACTIVE_LIMIT_MS" '
    /^Station / {
      mac=tolower($2)
      inactive=""
      next
    }
    /^[[:space:]]*inactive time:/ && mac != "" {
      inactive=$3
      if (inactive <= limit) print mac
      mac=""
    }
  '
done | awk -v mappings="$PRESENCE_MAC_MAP" '
  BEGIN {
    n=split(mappings, rows, ",")
    for (i=1; i<=n; i++) {
      split(rows[i], pair, "=")
      if (pair[1] != "" && pair[2] != "") names[tolower(pair[1])]=pair[2]
    }
  }
  names[$0] != "" { seen[names[$0]]=1 }
  END {
    first=1
    for (name in seen) {
      if (!first) printf "%%20"
      printf "%s", name
      first=0
    }
  }
')"

NOW="$(date +%s)"
OBSERVED_FILE="${STATE_PREFIX}.observed"
OBSERVED_AT_FILE="${STATE_PREFIX}.observed-at"
SENT_FILE="${STATE_PREFIX}.sent"
SENT_AT_FILE="${STATE_PREFIX}.sent-at"

OBSERVED="$(cat "$OBSERVED_FILE" 2>/dev/null || true)"
if [ "$PEOPLE" != "$OBSERVED" ]; then
  printf '%s' "$PEOPLE" >"$OBSERVED_FILE"
  printf '%s' "$NOW" >"$OBSERVED_AT_FILE"
fi

SENT="$(cat "$SENT_FILE" 2>/dev/null || true)"
SENT_AT="$(cat "$SENT_AT_FILE" 2>/dev/null || echo 0)"
OBSERVED_AT="$(cat "$OBSERVED_AT_FILE" 2>/dev/null || echo "$NOW")"

if [ -f "$SENT_FILE" ]; then
  if [ "$PEOPLE" != "$SENT" ] && [ $((NOW - OBSERVED_AT)) -lt "$CHANGE_DELAY_SECONDS" ]; then
    exit 0
  fi
  if [ "$PEOPLE" = "$SENT" ] && [ $((NOW - SENT_AT)) -lt "$HEARTBEAT_SECONDS" ]; then
    exit 0
  fi
fi

wget -qO- --timeout=5 "${RECEIVER}?ap=${AP_NAME}&clients=${PEOPLE}" >/dev/null
printf '%s' "$PEOPLE" >"$SENT_FILE"
printf '%s' "$NOW" >"$SENT_AT_FILE"
