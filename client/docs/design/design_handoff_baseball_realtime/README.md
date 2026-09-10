# Handoff — Baseball IQ, client port

**Sep 8, 2026.** The backend shipped and is ready. This is the front-end half — the last
piece of the feature.

## Read in this order

1. **`design-so-far.html`** — open it in a browser first. All seven states, pinned, in the
   real 48px bar, with the reasoning beside each one. Five minutes and you'll know the feature.
2. **`PROMPT_baseball_iq_client.md`** — the port spec: where it mounts, the seven states, the
   behaviours that matter, the one colour rule, what's mock, and 9 acceptance checks.
3. **`HANDOFF_baseball_iq_backend.md`** — the API contract, from the backend team. Authoritative
   on field names.

## Files

| File | What it is |
|---|---|
| `PROMPT_baseball_iq_client.md` | The spec |
| `design-so-far.html` | Runnable seven-state reference. Open directly, no build |
| `game-v2.jsx` | Design source — `BaseballIQ`, `IQDiamond`, mounted in `LineScoreBand` |
| `shared.jsx` | Tokens (`window.T`) |
| `HANDOFF_baseball_iq_backend.md` | Backend contract |

## The three things most likely to be got wrong

1. **There is no empty state.** Silence is the diamond reading "Ask Baseball IQ". Adding a
   skeleton or a placeholder undoes the central design decision.
2. **48px, always.** Panels overlay; nothing this feature does may move the score or the page.
3. **Detect failure on `ok: false`**, never on HTTP status (always 200) or on the placeholder
   text — and replace that placeholder copy with the design's.

## App scope

The line-score band component and its three mounts (live, pregame, Scout), plus a client for
`POST /api/iq/query` and handling for the `iqUpdate` envelope on the existing play socket.
Nothing else on the game view changes.
