Development workflow
====================

Goal
----
Provide a stable, predictable, and fast development workflow for the server and client with minimal reliance on experimental Node flags.

Key principles
--------------
- Build artifacts are the source of truth for production. Run compiled JS in `dist/` for production and CI.
- During development prefer a watch+restart loop that compiles TypeScript and restarts Node on changes.
- For fast iteration, an optional `ts-node-dev` script is available but intended for local dev only.

Recommended scripts (PowerShell)
--------------------------------
# Build server and run (production-like)
npm run build:server
npm run start:server

# Watch server compile + auto-restart on compiled output (stable; no experimental flags)
npm run dev:server:watch

# Fast iteration (single process; use only for local dev)
npm run dev:server:fast

Notes
-----
- `dev:server:watch` runs `tsc --watch` to compile server TypeScript into `dist/server` and uses `nodemon` to restart Node when compiled files change. This avoids experimental loader flags and mirrors production runtime.
- `dev:server:fast` uses `ts-node-dev` for quick restarts. It's significantly faster to iterate but may rely on runtime transforms; do not use it in production.

Tips
----
- If you see import resolution errors at runtime, ensure the code uses explicit `.js` extensions for local imports (the project uses that pattern).
- To debug compiled server code with source maps, Node is run with `--enable-source-maps` (see `start:server`).

If you want, I can add a small `nodemon.json` and a `build:watch` script to further simplify commands.
