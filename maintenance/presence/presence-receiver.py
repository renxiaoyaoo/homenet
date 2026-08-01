#!/usr/bin/env python3
import json
import os
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.getenv("PRESENCE_RECEIVER_HOST", "0.0.0.0")
PORT = int(os.getenv("PRESENCE_RECEIVER_PORT", "9977"))
STATE_FILE = os.getenv("PRESENCE_STATE_FILE", "/home/pi/network/maintenance/state/presence/presence.json")
HA_WEBHOOK = os.getenv("PRESENCE_HA_WEBHOOK", "http://127.0.0.1:8123/api/webhook/openwrt_presence_update")
EXPECTED_APS = [x.strip() for x in os.getenv("PRESENCE_EXPECTED_APS", "main,room").split(",") if x.strip()]
TTL_SECONDS = int(os.getenv("PRESENCE_TTL_SECONDS", "180"))


def now() -> int:
    return int(time.time())


def load_state() -> dict:
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            state = json.load(f)
    except (OSError, json.JSONDecodeError):
        state = {}
    state.setdefault("aps", {})
    state.setdefault("last_ha_push", {})
    state.setdefault("errors", [])
    return state


def save_state(state: dict) -> None:
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    tmp = f"{STATE_FILE}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2, sort_keys=True)
    os.replace(tmp, STATE_FILE)


def parse_clients(raw: str) -> list[str]:
    clients = []
    for item in raw.replace(",", " ").split():
        item = item.strip().lower()
        if item and item not in clients:
            clients.append(item)
    return clients


def merged_clients(state: dict) -> tuple[list[str], list[str], bool]:
    ts = now()
    aps = state.get("aps", {})
    seen_all = all(ap in aps for ap in EXPECTED_APS)
    fresh_aps = []
    merged = []
    for ap in EXPECTED_APS:
        row = aps.get(ap) or {}
        updated_at = int(row.get("updated_at") or 0)
        if ts - updated_at > TTL_SECONDS:
            continue
        fresh_aps.append(ap)
        for client in row.get("clients") or []:
            if client not in merged:
                merged.append(client)
    return sorted(merged), fresh_aps, seen_all


def push_ha(state: dict) -> dict:
    clients, fresh_aps, seen_all = merged_clients(state)
    if not seen_all:
        return {
            "posted": False,
            "reason": "waiting_for_all_aps",
            "fresh_aps": fresh_aps,
            "clients": clients,
        }
    if not fresh_aps:
        return {
            "posted": False,
            "reason": "no_fresh_ap",
            "fresh_aps": fresh_aps,
            "clients": clients,
        }

    query = urllib.parse.urlencode({"count": str(len(clients)), "clients": " ".join(clients)})
    url = f"{HA_WEBHOOK}?{query}"
    with urllib.request.urlopen(url, timeout=5) as resp:
        detail = {"status": resp.status, "reason": resp.reason}
    state["last_ha_push"] = {
        "updated_at": now(),
        "clients": clients,
        "count": len(clients),
        "fresh_aps": fresh_aps,
        "detail": detail,
    }
    return {"posted": True, **state["last_ha_push"]}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)

    def send_json(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False, sort_keys=True).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Connection", "close")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/health", "/state"):
            state = load_state()
            clients, fresh_aps, seen_all = merged_clients(state)
            self.send_json(200, {
                "ok": True,
                "expected_aps": EXPECTED_APS,
                "seen_all": seen_all,
                "fresh_aps": fresh_aps,
                "merged_clients": clients,
                "state": state,
            })
            return
        if parsed.path != "/report":
            self.send_json(404, {"ok": False, "error": "not_found"})
            return

        params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        ap = (params.get("ap") or [""])[0].strip().lower()
        if ap not in EXPECTED_APS:
            self.send_json(400, {"ok": False, "error": "unknown_ap", "expected_aps": EXPECTED_APS})
            return
        clients = parse_clients((params.get("clients") or [""])[0])
        state = load_state()
        state["aps"][ap] = {
            "updated_at": now(),
            "clients": clients,
            "remote_addr": self.client_address[0],
        }
        try:
            result = push_ha(state)
        except Exception as exc:
            result = {"posted": False, "reason": f"{type(exc).__name__}: {exc}"}
            state["errors"] = ([{"updated_at": now(), "error": result["reason"]}] + state.get("errors", []))[:10]
        state["updated_at"] = now()
        save_state(state)
        self.send_json(200, {"ok": True, "ap": ap, "clients": clients, "ha": result})


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"presence receiver listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
