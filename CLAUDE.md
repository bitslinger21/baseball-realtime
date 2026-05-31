# Baseball Realtime — Monorepo

- `client/` — React 19 + Vite 7 + TS frontend
- `api/` — NestJS backend (URLs use the `api/` prefix)

## Active work: frontend holistic redesign

A design redesign is being ported into `client/`. Before ANY UI work in `client/`,
read `client/CLAUDE.md` and `client/docs/design/design_handoff_baseball_realtime/MIGRATION.md`.
Current focus: PR 3 (Game view) — port `holistic/game-v2.jsx`, not `game.jsx`.
