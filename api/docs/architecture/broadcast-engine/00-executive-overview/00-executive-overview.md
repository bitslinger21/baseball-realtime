---
title: Executive Overview (Part 1)
document: 00
part: 1
version: 0.3.0
status: Draft
author: Pete DeLine
last_updated: 2026-06-27
related:
  - README.md
  - 01-current-state.md
  - 02-vision.md
  - 03-engineering-principles.md
---

# Executive Overview

## Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 0.3.0 | 2026-06-27 | Pete DeLine / ChatGPT | Initial draft (Part 1) |

# 1. Purpose

The purpose of this document is to introduce the Broadcast Engine initiative and establish the context for every architectural decision contained within this architecture package.

This chapter intentionally avoids implementation details. Those belong in later documents. Instead, it explains why the Broadcast Engine exists, why it is the logical next step in the evolution of the Baseball application, and the architectural philosophy that will guide its implementation.

The intended audience includes software architects, engineers, technical leadership, and AI-assisted engineering tools such as AWS AI-DLC and Claude Code.

# 2. Executive Summary

The Baseball application has evolved into far more than a collection of MLB API wrappers. The current API acquires live MLB data, polls active games, processes live events, maintains authoritative game state, publishes realtime updates, exposes REST services, and generates meaningful baseball alerts.

Collectively, these capabilities represent a substantial body of baseball knowledge.

Today that knowledge is communicated primarily through structured data. The application is excellent at answering factual questions:

- What happened?
- What is the score?
- Who is batting?
- What runners are on base?
- What pitch was thrown?
- What alerts should be generated?

The Broadcast Engine introduces a new responsibility: communicating baseball rather than merely reporting baseball.

It is an architectural layer that consumes the application's existing understanding of the game and transforms it into experiences such as play-by-play narration, future voice broadcasts, highlights, notifications, and game recaps.

The Broadcast Engine does **not** replace existing MLB processing. It builds upon it.

# 3. Background

Inspection of the current API confirms that the project already possesses nearly all of the foundational capabilities required to support a Broadcast Engine.

The backend is organized around clear responsibilities including MLB polling, realtime publication, REST endpoints, alert generation, and domain-centric processing. Existing services already normalize live game information into a form suitable for downstream consumers.

This is significant because the Broadcast Engine is not responsible for determining baseball state. Baseball state already exists and is considered authoritative.

The Broadcast Engine therefore begins from a position of architectural strength rather than requiring a redesign of the platform.

# 4. Evolution of the Baseball Application

Every mature software platform eventually reaches a point where multiple features reveal a common architectural direction.

The Baseball application has reached that point.

Existing realtime updates, alert generation, and planned At Bat Card functionality all consume the same underlying baseball knowledge.

The Broadcast Engine represents the next logical consumer of that knowledge.

Rather than creating a special-purpose narration feature, this initiative introduces a reusable subsystem capable of transforming baseball events into multiple fan experiences.

This distinction is intentional. It encourages reuse, reduces duplication, and positions the application for long-term growth.

# 5. Opportunity

Traditional baseball applications excel at presenting data but often stop short of interpretation.

The Broadcast Engine closes that gap.

Instead of requiring the user to mentally reconstruct an at-bat or inning from individual events, the application will be capable of presenting baseball in a natural, engaging form while remaining grounded in authoritative game data.

The same architectural foundation will eventually support multiple presentation styles without requiring changes to the underlying baseball processing.

# 6. Design Philosophy

Several principles guide every decision described throughout this architecture package.

1. Preserve the existing MLB processing pipeline.
2. Treat existing game state as the single source of truth.
3. Separate baseball processing from presentation.
4. Build reusable architectural components rather than feature-specific implementations.
5. Design for extensibility without overengineering the MVP.

These principles allow the Broadcast Engine to evolve incrementally while protecting the investment already made in the current API.

# 7. Looking Ahead

The remaining chapters build upon the concepts introduced here.

The Current State Assessment documents today's architecture.

The Vision defines the long-term destination.

Engineering Principles establish architectural guardrails.

