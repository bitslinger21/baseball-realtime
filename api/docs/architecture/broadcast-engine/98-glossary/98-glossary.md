---
title: Glossary
document: 98
version: 0.1.0
status: Draft
author: Pete DeLine
last_updated: 2026-06-30
related:
  - 03-engineering-principles.md
  - 04-architecture-design.md
  - 07-ai-context.md
---

# Glossary

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2026-06-30 | Pete DeLine | Initial draft |

---

# 1. Purpose

This document maintains the shared vocabulary used throughout the Broadcast Engine Architecture Package.

Consistent terminology reduces ambiguity for human engineers and AI-assisted development tools alike. When a term appears in any architecture document, implementation file, code comment, or design conversation, it should carry exactly the meaning defined here.

If a new term is introduced during implementation, it should be added to this glossary before it appears in code.

If an existing term is found to be imprecise, this document should be updated and the change propagated to all affected documents.

---

# 2. Glossary

---

## AI Provider

An external service or model capable of generating natural language text in response to a structured prompt.

The Broadcast Engine interacts with AI providers exclusively through the `IAiProvider` interface. No component outside `api/src/broadcast/providers/` may import a provider SDK directly.

Examples of potential AI providers: Anthropic Claude, AWS Bedrock models, OpenAI GPT.

The choice of provider is an implementation detail. The architecture does not depend on any specific provider.

*See also: IAiProvider, Narrator, Prompt*

---

## Announcer

A configured persona within the Broadcast Engine that defines a communication style, identity, and role.

The MVP includes one announcer: the play-by-play announcer. Future announcers include the color commentator, field reporter, and statistical analyst.

An announcer is not an AI model. It is a configuration that instructs the AI provider how to communicate. Different announcers may use the same underlying model with different system prompts.

*See also: Play-by-Play Announcer, Color Commentator, Field Reporter, Prompt Builder*

---

## Architecture Decision (AD)

A specific design choice made during the Broadcast Engine initiative, documented with its rationale in document 04.

Architecture Decisions may evolve as the system grows. Engineering Principles do not.

*See also: Engineering Principle*

---

## At-Bat

A single plate appearance: the sequence of pitches between a batter stepping in and a play outcome being recorded.

An at-bat ends with a strikeout, walk, hit, out in play, hit by pitch, or any other event that concludes the plate appearance.

The Broadcast Engine tracks the current at-bat's narration history within `BroadcastSession` to maintain continuity without repeating itself.

---

## Authoritative Game State

The single, trusted representation of a game's current condition as maintained by the Baseball application.

Authoritative game state is produced by `PollerProcessor` after processing each MLB feed update. It includes score, inning, outs, runners, count, pitcher, batter, play history, and all other factual game information.

The Broadcast Engine reads authoritative game state. It never writes to it, duplicates it, or maintains an independent version of it.

*See also: Baseball Knowledge, Single Source of Truth*

---

## Baseball Knowledge

The collective understanding of a game maintained by the Baseball application: rules, events, outcomes, player information, scoring, and all other factual information about what has occurred and what currently exists.

Baseball knowledge is owned exclusively by the Baseball application. The Broadcast Engine is a consumer of baseball knowledge, not a producer of it.

*See also: Authoritative Game State, EP-001*

---

## Broadcast Artifact

Any output produced by the Broadcast Engine as a result of processing a Broadcast Event.

In the MVP, broadcast artifacts are narration text payloads. Future artifacts may include recap segments, notification summaries, or voice synthesis requests.

Broadcast artifacts are immutable once produced. Downstream consumers may not modify them.

*See also: Broadcast Output, Output Router*

---

## Broadcast Context

The presentation-oriented view of the game assembled by the Context Builder for a specific Broadcast Event.

Broadcast Context is distinct from authoritative game state. It includes not only factual information about the current game situation but also presentation-specific information such as recent narration history, session memory contributions, and the active announcer configuration.

Broadcast Context is consumed by the Prompt Builder. It is never persisted.

*See also: Context Builder, BroadcastSession, Prompt Builder*

