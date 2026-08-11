# PROMPT — Scoring Widget: sync design files to as-built

> Handback from dev. The `ScoringWidget` 3D flip card was built with design iterations along the way. Update the holistic design files so they match what shipped.
>
> **Files to update:** `Holistic.html`, `holistic/scoring-widget.jsx` (already rewritten — verify only), `holistic/landing.jsx`

---

## Context

The original handoff designed a 3D flip card for live games on the landing page. Dev built it, then iterated with the user on dimensions, button styles, bases, back face layout, runner tooltips, and team logos on the matchup rows. The as-built component is already written at `holistic/scoring-widget.jsx`. Your job is to wire it into `Holistic.html` and `landing.jsx`, and verify it looks right.

---

## Step 1 — Wire `scoring-widget.jsx` into `Holistic.html`

Add one script tag to `Holistic.html`, between `shared.jsx` and `landing.jsx`:

```html
<script type="text/babel" src="holistic/scoring-widget.jsx"></script>
```

It must load after `shared.jsx` (needs global `T`) and before `landing.jsx` (which will use `ScoringWidget`).

---

## Step 2 — Update `holistic/landing.jsx`

Replace the existing `GameCardLive` component and its usages with `ScoringWidget`.

### 2a — Remove `GameCardLive`

Delete the `GameCardLive` function definition entirely.

### 2b — Replace usages with `ScoringWidget`

There are two `<GameCardLive ... />` calls in the landing artboard (Pittsburgh vs Toronto and Houston vs Chicago). Replace both with `<ScoringWidget ... />` using the new prop shape.

**New prop shape:**

```jsx
<ScoringWidget
  away={{ abbr: team.abbr, name: team.name, logoUrl: `https://www.mlbstatic.com/team-logos/${team.id}.svg`, hits: N, errors: N }}
  home={{ abbr: team.abbr, name: team.name, logoUrl: `https://www.mlbstatic.com/team-logos/${team.id}.svg`, hits: N, errors: N }}
  awayScore={N}
  homeScore={N}
  inning={N}
  half="top|bottom"
  balls={N}
  strikes={N}
  outs={N}
  bases={{ first: bool, second: bool, third: bool, runner1: string|null, runner2: string|null, runner3: string|null }}
  pitcher={{ name: 'First Last', era: '3.28', pc: 72, logoUrl: pitcherTeamLogoUrl }}
  batter={{ name: 'First Last', avg: '.289', ab: 3, h: 1, logoUrl: batterTeamLogoUrl }}
  venue="Stadium Name"
  elapsedTime="1H 44M"
  onEnter={() => {}}
/>
```

**Logo derivation rule:**
- Top half of inning → home team pitches (pitcher logo = home), away team bats (batter logo = away)
- Bottom half → away team pitches (pitcher logo = away), home team bats (batter logo = home)

**Sample data for the two live cards** — use realistic MLB data, keep team pairings from the original `GameCardLive` calls (PIT @ TOR and HOU @ CHC). Add plausible pitcher/batter names, stats, bases, count, venue, and elapsed time.

Example for PIT @ TOR (bottom 1st, 0-1-2 count, bases loaded):
```jsx
away={{ abbr: 'PIT', name: 'Pittsburgh Pirates', logoUrl: 'https://www.mlbstatic.com/team-logos/134.svg', hits: 2, errors: 0 }}
home={{ abbr: 'TOR', name: 'Toronto Blue Jays',  logoUrl: 'https://www.mlbstatic.com/team-logos/141.svg', hits: 4, errors: 1 }}
awayScore={1} homeScore={0}
inning={1} half="bottom"
balls={0} strikes={1} outs={2}
bases={{ first: true, runner1: '#11 Bo Bichette', second: true, runner2: '#27 Vladimir Guerrero Jr.', third: false, runner3: null }}
pitcher={{ name: 'Paul Skenes', era: '2.44', pc: 34, logoUrl: 'https://www.mlbstatic.com/team-logos/134.svg' }}
batter={{ name: 'George Springer', avg: '.271', ab: 1, h: 0, logoUrl: 'https://www.mlbstatic.com/team-logos/141.svg' }}
venue="Rogers Centre"
elapsedTime="0H 44M"
```

Example for HOU @ CHC (bottom 9th, 0-1-2 count):
```jsx
away={{ abbr: 'HOU', name: 'Houston Astros', logoUrl: 'https://www.mlbstatic.com/team-logos/117.svg', hits: 8, errors: 1 }}
home={{ abbr: 'CHC', name: 'Chicago Cubs',   logoUrl: 'https://www.mlbstatic.com/team-logos/112.svg', hits: 5, errors: 0 }}
awayScore={8} homeScore={5}
inning={9} half="bottom"
balls={0} strikes={1} outs={2}
bases={{ first: true, runner1: '#44 Anthony Rizzo', second: false, runner2: null, third: false, runner3: null }}
pitcher={{ name: 'Framber Valdez', era: '2.89', pc: 112, logoUrl: 'https://www.mlbstatic.com/team-logos/117.svg' }}
batter={{ name: 'Cody Bellinger', avg: '.261', ab: 4, h: 2, logoUrl: 'https://www.mlbstatic.com/team-logos/112.svg' }}
venue="Wrigley Field"
elapsedTime="3H 02M"
```

---

## What changed from the original design

These are already reflected in `holistic/scoring-widget.jsx` — no changes needed there, just understand what the component does:

- **Size: 425×195px** (was 498×280px)
- **Bases: `repeat(3, 18px)` grid, font-size 32px** (was 36px cells). Empty base = `◇` outline, not filled muted diamond
- **Occupied bases show a hover tooltip** with runner jersey + name (e.g. `#27 Jose Altuve`)
- **Pitcher/batter rows:** 18×18 team logo before the name
- **Both buttons (⟲ and ←) are identical:** 40×40, `border-radius: 8`, `background: T.surfaceAlt`, `border: 1px solid T.borderStrong`
- **Back face header:** no border-bottom, no bottom padding; elapsed row has no top padding (flows directly)
- **H-AB suppressed when at-bats = 0**
- **Props changed:** `away`/`home` now carry `{ name, logoUrl, hits, errors }` (not `{ id }`); `count: [b,s,o]` split into `balls`/`strikes`/`outs`; `bases` adds `runner1/2/3`; pitcher/batter add `logoUrl`; new `venue` and `elapsedTime` props

---

## Accept

Open `Holistic.html`. The landing artboard shows two live game `ScoringWidget` cards. Each:
- Renders at 425×195px with no overflow
- Shows pitcher logo + name / ERA / PC in the header
- Shows batter logo + name / AVG / H-AB in the header (H-AB present since ab > 0)
- Shows 32px diamonds in the bases grid; occupied bases are accent-colored `◆`; empty are `◇`
- Flips smoothly to the back face on ⟲ click; back face shows venue, elapsed, R/H/E table; ← returns to front
