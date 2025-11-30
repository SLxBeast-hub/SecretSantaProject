#!/usr/bin/env python3
import http.server
import socketserver
import os
import json
import threading
from urllib.parse import urlparse, parse_qs

PORT = 5000
DIRECTORY = "."

DATA_FILE = "data.json"
DATA_LOCK = threading.Lock()

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _read_data(self):
        with DATA_LOCK:
            if not os.path.exists(DATA_FILE):
                default = {
                    "numbers": [
                        {"name": "Shehan", "picked_by": None},
                        {"name": "Shehani", "picked_by": None},
                        {"name": "Sonal", "picked_by": None},
                        {"name": "Shamen", "picked_by": None}
                    ]
                }
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(default, f, indent=2)
                return default
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)

    def _write_data(self, obj):
        with DATA_LOCK:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(obj, f, indent=2)

    def client_ip(self):
        xff = self.headers.get('X-Forwarded-For')
        if xff:
            return xff.split(",")[0].strip()
        return self.client_address[0]

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            data = self._read_data()
            ip = self.client_ip()
            my_pick = None
            for idx, n in enumerate(data["numbers"]):
                if n.get("picked_by") == ip:
                    my_pick = idx
                    break
            out = {"numbers": [], "my_pick": my_pick}
            for n in data["numbers"]:
                out["numbers"].append({
                    "name": n["name"],
                    "picked": n["picked_by"] is not None,
                    "picked_by_me": n["picked_by"] == ip
                })
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(out).encode("utf-8"))
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/pick":
            content_length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(content_length) if content_length else b"{}"
            try:
                payload = json.loads(raw.decode("utf-8"))
            except:
                payload = {}
            if "index" not in payload:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "missing index"}).encode("utf-8"))
                return

            idx = int(payload["index"])
            ip = self.client_ip()
            data = self._read_data()

            if idx < 0 or idx >= len(data["numbers"]):
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "index out of range"}).encode("utf-8"))
                return

            already_picked = None
            for i, n in enumerate(data["numbers"]):
                if n.get("picked_by") == ip:
                    already_picked = i
                    break

            if already_picked is not None and already_picked != idx:
                self.send_response(403)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "You already picked a number", "your_pick": already_picked}).encode("utf-8"))
                return

            if data["numbers"][idx].get("picked_by") is not None and data["numbers"][idx].get("picked_by") != ip:
                self.send_response(409)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Number already taken"}).encode("utf-8"))
                return

            data["numbers"][idx]["picked_by"] = ip
            self._write_data(data)

            resp = {"ok": True, "index": idx, "name": data["numbers"][idx]["name"]}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return
        return super().do_POST()

class ReuseAddrTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

with ReuseAddrTCPServer(("0.0.0.0", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running at http://0.0.0.0:{PORT}/")
    httpd.serve_forever()