---

## Broadcast Director

The central orchestrating service of the Broadcast Engine.

The Broadcast Director receives Broadcast Events, evaluates whether narration is appropriate, coordinates the Context Builder, Memory Manager, Prompt Builder, Narrator, and Output Router, and manages the overall narration lifecycle.

The Broadcast Director does not generate narration. It coordinates the components that do.

Implemented at: `api/src/broadcast/director/broadcast-director.service.ts`

*See also: Broadcast Event, Narrator, Output Router*

---

## Broadcast Engine

The architectural layer introduced to transform the Baseball application's existing baseball knowledge into engaging fan experiences.

The Broadcast Engine is not responsible for understanding baseball. It is responsible for communicating it.

The Broadcast Engine consists of six primary components: Broadcast Director, Context Builder, Memory Manager, Prompt Builder, Narrator, and Output Router.

*See also: Baseball Knowledge, Broadcast Director*

---

## Broadcast Event

A baseball event derived from authoritative game state and presented to the Broadcast Director as a narration opportunity.

A Broadcast Event is a focused, presentation-oriented projection of a `PlayUpdateWire` payload. It carries only what the narration pipeline needs.

Broadcast Events are not the same as the `PlayUpdateWire` or `LiveUpdate` types used by the existing realtime pipeline. They are derived from those types, not replacements for them.

*See also: BroadcastEventType, Broadcast Director, PlayUpdateWire*

---

## BroadcastEventType

An enumeration of the baseball event categories the Broadcast Engine recognizes and may narrate.

Members include events such as pitch result, strikeout, walk, single, double, triple, home run, scoring play, pitching change, inning transition, game start, and game end.

The full enumeration is defined in `api/src/broadcast/types/broadcast-event.types.ts`.

*See also: Broadcast Event*

---

## Broadcast Output

The structured payload produced by the Narrator and delivered to downstream consumers by the Output Router.

Broadcast Output contains the narration text, the triggering event type, a sequence number, timestamps, and observability fields including token usage and provider identity.

Broadcast Output is consumer-agnostic. It is not shaped for any specific UI or delivery mechanism.

*See also: BroadcastOutput type, Output Router, Narration*

---

## Broadcast Session

The per-game runtime instance that holds presentation memory and session state for a single active game.

One Broadcast Session exists per active game. Sessions are created when a game becomes active and removed after final broadcast activity completes. Sessions are in-memory only and are not persisted.

Broadcast Sessions hold only presentation memory. They do not hold authoritative game state.

Implemented at: `api/src/broadcast/memory/broadcast-session.ts`

*See also: Memory Manager, Presentation Memory*

---

## Color Commentator

A future announcer role responsible for strategic and analytical context.

The color commentator explains why events matter: strategy, player tendencies, matchup history, and situational insight. It participates when the Broadcast Director identifies a moment suited to deeper explanation.

The color commentator does not drive the live event stream. It speaks in gaps created by the play-by-play announcer.

Introduced in Roadmap Phase 4.

*See also: Announcer, Play-by-Play Announcer, Field Reporter*

---

## Context Builder

The service responsible for assembling `BroadcastContext` from authoritative game state, the current Broadcast Event, and Memory Manager contributions.

The Context Builder produces a complete, presentation-oriented view of the game for every event the Broadcast Director determines should be narrated.

The Context Builder reads game state. It does not modify it.

Implemented at: `api/src/broadcast/context/context-builder.service.ts`

*See also: Broadcast Context, Memory Manager*

---

## Engineering Principle (EP)

An enduring architectural value that guides every implementation decision throughout the Broadcast Engine initiative.

Engineering Principles differ from Architecture Decisions. Principles describe how decisions should be made. Decisions record specific choices.

Engineering Principles are expected to remain stable even as technologies, AI providers, and presentation capabilities evolve.

Defined in document 03.

*See also: Architecture Decision*

---

## Field Reporter

A future announcer role that provides situational and environmental context.

