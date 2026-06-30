# 9. Application Organization

The API is implemented as a modular NestJS application that separates infrastructure concerns from baseball domain functionality.

Rather than organizing the application around individual MLB endpoints, the codebase is organized around responsibilities. This results in a clean separation between components responsible for acquiring baseball information, processing that information, and exposing it to downstream consumers.

Inspection of the application reveals three broad categories of modules.

### Infrastructure Modules

Infrastructure modules provide the runtime capabilities required to support the remainder of the application.

Examples include:

- polling infrastructure
- realtime communication
- application configuration
- persistence
- logging
- dependency injection

These modules are largely independent of baseball-specific concepts and provide reusable capabilities to the rest of the system.

---

### Domain Modules

Domain modules expose baseball-specific functionality.

Current modules include capabilities such as:

- Games
- Players
- Box Scores
- Standings
- Leaders
- Alerts
- Health

Each module represents a cohesive portion of the baseball domain and exposes functionality through REST endpoints and supporting services.

This modular organization improves maintainability while reducing unnecessary coupling between unrelated features.

---

### Integration Modules

Integration modules connect the application to external services.

The most significant integration is the MLB data provider.

Rather than allowing external APIs to permeate the application, integration responsibilities remain localized, allowing downstream components to consume normalized application models rather than provider-specific representations.

This architectural decision significantly reduces the impact of future provider changes.

---

# 10. Live Game Processing Pipeline

The heart of the Baseball application is its live game processing pipeline.

This pipeline continuously transforms raw MLB data into authoritative application state.

The processing flow can be summarized as follows.

```
MLB Services

      │

      ▼

Polling

      │

      ▼

Feed Retrieval

      │

      ▼

Feed Processing

      │

      ▼

Authoritative Game State

      │

      ├──────────────┐
      │              │
      ▼              ▼

REST APIs      Realtime Updates

      │
      ▼

Application Consumers
```

Each stage of the pipeline performs a distinct responsibility.

No individual stage attempts to solve multiple architectural concerns.

This separation of responsibilities contributes significantly to the clarity of the implementation.

---

## Polling Infrastructure

The application actively monitors live MLB games through a polling mechanism.

Polling is responsible for determining when games should be queried and retrieving updated game information from MLB services.

Importantly, polling is intentionally unaware of baseball rules.

Its responsibility ends once updated information has been acquired.

This separation ensures that scheduling logic remains independent from baseball processing logic.

---

## Feed Retrieval

Retrieved MLB responses enter the application through provider-specific services.

These services isolate external APIs from the remainder of the application.

As a result, downstream processing remains insulated from provider-specific implementation details.

This architectural boundary is particularly valuable because it minimizes the impact of future API changes.

---

## Feed Processing

Feed processing represents one of the most valuable architectural assets within the application.

Rather than forwarding raw MLB responses directly to clients, the processing pipeline interprets incoming information and updates the application's authoritative understanding of the game.

Examples include:

- inning progression
- score updates
- player substitutions
- runner movement
- play completion
- game status transitions

The resulting application state becomes the authoritative representation consumed by every downstream subsystem.

---

# 11. Current Domain Model

The application demonstrates a mature understanding of the baseball domain.

Rather than exposing provider-specific structures throughout the codebase, the application organizes information around meaningful baseball concepts.

Current concepts include:

- Game
- Team
- Player
- Play
- At Bat
- Pitch
- Inning
- Alert

This domain-centric organization improves readability while reducing dependence upon external provider representations.

It also establishes a strong foundation for future architectural capabilities.

The Broadcast Engine will consume these domain concepts rather than raw provider data.

---

# 12. Realtime Architecture

The application includes a realtime communication layer responsible for publishing live updates as games progress.

Inspection of the implementation reveals a dedicated realtime gateway responsible for distributing information to connected clients.

This realtime architecture provides an ideal integration point for the Broadcast Engine.

Rather than introducing a second publication mechanism, future broadcast artifacts can be published through the existing realtime infrastructure.

This approach preserves architectural consistency while minimizing additional complexity.

---

# 13. REST Services

In addition to realtime updates, the application exposes a comprehensive REST API.

Current REST capabilities include:

- game information
- player information
- standings
- leaders
- box scores
- alerts
- health monitoring

These services provide consumers with authoritative snapshots of current application state.

The coexistence of REST services and realtime publication demonstrates that the application already supports both request-driven and event-driven consumption models.

This architectural flexibility will prove valuable as future Broadcast Engine capabilities are introduced.

---

# 14. Architectural Observations

Several observations emerged during examination of the current implementation.

### Separation of Responsibilities

Infrastructure, domain processing, and presentation interfaces remain clearly separated.

This significantly reduces coupling throughout the application.

---

### Event-Oriented Thinking

Although the application is not explicitly implemented as an event-sourcing system, much of the architecture naturally follows an event-oriented processing model.

Incoming MLB events trigger updates to authoritative application state, which are subsequently distributed to interested consumers.

This existing architectural mindset aligns closely with the requirements of the Broadcast Engine.

---

### Extensibility

The modular organization of the application provides numerous extension points without requiring invasive modifications.

This characteristic substantially lowers the implementation risk associated with introducing the Broadcast Engine.

---

### Architectural Maturity

Perhaps the most significant conclusion reached during this assessment is that the current application already exhibits many characteristics of a mature platform.

Rather than serving as a thin wrapper around MLB services, the application performs meaningful interpretation, maintains authoritative knowledge, and exposes reusable capabilities through well-defined interfaces.

These characteristics position the project exceptionally well for the next stage of its architectural evolution.

---
