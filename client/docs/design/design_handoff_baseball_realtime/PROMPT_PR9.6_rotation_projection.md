# Build — Upcoming tab: rotation-projected starters (PR 9.6)

You are in the `baseball-realtime` client + API (React 19 + Vite + TS; Nest-style service layer). This adds the **rotation-projection** feature to the Player → **Upcoming** tab: when MLB hasn't posted a probable starter for an upcoming game, project the opponent's likely starter from their recent rotation order, flagged as `Projected` with a decaying confidence — instead of a dead "TBD" card. **Do only this.**

> Design source: `holistic/player-upcoming.jsx` (`window.UpcomingTab`). The components, config, and demo data already exist there — port them. This PR wires them to real data.
> Context: extends the Upcoming tab shipped in PR 9 / PR 9.5a / PR 9.5b. Unparks `future.md` **F-001 item #2**.

## Why now

F-001 #2 was parked with one blocker: *"confirm the API exposes the starter of each recent game."* **That is now confirmed — yes.** So the projection is computable. This is **NOT a Statcast-class gap** — it's schedule + recent-starters data the MLB feed already exposes.

## What it does (already designed — port verbatim)

Each upcoming game carries a `starter` object with one of three states:

```ts
starter:
  | { status: 'confirmed' }                                              // MLB posted the probable
  | { status: 'projected'; confidence: 'High'|'Medium'|'Low';
      lastStart: string; basis: string }                                 // we projected it
  | { status: 'tbd' }                                                    // can't even project
```

Surfaces (all in `player-upcoming.jsx`):
- **`StarterChip`** — on the game rail + the deep-dive header. Shows `Confirmed` (green dot) / `Projected · {confidence}` (navy dot) / `TBD` (grey dot). Config: `STARTER` map + `CONF_W` (High .92 / Medium .58 / Low .30) + `CONF_FILL` (High `positive` / Medium `highlight` / Low `accent`).
- **Dashed headshot ring** on projected cards (the `outline: 1.5px dashed info` on the `Headshot` wrapper when `status==='projected'`).
- **`ProjectionBanner`** — in the deep-dive, rendered only when `status !== 'confirmed'`: a dashed-navy strip with **"PROJECTED STARTER · not an announced probable"**, the **`basis`** sentence (plain-language rotation reasoning), and a **Confidence meter** (label + bar filled to `CONF_W[confidence]`).
- **`ReadCard`** subtitle reframes to **"Projection · if he takes his turn"** when projected (vs "Pre-game projection" when confirmed).
- A true **`status:'tbd'`** fallback for when even a projection can't be made (rotation in flux / no recent-starts data) — keeps the existing TBD chip, no banner.

Confirmed games are unchanged — full-authority probable, green `Confirmed` chip, no banner, no dashed ring. **A projection must NEVER wear the authority of a confirmed probable** (different dot color, "not an announced probable" caption, dashed ring, confidence meter).

## API / data requirements

Per upcoming game, the tab needs the `starter` object resolved server-side. Inputs:

1. **Schedule lookahead** — the player's team's next ~3 scheduled games (date, time, home/away, opponent, venue). *Already needed by PR 9.5a — reuse.*
2. **Confirmed probable, where posted** — MLB's announced probable pitcher for a game, when it exists → `status: 'confirmed'` + the full `pitcher` object. (MLB typically posts probables ~1 day out, so game 1 is often confirmed and games 2–3 often not.)
3. **Recent-starters-per-game for the opponent** *(the newly-confirmed data)* — the opponent's starting pitcher for each of their last ~N games, **in date order**. This is what unblocks the projection: it yields the rotation sequence.
4. **Pitcher metadata** for whichever pitcher is chosen (confirmed or projected): `name`, `throws` (L/R), `num`, `mlbId` (for the headshot — may be `null` for a fresh call-up → initials fallback), season `record`, `era`, plus `rookie` flag. *Same shape PR 9.5a already resolves for confirmed starters — reuse for projected ones.*

No Statcast, no new external provider — all four come from the MLB schedule + game feeds the app already consumes.

## Projection algorithm (server-side)

For a game with no confirmed probable:

1. Build the opponent's **rotation order** = the distinct starting pitchers from their recent games, in the sequence they last started (most-recent cycle).
2. Count the opponent's **games between now and the target date** (from the schedule), accounting for **off-days**.
3. The projected starter = advance through the rotation by that game count (modulo rotation size, typically 5) from the most recent starter.
4. **Confidence decays** by distance + disruption:
   - **High** — ~1 turn out, normal rest, no intervening off-day that could realign/skip.
   - **Medium** — ~2 turns out, OR an off-day in the window that could let them skip/realign.
   - **Low** — ~3 turns out / rotation in flux / recent doubleheader or spot-start noise.
5. **`basis`** = a short generated sentence stating the reasoning ("On turn behind {lastStarter}, on normal {N} days' rest." / "Next in {team}'s order, but an off-day {date} could let them skip or realign."). `lastStart` = the chosen pitcher's most recent start ("Jun 2 vs CWS").
6. If the rotation can't be resolved (too few recent starts, data gap, rotation visibly in flux) → **`status: 'tbd'`**, not a low-confidence guess.

Keep the algorithm in the service layer; the client just renders the resolved `starter` object.

## Must-not-break
- **Confirmed path is unchanged** — same look/data as PR 9.5a; the projection logic only fires when no probable is posted.
- A projection is **visually subordinate** to a confirmed probable (navy not green, dashed ring, "not an announced probable", confidence meter) — never present a projection as confirmed.
- Numerals mono + `tabular-nums` (record/ERA, confidence values).
- The `mlbId: null` rookie path must still fall back to initials (no broken headshot) — and a sparse-Statcast rookie's arsenal section stays governed by **F-001 #1** (still parked; out of scope here).
- Don't touch the other Upcoming sections' data (H2H, arsenal, arsenal-vs-bat, splits, heat map) or the other five tabs.

## Acceptance
- Game 1 (probable posted) shows **Confirmed** (green), no banner, no dashed ring.
- A game with no posted probable shows **Projected · {confidence}** (navy), a **dashed headshot ring**, and a **PROJECTED STARTER** banner with a real `basis` sentence + confidence meter — and the projected pitcher matches the opponent's actual rotation turn.
- Confidence varies by game (further-out / off-day games read lower).
- A game whose rotation can't be resolved shows **TBD** (grey), no banner — not a fabricated projection.
- `ReadCard` subtitle reads "Projection · if he takes his turn" for projected games.
- No Statcast dependency; data is schedule + recent-starters + existing pitcher metadata.

Open one PR titled **"PR 9.6 — Upcoming tab: rotation-projected starters."** Note it unparks `future.md` F-001 #2 and is **not** gated on Statcast (uses schedule + recent-starters-per-game, now confirmed available); F-001 #1 (sparse-Statcast rookie arsenal) and #3 (no-games empty state) remain parked.
