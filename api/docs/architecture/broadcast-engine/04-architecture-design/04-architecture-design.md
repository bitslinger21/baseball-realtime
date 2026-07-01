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
# 9. Core Domain Model

The Broadcast Engine introduces a new domain within the Baseball application.

Unlike the application's existing baseball domain—which models games, players, innings, pitches, and plays—the Broadcast Engine models the communication of baseball.

These concepts do not replace the existing domain.

Instead, they are derived from it.

The Broadcast Engine therefore establishes a second domain that builds upon the authoritative baseball knowledge already maintained by the application.

This separation preserves the engineering principle that baseball knowledge is owned by the Baseball application while communication is owned by the Broadcast Engine.

---

# 10. Domain Concepts

The Broadcast Engine is composed of several primary domain concepts.

Each concept represents a distinct responsibility within the communication domain.

---

## Baseball Knowledge

Baseball Knowledge represents the authoritative understanding of the current game maintained by the Baseball application.

Examples include:

- score
- inning
- outs
- runners
- pitcher
- batter
- count
- completed plays
- substitutions
- alerts

The Broadcast Engine treats this information as read-only.

No Broadcast Engine component should modify or reinterpret Baseball Knowledge.

---

## Broadcast Context

Broadcast Context represents the information required to communicate the game naturally.

Unlike Baseball Knowledge, Broadcast Context is presentation-oriented.

It may include:

- recently narrated events
- conversational continuity
- game momentum
- previous announcements
- user preferences
- selected announcers
- desired presentation style
- target audience

Broadcast Context is continuously derived from Baseball Knowledge but is not itself part of the authoritative game state.

---

## Broadcast Event

A Broadcast Event represents a baseball event that has been determined to be worthy of communication.

Not every baseball event necessarily becomes a Broadcast Event.

Likewise, a single baseball event may generate multiple Broadcast Events depending upon presentation requirements.

Examples include:

- pitch
- strikeout
- stolen base
- pitching change
- scoring play
- inning change
- game start
- game end

Broadcast Events serve as the primary input to the Broadcast Engine.

They establish **what should be communicated**, not **how it should be communicated**.

---

## Narration Request

A Narration Request combines:

- Broadcast Event
- Baseball Knowledge
- Broadcast Context

into a complete description of a communication opportunity.

This object represents the information required by the narration subsystem to generate presentation-ready output.

The Narration Request intentionally isolates presentation concerns from the remainder of the application.

---

## Broadcast Output

The Broadcast Engine ultimately produces one or more presentation-ready outputs.

These outputs are intentionally independent of any particular consumer.

Examples include:

- narrated text
- structured broadcast segments
- notification summaries
- recap paragraphs
- future voice synthesis requests

Presentation layers consume Broadcast Output.

They do not consume Baseball Knowledge directly.

---

# 11. Domain Relationships

The relationships between these concepts can be summarized as follows.

```
             Baseball Knowledge
                      │
                      │
                      ▼
              Broadcast Context
                      │
                      │
Broadcast Event ──────┤
                      │
                      ▼
             Narration Request
                      │
                      ▼
             Broadcast Output
                      │
                      ▼
            Presentation Layers
```

This flow emphasizes a critical architectural distinction.

The Baseball application determines **what is true**.

The Broadcast Engine determines **how that truth should be communicated**.

---

# 12. Domain Boundaries

Maintaining clear domain boundaries is essential to the long-term maintainability of the architecture.

The Baseball domain owns:

- rules of baseball
- game state
- player information
- scoring
- alerts
- factual interpretation

The Broadcast domain owns:

- communication
- presentation context
- narration
- sequencing
- announcer coordination
- presentation formatting

These domains collaborate through clearly defined interfaces.

Neither domain should duplicate the responsibilities of the other.

---

# 13. Design Philosophy

The Broadcast Engine deliberately models communication as its own domain rather than treating it as an implementation detail.

This decision has several long-term benefits.

First, communication becomes reusable.

Second, multiple presentation layers can share the same understanding of the game.

Third, future capabilities—including additional announcers, conversational interaction, statistical storytelling, and entirely new presentation models—can be introduced without modifying the Baseball domain.

Finally, this separation preserves one of the project's most important engineering principles:

> The Baseball application understands baseball.

> The Broadcast Engine communicates that understanding.

Every component introduced in the remaining sections of this document builds upon that philosophy.

---

# 14. Transition to Component Architecture

Having established the core concepts of the Broadcast Engine, the next section introduces the components responsible for implementing them.

Those components transform these domain concepts into a working architecture capable of producing live baseball broadcasts while remaining faithful to the engineering principles established throughout this architecture package.

---
# 15. Component Architecture

The Broadcast Engine is intentionally composed of small, focused components.

Each component owns a single architectural responsibility.

