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
