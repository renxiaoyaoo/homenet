#!/bin/sh
set -eu

PI="${PI:-192.168.50.5}"
LAN_IF="${LAN_IF:-br-lan}"
TABLE="${TABLE:-100}"
MARK="${MARK:-0x1}"
CNSET4="${CNSET4:-MIHOMO_CN4}"
CNSET4_RESTORE="${CNSET4_RESTORE:-/root/mihomo-cncidr4.ipset}"
INFRA_MACS="${INFRA_MACS:-}"
BYPASS_CLIENTS="${BYPASS_CLIENTS:-192.168.50.1 192.168.50.2 192.168.50.3 192.168.50.4 192.168.50.5}"
LAN_CIDR="${LAN_CIDR:-192.168.50.0/24}"
ENV_FILE="${ENV_FILE:-/root/mihomo-policy.env}"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi

ip route replace default via "$PI" dev "$LAN_IF" table "$TABLE"
ip rule list | grep -q "fwmark $MARK lookup $TABLE" || ip rule add fwmark "$MARK" table "$TABLE"

iptables -t mangle -N MIHOMO_POLICY 2>/dev/null || true
iptables -t mangle -F MIHOMO_POLICY

for CIDR in 0.0.0.0/8 10.0.0.0/8 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.168.0.0/16 224.0.0.0/4 240.0.0.0/4; do
  iptables -t mangle -A MIHOMO_POLICY -d "$CIDR" -j RETURN
done

# Keep domestic IPv4 real-IP traffic on the router path before LAN traffic is marked for mihomo.
if command -v ipset >/dev/null 2>&1 && [ -s "$CNSET4_RESTORE" ]; then
  ipset restore -exist < "$CNSET4_RESTORE"
  iptables -t mangle -A MIHOMO_POLICY -m set --match-set "$CNSET4" dst -j RETURN
fi

iptables -t mangle -A MIHOMO_POLICY -p tcp --dport 53 -j RETURN
iptables -t mangle -A MIHOMO_POLICY -p udp --dport 53 -j RETURN

for CLIENT in $BYPASS_CLIENTS; do
  iptables -t mangle -A MIHOMO_POLICY -s "$CLIENT/32" -j RETURN
done

iptables -t mangle -A MIHOMO_POLICY -s "$LAN_CIDR" -j MARK --set-mark "$MARK"

iptables -t mangle -D PREROUTING -i "$LAN_IF" -j MIHOMO_POLICY 2>/dev/null || true
iptables -t mangle -A PREROUTING -i "$LAN_IF" -j MIHOMO_POLICY

# Foreign domains use Mihomo fake-IP and enter the IPv4 policy above. Keep real
# IPv6 native: routing every IPv6 DIRECT flow through a same-LAN sidecar gateway
# creates an asymmetric return path.
ip6tables -t mangle -D PREROUTING -i "$LAN_IF" -j MIHOMO6 2>/dev/null || true
ip6tables -t mangle -F MIHOMO6 2>/dev/null || true
ip6tables -t mangle -X MIHOMO6 2>/dev/null || true
while ip -6 rule del fwmark "$MARK" table "$TABLE" 2>/dev/null; do :; done
while ip -6 route del default table "$TABLE" 2>/dev/null; do :; done
