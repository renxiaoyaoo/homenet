#!/bin/sh

TPROXY_PORT="7892"
MARK="1"
TABLE="100"

case "$1" in
  start)
    ip rule add fwmark $MARK table $TABLE 2>/dev/null
    ip route add local 0.0.0.0/0 dev lo table $TABLE 2>/dev/null

    iptables -t mangle -N MIHOMO 2>/dev/null
    iptables -t mangle -F MIHOMO

    iptables -t mangle -A MIHOMO -d 0.0.0.0/8 -j RETURN
    iptables -t mangle -A MIHOMO -d 10.0.0.0/8 -j RETURN
    iptables -t mangle -A MIHOMO -d 127.0.0.0/8 -j RETURN
    iptables -t mangle -A MIHOMO -d 169.254.0.0/16 -j RETURN
    iptables -t mangle -A MIHOMO -d 172.16.0.0/12 -j RETURN
    iptables -t mangle -A MIHOMO -d 192.168.0.0/16 -j RETURN
    iptables -t mangle -A MIHOMO -d 224.0.0.0/4 -j RETURN
    iptables -t mangle -A MIHOMO -d 240.0.0.0/4 -j RETURN
    iptables -t mangle -A MIHOMO -m addrtype --dst-type LOCAL -j RETURN

    iptables -t mangle -A MIHOMO -p tcp -j TPROXY --on-ip 127.0.0.1 --on-port $TPROXY_PORT --tproxy-mark $MARK
    iptables -t mangle -A MIHOMO -p udp -j TPROXY --on-ip 127.0.0.1 --on-port $TPROXY_PORT --tproxy-mark $MARK

    iptables -t mangle -D PREROUTING -i eth0 -j MIHOMO 2>/dev/null
    iptables -t mangle -A PREROUTING -i eth0 -j MIHOMO
    ;;

  stop)
    iptables -t mangle -D PREROUTING -i eth0 -j MIHOMO 2>/dev/null
    iptables -t mangle -F MIHOMO 2>/dev/null
    iptables -t mangle -X MIHOMO 2>/dev/null
    ip rule del fwmark $MARK table $TABLE 2>/dev/null
    ip route flush table $TABLE 2>/dev/null
    ;;

  restart)
    "$0" stop
    "$0" start
    ;;

  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
    ;;
esac
