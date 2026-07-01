---
title: Implementation Plan
document: 08
version: 0.1.0
status: Active
author: Pete DeLine
last_updated: 2026-06-30
related:
  - 04-architecture-design.md
  - 05-mvp-prd.md
  - 07-ai-context.md
  - 98-glossary.md
---

# Implementation Plan

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2026-06-30 | Pete DeLine | Initial plan |

---

# 1. Purpose

This document is the authoritative implementation plan for the Broadcast Engine MVP.

It translates the architecture (documents 03, 04, 07) and product requirements (document 05) into a sequenced set of implementation units. Each unit identifies exactly what files to create or modify, what tests to write, and what the acceptance condition is before the next unit begins.

This plan incorporates all resolved open questions:

| Question | Decision |
|----------|----------|
| AI provider | Anthropic SDK direct |
| Narration latency timeout | 3000ms, in config |
| Announcer identity | Veteran MLB announcer persona, in config |
| Pitch narration policy | At-bat outcomes only, driven by config array |
| Client changes | `useRealtimeGame.ts` + `GamePage.tsx` |

---

# 2. Guiding Constraint

**Under no circumstances should existing functionality break.**

The existing game processing pipeline — polling, feed processing, alert generation, realtime publication — must continue functioning exactly as before throughout every unit of this implementation.

This constraint drives two rules:

First, regression tests for `PollerProcessor` are written before any integration code touches that file. Those tests must pass before and after the integration.

Second, the Broadcast Director integration into `PollerProcessor` is fire-and-forget (`void`). No exception may ever propagate out of it.

---

# 3. Branch Strategy

All implementation work happens on a single feature branch:

```
feature/broadcast-engine-mvp
```

Branched from `main` after the docs branch is merged.

Each unit is committed individually on this branch with a descriptive commit message. The branch is pushed after every commit. No unit is considered complete until its commit is on the remote.

The branch is not merged to `main` until every unit is complete and every acceptance condition is met.

---

# 4. Unit Overview

| Unit | Name | Track |
|------|------|-------|
| 1 | Foundation — types, interfaces, config | API |
| 2 | PollerProcessor regression tests | API |
| 3 | BroadcastModule skeleton | API |
| 4 | MemoryManager + BroadcastSession | API |
| 5 | ContextBuilder | API |
| 6 | PromptBuilder | API |
| 7 | Anthropic AI Provider | API |
| 8 | Narrator | API |
| 9 | RealtimeGateway extension + OutputRouter | API |
| 10 | BroadcastDirector | API |
| 11 | PollerProcessor integration | API |
| 12 | Client — narration socket handler | Client |
| 13 | Client — GamePage narration display | Client |

Units 1–11 are backend. Units 12–13 are client. Units must be completed in order. Do not begin a unit until the previous unit's acceptance condition is met.

---

# 5. Unit 1 — Foundation

## Purpose

Establish the shared types, interfaces, and configuration that every subsequent unit depends on. No logic. No services. Types and config only.

## Files to Create

**`api/src/broadcast/types/broadcast-event.types.ts`**

Define the `BroadcastEventType` enum. Members:

```
AT_BAT_COMPLETE
SCORING_PLAY
PITCHING_CHANGE
INNING_TRANSITION
GAME_START
GAME_END
```

Define the `BroadcastEvent` interface:
- `gameId: string`
- `playKey: string`
- `eventType: BroadcastEventType`
- `description: string`
- `atBatResult: string | null`
- `isAtBatComplete: boolean`
- `gameState: BroadcastGameState`

Define `BroadcastGameState` as a plain object capturing score, inning, half, outs, runners, count, pitcher name and id, batter name and id.

---

**`api/src/broadcast/types/broadcast-context.types.ts`**

Define `BroadcastContext`:
- `event: BroadcastEvent`
- `gameState: BroadcastGameState`
- `recentPlays: string[]` — last 3–5 play descriptions
- `sessionMemory: SessionMemorySnapshot`
- `announcer: AnnouncerConfig`

Define `SessionMemorySnapshot`:
- `recentNarrations: { eventType: BroadcastEventType; text: string; ts: string }[]`
- `mentionedPlayerIds: string[]`
- `scoreLastStated: string | null`
- `atBatNarrationCount: number`

