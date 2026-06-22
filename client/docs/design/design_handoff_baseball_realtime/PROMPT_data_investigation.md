# Investigation — confirm the ❔ UNVERIFIED data sources (wired vs silent-mock)

You are working in the **`baseball-realtime`** codebase (backend ingest/mappers + the React 19 client). **This is an investigation, not a build.** Do **not** change UI, restyle, or "fix" anything yet — your deliverable is a **findings report** that classifies each item below as **WIRED** (real API/socket data), **SILENT-MOCK** (fabricated value shown as if real — a bug), **LABELED/GATED** (mock but disclosed, or intentionally not shown), or **DERIVED** (computed client-side — then say whether its *inputs* are real). Where you find a SILENT-MOCK, file it as a new bug entry; don't fix it in this pass.

> Context: a provenance audit (`data-provenance.md`) flagged these as **❔ — can't confirm wired vs mock from the docs alone.** They need a real trace against the running app's network/socket layer + the component that renders them. Several could be hiding fabricated data. Resolve each to a definitive code.

## Method (per item)

For each item: start at the **component** that renders it → trace the prop/state back to its **source** (a socket message field, a REST/generated-client call, or a hardcoded literal/`mock`/fixture) → confirm against an **actual payload** (dump the real network response / socket frame for a relevant player or game). "It has a variable name that sounds real" is not confirmation — find the literal or the wire field. Report the file/line and the source path you confirmed.

## Items to resolve (priority order)

1. **Overview · hot-zones heat map** *(top priority — sleeper risk).* The Overview tab's zone heat map uses the `StrikeZone` heat mode. **Pitch-location data does not exist anywhere in the current API** (per the BUG-011 investigation). Confirm whether this map draws from that **nonexistent pitch-location source** — if so it's **SILENT-MOCK** and must be gated/labeled. Check specifically whether it shares a source with the (known-mock) Pitching-tab location heat map, or whether it's driven by something real (e.g. a zone-rate split). This is the highest-stakes unknown.

2. **Splits · Career / Last-30d timeframe options.** The Splits tab defaults to 2026. Confirm the **Career** and **Last 30 days** timeframe toggles actually **refetch** different data — vs silently re-showing the 2026 numbers under a new label. (The mock only ever carried 2026.) If they don't refetch → **SILENT-MOCK**.

3. **Game view · game leaders** (top batter per side, in the dark line-score band). MIGRATION flagged this as "new data — may need API work." Confirm the leader name + line are **wired** to real per-game batting data vs a mock/fixture.

4. **Game view · Lineups tray** (lineup / bench / bullpen, substitution tree, IP-as-thirds). Confirm the **roster, batting order, and substitution data** are wired to a real source vs mock. Note any sub-field that's faked (e.g. bullpen list, sub sequence).

5. **Game view · cross-feed sync.** The line score (per-inning runs, R/H/E), the scoring summary, and the pitch-by-pitch feed are three renderings of the same game state. MIGRATION warns they can **drift** if not all sourced from **one feed**. Confirm there is a **single source of truth** — or document where they diverge (this is a structural silent-mock hazard even if not yet visible on screen).

6. **Stats · per-row "context note" strings** (e.g. per-game-rate notes beneath stat rows). Confirm each is **DERIVED** from a wired value vs a **canned/authored** string. Also re-confirm **BUG-010** scope while here (HR-row note echoing the XBH row; `0T` glyph) — but don't fix it, just note it.

7. **Upcoming · `lean` / `read` verdict prose.** The matchup "read" and edge-meter verdict copy is templated. Confirm it's **DERIVED** from wired inputs (the now-wired 9.5a/9.5b data) vs authored mock prose.

8. **Upcoming ↔ Pitching · batter × pitch-type consistency.** Provenance believes this resolved (Jun 20): Upcoming wires batter×pitch-type **AVG/SLG** (via `pitchLog` aggregation, PR 9.5b/6.6), while **whiff%** by pitch type still needs Statcast. **Confirm in code** that the two tabs read the **same** real source for the slash metrics and that no whiff%-by-pitch-type value is being shown anywhere as real. Close the contradiction definitively.

## Deliverable

A report — ideally as edits to **`data-provenance.md`** (flip each ❔ to its confirmed code with the file/line + source path you verified) plus, for any **SILENT-MOCK** found, a new **`bug-list.md`** entry (screen, severity, observed, expected, likely cause). Summarize at the top: which items are clean, which are now confirmed bugs, and the single highest-priority fix that fell out (likely #1 if the hot-zones map proves mock).

## Must-not
- Don't fix, restyle, gate, or relabel anything in this pass — investigation only. (Filing the bug is the action; the fix is a later PR.)
- Don't trust variable names or comments — confirm against a real payload.
- Don't change `data-provenance.md` codes you didn't actually verify; leave anything you couldn't trace as ❔ with a note on what blocked you.

No PR of code changes — this lands as doc/report updates (`data-provenance.md` + any new `bug-list.md` entries). If you prefer, open a single PR titled **"Investigation — confirm ❔ data sources (no behavior change)"** containing only those doc edits.
