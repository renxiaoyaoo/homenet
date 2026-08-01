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

LAN6_PREFIX="$(ip -6 -o addr show dev "$LAN_IF" scope global | awk '
  $0 !~ / deprecated / {
    split($4, a, "/")
    if (a[1] != "") {
      split(a[1], h, ":")
      printf "%s:%s:%s:%s::/64\n", h[1], h[2], h[3], h[4]
      exit
    }
  }
')"

# IPv4 TProxy route table.
while ip rule del fwmark "$MARK" table "$TABLE" 2>/dev/null; do
  :
done
ip rule add fwmark "$MARK" table "$TABLE"
ip route replace local default dev lo table "$TABLE"

# IPv6 TProxy route table.
while ip -6 rule del fwmark "$MARK" table "$TABLE" 2>/dev/null; do
  :
done

ip -6 rule add fwmark "$MARK" table "$TABLE"
ip -6 route replace local ::/0 dev lo table "$TABLE"

# IPv6 TProxy rules.
ip6tables -t mangle -N MIHOMO6 2>/dev/null
ip6tables -t mangle -F MIHOMO6

ip6tables -t mangle -A MIHOMO6 -d ::1/128 -j RETURN
ip6tables -t mangle -A MIHOMO6 -d fe80::/10 -j RETURN
ip6tables -t mangle -A MIHOMO6 -d fc00::/7 -j RETURN
ip6tables -t mangle -A MIHOMO6 -d ff00::/8 -j RETURN
ip6tables -t mangle -A MIHOMO6 -m addrtype --dst-type LOCAL -j RETURN
if [ -n "$LAN6_PREFIX" ]; then
  ip6tables -t mangle -A MIHOMO6 -d "$LAN6_PREFIX" -j RETURN
fi

ip6tables -t mangle -A MIHOMO6 -m mac --mac-source "$ROUTER_MAC" -p tcp -j TPROXY --on-ip ::1 --on-port "$TPROXY_PORT" --tproxy-mark 0x1
ip6tables -t mangle -A MIHOMO6 -m mac --mac-source "$ROUTER_MAC" -p udp -j TPROXY --on-ip ::1 --on-port "$TPROXY_PORT" --tproxy-mark 0x1

ip6tables -t mangle -D PREROUTING -i "$LAN_IF" -j MIHOMO6 2>/dev/null
ip6tables -t mangle -A PREROUTING -i "$LAN_IF" -j MIHOMO6

echo "mihomo-tproxy-route: using router $ROUTER_NEXT_HOP / $ROUTER_MAC"
if [ -n "$LAN6_PREFIX" ]; then
  echo "mihomo-tproxy-route: excluding local IPv6 prefix $LAN6_PREFIX"
fi
