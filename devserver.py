#!/usr/bin/env python3
import http.server
import socketserver
import sys
import socket

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
HOST = sys.argv[2] if len(sys.argv) > 2 else "localhost"

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

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

