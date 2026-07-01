---
title: Engineering Principles
document: 03
part: 1
version: 0.1.0
status: Draft
author: Pete DeLine / ChatGPT
last_updated: 2026-06-28
related:
  - 00-executive-overview.md
  - 01-current-state-assessment.md
  - 02-product-vision.md
  - 04-architecture-and-design.md
---

# Engineering Principles

## Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 0.1.0 | 2026-06-28 | Pete DeLine / ChatGPT | Initial draft (Part 1) |

---

# 1. Purpose

The purpose of this document is to establish the engineering principles that guide every architectural and implementation decision made throughout the Broadcast Engine initiative.

Where the Product Vision describes the desired future experience, this document defines the rules that ensure every implementation moves consistently toward that vision.

Engineering principles differ from implementation requirements.

Requirements describe what must be built.

Engineering principles describe how decisions should be made whenever multiple valid implementation options exist.

These principles are expected to remain stable throughout the lifetime of the project, even as technologies, programming languages, AI providers, and presentation capabilities evolve.

---

# 2. Scope

These principles apply to all components introduced as part of the Broadcast Engine initiative, including future enhancements beyond the initial MVP.

This includes, but is not limited to:

- Broadcast Engine components
- AI integration
- narration generation
- future announcer roles
- realtime broadcast delivery
- shared game context
- presentation models
- future voice synthesis
- future broadcast configuration
- future presentation layers

Although examples throughout this document focus on the Broadcast Engine, many of these principles also reinforce architectural patterns already established within the Baseball application.

---

# 3. Guiding Philosophy

Every engineering decision should reinforce a simple architectural philosophy:

> **The Baseball application understands baseball.  
> The Broadcast Engine communicates that understanding.**

This philosophy establishes a clear separation of responsibilities.

The Baseball application remains responsible for acquiring data, interpreting game events, maintaining authoritative game state, and determining what has occurred.

The Broadcast Engine builds upon that existing understanding to determine how those events should be presented to users.

This distinction intentionally separates baseball knowledge from presentation.

As a result, new presentation experiences can be introduced without modifying the application's understanding of baseball.

Likewise, improvements to baseball processing automatically benefit every presentation built upon it.

This philosophy represents the single most important engineering principle contained within this document.

---

# 4. Foundational Principles

The following principles establish the foundation upon which every future design decision should be evaluated.

## EP-001 — The Baseball Application Owns Baseball Knowledge

The Baseball application is the authoritative source of baseball knowledge.

It is responsible for:

- acquiring MLB data
- processing baseball events
- maintaining authoritative game state
- recognizing meaningful baseball situations
- determining factual game information

No Broadcast Engine component should duplicate or redefine this logic.

Whenever baseball knowledge already exists within the application, it should be reused rather than recreated.

---

## EP-002 — The Broadcast Engine Owns Communication

The Broadcast Engine is responsible for transforming baseball knowledge into engaging user experiences.

It determines:

- how information is communicated
- what level of detail is appropriate
- the style of presentation
- sequencing of narration
- presentation-specific context

It does **not** determine baseball facts.

This separation allows communication strategies to evolve independently from baseball processing.

---

## EP-003 — Maintain a Single Source of Truth

At any moment, there should be exactly one authoritative representation of a game's current state.

Every subsystem—including the Broadcast Engine—consumes that state.

No component should maintain an independent representation of inning, score, runners, outs, count, substitutions, or any other baseball concept that already exists elsewhere within the application.

This principle minimizes synchronization problems while improving consistency across every consumer.

---

## EP-004 — Extend Rather Than Replace

The Baseball application already contains mature architectural assets.

Whenever practical, new capabilities should extend these existing components rather than replacing them.

Examples include:

- polling infrastructure
- feed processing
- realtime publication
- alert generation
- domain services

Architectural evolution should occur incrementally.

Large-scale replacement should be considered only when extension is no longer practical.

---

## EP-005 — Separate Interpretation from Presentation

Determining what happened during a baseball game is fundamentally different from deciding how that information should be presented.

The application interprets.

The Broadcast Engine presents.

Maintaining this separation keeps both responsibilities focused while allowing each subsystem to evolve independently.

---

# 5. Architectural Implications

The principles established in this chapter influence every subsequent architectural decision.

They define clear ownership boundaries, reduce duplication, and preserve the strengths of the existing platform while enabling substantial future growth.

