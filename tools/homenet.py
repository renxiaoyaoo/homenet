#!/usr/bin/env python3
"""Small HomeNet CLI: declare, deploy, inspect, and publish one home."""

from __future__ import annotations

import argparse
import glob
import hashlib
import ipaddress
import json
import os
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.homenet_check import Reporter, check_instance
from tools.homenet_metadata import build_kuma_inventory, build_port_inventory, build_service_directory, service_module_id
from tools.homenet_privacy import build_privacy_report, print_privacy_markdown
from tools.homenet_routing import command_routing

VERSION = "1.0.0"
PUBLIC_DIRS = ("apps", "docs", "instances", "maintenance", "schemas", "templates", "tools", ".github")
PUBLIC_FILES = ("homenet", "README.md", "PUBLIC_PACKAGE.md", "PUBLISHING.md", "CONTRIBUTING.md", "SECURITY.md", "VERSIONING.md", "LICENSE")
SKIP_PARTS = {".git", ".agents", ".codex", "__pycache__", "node_modules", "dist", "static", "runtime", "state", "backups"}
SKIP_PREFIXES = ("maintenance/state/", "apps/ops/static/", "apps/ops/frontend/node_modules/")


def emit(value: Any, fmt: str = "json") -> None:
    if fmt == "json" or not isinstance(value, str):
        print(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(value)


def instance_path(raw: str | None) -> Path:
    if raw:
        return Path(raw).expanduser().resolve()
    configured = os.getenv("HOMENET_INSTANCE")
    return Path(configured).expanduser().resolve() if configured else ROOT / "instances" / "example-openwrt-pi"


def load_state(path: Path) -> tuple[Reporter, dict[str, Any]]:
    reporter = Reporter()
    if not path.is_dir():
        reporter.fail("instance", f"{path} does not exist")
        return reporter, {}
    return reporter, check_instance(path, reporter)


def module_flags(state: dict[str, Any]) -> dict[str, bool]:
    modules = state.get("site", {}).get("modules", {})
    return {
        str(key): bool(value.get("enabled", True))
        for key, value in modules.items()
        if isinstance(value, dict)
    }


def metadata(state: dict[str, Any], path: Path) -> dict[str, Any]:
    site = state.get("site", {})
    info = site.get("site", {}) if isinstance(site.get("site"), dict) else {}
    runtime = site.get("runtime", {}) if isinstance(site.get("runtime"), dict) else {}
    flags = module_flags(state)
    services = build_service_directory(state.get("services", []), flags)
    return {
        "schema": "homenet.metadata.v1",
        "profile": site.get("profile", "openwrt-pi"),
        "instance": {**info, "path": str(path)},
        "site": info,
        "networks": state.get("networks", {}),
        "wifi": state.get("wifi", {}),
        "devices": state.get("devices", []),
        "service_directory": services,
        "service_inventory": services,
        "port_inventory": build_port_inventory(state.get("services", []), flags),
        "kuma_inventory": build_kuma_inventory(state.get("services", []), flags),
        "remote_ingress": state.get("remote_ingress", []),
        "runtime_targets": runtime,
        "module_placement": site.get("modules", {}),
        "privacy": {"secrets_included": False},
    }


def command_metadata(args: argparse.Namespace) -> int:
    path = instance_path(args.instance)
    reporter, state = load_state(path)
    if reporter.failed:
        reporter.print()
        return 2
    emit(metadata(state, path))
    return 0


def http_probe(url: str, timeout: float = 4) -> tuple[bool, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "HomeNet/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return 200 <= response.status < 500, f"HTTP {response.status}"
    except urllib.error.HTTPError as exc:
        return exc.code < 500, f"HTTP {exc.code}"
    except Exception as exc:
        return False, type(exc).__name__


def tcp_probe(target: str, timeout: float = 3) -> tuple[bool, str]:
    try:
        host, raw_port = target.rsplit(":", 1)
        with socket.create_connection((host.strip("[]"), int(raw_port)), timeout=timeout):
            return True, "open"
    except Exception as exc:
        return False, type(exc).__name__


def tracked_probe(target: str) -> tuple[bool, str]:
    if target.endswith(" container"):
        command = ["docker", "inspect", "-f", "{{.State.Running}}", target.removesuffix(" container")]
    elif target.endswith((".service", ".timer")):
        command = ["systemctl", "is-active", target]
    else:
        return True, "declared"
    try:
        result = subprocess.run(command, text=True, capture_output=True, timeout=5, check=False)
        detail = (result.stdout or result.stderr).strip()
        return result.returncode == 0 and detail in {"true", "active"}, detail or "unknown"
    except Exception as exc:
        return False, type(exc).__name__


def log_marker_probe(pattern: str, marker: str, max_age_hours: float) -> tuple[bool, str]:
    if not marker or max_age_hours <= 0:
        return False, "invalid log check"
    files = [Path(name) for name in glob.glob(pattern)]
    if not files:
        return False, "no log"
    latest = max(files, key=lambda path: path.stat().st_mtime)
    if time.time() - latest.stat().st_mtime > max_age_hours * 3600:
        return False, "log is stale"
    with latest.open("rb") as log:
        log.seek(max(0, latest.stat().st_size - 1024 * 1024))
        found = marker.encode() in log.read()
    return found, "success marker found" if found else "success marker missing"


def sqlite_scalar_probe(path: str, query: str, expected: str) -> tuple[bool, str]:
    if not query.lstrip().lower().startswith("select "):
        return False, "query must be SELECT"
    uri = "file:" + urllib.parse.quote(str(Path(path).resolve())) + "?mode=ro"
    db = sqlite3.connect(uri, uri=True, timeout=2)
    try:
        db.execute("PRAGMA query_only = ON")
        row = db.execute(query).fetchone()
    finally:
        db.close()
    value = str(row[0]) if row else "no result"
    return value == expected, f"value {value}, expected {expected}"


def live_checks(state: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    flags = module_flags(state)
    for service in state.get("services", []):
        if not isinstance(service, dict):
            continue
        if not flags.get(service_module_id(service), True):
            continue
        checks = service.get("checks") if isinstance(service.get("checks"), list) else []
        if not checks:
            url = str(service.get("local_url") or "")
            if url.startswith(("http://", "https://")):
                checks = [{"type": "http", "target": url}]
        for check in checks:
            kind = str(check.get("type") or "")
            target = str(check.get("target") or "")
            try:
                if kind in {"http", "external"} and target.startswith(("http://", "https://")):
                    ok, detail = http_probe(target)
                elif kind == "tcp":
                    ok, detail = tcp_probe(target)
                elif kind == "tracked":
                    ok, detail = tracked_probe(target)
                elif kind == "log-marker":
                    ok, detail = log_marker_probe(target, str(check.get("marker") or ""), float(check.get("max_age_hours") or 36))
                elif kind == "sqlite-scalar":
                    ok, detail = sqlite_scalar_probe(target, str(check.get("query") or ""), str(check.get("expected") or ""))
                else:
                    continue
            except (OSError, ValueError, sqlite3.Error) as exc:
                ok, detail = False, type(exc).__name__
            label = str(service.get("id"))
            rows.append({"service": f"{label}:{kind}" if len(checks) > 1 else label, "ok": ok, "detail": detail})
    ops = next((s for s in state.get("services", []) if s.get("id") == "homenet-ops"), None)
    if ops:
        url = str(ops.get("local_url") or "").rstrip("/") + "/api/health"
        ok, detail = http_probe(url, timeout=8)
        rows.append({"service": "homenet-ops-health", "ok": ok, "detail": detail})
    return rows


def command_check(args: argparse.Namespace) -> int:
    path = instance_path(args.instance)
    reporter, state = load_state(path)
    if args.live and not reporter.failed:
        for row in live_checks(state):
            method = reporter.ok if row["ok"] else reporter.fail
            method("live", f"{row['service']} {row['detail']}")
    if args.format == "json":
        emit({
            "schema": "homenet.check.v1",
            "ok": not reporter.failed,
            "instance": str(path),
            "live": bool(args.live),
            "findings": [vars(item) for item in reporter.findings],
        })
    else:
        reporter.print()
    return 2 if reporter.failed else 0


def status_payload(state: dict[str, Any], path: Path, include_live: bool) -> dict[str, Any]:
    data = metadata(state, path)
    checks = live_checks(state) if include_live else []
    failed = [row for row in checks if not row["ok"]]
    return {
        "schema": "homenet.status.v1",
        "ok": not failed if include_live else None,
        "instance": data["instance"],
        "profile": data["profile"],
        "summary": {
            "networks": len(data["networks"]),
            "wifi": len(data["wifi"]),
            "devices": len(data["devices"]),
            "services": len(data["service_directory"]),
            "remote_entries": len(data["remote_ingress"]),
            "live_checks": len(checks),
            "live_failures": len(failed),
        },
        "runtime_targets": data["runtime_targets"],
        "services": data["service_directory"],
        "live": checks,
    }


def print_status(data: dict[str, Any], doctor: bool = False) -> None:
    summary = data["summary"]
    title = "HomeNet Doctor" if doctor else "HomeNet Status"
    print(f"# {title} - {data['instance'].get('display_name') or data['instance'].get('name')}")
    print()
    if data["ok"] is not None:
        print(f"- health: {'OK' if data['ok'] else 'PROBLEM'}")
    print(f"- networks: {summary['networks']}; Wi-Fi: {summary['wifi']}; devices: {summary['devices']}; services: {summary['services']}")
    if data["live"]:
        print(f"- live checks: {summary['live_checks']}; failures: {summary['live_failures']}")
        print()
        print("## Live")
        for row in data["live"]:
            if not doctor or not row["ok"]:
                print(f"- {'OK' if row['ok'] else 'FAIL'} {row['service']}: {row['detail']}")
        if doctor and not summary["live_failures"]:
            print("- No live problem found.")


def command_status(args: argparse.Namespace) -> int:
    path = instance_path(args.instance)
    reporter, state = load_state(path)
    if reporter.failed:
        reporter.print()
        return 2
    data = status_payload(state, path, bool(args.live))
    emit(data) if args.format == "json" else print_status(data, bool(getattr(args, "doctor", False)))
    return 0 if data["ok"] is not False else 2


def template_dir(profile: str) -> Path:
    name = "example-openwrt-only" if profile == "openwrt-only" else "example-openwrt-pi"
    return ROOT / "instances" / name


def template_site(profile: str) -> dict[str, Any]:
    import yaml

    return yaml.safe_load((template_dir(profile) / "site.yaml").read_text(encoding="utf-8"))


def related_host(router: str, last_octet: int) -> str:
    address = ipaddress.ip_address(router)
    return str(ipaddress.ip_address((int(address) & 0xFFFFFF00) + last_octet))


def replacement_map(profile: str, router: str, server: str, room: str) -> dict[str, str]:
    source = template_site(profile)
    runtime = source["runtime"]
    old_router = str(runtime["router"]["host"])
    old_base = int(old_router.split(".")[2])
    new_parts = router.split(".")
    new_base = int(new_parts[2])
    prefixes = {}
    for network in source.get("networks", {}).values():
        old_gateway = str(network.get("gateway") or "")
        if not old_gateway:
            continue
        old_parts = old_gateway.split(".")
        new_third = new_base + int(old_parts[2]) - old_base
        if not 0 <= new_third <= 255:
            raise ValueError("derived network is outside IPv4 range")
        prefixes[".".join(old_parts[:3]) + "."] = ".".join(new_parts[:2] + [str(new_third)]) + "."
    old_server = runtime.get("server", {}).get("host")
    old_room = runtime.get("room_ap", {}).get("host")
    replacements = {old_router: router}
    if old_server:
        replacements[str(old_server)] = server
    if old_room:
        replacements[str(old_room)] = room
    replacements.update(prefixes)
    return replacements


def apply_choices(output: Path, choices: dict[str, bool], room: str) -> None:
    import yaml

    path = output / "site.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    module_keys = {"room_ap": "room-ap", "maintenance_wifi": "maintenance-wifi", "remote_access": "remote-access", "smart_home": "smart-home"}
    feature_keys = {"maintenance_wifi": "maintenance_wifi", "remote_access": "remote_access", "smart_home": "smart_home"}
    for choice, module in module_keys.items():
        if module in data.get("modules", {}):
            data["modules"][module]["enabled"] = choices[choice]
    for choice, feature in feature_keys.items():
        if feature in data.get("features", {}):
            data["features"][feature]["enabled"] = choices[choice]
    if choices["room_ap"]:
        data["runtime"]["room_ap"] = {"type": "openwrt-ap", "host": room, "role": "Optional room coverage AP"}
        room_module = data["modules"]["room-ap"]
        room_module.update({"runtime": "openwrt-ap", "implementation": "relay-or-ap"})
        room_module.pop("reason", None)
        broadcasters = data.get("wifi", {}).get("main", {}).setdefault("broadcast_by", [])
        if "Room AP" not in broadcasters:
            broadcasters.append("Room AP")
    else:
        data["runtime"].pop("room_ap", None)
        broadcasters = data.get("wifi", {}).get("main", {}).get("broadcast_by", [])
        data.get("wifi", {}).get("main", {})["broadcast_by"] = [item for item in broadcasters if item != "Room AP"]
    if not choices["maintenance_wifi"]:
        data.get("networks", {}).get("ops", {})["enabled"] = False
        data.get("wifi", {}).pop("ops", None)
    if not choices["remote_access"]:
        data["remote_ingress"] = []
    path.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")

    devices_path = output / "devices.yaml"
    devices_data = yaml.safe_load(devices_path.read_text(encoding="utf-8"))
    devices = [item for item in devices_data.get("devices", []) if item.get("id") != "room-ap"]
    if choices["room_ap"]:
        devices.insert(1, {"id": "room-ap", "name": "Room AP", "role": "Optional coverage AP", "network": "lan", "ip": room, "expected": False})
    devices_data["devices"] = devices
    devices_path.write_text(yaml.safe_dump(devices_data, sort_keys=False, allow_unicode=True), encoding="utf-8")


def scaffold(profile: str, name: str, display_name: str, domain: str, router: str, server: str, room: str, choices: dict[str, bool], output: Path) -> None:
    source = template_dir(profile)
    template_name = source.name
    if not source.is_dir():
        raise RuntimeError(f"missing template {source}")
    shutil.copytree(source, output)
    replacements = replacement_map(profile, router, server, room)
    replacements.update({
        template_name: name,
        "Example OpenWrt + Pi Home": display_name,
        "Example OpenWrt Only Home": display_name,
        "example.net": domain,
    })
    for path in output.iterdir():
        if path.is_file():
            text = path.read_text(encoding="utf-8")
            for old, new in replacements.items():
                text = text.replace(old, new)
            path.write_text(text, encoding="utf-8")
    apply_choices(output, choices, room)


def ask(label: str, default: str) -> str:
    return input(f"{label} [{default}]: ").strip() or default


def ask_bool(label: str, default: bool) -> bool:
    answer = input(f"{label} [{'Y/n' if default else 'y/N'}]: ").strip().lower()
    if not answer:
        return default
    return answer in {"y", "yes"}


def command_init(args: argparse.Namespace) -> int:
    name = args.name or "my-home"
    profile = args.profile or "openwrt-pi"
    if not args.yes:
        name = ask("Instance id", name)
    display = args.display_name or name
    if not args.yes:
        display = ask("Display name", display)
        profile = ask("Profile (openwrt-pi/openwrt-only)", profile)
    if profile not in {"openwrt-pi", "openwrt-only"}:
        print("invalid profile", file=sys.stderr)
        return 2
    defaults = template_site(profile)
    default_router = str(defaults["runtime"]["router"]["host"])
    router = args.router_host or default_router
    domain = args.domain or "example.net"
    if not args.yes:
        domain = ask("Public domain or placeholder", domain)
        router = ask("OpenWrt IP", router)
    try:
        ipaddress.ip_address(router)
    except ValueError:
        print("invalid OpenWrt IP", file=sys.stderr)
        return 2
    server = args.server_host or related_host(router, 5)
    room = args.room_ap_host or related_host(router, 2)
    module_defaults = defaults.get("modules", {})
    choices = {
        "room_ap": args.room_ap if args.room_ap is not None else bool(module_defaults.get("room-ap", {}).get("enabled")),
        "maintenance_wifi": args.maintenance_wifi if args.maintenance_wifi is not None else bool(module_defaults.get("maintenance-wifi", {}).get("enabled")),
        "remote_access": args.remote_access if args.remote_access is not None else bool(module_defaults.get("remote-access", {}).get("enabled")),
        "smart_home": args.smart_home if args.smart_home is not None else bool(module_defaults.get("smart-home", {}).get("enabled")),
    }
    if not args.yes:
        if profile != "openwrt-only":
            server = ask("Server IP", server)
        choices["room_ap"] = ask_bool("Use a room AP", choices["room_ap"])
        if choices["room_ap"]:
            room = ask("Room AP IP", room)
        choices["maintenance_wifi"] = ask_bool("Enable maintenance Wi-Fi", choices["maintenance_wifi"])
        choices["remote_access"] = ask_bool("Enable remote access", choices["remote_access"])
        choices["smart_home"] = ask_bool("Enable smart-home integration", choices["smart_home"])
    if not name or any(ch not in "abcdefghijklmnopqrstuvwxyz0123456789-" for ch in name):
        print("invalid instance id", file=sys.stderr)
        return 2
    output = Path(args.output).resolve() if args.output else ROOT / "instances" / name
    with tempfile.TemporaryDirectory(prefix="homenet-init-") as temp:
        candidate = Path(temp) / name
        try:
            scaffold(profile, name, display, domain, router, server, room, choices, candidate)
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            return 2
        reporter, _ = load_state(candidate)
        if reporter.failed:
            reporter.print()
            return 2
        if output.exists() and tree_hash(output) == tree_hash(candidate):
            print(f"unchanged: {output}")
            return 0
        if output.exists() and not args.force:
            print(f"{output} differs; use --force to replace it", file=sys.stderr)
            return 2
        if output.exists():
            shutil.rmtree(output)
        shutil.copytree(candidate, output)
    print(f"created: {output}")
    print(f"next: ./homenet deploy --instance {output}")
    return 0


def tree_hash(root: Path) -> str:
    digest = hashlib.sha256()
    if not root.exists():
        return ""
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        digest.update(str(path.relative_to(root)).encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def render_deploy(state: dict[str, Any], path: Path, output: Path) -> None:
    import yaml

    site = state.get("site", {})
    info = site.get("site", {}) if isinstance(site.get("site"), dict) else {}
    runtime = site.get("runtime", {}) if isinstance(site.get("runtime"), dict) else {}
    server = runtime.get("server", {}) if isinstance(runtime.get("server"), dict) else {}
    output.mkdir(parents=True, exist_ok=True)
    template = ROOT / "templates" / "compose"
    if server.get("enabled", True) and template.is_dir():
        compose = yaml.safe_load((template / "docker-compose.yml").read_text(encoding="utf-8"))
        service_modules = {
            "homenet-ops": "observability-homenet",
            "uptime-kuma": "observability-homenet",
            "adguardhome": "dns-layer",
            "mihomo": "proxy-mihomo",
            "wg-easy": "remote-access",
            "cloudflared": "remote-access",
            "caddy": "remote-access",
            "ddns-go": "remote-access",
        }
        flags = module_flags(state)
        compose["services"] = {
            name: config for name, config in compose.get("services", {}).items()
            if flags.get(service_modules.get(name, "server-runtime"), True)
        }
        (output / "docker-compose.yml").write_text(yaml.safe_dump(compose, sort_keys=False), encoding="utf-8")
        env = (template / "env.example").read_text(encoding="utf-8")
        env = env.replace("example.net", str(info.get("domain") or "example.net"))
        env = env.replace("HOMENET_ROOT=/opt/homenet", f"HOMENET_ROOT={ROOT}")
        env = env.replace("HOMENET_ROUTER_IP=192.168.50.1", f"HOMENET_ROUTER_IP={runtime.get('router', {}).get('host') or '192.168.50.1'}")
        env = env.replace("192.168.50.5", str(server.get("host") or "192.168.50.5"))
        env = env.replace("instances/example-openwrt-pi", str(path))
        if not flags.get("remote-access", True):
            env = "\n".join(line for line in env.splitlines() if not line.startswith(("WG_", "CLOUDFLARED_", "CF_DNS_"))) + "\n"
        (output / "env.example").write_text(env, encoding="utf-8")
    steps = ["Configure OpenWrt from `site.yaml`; it remains Gateway/DHCP/Firewall/Wi-Fi owner."]
    if server.get("enabled", True):
        steps.extend(["Review `docker-compose.yml` and fill a private `.env`.", "Start the selected server services with Docker Compose."])
    steps.append("Run `./homenet check --live` after each source-tool change.")
    instructions = "\n".join(f"{index}. {step}" for index, step in enumerate(steps, 1))
    (output / "README.md").write_text(f"# HomeNet deployment\n\nInstance: `{path}`\n\n{instructions}\n", encoding="utf-8")


def command_deploy(args: argparse.Namespace) -> int:
    path = instance_path(args.instance)
    reporter, state = load_state(path)
    if reporter.failed:
        reporter.print()
        return 2
    output = Path(args.output_dir).resolve()
    with tempfile.TemporaryDirectory(prefix="homenet-deploy-") as temp:
        candidate = Path(temp) / "output"
        render_deploy(state, path, candidate)
        before = tree_hash(candidate)
        render_deploy(state, path, candidate)
        idempotent = before == tree_hash(candidate)
        if output.exists() and tree_hash(output) == tree_hash(candidate):
            action = "unchanged"
        else:
            if output.exists() and not args.force:
                print(f"{output} differs; use --force to replace it", file=sys.stderr)
                return 2
            if output.exists():
                shutil.rmtree(output)
            shutil.copytree(candidate, output)
            action = "written"
    result = {"ok": idempotent, "instance": str(path), "output": str(output), "action": action, "idempotent": idempotent, "writes_live_config": False}
    emit(result, args.format)
    return 0 if idempotent else 2


def public_paths(root: Path) -> list[Path]:
    manifest = root / "PUBLIC_PACKAGE_MANIFEST.json"
    if not (root / ".git").exists() and manifest.exists():
        data = json.loads(manifest.read_text(encoding="utf-8"))
        return [root / item for item in data.get("files", []) if (root / item).is_file()]
    paths: list[Path] = [root / name for name in PUBLIC_FILES if (root / name).is_file()]
    for name in PUBLIC_DIRS:
        base = root / name
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            if any(part in SKIP_PARTS for part in path.relative_to(root).parts) or rel.startswith(SKIP_PREFIXES):
                continue
            if name == "instances" and not rel.startswith(("instances/example-openwrt-pi/", "instances/example-openwrt-only/")):
                continue
            paths.append(path)
    return sorted(set(paths), key=lambda item: item.relative_to(root).as_posix())


def package_manifest(root: Path = ROOT) -> dict[str, Any]:
    files = [path.relative_to(root).as_posix() for path in public_paths(root)]
    return {"schema": "homenet.public-package.v1", "version": VERSION, "files": files}


def command_package(args: argparse.Namespace) -> int:
    manifest = package_manifest(ROOT)
    if not args.output_dir:
        emit(manifest, args.format)
        return 0
    output = Path(args.output_dir).resolve()
    if output.exists() and any(output.iterdir()) and not args.force:
        print(f"{output} is not empty; use --force", file=sys.stderr)
        return 2
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for rel in manifest["files"]:
        target = output / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel, target)
    (output / "PUBLIC_PACKAGE_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"exported {len(manifest['files'])} files to {output}")
    return 0


def check_package(path: Path) -> dict[str, Any]:
    required = {"homenet", "tools/homenet.py", "README.md", "PUBLIC_PACKAGE_MANIFEST.json", "instances/example-openwrt-pi/site.yaml", "instances/example-openwrt-only/site.yaml"}
    present = {item.relative_to(path).as_posix() for item in path.rglob("*") if item.is_file()}
    allowed_instances = ("instances/example-openwrt-pi/", "instances/example-openwrt-only/")
    forbidden = sorted(
        item for item in present
        if (item.startswith("instances/") and not item.startswith(allowed_instances))
        or item.startswith(("runtime/", "sub/"))
        or item in {".env", "docker-compose.yml"}
    )
    missing = sorted(required - present)
    return {"schema": "homenet.package-check.v1", "ok": not missing and not forbidden, "files": len(present), "missing": missing, "forbidden": forbidden}


def command_package_check(args: argparse.Namespace) -> int:
    report = check_package(Path(args.dir).resolve())
    emit(report, args.format)
    return 0 if report["ok"] else 2


def command_publish_check(args: argparse.Namespace) -> int:
    path = Path(args.dir).resolve()
    report = check_package(path)
    commands = [
        [sys.executable, "-m", "compileall", "-q", "tools", "apps/ops"],
        [str(path / "homenet"), "privacy", "--scope", "public", "--format", "json"],
        [str(path / "homenet"), "check", "--instance", "instances/example-openwrt-pi", "--format", "json"],
        [str(path / "homenet"), "check", "--instance", "instances/example-openwrt-only", "--format", "json"],
    ]
    failures = []
    if report["ok"]:
        for command in commands:
            result = subprocess.run(command, cwd=path, capture_output=True, text=True, timeout=30, check=False)
            if result.returncode:
                failures.append({"command": command[1:], "returncode": result.returncode})
    report.update({"schema": "homenet.publish-check.v1", "checks": len(commands) + 1, "failures": failures, "ok": report["ok"] and not failures})
    emit(report, args.format)
    return 0 if report["ok"] else 2


def command_privacy(args: argparse.Namespace) -> int:
    report = build_privacy_report(instance_path(args.instance), scope=args.scope)
    emit(report) if args.format == "json" else print_privacy_markdown(report)
    return 0 if report.get("ok") else 2


def build_parser() -> argparse.ArgumentParser:
    main = argparse.ArgumentParser(prog=os.getenv("HOMENET_PROG", "homenet"), description="Lightweight home network deployment and diagnosis")
    sub = main.add_subparsers(dest="command", required=True)

    def add_instance(command: argparse.ArgumentParser) -> None:
        command.add_argument("--instance")

    init = sub.add_parser("init", help="create or update a private instance interactively")
    init.add_argument("--yes", action="store_true")
    init.add_argument("--name")
    init.add_argument("--profile", choices=("openwrt-pi", "openwrt-only"))
    init.add_argument("--display-name")
    init.add_argument("--domain")
    init.add_argument("--router-host")
    init.add_argument("--server-host")
    init.add_argument("--room-ap-host")
    init.add_argument("--room-ap", action=argparse.BooleanOptionalAction, default=None)
    init.add_argument("--maintenance-wifi", action=argparse.BooleanOptionalAction, default=None)
    init.add_argument("--remote-access", action=argparse.BooleanOptionalAction, default=None)
    init.add_argument("--smart-home", action=argparse.BooleanOptionalAction, default=None)
    init.add_argument("--output")
    init.add_argument("--force", action="store_true")
    init.set_defaults(func=command_init)

    deploy = sub.add_parser("deploy", help="render a private runtime directory idempotently")
    add_instance(deploy)
    deploy.add_argument("--output-dir", default="/tmp/homenet-deploy")
    deploy.add_argument("--force", action="store_true")
    deploy.add_argument("--format", choices=("json", "markdown"), default="markdown")
    deploy.set_defaults(func=command_deploy)

    for name, help_text, live_default in (("check", "validate instance and optional live services", False), ("status", "summarize the home and optional live state", False), ("doctor", "show only current live problems", True)):
        command = sub.add_parser(name, help=help_text)
        add_instance(command)
        command.add_argument("--live", action="store_true", default=live_default)
        command.add_argument("--format", choices=("json", "markdown"), default="markdown")
        command.set_defaults(func=command_check if name == "check" else command_status, doctor=name == "doctor")

    meta = sub.add_parser("metadata", help="emit Console metadata (internal)")
    add_instance(meta)
    meta.set_defaults(func=command_metadata)

    routing = sub.add_parser("routing", help="inspect or persist Ops routing rules")
    routing_sub = routing.add_subparsers(dest="routing_command", required=True)
    for name in ("status", "commit"):
        command = routing_sub.add_parser(name)
        command.add_argument("--store", default=str(ROOT / "runtime/routing/rules.json"))
        command.add_argument("--format", choices=("json", "markdown"), default="markdown")
        if name == "commit":
            command.add_argument("--source-root", default=str(ROOT / "mihomo"))
            command.add_argument("--dry-run", action="store_true")
            command.add_argument("--confirm-permanent", action="store_true")
        command.set_defaults(func=command_routing)

    privacy = sub.add_parser("privacy", help="scan public files without printing matched values")
    add_instance(privacy)
    privacy.add_argument("--scope", choices=("public", "instance", "all"), default="public")
    privacy.add_argument("--format", choices=("json", "markdown"), default="markdown")
    privacy.set_defaults(func=command_privacy)

    package = sub.add_parser("package", help="export the public project")
    package.add_argument("--output-dir")
    package.add_argument("--force", action="store_true")
    package.add_argument("--format", choices=("json", "markdown"), default="markdown")
    package.set_defaults(func=command_package)

    package_check = sub.add_parser("package-check", help="validate an exported public project")
    package_check.add_argument("--dir", required=True)
    package_check.add_argument("--format", choices=("json", "markdown"), default="markdown")
    package_check.set_defaults(func=command_package_check)

    publish = sub.add_parser("publish-check", help="run package, privacy, compile, and example checks")
    publish.add_argument("--dir", required=True)
    publish.add_argument("--format", choices=("json", "markdown"), default="markdown")
    publish.set_defaults(func=command_publish_check)

    version = sub.add_parser("version", help="print HomeNet version")
    version.set_defaults(func=lambda _args: print(VERSION) or 0)
    return main


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
