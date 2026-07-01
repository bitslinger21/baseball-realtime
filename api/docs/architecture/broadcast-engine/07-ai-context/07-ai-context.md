---
title: AI Context
document: 07
version: 0.1.0
status: Draft
author: Pete DeLine
last_updated: 2026-06-30
related:
  - 03-engineering-principles.md
  - 04-architecture-design.md
  - 05-mvp-prd.md
---

# AI Context

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2026-06-30 | Pete DeLine | Initial draft |

---

# 1. Purpose

This document is written specifically for engineers and AI-assisted development tools implementing the Broadcast Engine.

Where the preceding documents established the architectural philosophy and component design, this document translates that architecture into the concrete conventions, patterns, file structure, integration points, and guardrails required to implement it correctly inside the existing Baseball API.

An implementer who has read this document and documents 03, 04, and 05 should be able to begin writing code without ambiguity about where things go, what they are called, or how they connect to the existing system.

---

# 2. The Existing System in Brief

Before introducing anything new, understand what already exists.

The API is a NestJS application. It polls MLB data continuously, processes live game events, maintains authoritative game state, and distributes updates to clients through a Socket.io realtime gateway.

The components most relevant to the Broadcast Engine are:

**`PollerProcessor`** (`api/src/poller/poller.processor.ts`)

This is the heart of the live game pipeline. It receives poll jobs, retrieves updated game feeds from MLB, processes play-by-play events, and dispatches results to downstream consumers. After processing each play, it currently calls two consumers:

```
this.alerts.onPlay(gameId, update)
this.realtime.publishGameUpdate(gameId, { play: payload })
```

The Broadcast Engine becomes a third consumer at this same point. The existing two calls must not be modified.

**`RealtimeGateway`** (`api/src/realtime/realtime.gateway.ts`)

The Socket.io gateway that distributes updates to connected clients. It currently emits three event types:

- `'play'` — live game state updates
- `'alert'` — baseball alerts (home run, no-hitter, etc.)
- `'daily'` — daily schedule updates

The Broadcast Engine introduces a fourth: `'narration'`. This is added to the gateway as a new `publishNarration` method following the exact same pattern as `publishGameAlert`.

**`AlertsService`** (`api/src/alerts/alerts.service.ts`)

The closest existing analogue to the Broadcast Engine. It receives play events, interprets them for significance, and publishes alerts. Study its structure before building the Broadcast Engine — the integration pattern is nearly identical.

---

# 3. Canonical Terminology

Use these terms exactly as written throughout all code, comments, and documentation. Inconsistent naming across the codebase creates confusion for both human engineers and AI tools.

| Term | Meaning | Do Not Use Instead |
|------|---------|-------------------|
| `BroadcastEvent` | A baseball event derived from game state and presented to the Broadcast Director as a narration opportunity | `PlayEvent`, `GameEvent`, `NarrationEvent` |
| `BroadcastContext` | The presentation-oriented view of the game assembled by the Context Builder for a specific event | `GameContext`, `NarrationContext`, `PromptContext` |
| `BroadcastSession` | The per-game runtime instance that holds presentation memory and session state | `GameSession`, `NarrationSession`, `BroadcastState` |
| `BroadcastOutput` | The structured payload produced by the Narrator and delivered by the Output Router | `NarrationResult`, `BroadcastResult`, `AiResponse` |
| `Narrator` | The service that invokes the AI provider and returns structured narration | `AiService`, `NarrationGenerator`, `LlmService` |
| `BroadcastDirector` | The orchestrating service that coordinates all other components | `BroadcastOrchestrator`, `BroadcastService`, `BroadcastManager` |
| `ContextBuilder` | The service that assembles `BroadcastContext` | `ContextService`, `ContextAssembler` |
| `MemoryManager` | The service that maintains per-session presentation memory | `SessionMemory`, `BroadcastMemory`, `NarrationMemory` |
| `PromptBuilder` | The service that converts `BroadcastContext` into an AI prompt | `PromptService`, `PromptGenerator`, `PromptFactory` |
| `OutputRouter` | The service that delivers `BroadcastOutput` to downstream consumers | `BroadcastPublisher`, `NarrationRouter`, `OutputService` |
| `IAiProvider` | The interface that all AI provider implementations must satisfy | `ILlmProvider`, `IAiClient`, `IModelProvider` |

