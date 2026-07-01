---
title: MVP Product Requirements Document
document: 05
version: 0.1.0
status: Draft
author: Pete DeLine
last_updated: 2026-06-30
related:
  - 00-executive-overview.md
  - 03-engineering-principles.md
  - 04-architecture-design.md
  - 06-roadmap.md
---

# MVP Product Requirements Document

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2026-06-30 | Pete DeLine | Initial draft |

---

# 1. Purpose

This document defines the first implementation milestone of the Broadcast Engine.

The preceding architecture documents established the motivation, vision, engineering principles, and component model for the overall system. This document translates those inputs into a concrete, bounded scope for initial delivery.

The MVP exists for one reason: to validate the architectural foundation.

A successful MVP demonstrates that the Broadcast Engine can receive authoritative baseball events, build appropriate context, invoke an AI provider, and deliver coherent play-by-play narration through the existing realtime infrastructure — all without disrupting the existing Baseball application.

Every requirement in this document serves that validation objective.

Capabilities that do not contribute to validating the foundation are explicitly deferred regardless of their eventual importance.

---

# 2. Scope

## In Scope

The MVP delivers the following capabilities.

- A complete, functioning Broadcast Engine capable of producing play-by-play text narration for live games.
- All six core architectural components: Broadcast Director, Context Builder, Memory Manager, Prompt Builder, Narrator, and Output Router.
- A provider-abstracted AI integration with one working implementation.
- Narration for a defined set of baseball events (see Section 7).
- Delivery of narration output through the existing realtime gateway.
- Per-game broadcast sessions with isolated presentation memory.
- Graceful degradation when the AI provider is unavailable.
- Structured logging and basic observability for every narration lifecycle.

## Out of Scope

The following capabilities are explicitly excluded from the MVP.

- Voice synthesis or audio output of any kind.
- Multiple announcer roles (color commentator, field reporter, statistical analyst).
- Color commentary or strategic analysis.
- Statcast enrichment (exit velocity, launch angle, spin rate, etc.).
- Personalized broadcasts or user-configurable announcer settings.
- Broadcast configuration user interfaces.
- Historical storytelling or career milestone commentary.
- AI-assisted conversations or interactive experiences.
- Game recap generation.
- Push notifications driven by broadcast output.
- Client-side UI changes beyond displaying narration text already delivered by the realtime gateway.
- Multiple simultaneous AI providers or dynamic provider selection.

These capabilities are addressed in the Roadmap (document 06). Their absence from the MVP is intentional and should not be treated as an oversight.

---

# 3. Guiding Constraints

Every MVP decision is governed by the engineering principles established in document 03.

Three constraints deserve explicit emphasis in this context.

**The existing pipeline must not be disrupted.**

The Baseball application currently acquires data, processes baseball events, maintains game state, and publishes realtime updates. Every one of those capabilities must continue functioning exactly as before. The MVP introduces the Broadcast Engine as an additive layer. It does not modify existing behavior.

**Baseball knowledge belongs to the Baseball application.**

The Broadcast Engine does not interpret baseball events. It does not calculate scores, determine runner advancement, or validate play outcomes. It receives that information from the application and determines how to communicate it.

**AI is a replaceable implementation detail.**

The MVP will integrate one AI provider. That provider should be isolated behind an abstraction. If the provider changes — or becomes temporarily unavailable — the Broadcast Engine architecture should require no redesign.

---

# 4. Success Definition

The MVP succeeds when the following outcomes are demonstrable.

**Architectural validation.**

The six-component architecture functions as a coherent system. A baseball event entering the Broadcast Director results in narration delivered through the Output Router without any modification to existing game processing.

**Narration quality threshold.**

Generated narration correctly reflects the baseball situation. Play outcomes, score, inning, and key players are described accurately. The narration does not invent facts. Narration that is grammatically awkward but factually correct is acceptable for the MVP. Narration that is factually incorrect is not.

**Resilience.**

The Baseball application continues processing live games without interruption when the AI provider returns an error, times out, or produces an unusable response.

**Observability.**

Engineers can trace any narration request — from the triggering event through context construction, prompt generation, AI response, and output publication — using structured logs.

**Session isolation.**

Two simultaneous live games produce independent narration streams. The memory and context of one game do not affect the other.

---

# 5. Non-Goals

The MVP is not intended to produce the best possible narration.

Natural language generation is expected to improve significantly as prompts are refined, additional context is provided, and future enrichment sources are integrated.

The MVP establishes that narration can be produced at all within the correct architectural constraints.

The MVP is also not intended to establish the final client experience. How narration is presented to users — the visual treatment, the timing, the display surface — is a client concern deferred to a later implementation phase.

