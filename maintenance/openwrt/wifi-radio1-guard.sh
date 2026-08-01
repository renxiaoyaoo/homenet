#!/bin/sh
PATH=/sbin:/bin:/usr/sbin:/usr/bin
TAG=wifi-radio1-guard
RADIO=radio1
LOCK=/tmp/wifi-radio1-guard.lock
LAST=/tmp/wifi-radio1-guard.last

[ "$(uci -q get wireless.radio1.disabled)" = "1" ] && exit 0

UPTIME="$(cut -d. -f1 /proc/uptime 2>/dev/null)"
[ -n "$UPTIME" ] && [ "$UPTIME" -lt 120 ] && exit 0

mkdir "$LOCK" 2>/dev/null || exit 0
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

bad=0
reason=""
status="$(wifi status "$RADIO" 2>/dev/null)"
echo "$status" | grep -q '"up": true' || { bad=1; reason="$reason radio1-not-up"; }
echo "$status" | grep -q '"retry_setup_failed": false' || { bad=1; reason="$reason retry-setup-failed"; }

if [ "$(uci -q get wireless.wifinet1.disabled)" != "1" ]; then
    iw dev wlan1 info 2>/dev/null | grep -q 'type AP' || { bad=1; reason="$reason wlan1-not-ap"; }
fi

if [ "$(uci -q get wireless.rx_relay_5g.disabled)" != "1" ]; then
    iw dev wlan1-2 info 2>/dev/null | grep -q 'type AP' || { bad=1; reason="$reason relay-not-ap"; }
fi

if [ "$bad" = "1" ]; then
    logger -t "$TAG" "radio1 unhealthy:$reason; restarting radio1"
    {
        date
        echo "unhealthy:$reason"
        echo "restarting radio1"
    } > "$LAST"
    wifi down "$RADIO"
    sleep 2
    wifi up "$RADIO"
    sleep 8
    wifi status "$RADIO" >> "$LAST" 2>&1
else
    {
        date
        echo "ok"
    } > "$LAST"
fi
