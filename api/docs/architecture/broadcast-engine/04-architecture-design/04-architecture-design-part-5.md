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