---

# 6. Integration Model

## Where the Broadcast Engine Connects

The Broadcast Engine integrates at a single point within the existing processing pipeline: after the PollerProcessor has updated authoritative game state.

```
MLB Feed
    │
    ▼
PollerProcessor
    │
    ├── (existing) Alerts Engine
    ├── (existing) Realtime Gateway
    │
    └── (new) Broadcast Engine
              │
              ▼
         Broadcast Output
              │
              ▼
         Realtime Gateway  ← delivered through existing infrastructure
```

The Broadcast Engine receives the same game state information already consumed by the alert subsystem and realtime publication. No new polling, no new MLB feed access, and no new connection to external data sources is introduced as part of the MVP.

## What the Broadcast Engine Receives

The Broadcast Engine consumes:

- The authoritative game state maintained after each polling cycle.
- The specific change that triggered the update (the Broadcast Event).

It does not receive raw MLB JSON responses.

It does not receive responses before they have been processed and normalized by the existing pipeline.

## What the Broadcast Engine Delivers

The Broadcast Engine delivers narration output to connected clients through the existing realtime gateway.

A new socket event type is introduced for broadcast narration. Clients that choose to subscribe receive narration as it is generated. Clients that do not subscribe are unaffected.

The content of the narration payload is defined in Section 9.

---

# 7. Narrated Events

Not every baseball event requires narration.

The Broadcast Director evaluates each incoming event and determines whether narration should be generated. The MVP defines a baseline set of events for which narration is expected, and a broader set for which narration is optional or explicitly suppressed.

## Required Narration Events

The following events must produce narration in the MVP.

**At-bat outcomes.**
Every plate appearance must produce a narration when it concludes. This includes strikeouts, walks, hit by pitch, single, double, triple, and home run.

**Scoring plays.**
Any at-bat that results in one or more runs scoring requires narration that communicates the score change and identifies the scoring player or players.

**Pitching changes.**
When a pitcher is replaced, narration must communicate who is leaving, who is entering, and the game situation at the time of the change.

**Inning transitions.**
The conclusion of a half-inning and the start of the next half-inning require narration that identifies the inning number and which team is now batting.

**Game start.**
When a game enters an active state, narration introduces the matchup, the starting pitchers, and the venue.

**Game conclusion.**
When a game ends, narration delivers a final summary: the winning team, the final score, and a brief observation about the game.

## Optional Narration Events

The following events may produce narration at the Broadcast Director's discretion. The Director should apply restraint. Unnecessary narration reduces the quality of the overall broadcast experience.

**Individual pitches within an at-bat.**
The Director may choose to narrate individual pitches, particularly when they are meaningful — a full count, a long foul ball sequence, or an unusual pitch type in a critical situation. Routine pitches mid-count generally should not be narrated.

**Baserunner events.**
Stolen bases, caught stealing, wild pitches that advance runners, and balks may be narrated when they meaningfully affect the game situation.

**Substitutions other than pitching changes.**
Pinch hitters, pinch runners, and defensive substitutions may be briefly noted when the context justifies it.

## Suppressed Events

The following events must not produce narration in the MVP.

- Mound visits without a pitching change.
- Replay reviews in progress (narrate only after the outcome is known).
- Events occurring before the game enters an active state.
- Events during rain delays or other suspensions.

---

# 8. Broadcast Session Requirements

A Broadcast Session represents the runtime instance responsible for communicating a single baseball game.

## Session Lifecycle

A Broadcast Session is created when a game transitions to an active state and the Broadcast Engine receives its first event for that game.

A session concludes after the final broadcast activity for a completed game has finished.

Sessions are not created for scheduled games. A session begins only when a game is live.

## Session Isolation

Each active game owns exactly one Broadcast Session.

Sessions share no state. The presentation memory, context history, and narrator configuration of one game have no effect on any other.

## Session Memory

The Memory Manager maintains the following state within each session.

- A rolling record of recently narrated events, sufficient for the Narrator to avoid unnecessary repetition.
- The current at-bat's narration history, allowing individual pitches to be narrated with continuity.
- The count of how many times the current score has been stated, allowing the Narrator to avoid restating it on every event.
- A record of players who have been introduced by name during the broadcast, allowing subsequent mentions to use shorter references.

Session memory is not persisted beyond the lifetime of the session. It exists in memory only. A server restart loses session memory for active games. This is acceptable for the MVP.

---

# 9. Output Contract

The Broadcast Engine delivers narration as a structured payload through the realtime gateway.

Every narration payload must include the following fields.