The field reporter covers mound visits, injury updates, weather delays, lineup changes, and other contextual information not directly captured by the play-by-play feed.

The field reporter must only speak when grounded data is available. It must never invent or speculate.

Introduced in Roadmap Phase 4 (conditional on data availability).

*See also: Announcer, Color Commentator*

---

## Graceful Degradation

The behavior of the Broadcast Engine when a failure occurs in any of its components.

Graceful degradation means that a failure in narration generation, AI provider availability, or output delivery does not interrupt the Baseball application's existing game processing. The failure is isolated, logged, and the system continues.

Baseball understanding must never depend on AI availability.

*See also: EP-014, Error Handling Rules in document 07*

---

## IAiProvider

The TypeScript interface that all AI provider implementations must satisfy.

No Broadcast Engine component other than a provider implementation class may import a vendor AI SDK. All AI interaction occurs through this interface.

Defined at: `api/src/broadcast/providers/ai-provider.interface.ts`

*See also: AI Provider, Narrator*

---

## Memory Manager

The service responsible for maintaining presentation memory across a Broadcast Session.

The Memory Manager tracks what has been narrated, which players have been introduced, how recently the score has been stated, and other conversational continuity information.

The Memory Manager never stores authoritative baseball information. Its sole responsibility is supporting coherent, non-repetitive narration.

Implemented at: `api/src/broadcast/memory/memory-manager.service.ts`

*See also: Broadcast Session, Presentation Memory*

---

## Narration

The natural language text produced by the Narrator in response to a Broadcast Event.

Narration communicates baseball facts. It does not determine them. Every statement in a narration must be traceable to authoritative game state or approved enrichment data provided in the Broadcast Context.

*See also: Narrator, Broadcast Output*

---

## Narration Request

The complete set of inputs assembled by the Broadcast Director and passed to the Narrator: the Broadcast Event, the Broadcast Context, and the prompt produced by the Prompt Builder.

The Narration Request is not a persisted object. It is the transient package passed between components during a single narration lifecycle.

*See also: Narrator, Prompt Builder, Broadcast Context*

---

## Narrator

The service that accepts a Narration Request, invokes the AI provider, validates the response, and returns structured narration.

The Narrator owns the communication intelligence of the Broadcast Engine. It does not own baseball knowledge.

The Narrator interacts with AI providers exclusively through `IAiProvider`. It never imports a provider SDK directly.

Implemented at: `api/src/broadcast/narrator/narrator.service.ts`

*See also: IAiProvider, Narration Request, Broadcast Output*

---

## Output Router

The service responsible for delivering `BroadcastOutput` to downstream consumers.

In the MVP, the Output Router delivers narration to the `RealtimeGateway` via `publishNarration`, which emits on the `'narration'` socket event.

The Output Router distributes. It does not generate or modify narration content.

Implemented at: `api/src/broadcast/router/output-router.service.ts`

*See also: Broadcast Output, RealtimeGateway*

---

## Play-by-Play Announcer

The primary announcer role and the only announcer included in the MVP.

The play-by-play announcer describes live action as it occurs: pitch results, at-bat outcomes, scoring plays, pitching changes, and inning transitions. It communicates what is happening.

*See also: Announcer, Color Commentator*

---

## PlayUpdateWire

The existing type defined in `api/src/poller/poller.processor.ts` that carries normalized play data produced by the polling pipeline.

`PlayUpdateWire` is the Broadcast Engine's primary input. The Broadcast Director reads from it to construct a `BroadcastEvent`. The Broadcast Engine never modifies `PlayUpdateWire` and never becomes responsible for producing it.

*See also: Broadcast Event, PollerProcessor*

---

## PollerProcessor

The existing NestJS worker (`api/src/poller/poller.processor.ts`) responsible for retrieving live MLB game feeds, processing play-by-play events, and dispatching results to downstream consumers.

The Broadcast Engine integrates at exactly one point inside `PollerProcessor`: a single fire-and-forget call to `BroadcastDirector.onPlay()` added after the existing alert and realtime calls.

No other changes to `PollerProcessor` are made as part of the Broadcast Engine initiative.

