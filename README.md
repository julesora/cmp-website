CMP Website
===========

A web interface for Chess Mnemonic Protocol (CMP).
Generate, check and replay legal moves. Export UCI, SAN or PGN.

Website: https://julesora.github.io/cmp-website/

Setup
-----

Requires Python 3.9+ and Node 22.12+.

    python3 -m venv .venv
    .venv/bin/pip install -r requirements-dev.txt
    npm ci

Browser
-------

Build and start the preview:

    npm run build:pages
    npm run preview:pages

Open the preview URL with /cmp-website/ at the end.

This version runs CMP in your browser. The first load downloads Python
(about 13 MB). Processing works offline while the page stays open.
Nothing is saved by the app.

Server
------

Start the Python server:

    npm start

In another terminal, start the frontend:

    npm run dev

Open the URL shown by Vite. This version sends inputs to your local
Python server.

Test
----

Install the test browser once:

    npx playwright install chromium

Test the API and server interface:

    npm run test:api
    npm test

Build and test the browser version:

    npm run build:pages
    npm run test:pages

Files
-----

* server/workbench.py: shared CMP operations
* server/app.py: HTTP API
* src/main.js: interface and board controls
* src/client.js: server and browser requests
* src/worker.js: Python browser worker
* scripts/browser.py: browser runtime files
* tests/: API and browser tests

Credits
-------

* [CMP][cmp] provides the protocol and chess rules.
* [cm-chessboard][board] provides the board visualiser. MIT license.
* [Pyodide][pyodide] runs Python in the browser. MPL-2.0 license.
* [FastAPI][fastapi] serves the local API. MIT license.
* [Vite][vite] builds and serves the frontend. MIT license.

The [standard chess pieces][pieces] are by Cburnett and Rfc1394, adapted
by Stefan Haack for cm-chessboard. They use the CC BY-SA 3.0 license.
The original attribution and license are included in the SVG file.

[cmp]: https://github.com/julesora/cmp
[board]: https://github.com/shaack/cm-chessboard
[pyodide]: https://github.com/pyodide/pyodide
[fastapi]: https://github.com/fastapi/fastapi
[vite]: https://github.com/vitejs/vite
[pieces]: https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces/Standard