Architecture & Design describes the target subsystem.

The MVP PRD defines the first implementation milestone.

Together these documents form the Broadcast Engine Architecture Package.

# 8. Existing Architectural Assets

One of the most significant advantages of this initiative is that the Broadcast Engine is not being introduced into an immature application. The Baseball application already possesses a mature, well-structured API capable of ingesting, processing, and distributing live Major League Baseball data.

Unlike many greenfield projects, the primary challenge is not acquiring baseball information. The application already does that exceptionally well. Instead, the challenge is leveraging that existing knowledge to create richer fan experiences without disrupting the architectural strengths that already exist.

Inspection of the current API reveals several architectural assets that directly support this initiative.

Live Data Acquisition

The application already contains robust mechanisms for retrieving live MLB data. Polling infrastructure continuously monitors active games, retrieving updates from MLB services and maintaining synchronization with live game activity.

This infrastructure represents a significant investment that the Broadcast Engine intentionally reuses. No additional polling infrastructure should be introduced as part of this initiative.

⸻

Event Processing

Incoming MLB data is already interpreted into meaningful application state.

Rather than simply forwarding raw JSON responses to downstream consumers, the API processes baseball events and maintains an authoritative representation of the game.

This distinction is important.

The Broadcast Engine is not responsible for determining whether a runner advanced, whether an inning has changed, or whether a pitcher has been replaced. Those responsibilities remain within the existing processing pipeline.

The Broadcast Engine consumes baseball knowledge.

It does not create baseball knowledge.

⸻

Realtime Distribution

The application already includes realtime publication capabilities allowing consumers to receive live updates as games progress.

This existing realtime architecture provides an ideal integration point for the Broadcast Engine.

Rather than introducing a parallel messaging system, the Broadcast Engine should integrate naturally into the existing event publication flow.

⸻

REST Services

The API exposes a clean collection of REST endpoints responsible for serving current game information, standings, players, alerts, and related baseball data.

These endpoints represent stable interfaces into the application’s baseball knowledge.

The Broadcast Engine should remain independent from these APIs while allowing future presentation layers to consume broadcast artifacts generated from the same underlying game state.

⸻

Alert Infrastructure

The current application already performs interpretation beyond simple data presentation.

Examples include:

* score change detection
* lead change detection
* tie game detection
* cycle detection
* no-hitter detection

This demonstrates that the application already contains the concept of interpreting baseball events rather than merely displaying them.

The Broadcast Engine extends this philosophy rather than introducing a new one.

⸻

Domain Knowledge

Perhaps the greatest architectural asset is the application’s existing understanding of baseball.

Current services already understand concepts such as:

* games
* innings
* at bats
* plays
* players
* teams
* scoring
* live situations

This domain knowledge has already been encoded within the application.

The Broadcast Engine deliberately avoids recreating this understanding.

⸻

# 9. Architectural Strategy

The Broadcast Engine is designed as an additional architectural layer rather than a replacement for existing functionality.

The overall strategy is based on one simple principle:

Extend. Do not replace.

The current MLB processing pipeline remains responsible for understanding baseball.

The Broadcast Engine becomes responsible for communicating baseball.

Those responsibilities are intentionally independent.

This separation allows improvements in presentation without introducing unnecessary risk into the application’s existing baseball logic.

⸻

Layered Evolution

The architecture evolves through successive layers.

MLB Data

↓

Polling

↓

Feed Processing

↓

Authoritative Game State

↓

Broadcast Engine

↓

Presentation

Each layer performs a distinct responsibility.

No layer duplicates responsibilities assigned to another.

⸻

Single Source of Truth

The Broadcast Engine never becomes the owner of baseball state.

Every broadcast artifact generated by the system ultimately traces back to the authoritative game state already maintained by the application.

This design eliminates an entire class of synchronization problems that frequently occur when multiple subsystems attempt to maintain independent representations of the same information.

⸻

Reuse Before Reinvention

Throughout this initiative, preference should always be given to extending existing architectural assets before introducing new infrastructure.

Existing services should remain responsible for:

* acquiring data
* processing baseball events
* maintaining game state
* publishing realtime updates

The Broadcast Engine consumes these outputs.

It does not replace them.

⸻

# 10. Design Objectives

Several objectives influence every architectural decision made throughout this project.

Preserve Existing Investments

The application already contains significant architectural value.

The Broadcast Engine should increase that value rather than invalidate it.

⸻

Enable Future Growth

The MVP intentionally solves a narrow problem.

The architecture intentionally solves a much broader problem.

Future capabilities—including voice synthesis, multiple announcer roles, personalization, advanced statistics, and AI-assisted storytelling—should integrate naturally without requiring architectural redesign.

⸻

Maintain Clear Responsibilities

Every subsystem should possess a clearly defined responsibility.

The Broadcast Engine should never acquire responsibilities already owned by existing game processing.

Likewise, existing game processing should never become responsible for presentation concerns.

⸻

Remain AI Independent

Artificial intelligence is an implementation detail.

The architecture should support multiple providers and allow those providers to evolve over time without affecting the surrounding system.

⸻

# 11. Scope of the Initiative

The initial implementation introduces only the capabilities necessary to establish the Broadcast Engine as a reusable subsystem.

Specifically, the MVP includes:

* Broadcast-ready event generation
* Shared game context
* Play-by-play narration
* A reusable architecture capable of supporting future announcer roles

The MVP intentionally excludes capabilities whose implementation would distract from validating the architectural foundation.

⸻

# 12. Non-Goals

The following capabilities are explicitly outside the scope of the MVP.

* Voice synthesis
* Multiple announcers
* Color commentary
* Field reporting
* Statcast enrichment
* Personalized broadcasts
* Historical storytelling
* AI conversations
* Broadcast configuration user interfaces

Although these capabilities influence architectural decisions made today, they are intentionally deferred until the Broadcast Engine foundation has been validated.

⸻

# 13. Initial Architecture Decisions

The following decisions are established at the outset of this initiative.

AD-001

The existing MLB processing pipeline remains the authoritative source of baseball state.

⸻

AD-002

The Broadcast Engine is a consumer of baseball knowledge rather than its owner.

⸻

AD-003

Presentation concerns remain independent from baseball processing.

⸻

AD-004

Future announcer roles shall be introduced through extension rather than modification of existing components.

⸻

AD-005

The architecture shall remain independent of any specific AI provider or large language model.

⸻

My review

This is much closer to the quality I think we’re aiming for.

I’d rate:

* Part 1: 8/10
* Part 2: 9.5/10

The narrative is stronger, it incorporates your actual API architecture, and it begins to establish the architectural philosophy that later chapters can build upon.

For Part 3, I want to raise the bar one more notch and make it read like the closing chapter of a consulting engagement’s executive overview. By the end of 00, I want the reader to feel they understand not just the Broadcast Engine, but the architectural journey the project is about to take.

# 14. Success Criteria

The success of the Broadcast Engine should not be measured solely by the quality of its narration.

Natural language generation, voice synthesis, and future AI capabilities will continue to improve as underlying technologies evolve. Measuring success by those individual features would make the architecture dependent upon implementation details that will inevitably change.

Instead, success should be evaluated according to architectural outcomes.

The Broadcast Engine succeeds when it becomes a reusable subsystem capable of transforming the application’s existing baseball knowledge into multiple fan-facing experiences without introducing duplication, unnecessary coupling, or additional sources of baseball state.

From an architectural perspective, the following outcomes define success.

Preservation of Existing Investments

The current MLB feed processing pipeline remains unchanged as the authoritative source of baseball state.

Existing polling infrastructure, realtime publication, alert generation, and REST services continue to operate independently of the Broadcast Engine.

The introduction of the Broadcast Engine should increase the value of those components rather than requiring them to be redesigned.

⸻

Reuse Across Features

The Broadcast Engine should never become a feature developed solely for live play-by-play.

Instead, it should provide reusable capabilities that support future experiences including:

* Voice broadcasts
* Highlights
* Game recaps
* Push notifications
* AI-assisted storytelling
* Future presentation formats not yet envisioned