Whenever future implementation questions arise, engineers should evaluate proposed solutions against these foundational principles before introducing new components or modifying existing ones.

If an implementation conflicts with these principles, the implementation—not the principles—should be reconsidered.

---
# 6. System Design Principles

The foundational principles establish ownership within the Baseball application.

The following principles guide the design of the Broadcast Engine itself.

Collectively, they define how new capabilities should be introduced while preserving the architectural qualities established by the existing platform.

---

## EP-006 — Prefer Composition Over Duplication

New functionality should be created by composing existing capabilities rather than duplicating existing logic.

Whenever the application already provides information, services, or events required by the Broadcast Engine, those capabilities should be reused.

Examples include:

- game state
- player information
- alert generation
- realtime publication
- game metadata

The Broadcast Engine should assemble these capabilities into richer user experiences rather than recreating them.

Composition reduces maintenance costs while ensuring that improvements to existing services automatically benefit every downstream consumer.

---

## EP-007 — Design for Multiple Consumers

The first consumer of the Broadcast Engine is live play-by-play narration.

It should never be the only consumer.

Every artifact produced by the Broadcast Engine should be designed with reuse in mind.

Future consumers may include:

- audio synthesis
- push notifications
- game recaps
- highlights
- At Bat Cards
- conversational AI
- statistical insights
- future presentation layers

Designing for multiple consumers encourages reusable interfaces while discouraging feature-specific implementations.

---

## EP-008 — Event-Driven, Not Request-Driven

Baseball is inherently event driven.

The Broadcast Engine should react to meaningful changes within the game rather than repeatedly requesting information.

Whenever practical, components should subscribe to authoritative events produced by the application.

This approach minimizes unnecessary processing while naturally aligning with the flow of a live baseball game.

---

## EP-009 — Preserve Deterministic Processing

The interpretation of baseball events should always remain deterministic.

Given identical game state, the application should always reach the same factual conclusions.

Artificial intelligence should never determine:

- whether a runner advanced
- whether a scoring play occurred
- whether a pitching change happened
- whether an alert should be generated

Those decisions belong to deterministic application logic.

Artificial intelligence may assist in communicating those facts but should never replace them.

---

## EP-010 — AI Is an Implementation Detail

Artificial intelligence enables richer communication.

It is not the architecture.

The Broadcast Engine should remain independent of:

- language models
- speech synthesis providers
- cloud vendors
- prompt formats
- AI frameworks

Future changes to AI technology should require minimal architectural changes.

Whenever possible, AI providers should be replaceable through well-defined abstractions.

---

# 7. Evolution Principles

The Broadcast Engine is expected to evolve significantly over time.

The following principles ensure that future enhancements strengthen rather than weaken the architecture.

---

## EP-011 — Favor Extension Over Modification

Future capabilities should be introduced by extending the Broadcast Engine rather than modifying existing behavior.

Examples include:

- additional announcers
- statistical commentators
- field reporters
- historical storytellers
- future presentation styles

Adding new functionality should require minimal changes to previously implemented components.

This principle minimizes regression risk while encouraging modular growth.

---

## EP-012 — Keep Features Loosely Coupled

Each major capability should possess a clearly defined responsibility.

Examples include:

- narration generation
- shared game memory
- AI integration
- presentation formatting
- voice synthesis
- realtime publication

Dependencies between these components should remain minimal.

Loose coupling improves testability, maintainability, and future extensibility.

---

## EP-013 — Optimize for Long-Term Maintainability

Engineering decisions should prioritize long-term clarity over short-term convenience.

Simple implementations are generally preferable to clever implementations.

Future engineers should be able to understand component responsibilities quickly without requiring extensive knowledge of unrelated portions of the system.

The architecture should remain approachable as the project grows.

---

## EP-014 — Preserve Backward Compatibility

The introduction of the Broadcast Engine should not disrupt existing application capabilities.

Current REST endpoints, realtime consumers, and existing application behavior should continue functioning unless explicit architectural changes have been approved.

Whenever possible, new capabilities should be additive.

Backward compatibility encourages incremental adoption while reducing implementation risk.

---

# 8. Architectural Consequences

Collectively, these principles establish a system that is:

- modular
- extensible
- deterministic
- maintainable
- reusable
- provider independent

More importantly, they encourage architectural evolution rather than architectural replacement.

Future capabilities should naturally emerge from the existing foundation rather than introducing competing implementations.

---
# 9. Implementation Principles

The engineering principles defined throughout this document establish ownership boundaries and system design philosophy.