Define `AnnouncerConfig`:
- `systemPrompt: string`

---

**`api/src/broadcast/types/broadcast-output.types.ts`**

Define `BroadcastOutput`:
- `gameId: string`
- `sequence: number`
- `eventType: BroadcastEventType`
- `narration: string`
- `generatedAt: string`
- `promptVersion: string`
- `providerName: string`
- `inputTokens: number`
- `outputTokens: number`
- `durationMs: number`

---

**`api/src/broadcast/providers/ai-provider.interface.ts`**

Define `IAiProvider` interface:
- `generateNarration(prompt: { system: string; user: string }): Promise<AiProviderResponse>`
- `readonly providerName: string`
- `readonly modelIdentifier: string`

Define `AiProviderResponse`:
- `text: string`
- `inputTokens: number`
- `outputTokens: number`
- `durationMs: number`

---

**`api/src/broadcast/broadcast.config.ts`**

```typescript
export const broadcastConfig = {
  ai: {
    timeoutMs: 3000,
    retries: 2,
  },
  announcer: {
    systemPrompt: `You are a veteran MLB play-by-play announcer with 30 years of experience. You speak with warmth and authority. Big moments get energy; routine plays get two sentences. You never invent facts — you only describe what you are told actually happened.`,
  },
  narration: {
    narratedEventTypes: [
      'AT_BAT_COMPLETE',
      'SCORING_PLAY',
      'PITCHING_CHANGE',
      'INNING_TRANSITION',
      'GAME_START',
      'GAME_END',
    ] as const,
  },
};
```

## Files to Modify

None.

## Tests

None for this unit. Types and config are validated implicitly by TypeScript compilation and by every subsequent unit's tests.

## Acceptance Condition

`tsc --noEmit` passes with zero errors across all new files.

---

# 6. Unit 2 — PollerProcessor Regression Tests

## Purpose

Capture the current behavior of `PollerProcessor` before any changes are made to it. These tests are the safety net for Unit 11.

**This unit must be completed before any other file in the existing codebase is modified.**

## Files to Create

**`api/src/poller/poller.processor.spec.ts`**

Write tests that verify the following behaviors of `processGamePoll`:

**Test: alert service is called for each play**
Mock `AlertsService.onPlay`. Process a job with a recorded play payload. Assert `onPlay` was called with the correct `gameId` and play data.

**Test: realtime gateway publishes each play**
Mock `RealtimeGateway.publishGameUpdate`. Process a job. Assert `publishGameUpdate` was called with the correct `gameId` and payload shape.

**Test: a thrown exception in AlertsService does not prevent realtime publication**
Mock `AlertsService.onPlay` to throw. Assert `publishGameUpdate` is still called.

**Test: processGamePoll completes when no plays are present**
Process a job with an empty play list. Assert no exceptions, no alert calls, no realtime calls.

**Test: multiple plays in a single poll are all processed**
Process a job with three plays. Assert `publishGameUpdate` is called three times.

Use real play payload shapes from `PlayUpdateWire`. Do not use `any`. These tests must reflect the actual data contracts.

## Files to Modify

None.

## Acceptance Condition

All tests pass. `git stash` the test file, run the suite, confirm it was failing before the file was present (i.e., these are new tests, not pre-existing). Restore and confirm all pass.

---

# 7. Unit 3 — BroadcastModule Skeleton

## Purpose

Create the NestJS module with all six services declared but not yet implemented. Wire it into `AppModule`. Confirm the application still starts.

## Files to Create

**`api/src/broadcast/broadcast.module.ts`**

Declare the module. Import `RealtimeModule` (already exists). Provide all six services as empty `@Injectable()` classes initially:
- `BroadcastDirectorService`
- `ContextBuilderService`
- `MemoryManagerService`
- `PromptBuilderService`
- `NarratorService`
- `OutputRouterService`

Export `BroadcastDirectorService` (the only service `PollerProcessor` will inject).

Create stub service files for each (one per file, matching the structure in document 07 Section 4). Each stub has the correct class name, decorator, constructor, and logger. No logic yet.

## Files to Modify

**`api/src/app.module.ts`**

Import and register `BroadcastModule` alongside existing feature modules.

## Tests

**`api/src/broadcast/broadcast.module.spec.ts`**

