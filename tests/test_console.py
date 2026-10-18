import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from apps.ops import app


class ConsoleDiagnosticsTest(unittest.TestCase):
    def test_wifi_errors_reports_group_key_failure(self) -> None:
        result = app.parse_wifi_errors("hostapd: WPA: group key handshake failed")
        self.assertEqual(result["status"], "warn")
        self.assertIn("1", result["detail"])

    def test_wifi_errors_ok_without_events(self) -> None:
        result = app.parse_wifi_errors("")
        self.assertEqual(result["status"], "ok")

    def test_successful_refresh_clears_stale_errors(self) -> None:
        app.STATE["errors"] = ["stale"]
        empty_checks = {"ok": True, "checks": []}
        empty_devices = {"ok": True, "items": [], "summary": {}}
        with (
            patch.object(app, "load_metadata", AsyncMock(return_value={})),
            patch.object(app, "probe_services", AsyncMock(return_value=([], []))),
            patch.object(app, "probe_foundation_checks", AsyncMock(return_value=empty_checks)),
            patch.object(app, "probe_network_diagnostics", AsyncMock(return_value=empty_checks)),
            patch.object(app, "probe_devices", AsyncMock(return_value=empty_devices)),
            patch.object(app, "build_console", return_value={}),
        ):
            asyncio.run(app.refresh_state())
        self.assertEqual(app.STATE["errors"], [])

    def test_dynamic_device_is_matched_by_mac(self) -> None:
        metadata = {
            "devices": [{
                "id": "phone",
                "name": "Phone",
                "macs": ["02:00:00:00:00:01"],
                "presence": "optional",
            }]
        }
        router_output = "\n".join([
            "__LEASES__",
            "9999999999 02:00:00:00:00:01 192.0.2.216 iPhone *",
            "__NEIGH__",
            "192.0.2.216 dev br-lan lladdr 02:00:00:00:00:01 REACHABLE",
        ])
        with (
            patch.object(app, "instance_device_details", return_value={}),
            patch.object(app, "run_text_command", AsyncMock(return_value=router_output)),
        ):
            result = asyncio.run(app.probe_devices(metadata))

        self.assertEqual(result["summary"]["unknown_count"], 0)
        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(result["items"][0]["id"], "phone")
        self.assertEqual(result["items"][0]["ip"], "192.0.2.216")
        self.assertEqual(result["items"][0]["status"], "ok")


if __name__ == "__main__":
    unittest.main()
