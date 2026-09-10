# Baseball IQ — CLIENT PORT

**Date:** Sep 8, 2026 · **The backend shipped Sep 2026 and is ready.** This is the front-end half.
**Design source:** `BaseballIQ` in `game-v2.jsx` (in this folder), mounted inside `LineScoreBand`.
**Visual reference:** open `design-so-far.html` — all seven states, pinned, in the real 48px bar.
**Backend contract:** `HANDOFF_baseball_iq_backend.md` in this folder. Where this document and
that one disagree about a field name, that one wins — but tell us, because the design assumed it.

---

## 1. What you are building

One component, living in the **previously-empty right side of the 48px sticky line-score bar**.
It has two jobs — showing a generated insight, and letting the user ask a question — and they
share one entry point and one surface.

**The load-bearing idea, do not design around it:** the ask affordance *is* the silence state.
The generator rejects most moments, so a surface *reserved* for insights would be empty most of
the time, and empty surfaces get filled with filler. Instead: when an insight exists it occupies
the line; when none does, the diamond reads **"Ask Baseball IQ"**, which is a legitimate resting
state. **There is no empty state and no placeholder skeleton. Do not add one.**

**The bar is 48px in every state.** Rest, insight, asking, thinking, answered, error. Verified in
the design. Every panel **overlays** the content below (absolute, shadowed) — the same posture as
the line-score drawer. Nothing this feature does may move the score or the page.

---

## 2. Where it mounts

`LineScoreBand` already takes `zones` / `leaders` / `triggerLabel` as props. Add two more in the
same style:

```tsx
<LineScoreBand … iqCandidates={iq?.candidates ?? []} iqSuggested={iq?.suggested ?? []} />
```

The band is shared by **live, pregame and Scout**. `candidates={[]}` yields the silence state,
which is the honest pregame state and the correct default anywhere without context.

**Scout works for free.** `GamePage.tsx` already slices `replayUpdates` to `scoutMarkerIdx`
before passing them to the band; read `iq` off that sliced update and the review view shows the
insight that was live at the marker. Do **not** pass the latest `iq` into Scout.

---

## 3. The seven states

| # | State | Trigger | What renders |
|---|---|---|---|
| 1 | **Silence** | `candidates` empty | Diamond + "Ask Baseball IQ" text label. Resting, not degraded |
| 2 | **Insight** | `candidates[0]` exists | Rust `kind` eyebrow + one **ellipsised** line. Label hides; diamond stays as the ask |
| 3 | **Asking** | click either | 460px field slides out **right-to-left**; panel below shows the full insight + suggested questions |
| 4 | **Thinking** | question submitted | Pulsing diamond + "Reading the game…" + the question, in the same box |
| 5 | **Answered** | `ok: true` | Mono headline + `unit` + prose + up to 3 facts |
| 6 | **Error** | `ok: false` | "Not right now" + explanation + Try again |
| 7 | **No context, asking** | `candidates` empty + asking | Field only; no suggestions, replaced by one italic invitation line |

Phase is **one** value (`idle` / `thinking` / `answered` / `error`), never a set of booleans —
the panel must not be able to show two things at once.

---

## 4. Behaviours that matter

**Arrival.** Because the backend decoupled generation from the play push (`iqUpdate`, backend
§3.5), an insight lands on a bar that has **already settled**, 1–2s after its play. Left alone
that reads as a glitch. The line **fades and settles in over 340ms** (`iqArrive` keyframe in the
source) — it does not pop, and it does not move the bar.

**`iqUpdate` patching.** Patch **only** the matching `atBatIndex`'s `iq`. Do not re-render the
play, the feed row, or anything else — the user is likely mid-read on the thing that just landed.

**Asking.** Same gesture as the header search: expands right-to-left over the bar's empty middle,
autofocuses, dismisses on **Esc / ✕ / outside-click**, and clears on dismiss.

**Thinking.** ~1.4s measured, which is past the point where a user stops assuming the click
registered — so the wait is visible, but it is **not a spinner**. The panel is already open and
already the right shape; keep the question on screen, pulse the diamond in place, and let the
answer replace the wait inside the same box. Disable the input while it runs.

**Error.** Detect on **`ok: false`**. Never sniff `headline === "N/A"`. The server always returns
200, so HTTP status tells you nothing. Render it as a **content** state — no alarm colour, no
icon, no apology stack. It says what happened, says what is unaffected ("the game feed and
everything else on this page are unaffected"), and offers Try again. **Replace the backend's
placeholder `sub` text with the design's copy** — the placeholder exists so an unported client
doesn't render blank, not because it's the right words.

**Answer rendering.** `headline` is 30px mono, tabular — a number or a very short phrase, never a
sentence. `unit` is the small rust label beside it, and it is **optional** — do not hardcode
"parks" (the design source did, briefly; it now reads `answer.unit`). Facts arrive **formatted
with units**; do no number formatting. More than 3 facts will not fit — take the first 3.

**Query request** carries `updateIndex` — the moment the user is asking *from*, which in Scout is
not the latest play. Send the marker index, not the live one, or "the last hit" resolves wrong.

---

## 5. Colour — one rule you must not simplify

Rust as **text** on the dark bar measures 3.38:1 and fails AA. Small rust type up there uses a
lightened rust, **`#e2703f`** (`IQ_INK_ACCENT`) — the `kind` eyebrow and the answer's `unit`
label. Raw brand `accent` stays on the **shapes**: the diamond glyph and the field border. Same
precedent as `highlightText` in the token pass. Do not collapse these into one value.

---

## 6. Not for port

`IQ_CANDIDATES`, `IQ_SUGGESTED`, `IQ_ANSWER`, `IQ_ERROR`, `IQ_THINKING_MS`, the
`initialWorthy` / `initialAsking` / `initialAnswered` / `initialPhase` / `showMockToggle` props,
and the `mock: insight/silence` toggle button. All exist so the design page can pin one instance
per state. In the app every one of them is runtime state.

`IQ_THINKING_MS = 1400` is a mock timeout standing in for the real round trip — the app waits on
the actual response, with no artificial floor.

---

## 7. Known gaps to expect on screen (backend §3, not your bug)

- Only **4 of 6 triggers** fire — milestone and streak detection are stubbed. `Streak` and `Rare`
  eyebrows will be rare in practice.
- **Park-factor answers are estimates** against each park's average fence, not the actual wall.
  Fine as designed; just don't add precision language to the UI around them.

---

## 8. Acceptance

1. The bar measures **48px** in all seven states. Content below keeps an identical y-position
   across every one of them.
2. With `candidates: []` the bar shows the diamond + "Ask Baseball IQ" — no skeleton, no gap.
3. An insight patched in via `iqUpdate` fades in over ~340ms; the score and bar do not move, and
   the play it belongs to does not re-render.
4. Pregame shows the silence state. Scout at marker N shows the insight that was live at N — not
   the latest one.
5. Submitting a question shows the thinking state within one frame; the panel does not resize
   when the answer lands.
6. A response with `ok: false` renders state 07, with the design's copy and a working Try again.
7. Asking dismisses on Esc, ✕, and outside-click, and clears the field each time.
8. An answer with no `unit` renders without a stray label.
9. In Scout, a question asked at marker N sends `updateIndex: N`.