Collectively, these components transform authoritative baseball knowledge into presentation-ready broadcast output while preserving the engineering principles established throughout this architecture package.

No component should duplicate responsibilities owned elsewhere within the Baseball application.

---

# 16. Component Overview

The Broadcast Engine consists of the following primary components.

```
                    Baseball Application
               (Authoritative Game State)
                           │
                           ▼
                   Broadcast Director
                           │
      ┌────────────┬──────────────┬──────────────┐
      ▼            ▼              ▼              ▼
 Context Builder  Memory      Prompt Builder  Output Router
                  Manager
      │            │              │
      └────────────┴──────────────┘
                     │
                     ▼
                 Narrator
                     │
                     ▼
                 AI Provider
                     │
                     ▼
             Broadcast Output
```

The Broadcast Director coordinates the overall broadcast process.

Every other component exists to perform a specialized portion of that workflow.

---

# 17. Broadcast Director

The Broadcast Director is the central orchestrator of the Broadcast Engine.

It owns the broadcast lifecycle.

Its responsibilities include:

- receiving Broadcast Events
- determining whether narration is required
- coordinating supporting components
- selecting participating announcers
- sequencing broadcast activity
- publishing completed output

Importantly, the Broadcast Director does **not** generate narration itself.

It coordinates components that do.

This distinction keeps orchestration independent from presentation.

---

# 18. Context Builder

The Context Builder constructs the Broadcast Context required for effective narration.

Inputs include:

- Baseball Knowledge
- current Broadcast Event
- previous narration
- game history
- presentation configuration

Outputs include:

- Broadcast Context

The Context Builder deliberately separates contextual reasoning from narration generation.

This improves reuse while allowing future presentation components to leverage the same contextual understanding.

---

# 19. Memory Manager

Live broadcasts require continuity.

The Memory Manager maintains presentation-specific memory throughout the game.

Examples include:

- recently narrated plays
- unresolved storylines
- ongoing pitcher performance
- previous statistical references
- conversational continuity

This memory exists exclusively within the Broadcast Engine.

It is distinct from authoritative game state.

Removing presentation memory from the Narrator simplifies prompt generation while improving consistency.

---

# 20. Prompt Builder

The Prompt Builder converts structured Broadcast Context into prompts suitable for AI providers.

Responsibilities include:

- prompt templates
- system instructions
- announcer personality
- presentation style
- response constraints
- output formatting

Centralizing prompt construction provides two significant advantages.

First, prompt evolution becomes independent of narration orchestration.

Second, multiple AI providers can share identical prompt-generation logic.

---

# 21. Narrator

The Narrator represents the communication intelligence of the Broadcast Engine.

It receives:

- Broadcast Context
- Broadcast Event
- generated prompt

It produces:

- structured narration

The Narrator owns communication.

It does not own baseball knowledge.

Future announcer roles—including color commentators and field reporters—should extend the Narrator abstraction rather than introducing unrelated implementations.

---

# 22. AI Provider

The AI Provider abstracts interactions with external language models.

Its responsibilities include:

- provider selection
- authentication
- retries
- streaming responses
- error handling
- provider-specific configuration

Examples may include:

- AWS AI-DLC
- future AWS Bedrock integrations
- future OpenAI integrations
- future local models

Every provider should expose a common interface.

No Broadcast Engine component other than the AI Provider should depend directly upon vendor APIs.

---

# 23. Output Router

The Output Router distributes completed Broadcast Output to downstream consumers.

Examples include:

- realtime client updates
- voice synthesis
- notifications
- game recap generation
- future presentation services

The Output Router performs distribution only.

It does not generate communication.

---

# 24. Component Relationships

Each component possesses a narrowly defined responsibility.

```
Broadcast Director
        │
        ├────────► Context Builder
        │
        ├────────► Memory Manager
        │
        ├────────► Prompt Builder
        │
        ├────────► Narrator
        │               │
        │               ▼
        │          AI Provider
        │
        ▼
 Output Router
```

Notice that no supporting component communicates directly with another unless explicitly required.

The Broadcast Director remains responsible for coordinating the workflow.

This design minimizes coupling while simplifying future extensions.

---

# 25. Architectural Observations

Several characteristics emerge from this component model.

## Clear Responsibilities

Every component owns a single architectural concern.

This minimizes overlap while improving maintainability.

---

## Replaceable Components

Individual components may evolve independently.

For example:

- new AI providers
- new prompt strategies
- new announcer roles
- improved context generation

None of these changes require architectural redesign.

---

## Testability

Each component may be tested independently using deterministic inputs and outputs.

This architecture naturally supports unit testing, integration testing, and AI simulation.

---

## Extensibility

Future capabilities are expected to appear primarily through the introduction of new components rather than modification of existing ones.