Verify the module compiles and all six providers can be resolved from the NestJS DI container.

## Acceptance Condition

`yarn start:dev` boots without errors. The regression tests from Unit 2 still pass.

---

# 8. Unit 4 — MemoryManager + BroadcastSession

## Purpose

Implement per-game session management. This is stateful infrastructure that the Context Builder, Narrator, and Director all depend on.

## Files to Create

**`api/src/broadcast/memory/broadcast-session.ts`**

Define `BroadcastSession` class or interface:
- `gameId: string`
- `startedAt: string`
- `sequence: number` — monotonically increasing, incremented on each narration
- `recentNarrations: { eventType: BroadcastEventType; text: string; ts: string }[]` — capped at 5
- `mentionedPlayerIds: Set<string>`
- `scoreLastStated: string | null`
- `atBatNarrationCount: number`

---

**`api/src/broadcast/memory/memory-manager.service.ts`**

Implement `MemoryManagerService`:

- `getOrCreateSession(gameId: string): BroadcastSession` — returns existing session or creates a new one
- `getSessionSnapshot(gameId: string): SessionMemorySnapshot` — returns a plain object safe to pass into `BroadcastContext`
- `recordNarration(gameId: string, output: BroadcastOutput): void` — updates the session after a successful narration; increments sequence, appends to recent narrations (capped at 5), records mentioned players, updates `scoreLastStated` if the narration contains a score reference
- `nextSequence(gameId: string): number` — returns and increments the session sequence
- `closeSession(gameId: string): void` — removes the session from the map

Internal state: `private readonly sessions = new Map<string, BroadcastSession>()`

## Files to Modify

None.

## Tests

**`api/src/broadcast/memory/memory-manager.service.spec.ts`**

- `getOrCreateSession` returns a new session with correct initial values
- `getOrCreateSession` called twice with the same `gameId` returns the same session
- `getOrCreateSession` called with different `gameIds` returns independent sessions
- `recordNarration` increments sequence
- `recordNarration` caps `recentNarrations` at 5
- `closeSession` removes the session; subsequent `getOrCreateSession` creates a fresh one
- Mutating one session does not affect another

## Acceptance Condition

All unit tests pass. Unit 2 regression tests still pass.

---

# 9. Unit 5 — ContextBuilder

## Purpose

Implement the service that assembles `BroadcastContext` from a `BroadcastEvent`, the current game state, and the session memory snapshot.

## Files to Create

**`api/src/broadcast/context/context-builder.service.ts`**

Implement `ContextBuilderService`:

- `build(event: BroadcastEvent, sessionSnapshot: SessionMemorySnapshot): BroadcastContext`

The method assembles:
- `event` — passed through directly
- `gameState` — taken from `event.gameState`
- `recentPlays` — derived from `sessionSnapshot.recentNarrations`, taking the last 3 `text` values
- `sessionMemory` — the snapshot passed in
- `announcer` — `{ systemPrompt: broadcastConfig.announcer.systemPrompt }`

No external calls. No async. Pure assembly from inputs.

## Files to Modify

None.

## Tests

**`api/src/broadcast/context/context-builder.service.spec.ts`**

- Given a `BroadcastEvent` and a `SessionMemorySnapshot` with 3 recent narrations, `build` returns a `BroadcastContext` with `recentPlays` containing those 3 texts
- `recentPlays` is capped at 3 even if the snapshot contains 5
- `announcer.systemPrompt` matches `broadcastConfig.announcer.systemPrompt`
- `gameState` in the context matches `event.gameState`
- The returned object contains no undefined fields

## Acceptance Condition

All unit tests pass. Unit 2 regression tests still pass.

---

# 10. Unit 6 — PromptBuilder

## Purpose

Implement the service that converts `BroadcastContext` into a structured prompt for the AI provider.

## Files to Create

**`api/src/broadcast/prompt/templates.ts`**

Define `PROMPT_VERSION = 'v1.0.0'`.

Define a `buildUserMessage(context: BroadcastContext): string` function that serializes the context into a readable briefing. Format:

```
Game: {away team} vs. {home team} — {half} of the {inning}
Score: {away} {awayScore}, {home} {homeScore}
Outs: {outs}
Runners: {runner description or "Bases empty"}
Count: {balls}-{strikes}
At bat: {batter name}
Pitching: {pitcher name}
Event: {event description}
Recent plays: {comma-separated list or "None"}
Previously said: {last narration text or "Nothing yet"}
```

