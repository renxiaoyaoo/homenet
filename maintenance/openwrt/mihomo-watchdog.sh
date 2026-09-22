#!/bin/sh
set -eu

PI="${PI:-192.168.50.5}"
INTERVAL="${INTERVAL:-5}"
STATE="${STATE:-/tmp/mihomo-watchdog.state}"
ENV_FILE="${ENV_FILE:-/root/mihomo-watchdog.env}"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

TG_ENABLE="${TG_ENABLE:-0}"
TG_API_BASE_URL="${TG_API_BASE_URL:-api.telegram.org}"
TG_BOT_TOKEN="${TG_BOT_TOKEN:-}"
TG_CHAT_ID="${TG_CHAT_ID:-}"

tg_notify() {
  [ "$TG_ENABLE" = "1" ] || return 0
  [ -n "$TG_BOT_TOKEN" ] || return 0
  [ -n "$TG_CHAT_ID" ] || return 0

  curl -fsS --max-time 5 \
    -X POST "https://${TG_API_BASE_URL}/bot${TG_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TG_CHAT_ID}" \
    --data-urlencode "text=$1" \
    >/dev/null 2>&1 || true
}

set_dns_adguard() {
  uci -q delete dhcp.@dnsmasq[0].server
  uci add_list dhcp.@dnsmasq[0].server="$PI#53"
  uci set dhcp.@dnsmasq[0].noresolv='1'
  uci commit dhcp
  /etc/init.d/dnsmasq restart >/dev/null 2>&1
}

set_dns_direct() {
  uci -q delete dhcp.@dnsmasq[0].server
  uci add_list dhcp.@dnsmasq[0].server='119.29.29.29'
  uci add_list dhcp.@dnsmasq[0].server='223.5.5.5'
  uci set dhcp.@dnsmasq[0].noresolv='1'
  uci commit dhcp
  /etc/init.d/dnsmasq restart >/dev/null 2>&1
}

check_mihomo() {
  curl -fsS --max-time 2 \
    -o /dev/null -w "%{http_code}" \
    "http://$PI:9090/version" 2>/dev/null | grep -qE '^(200|401)$'
}

policy_enabled() {
  iptables -t mangle -S MIHOMO_POLICY >/dev/null 2>&1 &&
    iptables -t mangle -S PREROUTING 2>/dev/null | grep -q -- '-i br-lan -j MIHOMO_POLICY' &&
    ip route show table 100 2>/dev/null | grep -q "default via $PI"
}

wan_last_check=0
wan_failures=0
wan_last_redial=-1800

check_wan() {
  now="$(cut -d. -f1 /proc/uptime)"
  [ "$now" -ge 300 ] || return 0
  [ $((now - wan_last_check)) -ge 60 ] || return 0
  wan_last_check="$now"

  if [ "$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@.up' 2>/dev/null)" != "true" ]; then
    wan_failures=0
    return 0
  fi

  if ping -c1 -W2 223.5.5.5 >/dev/null 2>&1 ||
     ping -c1 -W2 119.29.29.29 >/dev/null 2>&1; then
    wan_failures=0
    return 0
  fi

  wan_failures=$((wan_failures + 1))
  if [ "$wan_failures" -ge 5 ] && [ $((now - wan_last_redial)) -ge 1800 ]; then
    logger -t mihomo-watchdog "WAN reports up but both direct probes failed; redialing WAN once"
    wan_last_redial="$now"
    wan_failures=0
    ifdown wan
    sleep 2
    ifup wan
  fi
}

while true; do
  if ping -c1 -W1 "$PI" >/dev/null 2>&1 && check_mihomo; then
    if [ "$(cat "$STATE" 2>/dev/null || true)" != "on" ] || ! policy_enabled; then
      logger "mihomo-watchdog: mihomo ok, enable proxy and adguard dns"
      /root/mihomo-policy-on.sh
      set_dns_adguard
      echo on > "$STATE"
      tg_notify "Mihomo recovered: enable transparent proxy and AdGuard DNS"
    fi
  else
    if [ "$(cat "$STATE" 2>/dev/null || true)" != "off" ]; then
      logger "mihomo-watchdog: mihomo down, disable proxy and fallback dns"
      /root/mihomo-policy-off.sh
      set_dns_direct
      echo off > "$STATE"
      tg_notify "Mihomo down: disable transparent proxy and switch fallback DNS"
    fi
  fi

  check_wan
  sleep "$INTERVAL"
done