This characteristic aligns directly with the engineering principle of favoring extension over modification.

---

# 26. Transition to Event Flow

The component architecture defines *who* performs each responsibility.

The next section explains *when* those responsibilities occur.

It follows a baseball event from the moment it enters the Broadcast Engine until presentation-ready output is delivered to downstream consumers.

---
# 27. Event Flow and Lifecycle

The component architecture defines which parts of the Broadcast Engine own each responsibility.

This section defines how those responsibilities execute over time.

The Broadcast Engine is fundamentally event-driven. It reacts to meaningful changes in the game, evaluates whether those changes should be communicated, builds the necessary context, generates communication, and distributes the resulting broadcast output to downstream consumers.

The lifecycle is intentionally designed to preserve the most important architectural boundary in the system:

> The Baseball application determines what happened.  
> The Broadcast Engine determines how to communicate it.

---

# 28. High-Level Lifecycle

At a high level, the Broadcast Engine lifecycle follows this flow.

```text
MLB Feed
   │
   ▼
Existing Feed Processing
   │
   ▼
Authoritative Game State
   │
   ▼
Broadcast Event
   │
   ▼
Broadcast Director
   │
   ├── Evaluate event
   ├── Build context
   ├── Consult memory
   ├── Select narrator
   ├── Generate narration
   ├── Update memory
   └── Publish output
   │
   ▼
Broadcast Output
   │
   ▼
Presentation Consumers
```

This flow reinforces the fact that the Broadcast Engine begins **after** the existing application has processed baseball data.

It does not consume raw MLB feed data directly.

It does not calculate baseball state.

It does not determine official game outcomes.

It operates only after the existing application has already converted live MLB data into trusted application knowledge.

---

# 29. Event Entry Point

The Broadcast Engine begins with a Broadcast Event.

A Broadcast Event represents a communication opportunity derived from the current baseball state.

Examples include:

- pitch result
- strikeout
- walk
- hit
- scoring play
- pitching change
- inning transition
- game start
- game end

A Broadcast Event should not be treated as a replacement for existing live update models.

The current application already has realtime update structures used to communicate game changes to clients. Those existing structures should remain intact.

The Broadcast Event is a Broadcast Engine input model derived from existing application knowledge.

This distinction is important because it avoids an unnecessary refactor of the existing realtime system.

---

# 30. Event Evaluation

Not every baseball event requires broadcast output.

One of the Broadcast Director's responsibilities is determining whether an event should be communicated.

For example:

- A routine ball may not always require narration.
- A third consecutive foul ball may be summarized rather than narrated individually.
- A scoring play almost always requires communication.
- A pitching change may require a short contextual explanation.
- An inning-ending play may require a transition statement.

This evaluation prevents the Broadcast Engine from becoming a noisy event-to-text converter.

The goal is not to speak every event.

The goal is to communicate the game naturally.

---

# 31. Context Construction

When the Broadcast Director determines that an event should be communicated, it requests Broadcast Context.

Broadcast Context is constructed from:

- current game state
- current Broadcast Event
- recent plays
- current inning
- score
- runners
- count
- pitcher and batter
- previous broadcast output
- presentation configuration

The Context Builder assembles this information into a communication-oriented view of the game.

This view is not authoritative baseball state.

It is contextual support for communication.

The distinction matters because presentation context can include information that is useful for narration but irrelevant to game state, such as:

- whether a player was recently mentioned
- whether the same situation has already been described
- whether the broadcast should be concise
- whether the current moment deserves elevated emphasis

---

# 32. Memory Consultation

The Broadcast Engine requires memory, but that memory is presentation memory.

It is not baseball state.

The Memory Manager may track:

- recently narrated events
- repeated storylines
- current at-bat narration history
- prior references to a player
- previous excitement level
- unresolved broadcast threads

For example, if a batter has fouled off four straight pitches, the Baseball application owns the factual pitch history.

The Broadcast Engine memory may own the fact that the broadcaster has already described the at-bat as a battle.

That prevents repetitive narration and allows later commentary to feel coherent.

---

# 33. Narrator Selection

The MVP will likely include only one active narrator: the play-by-play announcer.

However, the lifecycle should allow future narrator selection without redesign.

Future narrator roles may include:

- color commentator
- field reporter
- statistical analyst
- historical storyteller
- condensed-game narrator

The Broadcast Director is responsible for deciding which narrator participates in a given moment.

This does not mean all future roles must be implemented now.

It means the lifecycle should not assume that only one narrator can ever exist.

---

# 34. Narration Generation

Once context has been assembled and the appropriate narrator selected, the Narrator generates broadcast output.

The Narrator receives structured input.

It should not receive raw MLB feed data.

It should not be asked to infer baseball state.

It should be asked to communicate a baseball situation already understood by the application.

