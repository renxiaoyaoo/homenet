#!/bin/sh
# Keep Guest SSID interfaces attached to br-guest after wifi/network reload.
# On this router netifd creates wlan0-2/wlan1-1 but does not enslave them automatically.
case "$ACTION" in
	add|ifup|ifupdate) ;;
	*) exit 0 ;;
esac

sleep 1
for iface in wlan0-2 wlan1-1; do
	ip link show "$iface" >/dev/null 2>&1 || continue
	brctl show br-guest 2>/dev/null | grep -qw "$iface" && continue
	brctl addif br-guest "$iface" 2>/dev/null || true
	ip link set br-guest up 2>/dev/null || true
	logger -t guest-bridge "attached $iface to br-guest"
done
