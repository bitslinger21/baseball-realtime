# Handoff to design — Baseball IQ backend (built Sep 2026)

Source spec: `PROMPT_baseball_iq_backend.md` in this folder ("Backend only — no UI work in
this handoff"). This document confirms what actually shipped against that spec, flags where
the implementation simplified or deviated, and reports the measured numbers the spec asked
for. The client surface itself is unchanged by this work — nothing here requires a UI update,
but a few behavioral details below affect how the existing designed surface will actually feel.

---

## 1. The two payloads, as built

### `iq` on the play feed (socket, not REST)

Exactly as specified — rides the existing `play` payload, no new channel:

```ts
interface IqCandidate {
  kind: 'Leverage' | 'Streak' | 'Rare';
  score: number;   // 0-1, the selector's ranking score, sent even though the client ignores it today
  text: string;    // one sentence, target ≤110 chars
}

interface IqBlock {
  candidates: IqCandidate[];  // 0-3, sorted best-first
  suggested: string[];        // 0-3 situational follow-up questions
}
```

`iq` is omitted (not an empty object) on the vast majority of plays — treat "missing" and
"present with empty arrays" as identical, per spec.

### `POST /api/iq/query`

```jsonc
// Request
{
  "gameId": "776543",
  "updateIndex": 412,
  "question": "Would that last hit be out in other parks?"
}

// Response — 200 always
{
  "ok": true,                // false = no real answer produced; render the "unavailable" state,
                              // don't sniff headline/sub text (see §3.2 — this is now a real field)
  "headline": "22 of 30",
  "unit": "parks",           // optional
  "sub": "Suzuki's single to right field (104.1 mph, 12° launch) clears the wall in 22 of 30 parks.",
  "facts": [
    { "label": "Distance", "value": "361 ft" }
  ]
}
```

Full machine-readable schema: `api/generated/openapi.yaml`, or `http://localhost:3000/docs`
while the server's running.

### `iqUpdate` — follow-up patch on the same play-feed socket (new, see §2)

```ts
interface IqUpdate {
  providerGameId: string;  // the socket receives 'play' globally, not scoped per room —
                            // this is the only way the client knows which game to patch
  atBatIndex: number;
  iq: IqBlock;
}
```

Arrives on the existing `'play'` socket event as `{ iqUpdate: IqUpdate }` — a sibling variant
to the existing `{ play: ... }` and `{ alert: ... }` envelopes on that same channel, not a new
channel. A client tracking plays by `atBatIndex` attaches `iq` to the matching one when this
arrives; nothing else about that play changes or re-renders.

---

## 2. How it actually behaves

- **Both payloads are Claude-backed** (Claude Haiku 4.5), not templated. One structured call
  produces `candidates` + `suggested` together, so they can't drift against each other — the
  spec's one hard rule about shared context is satisfied by construction, not by discipline.
- **Trigger list implemented:** scoring play, pitching change, leverage-index crossing (≥1.5,
  bucketed), half-inning gap. **Milestone and streak-crossing detection are not implemented
  yet** — the `kind` enum values `Streak`/`Rare` exist and the model can produce them from
  context, but nothing programmatically watches for "no-hitter intact" or "5 strikeouts in a
  row" the way it watches for a score change. Real streak/milestone insights will only surface
  if they happen to co-occur with one of the four implemented triggers.
- **Threshold/cadence/repetition (the spec left these to the implementer):** score ≥ 0.6 to
  surface at all; at least 2 plays or 60 seconds since the last shown insight in that game
  (whichever comes first); a per-game memory of shown fact "fingerprints" passed back to the
  model so it's asked not to repeat itself. All three are constants at the top of
  `api/src/iq/iq.service.ts` — cheap to retune, not exposed anywhere yet.
- **Latency:** every play's wire push is immediate now, including trigger plays — a home run
  lands on screen with no hold. Generation runs in the background afterward; if it produces a
  real result, the `iqUpdate` follow-up patch (see §1) arrives ~1-2s later. Roughly 10-20 plays
  per game get a patch at all — the other ~99% of pitches never see one.
- **`/iq/query` measured round-trip: ~1.4s** (real call against a finished game, logged
  server-side on every request now). No dedicated latency/error UI was designed yet per the
  spec — worth revisiting now that a real number exists.
- **Replay/Scout stability:** once generated for a given at-bat, an insight is persisted and
  reused forever — reopening a finished game, or reconnecting to a live one, never re-triggers
  Claude and never rewords a past insight. This is what makes replay correctness (spec
  acceptance criteria 1-2) hold.
- **Cost:** roughly $0.002/generation call, ~$70-100 projected for a full MLB season if every
  live game runs all season (generation isn't gated on viewership — see note below). Runs for
  every live game regardless of whether anyone's watching, not just ones opened in the app.

---

## 3. Deviations from spec — things design should know about

1. **Park factor (§7) is a rough single-number estimate, not a true per-angle model.** It
   compares estimated carry distance (from exit velo + launch angle, no wind/temperature/
   spray-angle) against each park's *average* fence distance, not the actual pulled/opposite-
   field wall the ball would have hit. "Would clear N of 30 parks" is directionally
   reasonable, not broadcast-grade precise. If a `/iq/query` answer citing this ever looks
   wrong to a real fan, this is why.
2. **`/iq/query` now has an explicit `ok` flag** (decided Sep 2026 — design it now). `ok:
   false` on any internal failure (bad gameId, Claude unavailable, no history for that game);
   `headline`/`sub`/`facts` still come back populated with placeholder text on failure so a
   client that hasn't built the new state yet doesn't render empty, but `ok` is the real
   contract now — don't sniff `headline === "N/A"`. Still a `200` in all cases, not a 4xx/5xx.
3. **Milestone/streak triggers are stubbed** — only 4 of the 6 listed triggers fire today.
   Decided low priority, but worth knowing: `Streak`/`Rare` are 2 of the 3 `kind` eyebrows, so
   the vocabulary on screen currently promises more variety than the generator delivers —
   they'll surface only when a streak/milestone happens to coincide with a scoring
   play/pitching change/leverage crossing/half-inning gap, not on their own.
4. **Generation isn't gated on viewership.** Every live game gets evaluated continuously
   (background polling runs regardless of whether the app has anyone open on it), which is
   what makes replay-from-cold-open correct, but also means cost scales with the full MLB
   schedule, not with actual app traffic. Not a design concern, flagged here in case it
   changes the app's usage story later.
5. **Trigger-play wire push decoupled from generation** (decided Sep 2026). Originally the
   triggering play's own wire push waited on the Claude call (~1-2s hold). Changed: every play
   now goes out immediately with no `iq`, and if generation produces a real result it arrives
   ~1-2s later as a separate `iqUpdate` patch (§1) — a home run lands instantly, the insight
   line just appears on the bar a beat after.

---

## Resolved (Sep 2026)

1. ~~Should `/iq/query`'s "unavailable" fallback get a designed state now?~~ **Yes — see §3.2,
   `ok: false` is the contract to design against.**
2. ~~Is the ~1-2s hold on trigger plays acceptable?~~ **No — decoupled, see §3.5.**
3. ~~Milestone/streak detection — follow-up pass or low priority?~~ **Low priority**, gap
   acknowledged (§3.3).

---

## Files touched

- `api/src/iq/` (new module — `iq.service.ts`, `iq.controller.ts`, `iq.types.ts`,
  `splits.service.ts`, `park-factor.service.ts`, `dtos/iq-query.dto.ts`)
- `api/src/persistence/entities/game-insight.entity.ts` (new) + matching migration
- `api/src/providers/mlb/mlb.service.ts` (new: situational splits, venue field info, team
  venue ids)
- `api/src/poller/poller.processor.ts`, `api/src/poller/poller.service.ts`,
  `api/src/realtime/realtime.gateway.ts`, `api/src/realtime/realtime.types.ts` (wiring)
- `api/src/domains/config/env.ts` (new `ANTHROPIC_API_KEY` config)
- Module registration: `api/src/iq/iq.module.ts`, `poller.module.ts`, `realtime.module.ts`,
  `app.module.ts`