This keeps narration generation grounded, testable, and constrained.

For MVP purposes, narration generation may produce text only.

Future implementations may produce richer structured output, such as:

- text
- emphasis level
- pacing hints
- voice instructions
- segment type
- consumer metadata

The lifecycle should allow richer output later without requiring changes to the existing baseball processing pipeline.

---

# 35. Output Publication

`
---

# 36. Memory Update

After output is published, the Memory Manager should be updated.

This allows future broadcast decisions to account for what has already been communicated.

For example:

- avoid repeating the same score too often
- avoid reintroducing the same pitcher repeatedly
- recognize an ongoing at-bat battle
- preserve continuity after a pitching change
- reference earlier important plays

This memory update completes the broadcast lifecycle for the event.

---

# 37. Example Lifecycle: Routine Pitch

A routine pitch provides the simplest example.

```text
Pitch occurs
   │
Existing feed processing updates game state
   │
Broadcast Event is derived
   │
Broadcast Director evaluates event
   │
Director decides whether narration is needed
   │
If needed, context is built
   │
Narrator generates concise play-by-play
   │
Output is published
   │
Memory is updated
```

For many routine pitches, the Director may decide no output is required.

That is acceptable.

Silence is part of a natural broadcast.

---

# 38. Example Lifecycle: Home Run

A home run follows the same lifecycle but with different evaluation and context.

```text
Home run occurs
   │
Existing feed processing updates score and play state
   │
Broadcast Event is derived
   │
Broadcast Director identifies high-significance event
   │
Context Builder gathers score, inning, runners, batter, pitcher
   │
Memory Manager provides recent game context
   │
Narrator generates elevated play-by-play
   │
Output Router publishes broadcast output
   │
Memory Manager records key moment
```

The important point is that the lifecycle does not change because the event is dramatic.

The same architecture handles routine and high-leverage moments.

Only the context and narration strategy change.

---

# 39. Example Lifecycle: Pitching Change

A pitching change illustrates why the Broadcast Engine must support context.

The factual event is simple:

> A new pitcher enters the game.

The broadcast opportunity is richer.

The Broadcast Engine may need to communicate:

- who is entering
- who is leaving
- inning and score
- runners on base
- handedness matchup
- recent pitcher workload
- strategic significance

All of that context is derived from existing baseball knowledge.

The Broadcast Engine does not invent it.

It organizes it for communication.

---

# 40. Lifecycle Principles

The event lifecycle is governed by several principles.

## Events Are Derived, Not Reinterpreted

Broadcast Events are derived from existing application knowledge.

They are not independent interpretations of MLB feed data.

---

## Context Is Presentation-Oriented

Broadcast Context supports communication.

It should not be confused with authoritative baseball state.

---

## Silence Is Valid

The Broadcast Engine does not need to produce output for every event.

A good broadcast includes pacing, restraint, and selective emphasis.

---

## Output Is Consumer-Agnostic

Broadcast output should be usable by multiple consumers.

It should not be tailored exclusively to one UI or delivery mechanism.

---

## Memory Supports Continuity

Broadcast memory exists to improve communication continuity.

It should never become an alternate source of game state.

---

# 41. Transition to Extensibility

The event lifecycle described in this section establishes the baseline flow for the Broadcast Engine.

The next section describes how this architecture supports future growth, including multiple announcer roles, color commentary, field reporting, Statcast enrichment, voice synthesis, and additional presentation consumers.

Those future capabilities should extend the lifecycle described here rather than replacing it.

---
# 42. Extensibility Model

The Broadcast Engine is designed to begin narrowly and grow deliberately.

The MVP focuses on play-by-play narration, but the architecture should not assume that play-by-play is the only future use case. The system must support future announcer roles, additional presentation formats, richer data sources, and new communication modes without requiring a redesign of the core engine.

Extensibility is therefore not a future enhancement.

It is a present architectural requirement.

The design should make the next capability easier to add than the first one.

---

# 43. Extension Philosophy

The Broadcast Engine should evolve through extension rather than modification.

New capabilities should be introduced by adding focused components, new narrator roles, new output consumers, or new enrichment providers.

They should not require existing components to accumulate unrelated responsibilities.

This philosophy follows directly from the Engineering Principles:

- preserve the existing MLB processing pipeline
- maintain a single source of truth
- separate baseball knowledge from communication
- favor extension over modification
- design for multiple consumers
- keep AI providers replaceable

The result should be a system that grows wider without becoming tangled.

---

# 44. Announcer Role Extension

The Broadcast Engine should support multiple announcer roles over time.

The MVP introduces a play-by-play announcer.

Future roles may include:

- color commentator
- field reporter
- statistical analyst
- historical storyteller
- condensed-game narrator
- educational narrator

These roles should share a common architectural foundation while retaining distinct responsibilities.

---

## Play-by-Play Announcer

The play-by-play announcer communicates what is happening in the game.

Responsibilities include:

- describing live action
- communicating count, outs, runners, and score when appropriate
- identifying meaningful events
- preserving pacing
- avoiding excessive repetition
- elevating major moments

The play-by-play announcer is required for the MVP.

---

## Color Commentator

The color commentator explains why events matter.

Responsibilities may include:

- strategy
- player tendencies
- statistical context
- matchup analysis
- historical references
- game trends
- situational insight

The color commentator should not drive the live event stream.

It should participate when the Broadcast Director identifies a suitable opportunity for additional context.

This distinction prevents color commentary from competing with play-by-play narration.

---

## Field Reporter

The field reporter provides situational or environmental context.

Potential responsibilities include:

- injury updates
- weather delays
- mound visits
- lineup changes
- crowd atmosphere
- ballpark context
- dugout or bullpen notes

The field reporter should speak only when grounded information is available.

Because the application may not initially possess reliable sources for these details, the field reporter should remain optional and deferred until appropriate data sources exist.

---

# 45. Data Enrichment Extension

The Broadcast Engine should support enriched communication without depending on enrichment for correctness.

The MVP should operate using the existing MLB feed and current application state.

Future enrichment sources may include:

- Statcast
- player season statistics
- matchup history
- ballpark data
- weather data
- historical records
- team trends
- news or roster context

These sources should enhance communication.

They should not become authoritative sources for game state.

---

## Statcast Enrichment

Statcast data can significantly improve the quality of future narration.

Examples include:

- exit velocity
- launch angle
- pitch velocity
- spin rate
- hit distance
- expected batting average
- sprint speed
- catch probability

However, Statcast should remain an enrichment layer.

It should not be required for MVP functionality.

It should not replace existing game-state processing.

It should not become the primary source of truth for play outcomes.

The architecture should allow Statcast to be added later without changing the Broadcast Engine lifecycle.

---

# 46. Presentation Consumer Extension

The Broadcast Engine should support multiple downstream consumers.

The first consumer may be realtime text narration.

Future consumers may include:

- voice synthesis
- game recaps
- highlights
- push notifications
- At Bat Cards
- in-app timelines
- mobile widgets
- smart speakers
- conversational AI
- future presentation services

Each consumer should receive broadcast output through a stable contract.

Consumers may choose how to render, store, summarize, speak, or ignore that output.

They should not reach backward into the Broadcast Engine to reinterpret events.

---

# 47. Voice Extension

Voice synthesis is a natural future extension of the Broadcast Engine.

However, voice should not be introduced until text narration is reliable.

This sequencing matters.

If the generated text is poor, voice synthesis will only make the weakness more obvious.

The recommended progression is:

```text
Broadcast Event
      │
      ▼