**gameId.**
The provider game identifier. Identifies which game produced this narration.

**sequence.**
A monotonically increasing integer within the session. Clients can use this to detect missed events and to display narration in the correct order.

**eventType.**
The type of baseball event that triggered this narration. Uses the application's existing event vocabulary.

**narration.**
The generated narration text. A single string. The Narrator is responsible for producing this text at an appropriate length and style for the event type.

**generatedAt.**
An ISO 8601 timestamp indicating when narration was produced.

The payload must not include raw AI provider responses, prompt content, or any information derived from sources other than the application's authoritative game state.

---

# 10. Component Requirements

The following requirements apply to each Broadcast Engine component individually.

## Broadcast Director

The Broadcast Director must evaluate every incoming Broadcast Event and determine whether narration should occur.

It must coordinate the Context Builder, Memory Manager, Prompt Builder, Narrator, and Output Router in the correct sequence.

It must not generate narration itself.

It must handle failures in any downstream component without allowing those failures to propagate to the existing game processing pipeline.

It must support concurrent execution across multiple simultaneous games without shared state.

## Context Builder

The Context Builder must produce a complete Broadcast Context for every event that the Director determines requires narration.

Context must include the current game situation (score, inning, outs, runners, count, pitcher, batter), the triggering event, recent play history sufficient for continuity, and relevant session memory contributed by the Memory Manager.

Context must not include raw MLB data structures or provider-specific representations.

The Context Builder must complete its work without modifying authoritative game state.

## Memory Manager

The Memory Manager must maintain presentation memory for each active Broadcast Session independently.

It must be updated after every successful narration to reflect what has been communicated.

It must never store authoritative baseball information. Its sole responsibility is maintaining conversational continuity for the broadcast.

## Prompt Builder

The Prompt Builder must accept a Broadcast Context and produce a structured prompt suitable for the configured AI provider.

It must include the announcer's identity and communication style within the prompt.

For the MVP, a single announcer identity is sufficient. The architecture must support additional identities in the future without requiring changes to the Prompt Builder's interface.

Prompts must be constructed deterministically. Given identical input context, the Prompt Builder must produce identical output.

## Narrator

The Narrator must accept a completed prompt and invoke the AI provider.

It must validate the AI response before returning it. Responses that fail validation must be logged and treated as failures.

It must not return raw AI provider responses to the Broadcast Director. It must return structured narration output.

It must implement the retry and timeout behavior appropriate for a live broadcast environment where latency matters but correctness matters more.

## AI Provider Interface

One AI provider implementation must be delivered with the MVP.

The provider implementation must conform to a shared interface. That interface is the only contract between the Narrator and the AI provider.

The provider implementation must handle authentication, network errors, rate limiting, and unexpected response formats without propagating raw exceptions to the Narrator.

## Output Router

The Output Router must deliver narration payloads through the existing realtime gateway using the output contract defined in Section 9.

It must not modify narration content.

It must log a structured record of every successful and unsuccessful delivery.

Delivery failures must not cause narration generation to be retried. If delivery fails, the event is logged and processing continues.

---

# 11. AI Provider Requirements

The MVP requires one working AI provider implementation.

The following requirements apply to that implementation.

**Response quality.**
The provider must be capable of producing coherent, factually grounded play-by-play narration given structured baseball context. The narration must correctly reflect the game situation described in the prompt.

**Latency.**
Narration should be generated and delivered within a timeframe appropriate for live game consumption. The exact threshold should be determined empirically during implementation, but the experience should not feel substantially delayed relative to the pace of live baseball.

**Reliability.**
The provider should handle transient failures gracefully. A single narration failure should not prevent future events from being narrated.

**Cost awareness.**
The integration must track token usage per request. This data should be available in structured logs. Cost awareness is required at the MVP because AI usage scales with game activity and the number of active games.

**Structured output preference.**
Where the selected provider supports structured output or constrained response formats, those capabilities should be used to improve reliability of response parsing.

---

# 12. Observability Requirements

Every significant activity within the Broadcast Engine lifecycle must produce a structured log entry.

The following events must always be logged.

- Broadcast Event received by the Broadcast Director.
- Director decision (narrate or suppress) with reason.
- Context construction initiated and completed.
- Prompt generation initiated and completed.
- AI provider request initiated.
- AI provider response received, including latency.
- Response validation result.
- Output Router delivery initiated.
- Output Router delivery result.
- Any failure at any stage, with error detail.

Every log entry must include the game identifier and the sequence number of the narration event so that the complete lifecycle of any narration can be reconstructed from logs alone.

---

# 13. Resilience Requirements

