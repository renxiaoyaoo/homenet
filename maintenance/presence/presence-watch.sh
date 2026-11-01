#!/bin/sh
set -eu

. /etc/presence-watch.conf
export AP_NAME PRESENCE_MAC_MAP RECEIVER INACTIVE_LIMIT_MS

while true; do
  /root/presence-report.sh || true
  sleep 5
done
