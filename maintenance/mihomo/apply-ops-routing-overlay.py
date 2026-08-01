#!/usr/bin/env python3
"""Apply the local Ops routing override layer to Mihomo config.

This is intentionally independent from subscription source config. It only
patches the local runtime config and points Mihomo at local ops-routing rule
files.
"""

from __future__ import annotations

import sys
from pathlib import Path

import yaml


POLICIES = [
    ("ops-routing-direct", "DIRECT"),
    ("ops-routing-japan", "PROXY-JAPAN"),
    ("ops-routing-ai", "AI-NODES"),
    ("ops-routing-ipv6", "IPV6-NODES"),
    ("ops-routing-proxy", "PROXY"),
]


def provider(name: str) -> dict:
    return {
        "type": "file",
        "behavior": "classical",
        "format": "yaml",
        "path": f"./rules/{name}.yaml",
    }


def main() -> int:
    config_path = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/pi/network/mihomo/config.yaml")
    rules_dir = config_path.parent / "rules"
    rules_dir.mkdir(parents=True, exist_ok=True)
    for name, _policy in POLICIES:
        rule_file = rules_dir / f"{name}.yaml"
        if not rule_file.exists():
            rule_file.write_text("payload: []\n", encoding="utf-8")

    config = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    if not isinstance(config, dict):
        raise SystemExit("mihomo config root is not a map")

    providers = config.setdefault("rule-providers", {})
    if not isinstance(providers, dict):
        raise SystemExit("mihomo rule-providers is not a map")
    for name, _policy in POLICIES:
        providers[name] = provider(name)

    overlay_rules = [f"RULE-SET,{name},{policy}" for name, policy in POLICIES]
    rules = config.setdefault("rules", [])
    if not isinstance(rules, list):
        raise SystemExit("mihomo rules is not a list")
    config["rules"] = [*overlay_rules, *[rule for rule in rules if rule not in overlay_rules]]

    config_path.write_text(yaml.safe_dump(config, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
