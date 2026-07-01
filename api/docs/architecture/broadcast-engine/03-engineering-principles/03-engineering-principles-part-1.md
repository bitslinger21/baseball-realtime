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
