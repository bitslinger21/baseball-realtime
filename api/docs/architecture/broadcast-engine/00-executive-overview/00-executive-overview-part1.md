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

*End of Part 1.*
