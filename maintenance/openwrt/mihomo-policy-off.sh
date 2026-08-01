#!/bin/sh
set -eu

LAN_IF="br-lan"
TABLE="100"
MARK="0x1"

iptables -t mangle -D PREROUTING -i "$LAN_IF" -j MIHOMO_POLICY 2>/dev/null || true
iptables -t mangle -F MIHOMO_POLICY 2>/dev/null || true
iptables -t mangle -X MIHOMO_POLICY 2>/dev/null || true

ip6tables -t mangle -D PREROUTING -i "$LAN_IF" -j MIHOMO6 2>/dev/null || true
ip6tables -t mangle -F MIHOMO6 2>/dev/null || true
ip6tables -t mangle -X MIHOMO6 2>/dev/null || true

while ip rule del fwmark "$MARK" table "$TABLE" 2>/dev/null; do :; done
while ip -6 rule del fwmark "$MARK" table "$TABLE" 2>/dev/null; do :; done
ip route flush table "$TABLE" 2>/dev/null || true
ip -6 route flush table "$TABLE" 2>/dev/null || true

ipset flush MIHOMO_CN4 2>/dev/null || true
ipset destroy MIHOMO_CN4 2>/dev/null || true
