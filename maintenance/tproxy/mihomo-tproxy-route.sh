#!/bin/sh

MARK="1"
TABLE="100"
LAN_IF="eth0"
TPROXY_PORT="7892"
ROUTER_IPV4="${ROUTER_IPV4:-192.168.50.1}"
ROUTER_MAC_FALLBACK="${ROUTER_MAC_FALLBACK:-}"

get_lladdr() {
  awk '
    {
      for (i = 1; i <= NF; i++) {
        if ($i == "lladdr") {
          print $(i + 1)
          exit
        }
      }
    }
  '
}

ROUTER_MAC=""
ROUTER_NEXT_HOP=""

for _ in 1 2 3 4 5 6 7 8 9 10; do
  ROUTER_NEXT_HOP="$(ip route show default dev "$LAN_IF" | awk '/^default / { print $3; exit }')"
  [ -n "$ROUTER_NEXT_HOP" ] || ROUTER_NEXT_HOP="$ROUTER_IPV4"

  ping -c 1 -W 1 "$ROUTER_NEXT_HOP" >/dev/null 2>&1 || true
  ROUTER_MAC="$(ip neigh show "$ROUTER_NEXT_HOP" dev "$LAN_IF" 2>/dev/null | get_lladdr)"
  [ -n "$ROUTER_MAC" ] && break

  ROUTER_NEXT_HOP="$(ip -6 route show default dev "$LAN_IF" | awk '/^default / { print $3; exit }')"
  if [ -n "$ROUTER_NEXT_HOP" ]; then
    ROUTER_MAC="$(ip -6 neigh show "$ROUTER_NEXT_HOP" dev "$LAN_IF" 2>/dev/null | get_lladdr)"
    [ -n "$ROUTER_MAC" ] && break
  fi

  sleep 1
done

if [ -z "$ROUTER_MAC" ]; then
  if [ -z "$ROUTER_MAC_FALLBACK" ]; then
    echo "mihomo-tproxy-route: router MAC not found; set ROUTER_MAC_FALLBACK if neighbour discovery is unavailable" >&2
    exit 1
  fi
  ROUTER_NEXT_HOP="$ROUTER_IPV4"
  ROUTER_MAC="$ROUTER_MAC_FALLBACK"
  echo "mihomo-tproxy-route: using fallback router MAC $ROUTER_MAC" >&2
fi

# IPv4 TProxy route table.
while ip rule del fwmark "$MARK" table "$TABLE" 2>/dev/null; do
  :
done
ip rule add fwmark "$MARK" table "$TABLE"
ip route replace local default dev lo table "$TABLE"

# Remove obsolete IPv6 TProxy state. Foreign domains use fake-IP over IPv4;
# real IPv6 remains native to avoid asymmetric DIRECT flows via a sidecar Pi.
while ip -6 rule del fwmark "$MARK" table "$TABLE" 2>/dev/null; do
  :
done
ip6tables -t mangle -D PREROUTING -i "$LAN_IF" -j MIHOMO6 2>/dev/null
ip6tables -t mangle -F MIHOMO6 2>/dev/null || true
ip6tables -t mangle -X MIHOMO6 2>/dev/null || true
while ip -6 route del default table "$TABLE" 2>/dev/null; do :; done

echo "mihomo-tproxy-route: using router $ROUTER_NEXT_HOP / $ROUTER_MAC"
