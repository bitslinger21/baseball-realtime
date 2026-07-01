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
