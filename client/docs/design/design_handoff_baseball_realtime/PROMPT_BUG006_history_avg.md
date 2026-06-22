# Backend — BUG-006: real running season-to-date AVG on the History game log

You are working in the **`baseball-realtime` backend** (ingests MLB data, maps to domain types, serves the client). **Do only this. Touch nothing else.**

> Cleanup, not expansion. No new endpoint, no Statcast, no new external source — the inputs already exist. The History tab's game-log **AVG** column is currently incoherent (it reads like noise, and its final value disagrees with the season AVG shown on the Stats tab and the player hero). Make that column a **real running season-to-date batting average**, sourced so it reconciles with the season AVG everywhere else.

---

## The bug

Player view → History → **Game log**. Each row is one game; the **AVG** column is meant to be the player's **season-to-date** average *through that game*.

Today it's wrong on two counts:
1. **Impossible game-to-game swings** — e.g. `.239 → .260` in a single game ~200 AB into the season. A running average that deep can't move 21 points in one game. The values are noise, not a cumulative average.
2. **Cross-screen mismatch** — the **last** game-log row's AVG (e.g. `.239`) doesn't equal the **Stats tab** (`.243`) or the **hero** (`.244`) season AVG for the same season. The final running value must, by definition, equal the season AVG.

Root cause: the AVG column isn't derived from the real cumulative hit/at-bat totals; it's fabricated per row.

---

## What "correct" is

For each game `g` in the selected season, in **chronological order**:

```
runningAVG(g) = (Σ hits   from game 1 … g) / (Σ atBats from game 1 … g)
```

- Computed over the **ordered** game log (oldest → newest) — order the rows by date before accumulating.
- **At-bats (AB), not plate appearances** — walks/HBP/sacrifices don't count in AB, matching how season AVG is defined.
- The value **after the last game** of a completed/most-recent span **must equal** the season AVG reported elsewhere (Stats tab, hero). They have to come from the **same season totals** (this is the BUG-002 "one season-AVG source" rule — the running series and the season aggregate must reconcile to the same `seasonHits / seasonAB`).
- Standard baseball rounding/format: 3 decimals, no leading zero (`.243`), and AB = 0 (no at-bats yet) → blank/`—`, not `.000` or `NaN`.

---

## Where to do it

Prefer **server-side**, in whatever assembles the per-season game-log response the History tab consumes:

1. Confirm each game-log row already carries (or can carry) per-game **H** and **AB** — they're shown in the `H/AB` column, so the raw numbers exist. If the row model lacks a numeric `atBats`/`hits`, add them (the H/AB display already implies they're available upstream).
2. Sort the season's games chronologically, accumulate `Σhits` / `ΣatBats`, and emit a **`runningAvg`** (number, or null when `ΣatBats === 0`) on each row.
3. Make sure the accumulator's final totals are the **same numbers** that produce the season AVG on Stats/hero — ideally read both from one season-stats source, or assert `final ΣatBats === seasonAB && final Σhits === seasonHits` so the column and the season figure can't drift.

If the architecture truly forces this to be a client-side derivation (the game-log endpoint can't change), it's the same formula over the ordered rows — but the **single-source reconciliation with season AVG is mandatory either way**; do not compute a running AVG from one set of totals while the hero/Stats AVG comes from another.

If the wire/row schema is code-generated into `@bitslinger21/baseball-realtime-client`, regenerate + version-bump and note it in the PR.

---

## Must-not

- Don't fabricate or smooth values — it's a true cumulative `H/AB`, nothing else.
- Don't change the displayed **per-game H/AB** numbers; only the derived running AVG column.
- Don't use plate appearances in place of at-bats.
- Don't introduce a second season-total source — the running series and the season AVG must reconcile to one.
- Don't touch other History sub-tabs (Career / vs Team / Postseason) or other screens.

## Acceptance

- The game-log AVG column **moves smoothly** game to game (no impossible single-game jumps) and trends like a real season-to-date average.
- The **last row's** running AVG **equals** the season AVG shown on the Stats tab and the hero for the same season (exact match, same source).
- Switching the season picker (2026…2022) recomputes the running series for that season; an early-season row with 0 AB shows blank/`—`, not `.000`.
- Per-game H/AB display is unchanged; no other screen affected.
- If codegen'd, the client package carries the new `runningAvg` field.

Open one PR titled **"BUG-006 — real running season-to-date AVG on History game log"**. In the description: state where you computed it (server-side row assembly vs client derivation), and confirm the final-row AVG reconciles to the single season-AVG source (cite the values you checked).
