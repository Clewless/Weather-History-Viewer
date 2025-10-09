Development workflow
====================

Goal
----
Provide a stable, predictable, and fast development workflow for the server and client.

Key principles
--------------
- Build artifacts are the source of truth for production. Run compiled JS for production.
- During development prefer a watch+restart loop that compiles TypeScript and restarts Node on changes.

Recommended scripts
--------------------------------
# Build and run server
npm run build
npm run start:server

# Run development server with auto-restart
npm run dev:server

# Run both client and server for development
npm run start:all

# Run tests
npm run test

# Lint code
npm run lint