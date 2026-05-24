# Plan G — Application Design Plan

## Scope
Define component tree, method signatures, service hooks, and data flow for the At-Bat Card System.

## Design Artifacts to Generate
- [ ] `plan-g-components.md` — component definitions and responsibilities
- [ ] `plan-g-component-methods.md` — method/prop signatures
- [ ] `plan-g-services.md` — hooks and utilities
- [ ] `plan-g-component-dependency.md` — dependency graph and data flow
- [ ] `plan-g-application-design.md` — consolidated design summary

---

## Design Questions

### Question 1
How should the strike zone diagram be rendered?

A) SVG — place pitch dots as `<circle>` elements at exact (pX, pZ) coordinates scaled to SVG viewport; cleanest for precise coordinate mapping

B) HTML Canvas — imperative drawing API; more control but harder to animate or interact with individual dots

C) CSS/HTML grid — approximate zone grid only, no precise coordinate placement (not recommended for this use case)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 2
How should the component tree be structured?

A) Flat — `AtBatCard` contains all sub-sections inline (zone, batter info, pitch log all in one file); simpler but less reusable

B) Decomposed — separate files: `ZoneDiagram`, `BatterInfoPanel`, `PitchLogTable` each in their own file under `components/AtBatCard/`; more reusable, easier to test individually

C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 3
Where should at-bat history state live? (The list of completed at-bats and their accumulated pitches, used to render collapsed past blocks and expand them on click)

A) `GamePage` component state — `useState` with an array of completed at-bat objects; keeps everything in one place

B) Custom hook `useAtBatHistory` — encapsulates at-bat boundary detection, pitch accumulation, and history list; `GamePage` calls the hook

C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 4
Today's game stats for the batter info panel (e.g. "1-for-4, 1 R, 2 RBI") — where do they come from?

A) Lazy-fetch from existing `GET /players/:mlbId/overview` when a new batter is seen — uses the `today` field already on `BatterOverviewDto`; no API changes needed

B) Add today's stats to `PlayUpdateWire` — poller already has access to the live boxscore; include `batterGameAB`, `batterGameH`, `batterGameR`, `batterGameRBI` directly in the WebSocket payload

C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 5
Pitch type color mapping (e.g. FF = red, SL = green, CH = blue) — where should it live?

A) Shared constants file `client/src/utils/pitchColors.ts` — exported map of pitch type code → hex color; reusable if zone diagrams appear elsewhere

B) Inline in `ZoneDiagram` (or `AtBatCard`) — co-located with the component that uses it; simpler for now

C) Other (please describe after [Answer]: tag below)

[Answer]: A
