CMP website
===========

[Open](https://julesora.github.io/cmp-website/) · [CMP](https://github.com/julesora/cmp)

Generate, check and replay legal moves. Export UCI, SAN or PGN.
The site runs CMP 0.1.2 in your browser. Nothing is saved by the app.

Setup
-----

Python 3.9+ and Node 22.12+.

    python3 -m venv .venv
    .venv/bin/pip install -r requirements-dev.txt
    npm ci

Run
---

    npm run build:pages
    npm run preview:pages

Open the preview URL at `/cmp-website/`.
The first load downloads Python (~13 MB). Processing then works offline.

For server development, run `npm start` and `npm run dev`.

Test
----

    npm run test:api
    npx playwright install chromium
    npm test
    npm run test:pages

Publish
-------

Push to `main`. GitHub Actions tests and deploys to Pages.
Pages must use GitHub Actions as its source.

Credits
-------

[cm-chessboard](https://github.com/shaack/cm-chessboard): MIT.
Standard pieces: Wikimedia Commons, CC BY-SA 3.0; license in the SVG.
[Pyodide](https://github.com/pyodide/pyodide): MPL-2.0.
