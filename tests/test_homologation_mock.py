import importlib.util
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "examples" / "homologation"
SPEC = importlib.util.spec_from_file_location("lab_mock", SRC / "mock" / "server.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class IsolatedMockTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), MODULE.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=3)

    def request(self, path, data=None):
        body = None if data is None else json.dumps(data).encode("utf-8")
        req = Request(self.base + path, data=body)
        try:
            with urlopen(req, timeout=3) as response:
                return response.status, json.load(response)
        except HTTPError as exc:
            return exc.code, json.load(exc)

    def test_health_is_synthetic(self):
        status, payload = self.request("/health")
        self.assertEqual(status, 200)
        self.assertTrue(payload["mock"])

    def test_success_acknowledges_without_sending(self):
        status, payload = self.request(
            "/mock/notify",
            {"caseId": "S01", "message": "test", "simulateFailure": False},
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["accepted"])
        self.assertFalse(payload["delivered"])

    def test_mock_supports_failure_injection(self):
        status, payload = self.request(
            "/mock/notify",
            {"caseId": "S02", "message": "test", "simulateFailure": True},
        )
        self.assertEqual(status, 503)
        self.assertFalse(payload["delivered"])

    def test_unrecognized_path_is_never_proxied(self):
        status, payload = self.request("/external-api")
        self.assertEqual(status, 404)
        self.assertTrue(payload["mock"])

    def test_invalid_payload_is_rejected(self):
        status, payload = self.request("/mock/notify", {"token": "sensitive"})
        self.assertEqual(status, 400)
        self.assertTrue(payload["mock"])

    def test_compose_is_scoped_and_local(self):
        compose = (SRC / "compose.lab.yml").read_text(encoding="utf-8")
        self.assertIn("internal: true", compose)
        self.assertIn("127.0.0.1:5688:5678", compose)
        self.assertIn("lab-n8n-state:/home/node/.n8n", compose)
        self.assertIn("LAB_ENCRYPTION_KEY", compose)
        self.assertNotIn("docker.sock", compose)
        self.assertNotIn("network_mode: host", compose)

    def test_local_env_is_gitignored(self):
        ignore = (SRC / ".gitignore").read_text(encoding="utf-8")
        self.assertIn(".env.lab", ignore)


if __name__ == "__main__":
    unittest.main()
