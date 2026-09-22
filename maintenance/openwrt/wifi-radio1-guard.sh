#!/bin/sh
PATH=/sbin:/bin:/usr/sbin:/usr/bin
TAG=wifi-radio1-guard
RADIO=radio1
LOCK=/tmp/wifi-radio1-guard.lock
LAST=/tmp/wifi-radio1-guard.last
LAST_ATTEMPT=/tmp/wifi-radio1-guard.attempt

[ "$(uci -q get wireless.radio1.disabled)" = "1" ] && exit 0

UPTIME="$(cut -d. -f1 /proc/uptime 2>/dev/null)"
[ -n "$UPTIME" ] && [ "$UPTIME" -lt 120 ] && exit 0

mkdir "$LOCK" 2>/dev/null || exit 0
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

status="$(wifi status "$RADIO" 2>/dev/null)"
if echo "$status" | grep -q '"up": true' &&
    echo "$status" | grep -q '"retry_setup_failed": false'; then
    exit 0
fi

now="$(date +%s)"
previous="$(cat "$LAST_ATTEMPT" 2>/dev/null || echo 0)"
[ $((now - previous)) -lt 600 ] && exit 0
echo "$now" > "$LAST_ATTEMPT"

logger -t "$TAG" "radio1 failed to start; retrying wifi up radio1"
wifi up "$RADIO"
sleep 5
status="$(wifi status "$RADIO" 2>/dev/null)"
if echo "$status" | grep -q '"up": true' &&
    echo "$status" | grep -q '"retry_setup_failed": false'; then
    echo "$(date): radio1 recovered" > "$LAST"
    logger -t "$TAG" "radio1 recovered"
else
    echo "$(date): radio1 still down" > "$LAST"
    logger -t "$TAG" "radio1 still down; next retry in 10 minutes"
fi
