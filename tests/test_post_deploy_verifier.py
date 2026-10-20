"""Static safeguards around the read-only V1.5 operator verification script."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
VERIFY = ROOT / "scripts" / "verify-lab-v15.sh"


class VerificationScriptContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.script = VERIFY.read_text(encoding="utf-8")

    def test_script_is_executable_by_bash(self):
        self.assertTrue(self.script.startswith("#!/usr/bin/env bash"))

    def test_only_reads_docker_state_and_sends_synthetic_requests(self):
        script = self.script
        self.assertIn("docker inspect", script)
        self.assertIn("docker network inspect", script)
        self.assertIn("docker port", script)
        self.assertIn('exec -T lab-n8n node', script)
        self.assertNotIn("docker compose up", script)
        self.assertNotIn("docker compose down", script)
        self.assertNotIn("docker run ", script)
        self.assertNotIn("docker restart ", script)
        self.assertNotIn("docker rm ", script)
        self.assertNotIn("docker volume rm ", script)

    def test_fails_closed_on_network_and_ports(self):
        script = self.script
        self.assertIn("automation-sandbox-lab_lab-only", script)
        self.assertIn("127.0.0.1:5688", script)
        self.assertIn("EGRESS EXTERNO POSSIVEL", script)
        self.assertIn("https://example.com", script)
        self.assertIn("BLOQUEADO", script)

    def test_verifies_mocks_are_not_deliveries(self):
        script = self.script
        self.assertIn("http://lab-mock:8080/mock/notify", script)
        self.assertIn("b.delivered===false", script)
        self.assertIn("fail?503:200", script)

    def test_never_displays_environment_file(self):
        script = self.script
        self.assertNotIn("cat $env_file", script)
        self.assertNotIn("env |", script)
        self.assertNotIn("printenv", script)
        self.assertNotIn("docker inspect -f '{{json .Config.Env}}'", script)


if __name__ == "__main__":
    unittest.main()