---

# 4. Module Location and File Structure

All Broadcast Engine code lives under `api/src/broadcast/`.

This follows the same convention as every other feature module in the application: `api/src/alerts/`, `api/src/realtime/`, `api/src/poller/`.

The recommended internal structure is:

```
api/src/broadcast/
  broadcast.module.ts
  director/
    broadcast-director.service.ts
    broadcast-director.service.spec.ts
  context/
    context-builder.service.ts
    context-builder.service.spec.ts
  memory/
    memory-manager.service.ts
    memory-manager.service.spec.ts
    broadcast-session.ts
  prompt/
    prompt-builder.service.ts
    prompt-builder.service.spec.ts
  narrator/
    narrator.service.ts
    narrator.service.spec.ts
  router/
    output-router.service.ts
    output-router.service.spec.ts
  providers/
    ai-provider.interface.ts
    anthropic/
      anthropic-ai.provider.ts
      anthropic-ai.provider.spec.ts
  types/
    broadcast-event.types.ts
    broadcast-context.types.ts
    broadcast-output.types.ts
```

Do not place Broadcast Engine types inside `api/src/common/` or `api/src/shared/`. They belong to the broadcast domain and live inside `api/src/broadcast/types/`.

---

# 5. Integration Point

There is exactly one place in the existing codebase where the Broadcast Engine connects: inside `PollerProcessor.processGamePoll()`.

After the existing downstream calls, add a single non-blocking invocation to the Broadcast Director:

```
// existing — do not modify
await this.alerts.onPlay(gameId, { ...u, ts });
this.realtime.publishGameUpdate(gameId, { play: payload });

// new — Broadcast Engine integration
void this.broadcastDirector.onPlay(gameId, u, payload);
```

The `void` keyword is intentional. Narration generation must not block or await within the polling loop. A narration failure must never propagate to `processGamePoll`. The Broadcast Director is responsible for catching its own errors internally.

`BroadcastDirector` is injected into `PollerProcessor` the same way `AlertsService` and `RealtimeGateway` are currently injected. No other changes to `PollerProcessor` are required.

`BroadcastModule` must be imported in `AppModule` (`api/src/app.module.ts`) the same way other feature modules are registered.

---

# 6. The `BroadcastEvent` Type

The `BroadcastEvent` is constructed inside the Broadcast Director from the `PlayUpdateWire` payload already produced by `PollerProcessor`.

`PlayUpdateWire` is defined in `api/src/poller/poller.processor.ts`. The Broadcast Engine does not redefine it. It reads from it.

A `BroadcastEvent` is a focused, presentation-oriented projection of that data. It carries only what the narration pipeline needs and nothing else. It does not carry raw MLB data structures.

At minimum, a `BroadcastEvent` includes:

- `gameId` — the provider game identifier
- `eventType` — a member of a `BroadcastEventType` enum (defined in `broadcast-event.types.ts`)
- `playKey` — the unique identifier of the play from the existing wire model
- `description` — the human-readable play description from the MLB feed
- `atBatResult` — the normalized outcome of the plate appearance when one has concluded
- `isAtBatComplete` — whether this event ends the current plate appearance
- `gameState` — a snapshot of the current authoritative game state at the moment of the event

`BroadcastEventType` should cover at minimum the events defined as required narration events in document 05 Section 7.

---

# 7. The `BroadcastContext` Type

`BroadcastContext` is assembled by the `ContextBuilder` and passed to the `PromptBuilder`. It is never passed back to any component outside the broadcast pipeline.

It must include:

- The current `BroadcastEvent`
- Score, inning, half-inning, outs, runners, count, pitcher, batter
- Recent play descriptions (last 3–5 plays) for continuity
- Session memory contributions from the `MemoryManager`
- The announcer identity configuration active for this session

It must not include:

