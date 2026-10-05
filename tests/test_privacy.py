import re
import tempfile
import unittest
from pathlib import Path

from tools.homenet_privacy import privacy_public_roots, scan_privacy_file


class PrivacyCoverageTest(unittest.TestCase):
    def test_public_roots_include_console_and_maintenance(self) -> None:
        roots = {path.as_posix() for path in privacy_public_roots()}
        self.assertTrue(any(path.endswith("/apps/ops") for path in roots))
        self.assertTrue(any(path.endswith("/maintenance") for path in roots))

    def test_private_instance_marker_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "public.py"
            path.write_text('HOST = "192.0.2.77"\n', encoding="utf-8")
            findings = scan_privacy_file(
                path,
                scope="public",
                extra_patterns=[("high", "private-instance-marker", re.compile(r"192\.0\.2\.77"))],
            )
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]["risk"], "private-instance-marker")

    def test_private_instance_marker_is_allowed_inside_instance(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site.yaml"
            path.write_text('gateway: "192.0.2.77"\n', encoding="utf-8")
            findings = scan_privacy_file(
                path,
                scope="instance",
                extra_patterns=[("high", "private-instance-marker", re.compile(r"192\.0\.2\.77"))],
            )
        self.assertEqual(findings, [])


if __name__ == "__main__":
    unittest.main()
