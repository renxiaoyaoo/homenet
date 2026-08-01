# Docker Compose Template

This directory contains a public, reusable compose starting point for the
`openwrt-pi` and `openwrt-mini-pc` profiles.

It is not a copy of any live home deployment. Real homes should derive their
runtime file from the selected instance, local storage policy, secret store,
and source-tool ownership rules.

Use it as a deployment worksheet:

```sh
cp templates/compose/docker-compose.yml ./docker-compose.yml
cp templates/compose/env.example ./.env
```

Then replace every `REPLACE_WITH_*` value in the local `.env`. Keep the filled
`.env`, service databases, certificates, proxy subscriptions, WireGuard data,
and Cloudflare tunnel credentials out of git.

The default uses `network_mode: host` because the normal OpenWrt + server
runtime profile exposes DNS, transparent proxy handoff, WireGuard, Caddy, and
Cloudflare Tunnel on the home server itself. If a home does not need those
network-facing services, remove the unused service from the private runtime
file instead of changing the public instance model.

The template keeps these boundaries explicit:

- OpenWrt remains the Gateway, DHCP, firewall, Wi-Fi, and TProxy owner.
- The server runtime hosts optional services such as DNS UI, Proxy core,
  monitoring, remote access, Caddy/DDNS, and HomeNet Ops.
- HomeNet renders review artifacts and explains ownership; it does not silently
  take write ownership from Docker, OpenWrt, Kuma, Cloudflare, Mihomo, AdGuard,
  WireGuard, or Home Assistant.
- Live writes require backup, source-tool proof, operator confirmation, live
  evidence, and post-change verification.