- Raw MLB data structures (`MlbFeedResponse`, `MlbPlay`, etc.)
- Database entities
- Provider-specific objects
- HTTP request or response objects

All values in `BroadcastContext` should be plain TypeScript types: strings, numbers, enums, and simple objects. The `PromptBuilder` must be able to serialize it without special handling.

---

# 8. The `BroadcastSession` Object

Each active game has exactly one `BroadcastSession`. The `MemoryManager` owns a `Map<string, BroadcastSession>` keyed by `gameId`.

A session is created on the first `onPlay` call for a game. It is removed after final broadcast activity for a completed game.

`BroadcastSession` holds only presentation memory. It must not hold authoritative game state.

Minimum session fields:

- `gameId`
- `startedAt`
- `recentNarrations` — a capped array (last N narrations) of `{ eventType, text, ts }`
- `mentionedPlayers` — a `Set<string>` of player identifiers mentioned in this broadcast
- `scoreLastStated` — the score string the last time it was narrated, to avoid repetition
- `atBatNarrationCount` — how many times the current at-bat has been narrated

Sessions are in-memory only. They are never persisted to the database. A server restart clears all sessions. This is acceptable behavior for the MVP.

---

# 9. Prompt Construction

The `PromptBuilder` produces a prompt object with two parts: a system message and a user message.

**System message**

The system message establishes the announcer's identity and the constraints on its behavior. It should:

- Name the announcer and describe its communication style
- Instruct the announcer to communicate only facts present in the provided context
- Specify the desired output length and format
- Prohibit fabrication, speculation, or references to events not in the context

**User message**

The user message contains the structured `BroadcastContext` serialized as a readable description of the current situation. It should not be raw JSON. It should read like a briefing given to an announcer before they speak.

Example user message structure (not final copy):

```
Game: Houston Astros vs. Chicago Cubs — Bottom of the 6th, 1 out
Score: HOU 4, CHC 2
Runners: Runner on second
Count: 2-1
At bat: Michael Busch (LHB) vs. Framber Valdez (LHP)
Event: Single to left field. Runner on second advances to third. No runs score.
Recent plays: Strikeout (Morel), Walk (Caratini)
Previously narrated: "Valdez has been dominant this inning."
```

The `PromptBuilder` is responsible for this serialization. No other component should produce prompts.

Prompt templates should be stored as versioned constants in `api/src/broadcast/prompt/`. When a template is changed, its version identifier must be incremented. The version is included in the narration log entry.

---

# 10. The `IAiProvider` Interface

Every AI provider implementation must satisfy this interface. No other broadcast component may call a provider SDK directly.

The interface must expose at minimum:

```typescript
interface IAiProvider {
  generateNarration(prompt: {
    system: string;
    user: string;
  }): Promise<AiProviderResponse>;

  readonly providerName: string;
  readonly modelIdentifier: string;
}

interface AiProviderResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}
```

The implementation class is responsible for:

- Authentication and credential management
- HTTP retry logic (recommended: 2 retries with exponential backoff)
- Timeout enforcement (recommended: 8000ms for MVP, tunable via config)
- Normalizing provider-specific errors into a consistent error type
- Never throwing raw SDK exceptions to the `Narrator`

The MVP ships one provider implementation. Its location is `api/src/broadcast/providers/anthropic/anthropic-ai.provider.ts`. The chosen provider is recorded as an Architecture Decision at implementation time.

---

# 11. The `BroadcastOutput` Payload

`BroadcastOutput` is the object the `OutputRouter` delivers to the `RealtimeGateway`. It becomes the socket payload emitted to clients on the `'narration'` event.

Required fields match the output contract defined in document 05 Section 9:

```typescript
interface BroadcastOutput {
  gameId: string;
  sequence: number;         // monotonically increasing per session
  eventType: BroadcastEventType;
  narration: string;
  generatedAt: string;      // ISO 8601
  promptVersion: string;
  providerName: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}
```

`promptVersion`, `providerName`, `inputTokens`, `outputTokens`, and `durationMs` are included for observability. They are delivered to the client but are not required to be displayed. The client may ignore them.

---

# 12. RealtimeGateway Extension