Text Narration
      │
      ▼
Voice Synthesis
      │
      ▼
Audio Playback
```

Voice should consume broadcast output.

It should not replace broadcast output.

This keeps narration generation independent from audio delivery.

Future voice capabilities may include:

- voice selection
- speaking rate
- emotion
- emphasis
- enthusiasm level
- announcer identity
- playback queueing
- interruption rules

These capabilities should remain presentation concerns.

---

# 48. Configuration Extension

Future users may want to customize the broadcast experience.

Potential settings include:

- broadcast enabled
- announcer style
- enthusiasm level
- narration verbosity
- color commentary enabled
- field reporter enabled
- voice enabled
- voice selection
- statistical depth
- condensed mode

No immediate UI work is required for the MVP.

However, the architecture should anticipate future configuration.

Configuration should influence broadcast behavior without requiring changes to the Broadcast Engine's core responsibilities.

For the MVP, default settings may be hardcoded or provided through server configuration.

Future UI settings can then update the same underlying configuration model.

---

# 49. Provider Extension

AI providers should remain replaceable.

The Broadcast Engine should not depend directly on any vendor-specific SDK, prompt format, or response structure outside of a provider abstraction.

Potential providers may include:

- AWS services
- OpenAI models
- local models
- future speech-language systems
- future specialized sports narration models

Provider replacement should affect adapter code, not Broadcast Engine architecture.

This principle protects the application from rapid changes in the AI ecosystem.

---

# 50. Extension Boundaries

Extensibility does not mean every future idea belongs inside the Broadcast Engine.

The Broadcast Engine owns communication of baseball knowledge.

It should not become a catch-all subsystem for unrelated features.

Future extensions should be accepted only when they strengthen the communication layer.

A proposed extension belongs in the Broadcast Engine if it answers one of these questions:

- What should be communicated?
- How should it be communicated?
- Who should communicate it?
- When should it be communicated?
- What context is needed for communication?
- Which consumer should receive it?

A proposed extension likely belongs elsewhere if it answers:

- What happened in the game?
- What is the official state?
- What are the baseball rules?
- How should the UI render controls?
- How should persistent user accounts be managed?
- How should billing or subscriptions work?

These boundaries prevent the Broadcast Engine from expanding beyond its architectural purpose.

---

# 51. Extensibility Risks

Extensible systems can fail in two opposite ways.

They can be too rigid, making future capabilities difficult to add.

They can also be too abstract, adding complexity before the system has proven it needs it.

The Broadcast Engine should avoid both failure modes.

The MVP should implement only what is necessary.

The architecture should still leave clear seams for future growth.

This balance is especially important because the Broadcast Engine will evolve alongside rapidly changing AI capabilities.

The system should be prepared for future growth without pretending to know every future requirement.

---

# 52. Extension Principles

The following principles govern future extensions:

## Additive by Default

New capabilities should add behavior rather than rewrite existing behavior.

---

## Optional by Design

Future roles such as color commentary and field reporting should be optional.

The play-by-play announcer remains the baseline broadcast experience.

---

## Grounded in Data

No announcer role should invent facts.

Every statement should be grounded in authoritative game state or approved enrichment sources.

---

## Consumer-Agnostic Output

Broadcast output should not be shaped exclusively for a single UI or delivery mechanism.

---

## Provider-Agnostic Intelligence

AI providers should remain replaceable implementation details.

---

## Configuration-Aware

Future personalization should be driven through configuration rather than hardcoded branching.

---

# 53. Transition to AI Integration

The extensibility model establishes how the Broadcast Engine can grow beyond MVP narration.

The next section focuses specifically on AI integration.

Artificial intelligence is central to the communication capabilities of the Broadcast Engine, but it must remain architecturally constrained.

The following section defines how AI should participate in the system without becoming the system.

---
# 54. AI Integration Architecture

Artificial intelligence enables the Broadcast Engine to communicate naturally.

It does not define the Broadcast Engine.

The Baseball application continues to own baseball knowledge, while the Broadcast Engine owns communication. Artificial intelligence assists the Broadcast Engine in performing that communication.

This distinction ensures that advances in AI technology enhance the system without requiring changes to its fundamental architecture.

---

# 55. Architectural Role of AI

Within the Broadcast Engine, AI performs a single architectural responsibility:

**Transform structured baseball context into natural communication.**

AI does **not**:

- determine baseball facts
- calculate game state
- interpret MLB feed data
- enforce baseball rules
- maintain presentation memory
- decide whether an event occurred

Those responsibilities belong elsewhere within the application.

Restricting AI to communication dramatically reduces complexity while improving determinism and testability.

---

# 56. AI Integration Model

The Broadcast Engine should interact with AI through a dedicated provider abstraction.

```
                Broadcast Director
                        │
                        ▼
                   Narrator
                        │
                        ▼
                 AI Provider Interface
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
   AWS AI-DLC     Future Provider    Local Model
