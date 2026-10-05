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


if __name__ == "__main__":
    unittest.main()