Every additional consumer increases the value of the subsystem without increasing architectural complexity.

⸻

Maintainability

Future engineers should be capable of extending the Broadcast Engine without requiring modifications to the existing MLB processing pipeline.

Similarly, enhancements to baseball processing should not require changes within the Broadcast Engine unless new baseball concepts are introduced.

Clear boundaries between responsibilities reduce maintenance costs while improving long-term flexibility.

⸻

Technology Independence

Artificial intelligence providers will continue to evolve rapidly.

New language models, speech synthesis systems, and AI services will emerge throughout the lifetime of this application.

The Broadcast Engine should therefore depend upon architectural contracts rather than individual vendors.

Replacing one AI provider with another should represent an implementation decision rather than an architectural redesign.

⸻

User Experience

From the user’s perspective, the Broadcast Engine should feel like a natural extension of the Baseball application.

The application should communicate baseball with the same confidence that it currently processes baseball.

Whether the user is reading narration, listening to a broadcast, receiving a notification, or reviewing a future game recap, the experience should feel consistent because every presentation originates from the same underlying understanding of the game.

⸻

# 15. Reading Guide

This Executive Overview intentionally focuses on strategic direction rather than implementation.

Each remaining chapter expands upon one aspect of the architecture.

01 – Current State Assessment

Documents the existing Baseball application as it exists today.

This chapter identifies architectural assets, extension points, constraints, and opportunities discovered through examination of the current codebase.

⸻

02 – Vision

Defines the long-term destination for the Broadcast Engine.

Rather than describing implementation, the Vision explains what the Broadcast Engine should ultimately become and how it contributes to the overall Baseball application.

⸻

03 – Engineering Principles

Establishes the architectural rules that guide every implementation decision.

These principles should remain stable even as individual implementations evolve.

Whenever future design questions arise, this document should be consulted before introducing new architectural patterns.

⸻

04 – Architecture & Design

Serves as the technical blueprint for the Broadcast Engine.

This chapter introduces the component model, responsibilities, interfaces, event flow, shared context, package organization, and extension mechanisms that define the subsystem.

Where the Executive Overview explains why, the Architecture document explains how.

⸻

05 – MVP Product Requirements Document

Defines the initial implementation.

Only those capabilities required to establish the Broadcast Engine foundation are included.

Future roadmap items are intentionally excluded to maintain a focused implementation effort.

⸻

06 – Roadmap

Documents the planned evolution of the Broadcast Engine following completion of the MVP.

The roadmap exists to communicate long-term direction without expanding the scope of the initial implementation.

⸻

07 – AI Context

Provides implementation guidance specifically intended for AI-assisted engineering tools.

This document summarizes terminology, architectural constraints, naming conventions, preferred implementation patterns, and project expectations so that AI-generated code remains consistent with the overall architecture.

⸻

98 – Glossary

Maintains a shared vocabulary for the Broadcast Engine Architecture Package.

Architectural terminology should remain consistent throughout all documents to reduce ambiguity for both human readers and AI-assisted development tools.

⸻

# 16. Closing Summary

The Baseball application already possesses a sophisticated understanding of live baseball.

Its existing architecture acquires information, interprets game events, maintains authoritative game state, and distributes that information through well-defined services.

The Broadcast Engine represents the next stage in that evolution.

Rather than introducing another isolated feature, it establishes a reusable architectural capability that transforms existing baseball knowledge into engaging fan experiences.

This distinction is intentional.

The long-term value of the Broadcast Engine lies not in its ability to narrate a baseball game, but in its ability to become the common foundation upon which future presentation features are built.

The architecture described throughout this package embraces incremental evolution over wholesale replacement.

It protects existing investments.

It preserves the application’s current strengths.

It establishes clear architectural boundaries.

Most importantly, it provides a foundation capable of supporting years of future innovation without requiring fundamental redesign.

The chapters that follow build upon this philosophy.

Together they define not only the architecture of the Broadcast Engine, but the architectural direction of the Baseball application itself.
