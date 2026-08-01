# Fix: on-dark logo plate missing on "Recent form" card (game-v2.jsx)

One-line fix, same `onDark` treatment as the earlier logo pass (PR 15 / prior handoff).

**File:** `holistic/game-v2.jsx` — the "Recent form" list (dark card, `#fff` team-name text)
was missed in the original on-dark sweep. `<TeamDot team={f.team} size={22} />` → added
`onDark`.

All other `TeamDot`/`TeamMark` usages were re-audited across `game-v2.jsx`, `game-scout.jsx`,
`landing.jsx`, `player.jsx` — every dark-surface usage already has `onDark`; light-card usages
correctly do not.

If your port has its OWN "Recent form" (or equivalent dark team-list) component not sourced
directly from this file, grep your codebase for team-logo renders on dark backgrounds and
confirm each one applies the white-plate treatment (`onDark` prop on `TeamDot`/`TeamMark` in
the design source, or its equivalent in your port).
