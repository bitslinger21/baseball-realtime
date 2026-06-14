# Game-view position model — handoff package

This is the `position_model/` subfolder of `design_handoff_baseball_realtime/`. It covers the pitch-by-pitch **position** work (PR 11 + PR 12) with one shared, non-contradicting spec.

**Install:** drop the whole `design_handoff_baseball_realtime/` folder into `client/docs/design/` (replacing the existing copy) — same as every prior handoff. No cherry-picking; this subfolder rides along with it. Claude Code grounds on `client/docs/design/design_handoff_baseball_realtime/position_model/`.

## TL;DR for the developer (Claude Code)

1. **Abandon the dead `pr-012-position-persistence` branch** — `git checkout main`, then `git branch -D pr-012-position-persistence`. Do not salvage it.
2. **PR 11 already exists on its own branch — VERIFY it, don't rebuild.** On the `pr-011` branch, run `PROMPT_PR11_VERIFY.md` and walk the A/B/C checklist. If it all passes, merge to main. Closes **BUG-009**. (Only if it fails do you rebuild from `PROMPT_PR11.md`.)
3. **Then PR 12** → branch fresh from the updated main and build from `PROMPT_PR12.md`. Session-scoped resume-on-return. Closes **BUG-010**.
4. **`SPEC_position_model.md` is the single source of truth.** If anything anywhere conflicts with it, the spec wins.
5. **Delete `PROMPT_PR11_standalone.md` / `PROMPT_PR12_standalone.md` from the repo if present** — they are superseded and one contradicts the spec (it says finals "open at the top," which is wrong).

## Why it kept failing (so it doesn't again)

Two root causes, both addressed in this package:

- **A hidden drip-feed gate.** A `replayCount`-style counter sits in the **default** feed render path, so the live feed is fed its rows gradually and the scroll-position effect fires against an incomplete list — landing on the first pitch. The fix is to make that gate **replay-only** and render the full at-bat history immediately. This is the 🔴 CRITICAL section in both the spec and PROMPT_PR11.
- **Blind debugging.** Prior attempts declared a confident root cause each round and committed it without verification, drifting into load-bearing code (the replay default, `useAtBatHistory`'s signature, StrictMode hacks). PROMPT_PR11 §3 makes **instrumentation the mandatory first step** — log the firing order, then diagnose.

## The behavior in one table (full version in the spec)

| Arrived by… | **LIVE game** | **FINAL game** |
|---|---|---|
| **Fresh open** | Current (live) at-bat, follow armed | First at-bat of the game |
| **Return** (in-session Back) | Current at-bat, follow **re-armed** — NOT where you left off | **Exactly** where you left off (scroll + expanded PA) |
| **Hard refresh** | Current at-bat (= fresh open) | First at-bat (= fresh open) |

Feed order is **newest-first in both states** (current/most-recent AB on top). The open target differs only by scroll: **live = top (`scrollTop 0`)**, **final = bottom (`scrollTop = scrollHeight`)**.

## Contents

| File | What it is |
|---|---|
| `README.md` | This file |
| `SPEC_position_model.md` | **Single source of truth** — the decision table, feed ordering, the replay-gate fix, timing rule, must-not-break list, and all 8 acceptance tests |
| `PROMPT_PR11_VERIFY.md` | **Run this on the existing PR 11 branch** — acceptance-test checklist (static audit + instrumentation + interactive tests) to confirm it's safe to merge |
| `PROMPT_PR11.md` | Rebuild PR 11 from scratch — only if verification fails. Live open + follow/break + Jump-to-live pill (closes BUG-009) |
| `PROMPT_PR12.md` | Build PR 12 — session-scoped resume-on-return (closes BUG-010) |
| `Game Position Prototype (standalone).html` | Runnable reference prototype — open in any browser; demonstrates the live open/follow/break/pill (toggle "Feed opens at" to compare today's broken open vs the fixed one). Caveat: its feed never page-scrolls, so it can't show the pill's page-scroll pinning — verify that in the real app. |

## Ground rules that apply to both PRs

- **No new API.** Both PRs run on the socket play feed already wired. Zero backend changes.
- **Session-scoped memory only** — in-memory module cache or `sessionStorage`, **never `localStorage`**. Key by `providerGameId`.
- **No `scrollIntoView`** anywhere — set `scrollTop` on the container directly.
- **Numerals stay mono.** This is behavior, not a restyle — don't touch row layout, the expanded live-PA table, or the single rust LIVE pill in `PageTitle`.
- **Do not commit design files into the app repo** — no `holistic/*.jsx`, no prototype HTML. The only docs worth committing (under `client/docs/design/`) are `SPEC_position_model.md` and the two prompts. Delete any `*_standalone.md`.
- **Keep each PR's diff tight.** PR 11 ≈ `PitchByPitchV2.tsx` + `.css`. PR 12 ≈ a cache module + `PitchByPitchV2.tsx` (+ `GamePage.tsx`). Don't bundle unrelated doc add/deletes.
