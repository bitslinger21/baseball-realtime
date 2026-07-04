# League Leaders — ERA/WHIP sort direction fix (Jul 4, 2026)

**Bug (in the ported app):** the **ERA** leaderboard sorts **descending**, so the worst ERA shows at
rank 1. For ERA — and **WHIP** — **lower is better**; rank 1 must be the **minimum**.

**Design is already correct.** `holistic/leaders.jsx` marks these categories with `asc: true` and the
ranking helper honors it. Verified: ERA rank 1 = 2.14 (lowest), ascending. This handoff is only to
correct the port.

## Fix
Sorting must be **per-category directional**, not globally descending:

- Every category carries a direction flag. In the design it's `asc` on the category object; ERA and
  WHIP set `asc: true`, all others (HR, AVG, RBI, R, H, SB, OPS, W, SO, SV, IP) are descending.
- The rank builder:

```js
// asc = "lower is better" (ERA, WHIP). Otherwise higher is better.
const sorted = [...pool].sort((a, b) => (asc ? a.val - b.val : b.val - a.val));
// then standard competition ranking (ties share a rank), keep rank ≤ 10
```

- Do **not** special-case by category name in the view. Drive it off the flag so adding a future
  "lower-is-better" stat (e.g. FIP, BB/9) is just `asc: true` on that category.

## Acceptance
- Pitching **ERA**: rank 1 is the lowest ERA (e.g. 2.14), ascending down the card.
- Pitching **WHIP**: rank 1 is the lowest WHIP (e.g. .88), ascending.
- All other categories unchanged (rank 1 = highest value).
- Ties still share a rank; each card still shows everyone ranked ≤ 10.
- Numerals stay mono + tabular-nums.
