# MatchupLeft — fix blank "Waiting for updates…" state

## Bug
`client/src/pages/game/MatchupLeft.tsx` renders a fully blank panel — just the text
"Waiting for updates…" — whenever `latest` (the most recent `PlayUpdate`) is `null`:

```tsx
if (latest == null) {
  return (
    <div className="card matchup-left">
      <div className="matchup-left__empty">Waiting for updates…</div>
    </div>
  );
}
```

This fires for a game with `status === "live"` whose realtime feed hasn't delivered any
plays yet (cold socket connect, subscription race, etc). The design never shows a fully
blank panel in this card — every state should be filled with whatever real info is known.

## What to check first
Before touching this component, find out WHY `latest` is null for a live game — that's
the root defect. Look at `useRealtimeGame`/the socket subscription in `GamePage.tsx`: is
the subscription actually firing for `providerGameId`, and does the server replay the
game's play history on subscribe (so a client that connects mid-game gets caught up), or
only stream new plays going forward? If a client can be live with zero plays ever
delivered, that's the fix — subscribe should return backfill, not just a live tail.

## UI fix (regardless of the above)
`MatchupLeft` still needs a real empty state as a fallback — don't leave the blank panel:
- Show the eyebrow (inning/bases/count) faded/dashed if `game.status === "live"` but no
  play data yet — mirror the `PregameMatchupLeft` treatment in the design source
  (`holistic/game-v2.jsx`) rather than inventing new copy.
- Keep "Waiting for updates…" only as small supporting text under a real card shell —
  not the entire panel content.

## Verify
Reproduce a live game with an empty feed (or throttle/delay the socket) and confirm
`MatchupLeft` no longer renders a bare text-only panel.
