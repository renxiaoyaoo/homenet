#!/usr/bin/env python3
import ipaddress
import json
import os
import re
import sqlite3
import subprocess
import time
from pathlib import Path

DB_PATH = Path(os.getenv("WG_EASY_DB", "/home/pi/network/wg-easy/data/wg-easy.db"))
STATE_FILE = Path(os.getenv("WG_STATUS_FILE", "/home/pi/network/maintenance/state/wireguard/clients.json"))
STALE_AFTER_SECONDS = int(os.getenv("WG_STALE_AFTER_SECONDS", "3600"))
ACTIVE_AFTER_SECONDS = int(os.getenv("WG_ACTIVE_AFTER_SECONDS", "300"))


def load_clients() -> dict[str, dict]:
    clients: dict[str, dict] = {}
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        for row in con.execute(
            "select name, ipv4_address, ipv6_address, enabled from clients_table order by id"
        ):
            item = {
                "name": row["name"],
                "ipv4_address": row["ipv4_address"],
                "ipv6_address": row["ipv6_address"],
                "enabled": bool(row["enabled"]),
            }
            if row["ipv4_address"]:
                clients[row["ipv4_address"]] = item
            if row["ipv6_address"]:
                clients[row["ipv6_address"]] = item
    finally:
        con.close()
    return clients


def handshake_seconds(text: str) -> int | None:
    if not text or text == "never":
        return None
    total = 0
    units = {
        "second": 1,
        "seconds": 1,
        "minute": 60,
        "minutes": 60,
        "hour": 3600,
        "hours": 3600,
        "day": 86400,
        "days": 86400,
    }
    for value, unit in re.findall(r"(\d+)\s+([a-z]+)", text):
        total += int(value) * units.get(unit, 0)
    return total if total else None


def endpoint_scope(endpoint: str) -> str:
    if not endpoint:
        return "none"
    host = endpoint.rsplit(":", 1)[0]
    if host.startswith("[") and "]" in host:
        host = host[1:host.index("]")]
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return "unknown"
    if ip.is_private or ip.is_loopback or ip.is_link_local:
        return "lan"
    return "outside"


def parse_wg_show(text: str, clients_by_ip: dict[str, dict]) -> list[dict]:
    peers = []
    current: dict | None = None
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("peer: "):
            if current:
                peers.append(current)
            current = {"allowed_ips": []}
            continue
        if current is None:
            continue
        if line.startswith("endpoint: "):
            current["endpoint"] = line.split(": ", 1)[1]
        elif line.startswith("allowed ips: "):
            allowed = []
            for item in line.split(": ", 1)[1].split(","):
                ip = item.strip().split("/", 1)[0]
                if ip:
                    allowed.append(ip)
            current["allowed_ips"] = allowed
        elif line.startswith("latest handshake: "):
            text_value = line.split(": ", 1)[1]
            current["latest_handshake"] = text_value
            current["latest_handshake_seconds"] = handshake_seconds(text_value)
        elif line.startswith("transfer: "):
            current["transfer"] = line.split(": ", 1)[1]
    if current:
        peers.append(current)

    rows = []
    now = int(time.time())
    for peer in peers:
        client = next((clients_by_ip.get(ip) for ip in peer.get("allowed_ips", []) if ip in clients_by_ip), None)
        seconds = peer.get("latest_handshake_seconds")
        if seconds is None:
            status = "idle"
        elif seconds <= ACTIVE_AFTER_SECONDS:
            status = "active"
        elif seconds <= STALE_AFTER_SECONDS:
            status = "recent"
        else:
            status = "stale"
        endpoint = peer.get("endpoint") or ""
        rows.append({
            "name": (client or {}).get("name") or "unknown",
            "enabled": (client or {}).get("enabled", True),
            "ipv4_address": (client or {}).get("ipv4_address") or next((ip for ip in peer.get("allowed_ips", []) if "." in ip), ""),
            "ipv6_address": (client or {}).get("ipv6_address") or next((ip for ip in peer.get("allowed_ips", []) if ":" in ip), ""),
            "endpoint_scope": endpoint_scope(endpoint),
            "has_endpoint": bool(endpoint),
            "latest_handshake": peer.get("latest_handshake") or "never",
            "latest_handshake_seconds": seconds,
            "last_seen_at": now - seconds if seconds is not None else None,
            "status": status,
            "transfer": peer.get("transfer") or "",
        })
    return sorted(rows, key=lambda item: (item["status"] != "active", item["status"] != "recent", item["name"].lower()))


def main() -> None:
    clients = load_clients()
    result = subprocess.run(
        ["docker", "exec", "wg-easy", "wg", "show"],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=8,
    )
    state = {
        "ok": True,
        "updated_at": int(time.time()),
        "active_after_seconds": ACTIVE_AFTER_SECONDS,
        "stale_after_seconds": STALE_AFTER_SECONDS,
        "clients": parse_wg_show(result.stdout, clients),
    }
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    tmp.replace(STATE_FILE)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(json.dumps({
            "ok": False,
            "updated_at": int(time.time()),
            "error": f"{type(exc).__name__}: {exc}",
            "clients": [],
        }, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
        raise
