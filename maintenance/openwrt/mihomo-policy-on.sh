#!/bin/sh
set -eu

PI="${PI:-192.168.50.5}"
PI6_LL="${PI6_LL:-}"
LAN_IF="${LAN_IF:-br-lan}"
TABLE="${TABLE:-100}"
MARK="${MARK:-0x1}"
CNSET4="${CNSET4:-MIHOMO_CN4}"
CNSET4_RESTORE="${CNSET4_RESTORE:-/root/mihomo-cncidr4.ipset}"
INFRA_MACS="${INFRA_MACS:-}"
BYPASS_CLIENTS="${BYPASS_CLIENTS:-192.168.50.1 192.168.50.2 192.168.50.3 192.168.50.4 192.168.50.5}"
LAN_CIDR="${LAN_CIDR:-192.168.50.0/24}"

lan6_prefixes() {
  ip -6 route show dev "$LAN_IF" 2>/dev/null | awk '
    $1 ~ /^[0-9a-fA-F:]+\/[0-9]+$/ &&
    $1 !~ /^fe80:/ &&
    $1 !~ /^fc/ &&
    $1 !~ /^fd/ {
      print $1
    }
  '
}

ip route replace default via "$PI" dev "$LAN_IF" table "$TABLE"
ip rule list | grep -q "fwmark $MARK lookup $TABLE" || ip rule add fwmark "$MARK" table "$TABLE"

if [ -n "$PI6_LL" ]; then
  ip -6 route replace default via "$PI6_LL" dev "$LAN_IF" table "$TABLE" metric 1
  ip -6 rule | grep -q "fwmark $MARK lookup $TABLE" || ip -6 rule add fwmark "$MARK" table "$TABLE"
fi

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

ip6tables -t mangle -N MIHOMO6 2>/dev/null || true
ip6tables -t mangle -F MIHOMO6
ip6tables -t mangle -A MIHOMO6 -d ::1/128 -j RETURN
ip6tables -t mangle -A MIHOMO6 -d fe80::/10 -j RETURN
ip6tables -t mangle -A MIHOMO6 -d fc00::/7 -j RETURN
ip6tables -t mangle -A MIHOMO6 -d ff00::/8 -j RETURN

for PREFIX in $(lan6_prefixes); do
  ip6tables -t mangle -A MIHOMO6 -d "$PREFIX" -j RETURN
done

for MAC in $INFRA_MACS; do
  ip6tables -t mangle -A MIHOMO6 -m mac --mac-source "$MAC" -j RETURN
done

ip6tables -t mangle -A MIHOMO6 -j MARK --set-mark "$MARK"
ip6tables -t mangle -D PREROUTING -i "$LAN_IF" -j MIHOMO6 2>/dev/null || true
ip6tables -t mangle -A PREROUTING -i "$LAN_IF" -j MIHOMO6
