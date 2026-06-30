# 83. Architecture Decisions

The preceding sections define the architecture of the Broadcast Engine.

This chapter records the most significant architectural decisions made during its design.

Unlike Engineering Principles, which describe enduring architectural values, Architecture Decisions document specific design choices that shape the implementation.

These decisions provide context for future evolution while preserving the rationale behind the architecture.

---

## AD-001 — The Baseball Application Owns Baseball Knowledge

**Decision**

The Baseball application remains the authoritative owner of baseball knowledge.

**Rationale**

The application already performs deterministic interpretation of MLB data and maintains authoritative game state.

Duplicating this logic within the Broadcast Engine would introduce unnecessary complexity and the possibility of inconsistent interpretations.

---

## AD-002 — The Broadcast Engine Owns Communication

**Decision**

The Broadcast Engine transforms baseball knowledge into presentation.

**Rationale**

Separating communication from baseball interpretation allows both responsibilities to evolve independently.

---

## AD-003 — The Broadcast Engine Is an Architectural Layer

**Decision**

The Broadcast Engine is introduced as a new architectural layer rather than replacing any portion of the existing processing pipeline.

**Rationale**

The existing Baseball application already performs the difficult work of understanding baseball.

The Broadcast Engine extends that capability rather than duplicating it.

---

## AD-004 — Existing Processing Pipeline Is Preserved

**Decision**

Polling, feed processing, authoritative game state, alerts, and realtime infrastructure remain unchanged.

**Rationale**

These capabilities represent mature architectural assets.

Reuse reduces implementation risk while preserving existing functionality.

---

## AD-005 — Broadcast Events Are Derived

**Decision**

Broadcast Events are derived from authoritative application state.

They are never created directly from raw MLB feed data.

**Rationale**

The Baseball application should remain the only interpreter of provider data.

---

## AD-006 — Broadcast Context Is Separate from Game State

**Decision**

Presentation context is maintained independently of authoritative game state.

**Rationale**

Communication requires information such as conversational continuity and prior narration that has no place within baseball state.

---

## AD-007 — Presentation Memory Is Session Scoped

**Decision**

Presentation memory belongs to a Broadcast Session.

It is never persisted as authoritative baseball information.

**Rationale**

Presentation continuity improves communication without affecting baseball correctness.

---

## AD-008 — AI Is an Implementation Detail

**Decision**

The Broadcast Engine communicates through an AI Provider abstraction.

**Rationale**

The architecture should outlive individual AI vendors, models, and prompt formats.

---

## AD-009 — AI Never Determines Baseball Facts

**Decision**

Artificial intelligence communicates facts.

It does not establish facts.

**Rationale**

Maintaining deterministic baseball processing ensures consistency, correctness, and testability.

---

## AD-010 — Components Own One Responsibility

**Decision**

Every major Broadcast Engine component owns a single architectural responsibility.

Examples include:

- orchestration
- context construction
- memory
- narration
- provider interaction
- output routing

**Rationale**

Focused responsibilities reduce coupling while improving maintainability.

---

## AD-011 — Output Is Consumer Independent

**Decision**

Broadcast output is generated independently of any specific presentation layer.

**Rationale**

Future consumers—including audio, notifications, recaps, and interfaces not yet conceived—should all consume the same communication output.

---

## AD-012 — Extensibility Is a Design Goal

**Decision**

Future announcers, AI providers, enrichment sources, and consumers are introduced through extension rather than modification.

**Rationale**

The architecture should become more valuable as capabilities are added.

---

## AD-013 — Broadcast Sessions Are Independent

**Decision**

Each active game owns an independent Broadcast Session.

**Rationale**

Session isolation simplifies scalability, memory management, and concurrency while preventing cross-game interference.

---

## AD-014 — Communication May Be Silent

**Decision**

The Broadcast Engine is not required to produce narration for every baseball event.

**Rationale**

Natural broadcasts include pacing, restraint, and selective emphasis.

The architecture should support meaningful silence.

---

## AD-015 — Voice Is a Consumer

**Decision**

Voice synthesis consumes broadcast output.

It is not part of narration generation.

**Rationale**

Separating communication from voice delivery allows narration to support many future consumers without modification.

---

# 84. Architectural Tradeoffs

Every architecture reflects a series of tradeoffs.

The Broadcast Engine intentionally favors:

- clarity over cleverness
- composition over duplication
- deterministic processing over AI inference
- extensibility over feature-specific optimization
- provider independence over vendor-specific features
- reusable communication over presentation-specific implementations

These tradeoffs guide future evolution of the system.

---

# 85. Architecture Summary

The Broadcast Engine does not replace the Baseball application.

It extends it.

The existing application continues to perform the work it already performs exceptionally well:

- acquiring MLB data
- interpreting baseball events
- maintaining authoritative game state
- exposing baseball knowledge

The Broadcast Engine introduces a complementary capability.

It transforms that baseball knowledge into engaging communication suitable for a wide variety of presentation experiences.

This architecture preserves one authoritative understanding of the game while enabling many different ways to experience it.

As new announcers, AI models, presentation styles, and user experiences emerge, they build upon the same architectural foundation rather than creating competing implementations.

The result is an architecture that is simultaneously focused, extensible, and resilient to technological change.

---

# Closing

The Broadcast Engine Architecture completes the architectural design of the system.

The remaining documents shift from architecture to execution.

The MVP Product Requirements Document identifies the subset of this architecture required for the initial release.

The Roadmap describes the planned evolution beyond the MVP.

Together, these documents provide both the long-term architectural vision and the practical implementation strategy for delivering it.

---
