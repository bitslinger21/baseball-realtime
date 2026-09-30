# Baseball Realtime — Monorepo

- `client/` — React 19 + Vite 7 + TS frontend
- `api/` — NestJS backend (URLs use the `api/` prefix)

## Active work: frontend holistic redesign

A design redesign is being ported into `client/`. Before ANY UI work in `client/`,
read `client/CLAUDE.md` and `client/docs/design/design_handoff_baseball_realtime/MIGRATION.md`.

## Process

The AI-DLC workflow is retired (Sep 30, 2026). `aidlc-docs/` and
`.aidlc-rule-details/` are kept as history only; nothing needs to be logged
there. UI work follows the design-handoff prompts in
`client/docs/design/design_handoff_baseball_realtime/`.
