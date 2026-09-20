CMP website
===========

A plain workbench for [CMP](https://github.com/julesora/cmp).
Uses CMP 0.1.2, FastAPI, Vite and cm-chessboard.

Run
---

Requires Python 3.9+ and Node 22.12+.

    python3 -m venv .venv
    .venv/bin/pip install -r requirements-dev.txt
    npm ci
    npm run build
    npm start

Open http://127.0.0.1:8000.
For development, also run `npm run dev` and open its URL.

Use
---

Paste a cmp1 sequence and choose Check. Step through moves, add legal
moves, normalize text, or copy/download UCI, SAN and PGN. Editing at an
earlier move replaces the following moves. Sequences are limited to 256 moves.

Inputs go to your running Python server. Nothing is saved by the app.
CMP is a chess notation format; this version has no secret/password API.

Test
----

    npm run test:api
    npx playwright install chromium
    npm test

Browser tests start both development servers automatically.

Credits
-------

[cm-chessboard](https://github.com/shaack/cm-chessboard) is MIT licensed.
Its standard chess pieces are from Wikimedia Commons, CC BY-SA 3.0;
see the license in the bundled SVG. CMP is installed as a pinned package.
