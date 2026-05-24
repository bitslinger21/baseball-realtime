# Plan G — At-Bat Card System: Clarifying Questions

Please answer each open question by filling in the letter choice after the `[Answer]:` tag.
Let me know when you're done.

---

## Decided in Brainstorming (no answer needed)

- **Placement**: Lives in the GamePage pitch feed — one at-bat card block per at-bat, replacing individual pitch rows
- **Feed structure**: Batter name row → At-Bat Card below it (zone diagram + pitch log, live-updating per pitch)
- **Real-time**: Card updates pitch-by-pitch as WebSocket events arrive; also works during historical replay
- **At-bat history**: Current at-bat is fully expanded and live; past at-bat blocks collapse to batter name row; clicking a past batter name expands their filled-in card

---

## Question 1
Which card layout should be used? (See ASCII renders from brainstorming)

A) Modified Landscape — zone top-left, batter stats + photo top-right, pitch log full-width bottom

B) Three Column — batter panel left, zone center, pitch log right; all in one horizontal band (wide screens only)

C) Portrait with Batter Header — batter stats span full width at top, zone below, pitch log at bottom; narrowest width, mobile-friendly

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2
Which perspective should the strike zone diagram use?

A) Catcher's view — standard broadcast perspective (left = inside to RHB)

B) Pitcher's view — mirrored

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 3
How should pitch types be visually distinguished on the zone diagram?

A) Color-coded numbered dots — each pitch type gets a distinct color; number shows sequence order

B) Numbered markers only — no color coding on the zone dots; color coding in the pitch log table rows only

C) Both — colored numbered dots on the zone AND color-coded rows in the pitch log table

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 4
How should the strike zone height be rendered?

A) Static zone — standard rulebook proportions; simpler to implement

B) Dynamic zone — use `strikeZoneTop` / `strikeZoneBottom` from the live feed per batter; more accurate but requires 2 additional fields in the WebSocket payload

C) Other (please describe after [Answer]: tag below)

[Answer]: B