This is a function, not a template engine. Build it with string interpolation.

---

**`api/src/broadcast/prompt/prompt-builder.service.ts`**

Implement `PromptBuilderService`:

- `build(context: BroadcastContext): { system: string; user: string; promptVersion: string }`

Returns:
- `system` — `context.announcer.systemPrompt`
- `user` — output of `buildUserMessage(context)`
- `promptVersion` — `PROMPT_VERSION`

## Files to Modify

None.

## Tests

**`api/src/broadcast/prompt/prompt-builder.service.spec.ts`**

- `build` returns an object with `system`, `user`, and `promptVersion`
- `system` equals the configured system prompt
- `user` contains the batter name from the context
- `user` contains the pitcher name from the context
- `user` contains the score from the context
- `promptVersion` equals `PROMPT_VERSION`
- Given identical contexts, `build` always returns identical output (determinism)

## Acceptance Condition

All unit tests pass. Unit 2 regression tests still pass.

---

# 11. Unit 7 — Anthropic AI Provider

## Purpose

Implement the `IAiProvider` interface using the Anthropic SDK.

## Dependencies to Install

```bash
yarn add @anthropic-ai/sdk
```

Anthropic API key is read from `process.env.ANTHROPIC_API_KEY`. Add to `.env.example`:

```
ANTHROPIC_API_KEY=your_key_here
```

## Files to Create

**`api/src/broadcast/providers/anthropic/anthropic-ai.provider.ts`**

Implement `AnthropicAiProvider` satisfying `IAiProvider`:

- `providerName = 'anthropic'`
- `modelIdentifier = 'claude-sonnet-4-6'`

`generateNarration` implementation:
1. Record `startTime = Date.now()`
2. Call `anthropic.messages.create` with `model`, `max_tokens: 150`, `system`, `messages: [{ role: 'user', content: user }]`
3. Wrap in a `Promise.race` against a `setTimeout` of `broadcastConfig.ai.timeoutMs` that rejects with a timeout error
4. On success: extract `content[0].text`, `usage.input_tokens`, `usage.output_tokens`, compute `durationMs`
5. On timeout: throw a typed `BroadcastTimeoutError`
6. On API error: catch, log, throw a typed `BroadcastProviderError`
7. Retry up to `broadcastConfig.ai.retries` times on transient errors (network, 429, 529) with exponential backoff. Do not retry on timeout.

Define `BroadcastTimeoutError` and `BroadcastProviderError` in `api/src/broadcast/types/broadcast-event.types.ts` or a new `broadcast-errors.ts` file.

---

**`api/src/broadcast/providers/anthropic/anthropic-ai.provider.spec.ts`**

Tests use a mocked Anthropic SDK — do not make real API calls in tests.

- `generateNarration` returns `AiProviderResponse` with correct fields on success
- `generateNarration` throws `BroadcastTimeoutError` when the timeout fires first
- `generateNarration` retries on a 429 response and succeeds on the second attempt
- `generateNarration` throws `BroadcastProviderError` after exhausting retries
- `providerName` equals `'anthropic'`
- `modelIdentifier` equals `'claude-sonnet-4-6'`

## Files to Modify

**`api/src/broadcast/broadcast.module.ts`**

Register `AnthropicAiProvider` as a provider using the `IAiProvider` injection token:

```typescript
{
  provide: 'IAiProvider',
  useClass: AnthropicAiProvider,
}
```

## Acceptance Condition

All unit tests pass. Unit 2 regression tests still pass. TypeScript compiles with no errors.

---

# 12. Unit 8 — Narrator

## Purpose

Implement the service that accepts a `NarrationRequest`, invokes the AI provider, validates the response, and returns structured narration.

## Files to Create

**`api/src/broadcast/narrator/narrator.service.ts`**

Inject `IAiProvider` via the `'IAiProvider'` token.

Define `NarrationRequest`:
- `context: BroadcastContext`
- `prompt: { system: string; user: string; promptVersion: string }`
- `gameId: string`
- `sequence: number`

Implement `NarratorService`:

- `narrate(request: NarrationRequest): Promise<BroadcastOutput>`

Workflow:
1. Log request initiation with `gameId`, `sequence`, `promptVersion`
2. Record `startTime`
3. Call `this.aiProvider.generateNarration({ system: request.prompt.system, user: request.prompt.user })`
4. Validate response: `text` must be a non-empty string, length between 10 and 500 characters
5. If validation fails: log warning with reason, throw `BroadcastValidationError`
6. Build and return `BroadcastOutput` with all required fields populated
7. Log successful narration with `gameId`, `sequence`, `durationMs`, token counts

## Files to Modify

None beyond the module if registration is needed.

## Tests

**`api/src/broadcast/narrator/narrator.service.spec.ts`**

Mock `IAiProvider`.

- `narrate` returns a well-formed `BroadcastOutput` on a valid AI response
- `narrate` throws `BroadcastValidationError` when `text` is empty
- `narrate` throws `BroadcastValidationError` when `text` exceeds 500 characters
- `narrate` propagates `BroadcastTimeoutError` from the provider
- `narrate` propagates `BroadcastProviderError` from the provider
- `BroadcastOutput.sequence` matches the value passed in the request
- `BroadcastOutput.gameId` matches the value passed in the request
- `BroadcastOutput.generatedAt` is a valid ISO 8601 string
- `BroadcastOutput.promptVersion` matches the prompt's version

## Acceptance Condition

All unit tests pass. Unit 2 regression tests still pass.

---

# 13. Unit 9 — OutputRouter + RealtimeGateway Extension

## Purpose

Add `publishNarration` to `RealtimeGateway` and implement the `OutputRouterService` that calls it.

## Files to Modify

**`api/src/realtime/realtime.gateway.ts`**

Add one method after `publishGameAlert`:

```typescript
public publishNarration(gameId: string, output: BroadcastOutput): void {
  this.server.to(gameId).emit('narration', output);
  this.logger.debug(
    `[broadcast] narration gameId=${gameId} seq=${output.sequence} chars=${output.narration.length}`,
  );
}
```

Import `BroadcastOutput` from the broadcast types. No other changes to this file.

## Files to Create

**`api/src/broadcast/router/output-router.service.ts`**

Inject `RealtimeGateway`.

Implement `OutputRouterService`:

- `deliver(output: BroadcastOutput): void`

Workflow:
1. Call `this.gateway.publishNarration(output.gameId, output)`
2. Log delivery success with `gameId` and `sequence`
3. Wrap in try/catch — log any error and return without throwing

## Tests

**`api/src/broadcast/router/output-router.service.spec.ts`**

Mock `RealtimeGateway`.

- `deliver` calls `publishNarration` with the correct `gameId` and `output`
- `deliver` does not throw when `publishNarration` throws
- `deliver` logs an error when `publishNarration` throws

**`api/src/realtime/realtime.gateway.spec.ts`** (new or extend existing if present)

- `publishNarration` emits on the `'narration'` event to the correct room
- `publishNarration` does not affect `'play'` or `'alert'` emissions

## Acceptance Condition

All unit tests pass. Unit 2 regression tests still pass. `tsc --noEmit` clean.

---

# 14. Unit 10 — BroadcastDirector

## Purpose

Implement the orchestrating service that coordinates all other components. This is the most complex unit and the one most critical to get right.

## Files to Create

**`api/src/broadcast/director/broadcast-director.service.ts`**

Inject: `MemoryManagerService`, `ContextBuilderService`, `PromptBuilderService`, `NarratorService`, `OutputRouterService`.

Implement `BroadcastDirectorService`:

**`shouldNarrate(event: BroadcastEvent): boolean`** (private)

Returns `true` if `event.eventType` is present in `broadcastConfig.narration.narratedEventTypes`. Returns `false` otherwise. This is the entire suppression logic for the MVP.

**`deriveBroadcastEvent(gameId: string, update: PlayUpdateWire, payload: unknown): BroadcastEvent | null`** (private)

Constructs a `BroadcastEvent` from the `PlayUpdateWire`. Returns `null` if the event type cannot be determined. Maps play data to `BroadcastEventType` values. Reads `isAtBatComplete`, `atBatResult`, `description`, and `playKey` from the wire payload. Reads `gameState` from the current application state available in the payload.

