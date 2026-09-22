"""Serve the exported app locally for concurrent browser tests."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewServer(ThreadingHTTPServer):
    # Parallel browser contexts open bursts of asset connections. The standard
    # server's small backlog on older Python versions can reset those requests.
    request_queue_size = 128


if __name__ == "__main__":
    directory = Path(__file__).resolve().parents[1] / "dist"
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    with PreviewServer(("127.0.0.1", 4173), handler) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
