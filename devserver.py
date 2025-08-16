#!/usr/bin/env python3
import http.server
import socketserver
import sys
import socket
import os
import re

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
HOST = sys.argv[2] if len(sys.argv) > 2 else "localhost"

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    CSP_DEV = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src-elem 'self' 'unsafe-inline'; script-src-attr 'none'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'"

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        # Development CSP: disable upgrade-insecure-requests on localhost
        self.send_header('Content-Security-Policy', self.CSP_DEV)
        super().end_headers()

    def do_GET(self):
        # Intercept index.html and strip the meta CSP upgrade directive for Safari
        if self.path in ('/', '/index.html'):
            path = self.translate_path('/index.html')
            if os.path.isfile(path):
                try:
                    with open(path, 'rb') as f:
                        data = f.read()
                    text = data.decode('utf-8', errors='replace')
                    # Remove any meta CSP tags entirely in dev to avoid Safari upgrade
                    text = re.sub(r'<meta[^>]*http-equiv=["\']Content-Security-Policy["\'][^>]*>\s*', '', text, flags=re.IGNORECASE)
                    body = text.encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
                except Exception:
                    pass
        return super().do_GET()

    def guess_type(self, path):
        if path.endswith('.js'):
            return 'text/javascript'
        if path.endswith('.css'):
            return 'text/css'
        if path.endswith('.webmanifest'):
            return 'application/manifest+json'
        return super().guess_type(path)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def try_bind(host: str, port: int, attempts: int = 10):
    last_err = None
    current = port
    for _ in range(attempts):
        try:
            httpd = ReusableTCPServer((host, current), NoCacheHandler)
            return httpd, current
        except OSError as e:
            last_err = e
            if getattr(e, 'errno', None) == 48:  # Address already in use
                current += 1
                continue
            raise
    raise last_err

httpd, bound_port = try_bind(HOST, PORT)
print(f"Serving at http://{HOST}:{bound_port}")
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    httpd.server_close()

