#!/bin/sh
set -eu

AP_NAME="${AP_NAME:-main}"
RECEIVER="${RECEIVER:-http://192.168.50.5:9977/report}"
PRESENCE_MAC_MAP="${PRESENCE_MAC_MAP:-}"

INACTIVE_LIMIT_MS="${INACTIVE_LIMIT_MS:-120000}"

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

wget -qO- --timeout=5 "${RECEIVER}?ap=${AP_NAME}&clients=${PEOPLE}" >/dev/null
