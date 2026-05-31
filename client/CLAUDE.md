# Baseball Realtime — Client

React 19 + Vite 7 + TypeScript. Vanilla CSS per component (no Tailwind/CSS-in-JS/UI lib).

## Design redesign in progress

A holistic redesign ("editorial scorebook" — cream base, DM Sans UI, JetBrains Mono
for ALL numerals) is being ported in. **Before doing any UI work, read the design specs:**

- `docs/design/design_handoff_baseball_realtime/MIGRATION.md` — integration plan,
  PR-by-PR order, token map, and per-PR fidelity notes. READ THIS FIRST.
- `docs/design/design_handoff_baseball_realtime/README.md` — full design spec
  (tokens, components, per-screen layouts).
- `docs/design/design_handoff_baseball_realtime/holistic/*.jsx` — the reference
  design (open `Holistic.html` in a browser to view). Port these screens.

### Migration status
- PR 1 (tokens + fonts) — DONE
- PR 2 (Today's Games / DailyGamesPage) — DONE
- PR 3 (Game view / GamePage) — IN PROGRESS. Port `holistic/game-v2.jsx`
  (`window.GameScreenV2`), NOT the superseded `game.jsx`. See the PR 3 "fidelity
  notes" block in MIGRATION.md — especially: port `StrikeZone` verbatim (don't
  reimplement), use in-app team logos + portrait (2:3) player headshots, one LIVE
  pill only, Lineups button lives in the play-state eyebrow.
- PR 4 (Player view — Overview + Stats) — not started
- PR 5 (sweep + Splits/Pitching/History) — not started

### Hard rules
- ALL numbers use mono + tabular-nums. Sans is for labels/prose only.
- Reserve the rust accent for live/hot state, not decoration.
- Don't touch Standings / Leaders / Settings (out of scope this pass).