Add one method to `RealtimeGateway`:

```typescript
public publishNarration(gameId: string, output: BroadcastOutput): void {
  this.server.to(gameId).emit('narration', output);
  this.logger.debug(
    `[broadcast] narration gameId=${gameId} seq=${output.sequence} len=${output.narration.length}`,
  );
}
```

This follows the exact same pattern as `publishGameAlert`. No other changes to `RealtimeGateway` are required for the MVP.

Clients subscribe to the `'narration'` event on the same game room they already join for `'play'` and `'alert'` events. No new subscription mechanism is needed.

---

# 13. Error Handling Rules

These rules are non-negotiable. Violating them risks disrupting the existing game processing pipeline.

**Rule 1 — The Broadcast Director catches everything.**

The `onPlay` method on `BroadcastDirector` must wrap its entire body in a try/catch. No exception may escape to `PollerProcessor` under any circumstances.

**Rule 2 — AI failures are logged and swallowed.**

When the AI provider returns an error or the `Narrator` fails validation, the failure is logged with full detail and the event is skipped. The session continues. The next event is processed normally.

**Rule 3 — Session errors are isolated.**

A failure in one game's `BroadcastSession` must not affect any other session. The `MemoryManager` must handle missing or corrupt session state gracefully, creating a new session if necessary.

**Rule 4 — Never `await` inside the poller loop.**

The `broadcastDirector.onPlay()` call in `PollerProcessor` is fire-and-forget (`void`). Do not change this to `await`. Do not add any `await` to `processGamePoll` for broadcast purposes.

**Rule 5 — Never throw from `publishNarration`.**

If delivery to the `RealtimeGateway` fails, log it and continue. Do not propagate.

---

# 14. Logging Requirements

Every significant step in the narration lifecycle produces a structured log entry. Use the NestJS `Logger` class (`private readonly logger = new Logger(ClassName.name)`) in every service, matching the convention used throughout the existing codebase.

Each log entry must include `gameId` and, where applicable, `playKey` and `sequence`. This allows the complete lifecycle of any narration to be reconstructed from logs.

Minimum required log points:

| Event | Level | Required Fields |
|-------|-------|----------------|
| Director received event | `debug` | `gameId`, `playKey`, `eventType` |
| Director decision: narrate | `log` | `gameId`, `playKey`, `eventType` |
| Director decision: suppress | `debug` | `gameId`, `playKey`, `eventType`, `reason` |
| AI provider request sent | `debug` | `gameId`, `playKey`, `providerName`, `promptVersion` |
| AI provider response received | `log` | `gameId`, `playKey`, `durationMs`, `inputTokens`, `outputTokens` |
| Validation failed | `warn` | `gameId`, `playKey`, `reason` |
| AI provider error | `error` | `gameId`, `playKey`, `error message` |
| AI provider timeout | `warn` | `gameId`, `playKey`, `timeoutMs` |
| Narration published | `log` | `gameId`, `sequence`, `eventType`, `narration length` |
| Delivery failed | `error` | `gameId`, `sequence`, `error message` |

---

# 15. What Must Never Happen

The following behaviors are architectural violations. If implementing code that would cause any of these, stop and reconsider the approach.

**Never call MLB API services from within the Broadcast Engine.**

All baseball data enters the application through `PollerProcessor`. The Broadcast Engine receives what the poller has already processed. It never initiates its own external data requests.

**Never modify `PollerProcessor` behavior beyond adding the single integration call.**

`processGamePoll`, its existing `alerts.onPlay` call, and its existing `realtime.publishGameUpdate` call must remain exactly as they are. The broadcast integration is additive only.

**Never store authoritative game state inside the Broadcast Engine.**

Score, inning, runners, outs — all of this lives in the Baseball application's existing game state. The Broadcast Engine reads it; it does not own it. The `BroadcastSession` and `MemoryManager` hold only presentation memory.

**Never allow AI to determine a baseball fact.**

The prompt contains facts. The AI communicates those facts. If the AI response contradicts the provided facts, the response is invalid and must be discarded.

**Never fabricate context to fill a prompt.**