The Broadcast Engine must degrade gracefully in every failure scenario. The following behaviors are required.

**AI provider timeout.**
If the AI provider does not respond within the configured timeout, the Narrator logs the timeout, does not produce narration for that event, and signals the Director to continue processing. The session remains active. Future events are processed normally.

**AI provider error.**
If the AI provider returns an error response, the Narrator logs the error and does not produce narration. The Director continues.

**Invalid AI response.**
If the Narrator receives a response that fails validation (missing required content, response too short, unrecognized structure), it logs the failure and does not deliver the output. The Director continues.

**Output Router failure.**
If delivery to the realtime gateway fails, the Output Router logs the failure and continues. The session is not interrupted.

**No event in any of these scenarios may cause an exception to propagate to the PollerProcessor or any other existing component.**

---

# 14. Acceptance Criteria

The MVP is complete when all of the following criteria are satisfied.

**AC-001 — Core lifecycle functions end to end.**
A live baseball game produces narration visible to a connected client for each of the required narration event types defined in Section 7.

**AC-002 — Factual accuracy.**
Generated narration correctly reflects the actual game situation at the time of each event. Score, inning, players involved, and play outcome are accurate.

**AC-003 — Session isolation.**
Two simultaneous live games produce independent narration streams with no cross-contamination of memory or context.

**AC-004 — Existing pipeline unaffected.**
The existing realtime gateway continues delivering game state updates normally. Alert generation is unaffected. REST endpoints continue responding. The PollerProcessor is not modified.

**AC-005 — Graceful degradation.**
When the AI provider is made temporarily unavailable, live game processing continues without error. When the provider becomes available again, narration resumes for subsequent events.

**AC-006 — Observability.**
The complete lifecycle of a narration event can be reconstructed from structured logs without requiring access to application memory or session state.

**AC-007 — New socket event type.**
Clients can subscribe to broadcast narration independently of existing game state events. Clients that do not subscribe receive no additional data.

**AC-008 — Token usage logged.**
Every AI provider invocation records token usage in structured logs. This information is accessible without querying an external service.

---

# 15. Deferred to Roadmap

The following capabilities were considered for the MVP and explicitly deferred.

**Streaming narration.**
Delivering narration tokens progressively as they are generated by the AI provider would improve perceived latency. This is deferred because it requires additional client coordination and introduces complexity before the core narration quality has been validated.

**Prompt versioning.**
Tracking which prompt template version produced each narration would improve iterative refinement. Deferred to a subsequent phase when prompt iteration has begun in earnest.

**Per-game broadcast configuration.**
Allowing individual games or users to configure narration verbosity, announcer style, or other preferences requires a configuration model not yet designed. Deferred to the Roadmap.

**Client display experience.**
How the client presents narration — scrolling ticker, overlay, dedicated panel — is a product and design decision outside the scope of the MVP. The MVP delivers narration to the realtime socket. The display treatment follows separately.

**Multiple AI providers.**
The provider interface supports multiple implementations, but only one is required for the MVP. Dynamic provider selection and fallback routing are Roadmap items.

---

# 16. Open Questions

The following questions must be resolved before or during MVP implementation.

**OQ-001 — AI provider selection.**
Which provider will be used for the MVP implementation? The interface is provider-agnostic, but the implementation requires a specific choice. The decision should be documented as an architecture decision at that time.

**OQ-002 — Narration latency threshold.**
What is the acceptable maximum delay between a baseball event occurring and narration appearing in a connected client? This threshold affects timeout configuration, retry strategy, and potentially provider selection.

**OQ-003 — Announcer identity.**
What name, personality, and communication style defines the MVP play-by-play announcer? This defines the system prompt provided to the AI provider and significantly influences the character of the generated narration.

**OQ-004 — Individual pitch narration policy.**
Section 7 classifies individual pitch narration as optional. A more precise policy — for example, narrating only when the count reaches two strikes or three balls — should be determined before implementation to avoid over-generating AI requests.

**OQ-005 — Client narration display.**
Although client display is deferred, the output contract (Section 9) must be sufficient to support eventual display. Are there additional fields the client will require that should be established now?

---

# Closing

The MVP establishes the Broadcast Engine as a functioning architectural layer within the Baseball application.

It does not complete the Broadcast Engine.

Its purpose is to prove that the six-component architecture can receive authoritative baseball events, build appropriate context, generate coherent narration through an AI provider, and deliver that narration to connected clients — all without disrupting the existing application.

When every acceptance criterion in Section 14 is met, the foundation is validated.

The Roadmap describes what the Broadcast Engine becomes from that point forward.

---