**`onPlay(gameId: string, update: PlayUpdateWire, payload: unknown): Promise<void>`** (public)

This is the integration method called by `PollerProcessor`. Its entire body is wrapped in try/catch. No exception may escape.

Workflow:
1. Derive `BroadcastEvent` from `update` and `payload`. If null, log debug and return.
2. Call `shouldNarrate(event)`. If false, log debug with reason `'event type not in narrated set'` and return.
3. Get session snapshot from `MemoryManagerService.getSessionSnapshot(gameId)`
4. Build `BroadcastContext` via `ContextBuilderService.build(event, snapshot)`
5. Build prompt via `PromptBuilderService.build(context)`
6. Get sequence via `MemoryManagerService.nextSequence(gameId)`
7. Call `NarratorService.narrate({ context, prompt, gameId, sequence })`
8. Call `OutputRouterService.deliver(output)`
9. Call `MemoryManagerService.recordNarration(gameId, output)`
10. Log success
11. Catch any error: log with `gameId`, `playKey`, error message. Do not rethrow.

## Tests

**`api/src/broadcast/director/broadcast-director.service.spec.ts`**

Mock all five injected services.

- `onPlay` calls `ContextBuilderService.build` when the event type is in the narrated set
- `onPlay` does NOT call `ContextBuilderService.build` when the event type is not in the narrated set
- `onPlay` calls `NarratorService.narrate` with correct `gameId` and `sequence`
- `onPlay` calls `OutputRouterService.deliver` with the narrator's output
- `onPlay` calls `MemoryManagerService.recordNarration` after successful delivery
- `onPlay` does not throw when `ContextBuilderService.build` throws
- `onPlay` does not throw when `NarratorService.narrate` throws `BroadcastTimeoutError`
- `onPlay` does not throw when `NarratorService.narrate` throws `BroadcastProviderError`
- `onPlay` does not throw when `OutputRouterService.deliver` throws
- `onPlay` called concurrently for two different `gameId` values processes both independently

## Acceptance Condition

All unit tests pass. Unit 2 regression tests still pass.

---

# 15. Unit 11 — PollerProcessor Integration

## Purpose

Add the single fire-and-forget call to `BroadcastDirectorService` inside `PollerProcessor`. This is the only change to any existing file in the main processing pipeline.

## Files to Modify

**`api/src/poller/poller.processor.ts`**

1. Inject `BroadcastDirectorService` in the constructor alongside `AlertsService` and `RealtimeGateway`. Follow the exact same injection pattern.

2. In `processGamePoll`, after the existing lines:
   ```typescript
   await this.alerts.onPlay(gameId, { ...u, ts });
   this.realtime.publishGameUpdate(gameId, { play: payload });
   ```
   Add:
   ```typescript
   void this.broadcastDirector.onPlay(gameId, u, payload);
   ```

   The `void` is mandatory. Do not `await`. Do not add try/catch here — the Director handles its own errors.

3. No other changes to this file.

**`api/src/poller/poller.module.ts`**

Import `BroadcastModule` if not already resolvable through `AppModule`.

## Tests

**`api/src/poller/poller.processor.spec.ts`** (extend from Unit 2)

Add to the existing regression tests:

- `onPlay` on `BroadcastDirectorService` is called once per play processed
- `onPlay` on `BroadcastDirectorService` is called with the correct `gameId`
- A thrown exception inside `BroadcastDirectorService.onPlay` does not prevent `AlertsService.onPlay` from completing (test isolation via ordering)
- A thrown exception inside `BroadcastDirectorService.onPlay` does not prevent `RealtimeGateway.publishGameUpdate` from completing
- The existing Unit 2 tests (alert service called, realtime gateway called, empty play list) still pass without modification

## Acceptance Condition

All tests — Unit 2 originals and new additions — pass. Application boots and processes a live game without errors. The broadcast narration appears in server logs. The existing `'play'` and `'alert'` socket events are unaffected.

---

# 16. Unit 12 — Client Narration Socket Handler

## Purpose

Add `'narration'` event handling to `useRealtimeGame.ts` so the client receives and stores narration payloads from the server.

## Files to Modify

**`client/src/realtime/useRealtimeGame.ts`**

