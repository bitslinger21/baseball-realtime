---
title: Architecture & Design
document: 04
part: 1
version: 0.1.0
status: Draft
author: Pete DeLine / ChatGPT
last_updated: 2026-06-28
related:
  - 00-executive-overview.md
  - 01-current-state-assessment.md
  - 02-product-vision.md
  - 03-engineering-principles.md
  - 05-mvp-prd.md
---

# Architecture & Design

## Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 0.1.0 | 2026-06-28 | Pete DeLine / ChatGPT | Initial draft (Part 1) |

---

# 1. Purpose

This document defines the architecture of the Broadcast Engine.

The preceding documents established the motivation for the initiative, assessed the current application, described the desired future experience, and defined the engineering principles that guide implementation.

This document translates those concepts into a concrete software architecture.

It identifies the major architectural components, their responsibilities, their interactions, and the boundaries between them.

The objective is not merely to define an implementation.

The objective is to define an architecture capable of supporting years of future evolution while preserving the architectural strengths already present within the Baseball application.

---

# 2. Scope

This document describes the Broadcast Engine itself.

It intentionally assumes the existing Baseball application remains responsible for:

- MLB data acquisition
- feed processing
- authoritative game state
- domain services
- alert generation
- realtime publication

These capabilities are considered existing architectural assets and are not redesigned here.

Instead, this document focuses on the components introduced to transform existing baseball knowledge into broadcast-ready presentation artifacts.

---

# 3. Architectural Context

The Broadcast Engine is introduced as an additional architectural layer within the Baseball application.

It does not replace the existing processing pipeline.

Instead, it consumes the application's authoritative understanding of baseball and transforms that understanding into presentation-ready content.

The Broadcast Engine therefore occupies a unique position within the overall architecture.

It is neither responsible for understanding baseball nor for presenting baseball directly to end users.

Instead, it serves as the bridge between those two responsibilities.

---

## High-Level Context

```
                     MLB Services
                           │
                           ▼
                  Existing Baseball API
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
Feed Processing                     Authoritative
Pipeline                            Game State
                                            │
                                            ▼
                                   Broadcast Engine
                                            │
                 ┌──────────────┬──────────────┬──────────────┐
                 ▼              ▼              ▼
          Live Narration   Future Consumers   Broadcast APIs
                                            │
                                            ▼
                                   Presentation Layers
```

The Broadcast Engine consumes baseball understanding.

Presentation layers consume Broadcast Engine output.

Neither subsystem bypasses the other.

This separation establishes a clear architectural boundary between understanding the game and communicating the game.

---

# 4. Architectural Responsibilities

The Broadcast Engine is responsible for:

- determining when narration should occur
- maintaining presentation context
- generating broadcast artifacts
- coordinating announcer behavior
- interacting with AI providers
- delivering presentation-ready output

The Broadcast Engine is **not** responsible for:

- polling MLB services
- interpreting baseball rules
- maintaining game state
- determining factual baseball outcomes
- exposing user interface components

These responsibilities remain within the existing Baseball application.

This distinction represents one of the most important architectural boundaries in the system.

---

# 5. Architectural Goals

The architecture has been designed to satisfy several long-term objectives.

## Reuse Existing Assets

The existing Baseball application already performs the difficult work of understanding baseball.

The Broadcast Engine should maximize reuse of these existing capabilities while introducing minimal disruption to the current architecture.

---

## Enable Multiple Presentation Models

The MVP introduces live play-by-play narration.

The architecture intentionally supports substantially more.

Future consumers may include:

- color commentary
- field reporting
- voice synthesis
- game recaps
- push notifications
- statistical storytelling
- conversational interfaces

Every presentation should build upon the same underlying Broadcast Engine.

---

## Preserve Clear Ownership

Every architectural component should possess a clearly defined responsibility.

The Baseball application owns baseball knowledge.

The Broadcast Engine owns communication.

Presentation layers own user experience.

Maintaining these boundaries minimizes coupling while improving long-term maintainability.

---

## Remain Provider Independent

No architectural component should depend directly upon a specific AI provider.

Artificial intelligence services are expected to evolve rapidly.

The architecture should accommodate those changes without requiring fundamental redesign.

---

# 6. Architectural Overview

At a conceptual level, the Broadcast Engine transforms baseball understanding into communication.

```
Authoritative Game State

          │

          ▼

Broadcast Engine

          │

          ▼

Broadcast Artifacts

          │

          ▼

Presentation Layers
```

Although deceptively simple, this transformation represents the central architectural responsibility of the entire subsystem.

Every internal component exists to support one portion of this transformation.

No component should duplicate responsibilities performed elsewhere.

---

# 7. Core Architectural Concepts

Before introducing individual components, several architectural concepts require definition.

These concepts recur throughout the remainder of this document.

### Baseball Knowledge

The authoritative understanding of the game maintained by the Baseball application.

The Broadcast Engine consumes baseball knowledge.

It does not create it.

---

### Broadcast Context

The information required to communicate a game naturally.

Examples include:

- current game situation
- recent events
- inning progression
- momentum
- previous narration
- presentation preferences

Broadcast Context is derived from baseball knowledge.

It is not part of authoritative game state.

---

### Broadcast Artifact

The fundamental output produced by the Broadcast Engine.

A Broadcast Artifact contains presentation-ready information suitable for one or more downstream consumers.

Future consumers—including voice synthesis, notifications, game recaps, and visual presentations—should all consume Broadcast Artifacts rather than interacting directly with baseball state.

---

### Presentation Layer

Any component responsible for delivering Broadcast Artifacts to users.

Presentation layers remain intentionally independent of both baseball processing and Broadcast Engine internals.

This separation enables new presentation experiences to be introduced without affecting either subsystem.

---

# 8. Transition to Component Design

The preceding sections establish the architectural boundaries of the Broadcast Engine.

The remaining chapters of this document move from architectural concepts to concrete implementation.

The next section introduces the Broadcast Engine's domain model.

Those domain objects become the shared language through which every component within the Broadcast Engine communicates.

Establishing that common vocabulary first allows subsequent sections to describe component responsibilities without ambiguity.

---
