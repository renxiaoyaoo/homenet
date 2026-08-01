"""Module-owned remote-access review renderers."""

from __future__ import annotations

from typing import Any

from modules.renderers.common import remote_access_review_lines


def render_cloudflared_remote_ingress(
    *,
    entries: list[dict[str, Any]],
    services: list[dict[str, Any]],
    ports: list[dict[str, Any]],
) -> dict[str, Any]:
    lines = remote_access_review_lines(
        artifact_id="remote-access.cloudflared",
        target_path="cloudflared/config.yml + Cloudflare Access apps",
        title="Cloudflare Tunnel / Access remote entry inventory.",
        note="Cloudflare owns public hostnames, Access app policy, and tunnel routing.",
        entries=entries,
        services=services,
        ports=ports,
        source_tool="Cloudflare Dashboard/API + cloudflared",
        required_secrets=["CLOUDFLARE_ACCOUNT_ID", "CF_ZERO_TRUST_API_TOKEN", "CLOUDFLARED_TUNNEL_TOKEN"],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/remote_access.py::render_cloudflared_remote_ingress"}


def render_caddy_remote_ingress(
    *,
    entries: list[dict[str, Any]],
    services: list[dict[str, Any]],
    ports: list[dict[str, Any]],
) -> dict[str, Any]:
    lines = remote_access_review_lines(
        artifact_id="remote-access.caddy",
        target_path="caddy/Caddyfile",
        title="Caddy IPv6/LAN HTTP entry inventory.",
        note="Caddy owns LAN HTTP routing and IPv6 HTTPS reverse-proxy routes.",
        entries=entries,
        services=services,
        ports=ports,
        source_tool="Caddy",
        required_secrets=[],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/remote_access.py::render_caddy_remote_ingress"}


def render_wireguard_remote_access(
    *,
    entries: list[dict[str, Any]],
    services: list[dict[str, Any]],
    ports: list[dict[str, Any]],
) -> dict[str, Any]:
    lines = remote_access_review_lines(
        artifact_id="remote-access.wireguard",
        target_path="wg-easy/",
        title="WireGuard return-home inventory.",
        note="WireGuard owns LAN-level remote access; peer keys stay in WireGuard tooling.",
        entries=entries,
        services=services,
        ports=ports,
        source_tool="wg-easy / WireGuard",
        required_secrets=["WIREGUARD_ADMIN_PASSWORD", "WIREGUARD_CLIENT_PRIVATE_KEYS"],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/remote_access.py::render_wireguard_remote_access"}


def render_ddns_remote_ingress(
    *,
    entries: list[dict[str, Any]],
    services: list[dict[str, Any]],
    ports: list[dict[str, Any]],
) -> dict[str, Any]:
    lines = remote_access_review_lines(
        artifact_id="remote-access.ddns",
        target_path="ddns-go/config.yaml",
        title="DDNS public DNS update inventory.",
        note="DDNS keeps IPv6 direct hostnames pointed at the current public address.",
        entries=entries,
        services=services,
        ports=ports,
        source_tool="ddns-go + DNS provider",
        required_secrets=["CF_DNS_API_TOKEN"],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/remote_access.py::render_ddns_remote_ingress"}
