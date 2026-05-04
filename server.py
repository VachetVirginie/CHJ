from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8888
SPA_ROUTES = ("/admin-qr", "/tableau/")

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/admin-qr" or path.startswith("/tableau/"):
            self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    Path.cwd()
    server = ThreadingHTTPServer(("", PORT), Handler)
    print(f"Server running at http://localhost:{PORT}")
    server.serve_forever()
