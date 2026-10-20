#!/usr/bin/env python3
"""Mock-only HTTP server for an isolated demonstration lab.

No authentication, database, outbound networking, or production services.
Never publish this service on a real interface or connect production networks.
"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        # Avoid storing payloads, IDs or messages in access logs.
        pass

    def send_json(self, code, payload):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlsplit(self.path).path != "/health":
            return self.send_json(404, {"error": "not_found", "mock": True})
        self.send_json(200, {"status": "ok", "mock": True, "service": "lab-mock"})

    def do_POST(self):
        if urlsplit(self.path).path != "/mock/notify":
            return self.send_json(404, {"error": "not_found", "mock": True})
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = -1
        if size < 2 or size > 2048:
            return self.send_json(413, {"error": "payload_size_invalid", "mock": True})
        try:
            data = json.loads(self.rfile.read(size))
        except (json.JSONDecodeError, ValueError):
            return self.send_json(400, {"error": "invalid_json", "mock": True})
        if not isinstance(data, dict) or set(data) != {"caseId", "message", "simulateFailure"}:
            return self.send_json(400, {"error": "invalid_contract", "mock": True})
        if not (isinstance(data["caseId"], str) and data["caseId"].startswith("S")
                and len(data["caseId"]) <= 12
                and isinstance(data["message"], str) and len(data["message"]) <= 80
                and isinstance(data["simulateFailure"], bool)):
            return self.send_json(400, {"error": "invalid_fields", "mock": True})
        if data["simulateFailure"]:
            return self.send_json(503, {"accepted": False, "delivered": False,
                                        "mock": True, "error": "simulated_service_failure"})
        self.send_json(200, {"accepted": True, "delivered": False, "mock": True,
                             "caseId": data["caseId"]})


if __name__ == "__main__":
    print("Synthetic mock listening on isolated port 8080", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
