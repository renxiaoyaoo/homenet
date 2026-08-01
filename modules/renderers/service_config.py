"""Module-owned service configuration review renderers."""

from __future__ import annotations

from typing import Any

from modules.renderers.common import service_config_review_lines


def render_adguard_config_inventory(*, services: list[dict[str, Any]], ports: list[dict[str, Any]]) -> dict[str, Any]:
    lines = service_config_review_lines(
        artifact_id="dns-layer.adguard",
        target_path="adguard/conf/AdGuardHome.yaml",
        title="AdGuard Home service config inventory.",
        note="AdGuard owns home DNS split/filtering; generated output does not include AdGuardHome.yaml values or runtime database content.",
        service_ids=["adguard"],
        services=services,
        ports=ports,
        source_tool="AdGuard Home",
        required_secrets=[],
        dependencies=["mihomo", "gateway-openwrt.dhcp", "dns-layer.domestic-upstreams"],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/service_config.py::render_adguard_config_inventory"}


def render_homenet_ops_runtime_inventory(*, services: list[dict[str, Any]], ports: list[dict[str, Any]]) -> dict[str, Any]:
    lines = service_config_review_lines(
        artifact_id="observability-homenet.ops-compose",
        target_path="apps/ops/docker-compose.yml",
        title="HomeNet Ops runtime inventory.",
        note="HomeNet Ops owns the daily operations entry; generated output does not include image build caches, env values, or runtime state.",
        service_ids=["homenet-ops"],
        services=services,
        ports=ports,
        source_tool="Docker Compose / HomeNet Ops",
        required_secrets=[],
        dependencies=["homenet.metadata.v1", "uptime-kuma", "cloudflared"],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/service_config.py::render_homenet_ops_runtime_inventory"}


def render_home_assistant_config_inventory(*, services: list[dict[str, Any]], ports: list[dict[str, Any]]) -> dict[str, Any]:
    lines = service_config_review_lines(
        artifact_id="smart-home.home-assistant",
        target_path="home-assistant/configuration.yaml",
        title="Home Assistant service config inventory.",
        note="Home Assistant owns smart-home automations and integrations; generated output does not include HA secrets or storage data.",
        service_ids=["home-assistant"],
        services=services,
        ports=ports,
        source_tool="Home Assistant",
        required_secrets=["HOME_ASSISTANT_TOKEN", "MQTT_PASSWORD"],
        dependencies=["mosquitto", "zigbee2mqtt", "go2rtc"],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/service_config.py::render_home_assistant_config_inventory"}


def render_mosquitto_config_inventory(*, services: list[dict[str, Any]], ports: list[dict[str, Any]]) -> dict[str, Any]:
    lines = service_config_review_lines(
        artifact_id="smart-home.mosquitto",
        target_path="mosquitto/config/",
        title="Mosquitto MQTT service config inventory.",
        note="Mosquitto owns the MQTT broker surface; generated output does not include broker password files.",
        service_ids=["mosquitto"],
        services=services,
        ports=ports,
        source_tool="Mosquitto MQTT",
        required_secrets=["MQTT_PASSWORD"],
        dependencies=["home-assistant", "zigbee2mqtt"],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/service_config.py::render_mosquitto_config_inventory"}


def render_zigbee2mqtt_config_inventory(*, services: list[dict[str, Any]], ports: list[dict[str, Any]]) -> dict[str, Any]:
    lines = service_config_review_lines(
        artifact_id="smart-home.zigbee2mqtt",
        target_path="zigbee2mqtt/configuration.yaml",
        title="Zigbee2MQTT service config inventory.",
        note="Zigbee2MQTT owns the Zigbee bridge surface; generated output does not include coordinator secrets or MQTT password values.",
        service_ids=["zigbee2mqtt"],
        services=services,
        ports=ports,
        source_tool="Zigbee2MQTT",
        required_secrets=["MQTT_PASSWORD"],
        dependencies=["mosquitto", "home-assistant"],
    )
    return {"lines": lines, "implementation_surface": "modules/renderers/service_config.py::render_zigbee2mqtt_config_inventory"}
