import http.server
import socketserver

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving HTTP on port {PORT}...")
    print(f"Access transmitter at: http://localhost:{PORT}/transmitter.html")
    print(f"Access receiver at: http://localhost:{PORT}/receiver.html")
    httpd.serve_forever()
