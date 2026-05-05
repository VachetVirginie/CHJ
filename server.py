from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 8888
SPA_ROUTES = ("/chj", "/tableau/")

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/chj" or path.startswith("/chj/") or path.startswith("/tableau/"):
            self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    Path.cwd()
    server = ThreadingHTTPServer(("", PORT), Handler)
    print(f"Server running at http://localhost:{PORT}")
    server.serve_forever()