*See also: Broadcast Director, PlayUpdateWire*

---

## Presentation Layer

Any component responsible for delivering broadcast artifacts to end users.

Presentation layers are intentionally independent of both the Baseball application's game processing and the Broadcast Engine's internal components.

Examples include the existing web client, future mobile applications, voice playback systems, and smart speakers.

Presentation layers consume Broadcast Output. They do not reach into the Broadcast Engine to reinterpret events.

*See also: Broadcast Output, Output Router*

---

## Presentation Memory

The information maintained by the Memory Manager within a Broadcast Session to support conversational continuity.

Presentation memory is not baseball state. It is communication state: what has been said, how recently, and in what context.

Examples include recently narrated events, players who have been introduced by name, and the score as last stated.

*See also: Memory Manager, Broadcast Session*

---

## Prompt

The structured input delivered to an AI provider by the Narrator.

A prompt consists of a system message and a user message. The system message establishes the announcer identity and constraints. The user message contains the serialized Broadcast Context.

Prompts are constructed by the Prompt Builder. They carry version identifiers. Every narration log entry records which prompt version produced it.

*See also: Prompt Builder, IAiProvider*

---

## Prompt Builder

The service responsible for converting `BroadcastContext` into a structured prompt suitable for the configured AI provider.

The Prompt Builder is the only component that produces prompts. Prompt templates are versioned constants maintained in `api/src/broadcast/prompt/`.

Given identical input context, the Prompt Builder always produces identical output. Prompt construction is deterministic.

Implemented at: `api/src/broadcast/prompt/prompt-builder.service.ts`

*See also: Prompt, Broadcast Context, Narrator*

---

## RealtimeGateway

The existing Socket.io gateway (`api/src/realtime/realtime.gateway.ts`) responsible for distributing live updates to connected clients.

The Broadcast Engine adds one method to the gateway — `publishNarration` — which emits on the `'narration'` socket event. No other changes to `RealtimeGateway` are required for the MVP.

*See also: Output Router, Broadcast Output*

---

## Single Source of Truth

The architectural principle that exactly one authoritative representation of game state exists within the system at any moment.

That representation is maintained by the Baseball application. Every other subsystem — including the Broadcast Engine — reads from it rather than maintaining its own copy.

Defined as EP-003.

*See also: Authoritative Game State, Baseball Knowledge*

---

## Suppression

The Broadcast Director's decision not to narrate a Broadcast Event.

Suppression is not a failure. It is a deliberate choice. A natural broadcast includes pacing, restraint, and selective emphasis. The Director suppresses events when narration would add no value or would produce a broadcast that feels mechanical.

Every suppression decision is logged with a reason code.

*See also: Broadcast Director, AD-014*

---

# 3. Deprecated Terms

The following terms have been considered and rejected. They must not appear in code, comments, or documentation.

| Rejected Term | Use Instead | Reason |
|---------------|-------------|--------|
| `NarrationEvent` | `BroadcastEvent` | Scope is broader than narration |
| `GameContext` | `BroadcastContext` | Ambiguous with authoritative game state |
| `BroadcastOrchestrator` | `BroadcastDirector` | Director is the canonical term from architecture |
| `LlmService` | `Narrator` | Technology-specific; the Narrator is provider-agnostic |
| `AiService` | `IAiProvider` | Conflates the abstraction with the implementation |
| `SessionMemory` | `MemoryManager` | Memory is managed, not just stored |
| `NarrationResult` | `BroadcastOutput` | Output may serve consumers beyond narration |
| `BroadcastPublisher` | `OutputRouter` | Router is the canonical term from architecture |

---

# Closing

This glossary is a living document.

When new terms are introduced during implementation, they are added here first. When terms prove imprecise, they are corrected here and propagated to affected documents.

Consistent vocabulary is not a stylistic preference. It is an architectural tool that reduces ambiguity, improves the quality of AI-assisted development, and ensures that every engineer working on the Broadcast Engine shares a common understanding of the system they are building.

---