Following the exact same pattern as the existing `alerts` state:

1. Define a `NarrationPayload` type matching `BroadcastOutput` from the server (or import from the generated SDK client if available after an SDK rebuild).

2. Add state: `const [narrationsByGameId, setNarrationsByGameId] = useState<Record<string, NarrationPayload[]>>({})`.

3. Add a `handleNarration` callback (inside the socket listener effect) that appends the incoming payload to the correct game's narration list, capped at the last 10 entries.

4. Register: `socket.on('narration', handleNarration)`.

5. Clean up: `socket.off('narration', handleNarration)` in the effect return.

6. Derive and return: `const narrations: readonly NarrationPayload[] = selectedGameId ? (narrationsByGameId[selectedGameId] ?? []) : []`.

7. Add `narrations` to the hook's return value.

The hook's existing behavior — `'play'`, `'hydrate'`, alerts, all state — must not change.

## Tests

**`client/src/realtime/useRealtimeGame.spec.ts`** (new or extend)

- Receiving a `'narration'` event appends to `narrations` for the correct `gameId`
- Receiving a `'narration'` event for a different `gameId` does not affect the selected game's narrations
- `narrations` is capped at 10 entries
- Receiving a `'play'` event after a `'narration'` event does not clear narrations
- The hook still returns all previously existing fields unchanged

## Acceptance Condition

All client tests pass. The hook returns `narrations`. The existing hook behavior is unchanged.

---

# 17. Unit 13 — GamePage Narration Display

## Purpose

Display the latest narration in `GamePage.tsx`. This is the final unit and the one that makes the MVP visible.

## Design

The narration strip sits between the `LineScoreBand` and the two-column hero row. It displays the most recent narration text. When a new narration arrives it replaces the previous one. It is visually distinct but unobtrusive — not competing with the pitch-by-pitch feed.

Apply the existing design token system: `--color-surface-alt` background, `--color-text-muted` label, `--color-text` narration text, `--font-sans` for the label, `--font-mono` for any numeric references within the narration if applicable.

## Files to Create

**`client/src/features/game/NarrationStrip.tsx`**

A simple component accepting `narration: string | null`. Renders nothing when `narration` is null. When present, renders:

```
[ 📻  narration text here ]
```

No animation for MVP. No history. Latest only.

**`client/src/features/game/NarrationStrip.css`**

Style per the design token system above. Full width, modest height, subtle background.

## Files to Modify

**`client/src/pages/GamePage.tsx`**

1. Destructure `narrations` from `useRealtimeGame`.
2. Derive `latestNarration = narrations.at(-1)?.narration ?? null`.
3. Render `<NarrationStrip narration={latestNarration} />` between `<LineScoreBand>` and the two-column hero row.

## Tests

**`client/src/features/game/NarrationStrip.spec.tsx`**

- Renders nothing when `narration` is null
- Renders narration text when provided
- Updates when `narration` prop changes

## Acceptance Condition

Opening a live game in the browser shows the narration strip. New narrations appear as plays occur. Existing game view behavior — pitch-by-pitch feed, line score, matchup cards, alert chips — is unaffected.

---

# 18. Final Acceptance

Before merging to `main`, verify all of the following:

- [ ] All 13 unit acceptance conditions met
- [ ] Full test suite passes with zero failures
- [ ] `tsc --noEmit` passes in both `api/` and `client/`
- [ ] Application boots in development without errors
- [ ] A live game produces narration visible in the `NarrationStrip`
- [ ] Narration text is factually consistent with the play that triggered it
- [ ] Existing `'play'` and `'alert'` socket events are unaffected
- [ ] Server logs show structured narration lifecycle entries for each narrated event
- [ ] Server logs show suppression entries for non-narrated events
- [ ] Token usage is present in logs for every AI provider call
- [ ] Disconnecting the Anthropic API key mid-game: application continues processing games, narration stops silently, no uncaught exceptions

---

# 19. Post-MVP

Upon merge, update this document's status to `Complete` and record the merge date.

Open the following items as the immediate next priorities from the Roadmap (Phase 2):

- Prompt quality iteration (requires prompt versioning tooling)
- Streaming narration responses
- Individual pitch narration policy (Phase 2 config addition)
- Client display refinement (animation, history drawer)
- Token cost observability

---