```

Every provider implements the same interface.

No Broadcast Engine component should communicate directly with a vendor SDK.

This isolation minimizes vendor lock-in while simplifying testing.

---

# 57. Why AWS AI-DLC

The recommended implementation platform for the MVP is AWS AI-DLC.

AI-DLC provides several architectural advantages:

- centralized prompt execution
- managed model access
- provider abstraction
- operational tooling
- authentication
- observability
- scalability

These capabilities align naturally with the Broadcast Engine architecture.

Equally important, AI-DLC allows the Broadcast Engine to evolve independently of the underlying language models it uses.

---

# 58. Prompt Lifecycle

Prompt generation should follow a consistent lifecycle.

```
Broadcast Event
        │
        ▼
Context Builder
        │
        ▼
Narration Request
        │
        ▼
Narrator
        │
        ▼
Prompt
        │
        ▼
AI Provider
        │
        ▼
Structured Response
```

Each stage performs one responsibility.

Prompt construction should remain deterministic.

Only the AI response introduces probabilistic behavior.

---

# 59. Prompt Design Principles

Every prompt should be constructed from structured application knowledge rather than raw provider responses.

Prompts should include:

- current game situation
- relevant baseball context
- announcer identity
- desired presentation style
- output constraints

Prompts should avoid:

- unnecessary historical data
- duplicated information
- provider-specific assumptions
- excessive instructions

Prompt quality should improve through iteration without requiring architectural changes.

---

# 60. Response Validation

AI responses should never be trusted blindly.

Before broadcast output is published, responses should be validated.

Validation may include:

- required fields
- response length
- prohibited content
- structural correctness
- formatting
- successful parsing

Whenever possible, structured outputs should be preferred over free-form text.

Validation protects downstream consumers while reducing operational risk.

---

# 61. Failure Handling

AI providers occasionally fail.

Failures may include:

- timeouts
- network errors
- rate limits
- malformed responses
- unavailable models

These failures should not interrupt the overall operation of the Baseball application.

The Broadcast Engine should degrade gracefully.

Potential fallback strategies include:

- retrying the request
- generating simplified narration
- skipping optional commentary
- logging the failure
- continuing game processing

Baseball understanding should never depend upon AI availability.

---

# 62. Observability

Every AI interaction should be observable.

Useful telemetry includes:

- provider
- model
- request duration
- response duration
- retries
- failures
- prompt version
- narrator
- token usage
- estimated cost

These metrics support operational monitoring while enabling future optimization.

---

# 63. Cost Management

AI introduces variable operational cost.

The architecture should support cost-aware operation.

Potential strategies include:

- configurable verbosity
- selective narration
- prompt optimization
- response caching
- provider selection
- model selection

The Broadcast Engine should be capable of balancing quality, latency, and cost without architectural redesign.

---

# 64. Streaming Responses

Future AI providers may support streaming output.

The Broadcast Engine should treat streaming as an optimization rather than a requirement.

Streaming should improve responsiveness without affecting the overall architecture.

Whether responses arrive incrementally or all at once, downstream components should observe the same logical broadcast lifecycle.

---

# 65. Model Independence

The architecture intentionally avoids assumptions regarding:

- model family
- model size
- provider
- deployment location
- prompt syntax

Future models should improve communication quality without changing the surrounding architecture.

Replacing one model with another should require configuration changes rather than architectural modifications.

---

# 66. AI Evolution

Artificial intelligence is evolving faster than almost every other technology used by this project.

The architecture should therefore optimize for adaptability rather than permanence.

Future capabilities may include:

- reasoning models
- multimodal models
- speech-native models
- specialized sports models
- local inference
- personalized models

The Broadcast Engine should benefit from these advances through its provider abstraction rather than requiring redesign.

---

# 67. AI Integration Principles

The AI integration architecture is governed by several principles.

## AI Communicates

Artificial intelligence communicates baseball knowledge.

It does not create baseball knowledge.

---

## AI Is Replaceable

Providers should remain interchangeable.

---

## AI Is Observable

Every interaction should be measurable.

---

## AI Is Optional

The Baseball application continues functioning even when AI services are unavailable.

---

## AI Is Constrained

AI should receive structured baseball context.

It should not infer authoritative game state.

---

## AI Is an Enhancement

The value of the Broadcast Engine comes from its architecture.

Artificial intelligence improves that architecture's ability to communicate naturally.

It does not replace the architecture itself.

---

# 68. Transition to Runtime Architecture

The previous sections established the conceptual architecture, component model, event lifecycle, extensibility strategy, and AI integration approach.

The next section focuses on runtime considerations, including:

- performance
- concurrency
- scalability
- resiliency
- caching
- monitoring
- deployment

These topics ensure that the Broadcast Engine not only functions correctly but operates reliably in a live production environment.

---
# 69. Runtime Architecture

The preceding sections describe the logical architecture of the Broadcast Engine.

This section focuses on its runtime behavior.

The Broadcast Engine operates in a live environment where baseball events occur continuously and users expect timely, accurate communication. The architecture must therefore support predictable performance, graceful failure handling, and operational visibility while remaining independent of any specific deployment platform.

---

# 70. Runtime Characteristics

The Broadcast Engine should exhibit the following characteristics.

## Event Driven

The Broadcast Engine reacts to baseball events.

It should never poll MLB services directly.

It should begin processing only after the Baseball application has updated authoritative game state.

---

## Asynchronous

Narration generation should not block baseball processing.

The Baseball application must continue processing live game updates regardless of Broadcast Engine activity.

Communication is important.

Game processing is critical.

The architecture should always prioritize maintaining accurate game state.

---

## Stateless Components

Whenever practical, Broadcast Engine components should remain stateless.

Long-lived state should exist only where architecturally justified, such as:

- presentation memory
- runtime configuration
- active broadcast sessions

Stateless components simplify scaling and testing.

---

## Deterministic Inputs

Every Broadcast Event should produce deterministic inputs to the Broadcast Engine.

Although AI responses are inherently probabilistic, the information supplied to AI should always originate from deterministic application state.

This improves reproducibility and simplifies debugging.

---

# 71. Concurrency

Multiple games may be active simultaneously.

Each game should be processed independently.

The architecture should avoid shared mutable state across games.

A conceptual runtime model may resemble:

```text
Game A ─────────────┐
                    │
                    ▼
            Broadcast Session A