If a piece of context is unavailable — a player's season average, a matchup history — omit it from the prompt. Do not substitute placeholder values, invent plausible numbers, or retrieve data from sources not wired into the Context Builder.

**Never couple to a specific AI provider outside the provider abstraction.**

No import of an AI vendor's SDK should appear anywhere except inside `api/src/broadcast/providers/`. The `Narrator` knows only `IAiProvider`.

**Never make narration synchronous with game processing.**

The polling loop runs on a schedule. Narration generation involves a network call to an AI provider that may take multiple seconds. These two concerns must never share a synchronous execution path.

---

# 16. Testing Expectations

Every service in `api/src/broadcast/` must have a corresponding `.spec.ts` file.

**Unit tests**

Unit tests use Jest mocks for all dependencies. The `IAiProvider` should be mocked with a deterministic response. Tests verify that given specific `BroadcastEvent` inputs, the Director makes the correct narrate/suppress decision, the Context Builder produces the correct fields, and the PromptBuilder produces the correct structure.

**Integration test**

A single integration test verifies the full narration lifecycle using a recorded `PlayUpdateWire` payload from a real game. The AI provider is mocked. The test verifies that narration is published to the `RealtimeGateway` with the correct `gameId`, `eventType`, and a non-empty `narration` string.

**Simulation**

Historical game data replayed through the Broadcast Engine is the primary quality validation tool. This is not an automated test but an operational tool: replay a completed game, capture all narration output, and review it for pacing, accuracy, and quality. Build this capability as part of the MVP.

---

# 17. Questions to Answer Before Writing Code

These open questions from document 05 Section 16 must be resolved before implementation begins. Do not proceed with code that depends on an unresolved question.

**OQ-001 — AI provider selection.**
Which provider is used for the MVP? Record the decision in a new Architecture Decision entry in document 04 before proceeding. The choice determines the contents of `api/src/broadcast/providers/`.

**OQ-002 — Narration latency threshold.**
What is the acceptable maximum delay? This sets the `Narrator`'s timeout value and informs retry strategy.

**OQ-003 — Announcer identity.**
What is the announcer's name, personality, and communication style? This is the system prompt. It directly determines the character of generated narration and must be agreed upon before prompt development begins.

**OQ-004 — Individual pitch narration policy.**
Which pitch situations within an at-bat justify narration? This determines the Broadcast Director's suppression logic for `PITCH` event types.

**OQ-005 — Client narration display.**
Are there additional fields the client needs in the `BroadcastOutput` payload beyond those defined in Section 11 of this document? Confirm with the client implementation team before finalizing the type.

---

# 18. Summary Checklist

Use this checklist to verify that an implementation is consistent with the architecture before considering any phase complete.

- [ ] All new code lives under `api/src/broadcast/`
- [ ] `BroadcastModule` is registered in `AppModule`
- [ ] `BroadcastDirector.onPlay()` is called with `void` from `PollerProcessor`, after the existing alert and realtime calls
- [ ] No existing calls in `PollerProcessor` have been modified
- [ ] `RealtimeGateway` has a `publishNarration` method emitting on `'narration'`
- [ ] No AI provider SDK is imported outside `api/src/broadcast/providers/`
- [ ] No MLB API calls originate from any broadcast service
- [ ] `BroadcastSession` contains no authoritative game state
- [ ] `BroadcastDirector.onPlay()` catches all exceptions and never propagates to `PollerProcessor`
- [ ] Every service has a corresponding `.spec.ts` file
- [ ] Token usage is logged on every AI provider response
- [ ] Prompt templates carry version identifiers
- [ ] All terminology matches the canonical names in Section 3 of this document

---

# Closing

This document is the implementation companion to the architecture package.

Where the architecture documents describe what to build and why, this document describes how to build it correctly inside the existing Baseball API.

Refer back to document 03 (Engineering Principles) when facing any design decision not covered here. If a proposed implementation would violate an engineering principle, change the implementation — not the principle.

The final document in this package, 98 — Glossary, provides the shared vocabulary used consistently throughout all documents and all code.

---
