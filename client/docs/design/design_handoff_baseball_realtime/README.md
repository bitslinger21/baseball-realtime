# Handoff — Team page, Transactions tab (Sep 13, 2026)

One prompt. **Gated on new API** — needs a club transactions feed (§6 of the prompt).

**Read `PROMPT_transactions_tab.md`.**

| File | What it is |
|---|---|
| `PROMPT_transactions_tab.md` | The spec: ledger layout, direction column, type chips, tab-specific hero stats, filter cascade, required data shape, acceptance. |
| `Team Page - Transactions.html` | The design. All ledger data is MOCK and marked so — **do not port the content**. |
| `Team Page - Overview v2.html` · `Team Page - Schedule.html` | Re-synced only for the third `.ttabs` entry. No other change. |

## Two things to flag to the dev

1. **`direction` must be resolved server-side.** The `+`/`−` column is the page's
   main signal; the client must never parse a move string in English to get it.
2. **The type chips were iterated.** Four neutral chips with coloured dots were
   rejected in review as too alike. The shipped version tints the whole chip.
   Don't reintroduce the dot.

## Not in scope

Player-level transaction history (the player History tab already covers it) ·
a league-wide transactions feed · season picker · pagination past one season.
