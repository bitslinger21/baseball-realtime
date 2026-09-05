# Runner Trace — Feature Handoff

## Overview
Runner Trace is an interactive detail panel that displays a baserunner's complete journey through an inning when clicked from the scorebook. It shows which plays caused each advancement, the current location, and final outcome—with a synchronized diamond visualization and timeline.

## Files
- `Runner Trace Mock.html` — UI reference (side-by-side scorebook + detail panel)
- `PROMPT_runner_trace.md` — Implementation spec and data schema
- `Runner Trace Handoff.md` — This document

## Key Features
- **Scorebook integration**: Click any baserunner notation to open trace
- **Timeline view**: Chronological progression from at-bat through outcome
- **Diamond visualization**: Path traced in rust, highlighting current base and final result
- **Synchronized state**: Hover/click in scorebook highlights related cells in trace panel
- **Player context**: Photo, name, inning, final result badge

## Design Tokens
Per Baseball Realtime scorebook system: DM Sans (UI), JetBrains Mono (numerals), cream/rust/navy.

## Data Requirements
- Inning-by-inning play log with runner advancement events
- Baserunner roster + headshot URLs
- Play-by-play descriptions and outcomes

## Next Steps for Dev
1. Wire Runner Trace component to GamePage scorebook feed
2. Implement click handler on scorebook baserunner cells
3. Query inning-specific runner ledger from game state
4. Render timeline from advancement events
5. Draw diamond path based on base sequence