The following principles focus on implementation practices that preserve those architectural qualities throughout the lifetime of the project.

---

## EP-015 — Design for Testability

Every component introduced as part of the Broadcast Engine should be testable in isolation.

Components should depend upon well-defined interfaces rather than concrete implementations whenever practical.

Business logic should remain independent of infrastructure concerns, allowing deterministic unit tests without requiring external services.

Artificial intelligence integrations should be isolated behind abstractions that can be replaced by test doubles during automated testing.

Testability is considered an architectural requirement rather than an implementation convenience.

---

## EP-016 — Design for Observability

As the Broadcast Engine evolves, understanding its behavior in production becomes increasingly important.

Components should emit sufficient logging, metrics, and diagnostic information to answer questions such as:

- What event is currently being processed?
- Why was narration generated?
- Which presentation consumers received the broadcast?
- How long did AI generation require?
- Which provider generated the response?
- Why was a particular event ignored?

Observability should be designed into the architecture rather than added after implementation.

---

## EP-017 — Favor Immutable Broadcast Artifacts

Once a broadcast artifact has been produced, it should be treated as immutable.

Subsequent processing stages should enrich the artifact through composition rather than modifying previously generated content.

Immutable artifacts simplify debugging, reduce unintended side effects, and improve traceability throughout the broadcast pipeline.

---

## EP-018 — Keep User Interfaces Independent

The Broadcast Engine should remain completely independent of any specific user interface.

Whether consumed by:

- the current web client
- a future mobile application
- voice synthesis
- wearable devices
- automotive integrations
- smart speakers
- future interfaces not yet envisioned

…the Broadcast Engine should produce the same presentation artifacts.

User interfaces consume broadcast information.

They should never influence how that information is generated.

---

## EP-019 — Configuration Over Customization

Future presentation capabilities should be introduced through configuration rather than hard-coded behavior.

Examples include:

- announcer selection
- narration verbosity
- enthusiasm level
- statistical depth
- voice characteristics
- presentation preferences

Configuration enables personalization while preserving a common architectural foundation.

The Broadcast Engine should support configurable behavior without requiring changes to core application logic.

---

# 10. Decision Framework

Engineering principles are most valuable when they influence real design decisions.

Whenever a new capability is proposed, engineers should evaluate it using the following questions.

### Ownership

Who owns this responsibility?

If the capability requires understanding baseball, it likely belongs within the Baseball application.

If the capability determines how baseball should be communicated, it likely belongs within the Broadcast Engine.

---

### Reuse

Can existing application capabilities be reused?

Existing processing pipelines, domain services, realtime infrastructure, and alert generation should be preferred over creating new implementations.

---

### Extensibility

Does this design make future capabilities easier to implement?

Architectural decisions should reduce future effort rather than optimize exclusively for the current feature.

---

### Independence

Does this introduce unnecessary coupling?

Every new dependency should have a clear architectural justification.

Reducing coupling generally improves maintainability, testability, and long-term flexibility.

---

### Simplicity

Is there a simpler solution that preserves the same architectural qualities?

The simplest design that satisfies the engineering principles is usually the preferred solution.

---

# 11. Relationship to Architecture Decisions

Engineering Principles (EPs) establish enduring architectural values.

Architecture Decisions (ADs) document specific design choices made while implementing those values.

Engineering principles rarely change.

Architecture decisions may evolve as the system grows.

For example:

**Engineering Principle**

> The Baseball application owns baseball knowledge.

**Architecture Decision**

> BroadcastEvent is generated from the authoritative game state maintained by the Baseball application.

This distinction allows the architecture to evolve while preserving the core philosophy of the project.

---

# 12. Closing Summary

The Engineering Principles defined in this document establish the foundation upon which every Broadcast Engine component should be designed, implemented, and maintained.

They intentionally separate enduring architectural philosophy from implementation-specific decisions.

Technologies will change.

Artificial intelligence will improve.

Presentation styles will evolve.

New user experiences will emerge.

The principles described here should remain stable throughout those changes.

By consistently applying these principles, the Broadcast Engine can continue growing without sacrificing clarity, maintainability, or architectural integrity.

These principles therefore serve not only as engineering guidance, but as the long-term architectural compass for the Broadcast Engine initiative.

The next chapter, **Architecture & Design**, translates these principles into a concrete system architecture that defines the components, interactions, responsibilities, and extension model of the Broadcast Engine.

---