Game B ─────────────┐
                    │
                    ▼
            Broadcast Session B

Game C ─────────────┐
                    │
                    ▼
            Broadcast Session C
```

Each session maintains its own presentation memory and broadcast context while sharing common infrastructure components.

This isolation improves scalability while preventing one game's activity from affecting another.

---

# 72. Broadcast Sessions

A Broadcast Session represents the runtime instance responsible for communicating a single baseball game.

A session may include:

- presentation memory
- announcer configuration
- runtime preferences
- active narrator state
- temporary caches

Sessions begin when a game enters an active broadcast state.

Sessions conclude after final broadcast activities have completed.

Session lifetime should remain independent from user connections.

The Broadcast Engine communicates games.

It does not communicate individual users.

---

# 73. Performance

The Broadcast Engine should communicate live baseball naturally without introducing unnecessary delay.

Performance goals include:

- rapid event evaluation
- efficient context construction
- minimal orchestration overhead
- prompt optimization
- low-latency AI interaction

Performance optimization should focus first on eliminating unnecessary work.

Only after the architecture is well understood should implementation-level optimizations be introduced.

Premature optimization should be avoided.

---

# 74. Scalability

The architecture should scale primarily through parallel game processing.

Additional games should increase throughput requirements without significantly increasing architectural complexity.

Key scalability characteristics include:

- independent broadcast sessions
- stateless orchestration components
- replaceable AI providers
- isolated presentation memory
- reusable infrastructure services

No architectural component should assume that only one game is active.

---

# 75. Resiliency

Broadcast failures should never interrupt baseball processing.

Examples include:

- AI provider unavailable
- narration timeout
- malformed response
- output publication failure
- temporary infrastructure outage

When failures occur, the Broadcast Engine should:

- isolate the failure
- log diagnostic information
- continue processing future events
- preserve baseball state
- recover automatically whenever practical

Graceful degradation is preferred over complete interruption.

---

# 76. Caching

Caching should be used only when it improves efficiency without introducing ambiguity.

Potential cache candidates include:

- player summaries
- prompt templates
- historical statistics
- static ballpark information
- reusable configuration

Authoritative game state should never be cached inside the Broadcast Engine.

Game state belongs to the Baseball application.

Caching should improve performance, not ownership.

---

# 77. Monitoring

Operational monitoring should answer questions such as:

- Is narration being generated?
- Are AI providers responding?
- Are sessions healthy?
- Are broadcasts falling behind?
- Are failures increasing?
- Are consumers receiving output?

Monitoring should emphasize system health rather than implementation details.

The objective is rapid diagnosis during live games.

---

# 78. Metrics

Representative metrics may include:

## Throughput

- Broadcast Events received
- Narration requests generated
- Broadcast outputs published

---

## Latency

- context generation
- narration generation
- AI response time
- publication time

---

## Reliability

- AI failures
- retries
- skipped events
- validation failures
- publication failures

---

## Cost

- AI requests
- token usage
- estimated provider cost

Metrics should support operational improvement without influencing architectural responsibilities.

---

# 79. Logging

Structured logging should be used throughout the Broadcast Engine.

Useful log entries include:

- Broadcast Event identifier
- game identifier
- session identifier
- narrator
- provider
- latency
- retry count
- publication status

Logs should enable engineers to reconstruct the lifecycle of a broadcast event without exposing unnecessary implementation details.

---

# 80. Testing Strategy

The architecture naturally supports multiple testing levels.

## Unit Tests

Individual components tested independently.

Examples:

- Context Builder
- Broadcast Director
- Memory Manager

---

## Integration Tests

Interaction between Broadcast Engine components.

Examples:

- Broadcast Director → Narrator
- Narrator → AI Provider
- Output Router → Consumer

---

## End-to-End Tests

Complete broadcast lifecycle using deterministic baseball events.

These tests verify the architecture rather than any particular AI response.

---

## Simulation

Recorded MLB games provide an excellent source of deterministic replay.

Historical games can be replayed through the Broadcast Engine to evaluate:

- narration pacing
- latency
- failure handling
- observability
- scalability

Simulation should become a primary architectural validation technique.

---

# 81. Runtime Principles

The runtime architecture is governed by the following principles.

## Baseball Processing First

Broadcast generation must never delay authoritative game processing.

---

## Independent Sessions

Each game should execute independently.

---

## Graceful Failure

Failures should degrade communication rather than interrupt the application.

---

## Observable Behavior

Every significant runtime activity should be measurable.

---

## Scalable Design

Growth in active games should primarily increase workload rather than architectural complexity.

---

## Testable Runtime

Every runtime behavior should be reproducible through deterministic testing or historical replay.

---

# 82. Transition to Architecture Decisions

The previous sections collectively define the architecture of the Broadcast Engine.

The final section captures the key Architecture Decisions made throughout this design, documents their rationale, and establishes the architectural record that future evolution should build upon.

---
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
