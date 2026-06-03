# Claude Code kickoff prompt — Baseball Realtime redesign

Paste the block below into a Claude Code session running in the `baseball-realtime` repo. It grounds the session on the handoff docs, then scopes the next PR.

> **Status going in:** PR 1 (tokens/fonts), PR 2 (Today's Games), and PR 3 (Game view through `PitcherCard`) are merged. PR 3.5 (win-prob + leverage) is blocked on new API data. **The next buildable chunk is PR 4 — the Player view.**

---

## Prompt to paste

```
You are porting a signed-off design into the existing Baseball Realtime client
(React 19 + Vite 7 + TypeScript + react-router-dom v7, vanilla CSS per component —
no Tailwind, no CSS-in-JS, no UI lib).

Ground yourself first — read, in this order, and follow them as the source of truth:
  1. design_handoff_baseball_realtime/README.md      (design spec — tokens, components, screen specs)
  2. design_handoff_baseball_realtime/MIGRATION.md    (codebase integration plan, PR-sized)
  3. design_handoff_baseball_realtime/holistic/shared.jsx  (tokens + atoms — port these verbatim where noted)
  4. design_handoff_baseball_realtime/holistic/player.jsx  (the screen you're building)
Open design_handoff_baseball_realtime/Holistic.html in a browser to see the target.

PR 1, PR 2, and PR 3 are already merged. Do NOT touch PR 3.5 (win-prob + leverage —
blocked on new API data) or the landing/game screens.

BUILD PR 4 — Player view (/player/:mlbId): the three signed-off tabs only —
Overview, Stats, and Splits. See MIGRATION.md §5 "PR 4" and README §3.

Scope:
- Build PlayerPage.tsx with the full-width PlayerHero band (NO left sidebar) shared
  across tabs, then Overview, Stats, and Splits tab bodies.
- Render Pitching and History as "Coming soon" placeholders so the tab nav is complete
  but the bodies stay empty (they're built in the design but not yet signed off).
- New primitives this PR needs (port into components/primitives/, reuse — don't reinvent):
  Tabs, Th/Td/Tr, Sparkline, TeamMark, VBar, and the inline hot-zone heat-map cell.
- Hero buttons are in scope:
  * "Watch live ▸"  → navigate(`/game/${providerGameId}`)
  * "Compare ▾"     → anchored player-picker popover, shipped as a FAKE-DOOR
    (search input wired to player search; selecting a player leads to a
    "Notify me when this ships" CTA → green confirmation; do NOT build the
    side-by-side comparison view). Fire window.track() events
    compare_opened / compare_player_selected / compare_notify_requested.
- Port the shared.jsx focus-ring reset (default ring off on click; accent :focus-visible
  for keyboard) and the window.track() stub.

Hold these rules (they've bitten prior ports — see README + MIGRATION fidelity notes):
- ALL numbers use the mono font (JetBrains Mono) + font-variant-numeric: tabular-nums.
  Sans is for labels and prose only. This is the single most important rule.
- Player photos render through the shared Headshot atom — PORTRAIT (taller than wide),
  object-position: center top, initials fallback. Never a 1:1 square (it clips the chin).
- Stats + Splits are TABLES, not card grids. (The user explicitly rejected card grids here.)
- The context-aware AppHeader return ("← Back to game" when arrived from a game, else
  "← Today's games" → /) is derived from the route the user came from — never hardcoded.
- Splits: six tables; the category rail filters which render (every option resolves to a
  real table), the timeframe rail is controlled + updates a caption (only the 2026 dataset
  exists in the mock — wire timeframes to the splits API range param to refetch).

Work in PR-sized commits. After the hero + each tab, stop and let me review before moving on.
Don't redesign — match holistic/player.jsx. Flag any API data gaps rather than blocking.
```

---

---

## Prompt to paste — PR 6: Player Pitching tab (review-port)

This tab is **built in the design but NOT yet signed off** — the goal of the port is to get it
into the real app so the design owner can review it, then approve or request changes. Build it
AFTER PR 4 (it graduates out of the "Coming soon" placeholder). See MIGRATION.md §5 "PR 6" and
README §3 Tab 3.

```
You are porting a built-but-unreviewed design tab into the existing Baseball Realtime client
(React 19 + Vite 7 + TypeScript + react-router-dom v7, vanilla CSS per component —
no Tailwind, no CSS-in-JS, no UI lib).

Ground yourself first — read, as the source of truth:
  1. design_handoff_baseball_realtime/README.md      (§3 Tab 3 — Pitching; + Notes & Caveats)
  2. design_handoff_baseball_realtime/MIGRATION.md    (§5 "PR 6")
  3. design_handoff_baseball_realtime/holistic/player.jsx  (port the Pitching tab verbatim)
Open design_handoff_baseball_realtime/Holistic.html in a browser to see the target.

PR 4 is merged (Player hero + Overview/Stats/Splits; Pitching + History are "Coming soon"
placeholders). BUILD PR 6 — graduate the Pitching tab out of its placeholder. Do NOT touch
the History tab (it stays a placeholder) or any other screen. Port verbatim — don't redesign.

What the tab is: "How pitchers attack this BATTER." It is batter-scoped.

Components to port (match holistic/player.jsx exactly):
- New atom Donut (inline SVG) — the pitch-mix ring, center reads "SEEN / {count}".
- "Pitch mix" card — Donut + usage-% legend per pitch type.
- "Performance vs pitch type" table — columns Pitch | AVG | SLG | Whiff, where the SLG cell
  EMBEDS a small colored bar beside the value (there is NO separate SLG-bar column).
- "Damage by location" — a 3×3 SLG heat map (the HotZone component, NOT StrikeZone) + insight line.
- "By pitcher handedness" table — FB%/BB%/OS%/Zone%/First-pitch strike/Put-away for LHP/RHP.
- "Counts attacked" card — a single 3-column × 2-row grid (6 tiles, no divider/eyebrow).
  Row 1: 0-2 Slider · 1-2 Slider · Ahead Sinker.  Row 2: 2-2 4-Seam · 3-2 4-Seam · Behind 4-Seam.
  The four two-strike tiles have a SOLID border and show TWO labeled mono numbers — thrown %
  and put-away K % (K rate accented rust). The two count-state tiles (Ahead / Behind, 3rd column)
  have a DASHED border and show a single thrown %. Dashed vs solid carries the state-vs-count
  distinction — preserve it.

Three settled decisions (Jun 2, 2026) — honor them, do not "fix" them:
1. KEEP the bright per-pitch color palette (four-seam #dc2626, sinker #ea580c, slider #0891b2,
   curve #3b82f6, change #16a34a, cutter #a3a3a3). It is a SANCTIONED EXCEPTION to the
   cream/rust/navy token system — do NOT remap these to token tints.
2. The top filter rail (All / vs LHP / vs RHP / In strike zone / Outside zone) is DISPLAY-ONLY —
   render it but leave it inert (no per-filter data in the mock yet). Same posture as Splits timeframe.
3. Batter-scoped. On a PITCHER's profile this tab is meaningless — render a
   "Pitcher arsenal — coming separately" placeholder there so the tab nav doesn't break.

Hold the global rules: ALL numbers use mono (JetBrains Mono) + tabular-nums; sans for labels/prose
only. Data note: the tab needs pitch-level data (mix %, per-pitch AVG/SLG/whiff, location SLG,
count-attack tendencies) — if the API doesn't expose it yet, port with the mock data for the
visual review and wire real data after sign-off (same gating pattern as PR 3.5).

When it renders at parity, STOP and tell me it's ready for design-owner review — do not assume
sign-off. Be ready to make changes after review.
```

---

## After PR 4 / PR 6

In rough order, the remaining chunks (all specced in MIGRATION.md §5):

- **PR 3.5** — Win probability + Leverage row on the game view. *Blocked on new API data* (win-prob time series + leverage index). Design is signed off; port `WinProbTimeline` + `LeverageCard` from `game-v2.jsx` verbatim once the data exists.
- **PR 5** — Sweep + polish (kill stale grays, delete dead CSS).
- **History tab** — built but unreviewed; follows the same review-port pattern as the Pitching tab (PR 6) in a later PR.

Re-generate a prompt for any other PR by swapping the "BUILD" block for that PR's section in `MIGRATION.md`.
