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

After narration is generated, the Broadcast Director publishes the completed output through the Output Router.

The Output Router distributes broadcast output to downstream consumers.

Potential consumers include:

- realtime client updates
- text display
- voice synthesis
- notifications
- game recaps
- highlights
- future presentation services

The Output Router should not decide what the narration says.

It should not modify baseball meaning.

Its responsibility is delivery.

This preserves the separation between communication generation and presentation delivery.

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
