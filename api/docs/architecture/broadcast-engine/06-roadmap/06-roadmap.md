---
title: Roadmap
document: 06
version: 0.1.0
status: Draft
author: Pete DeLine
last_updated: 2026-06-30
related:
  - 02-product-vision.md
  - 04-architecture-design.md
  - 05-mvp-prd.md
  - 07-ai-context.md
---

# Roadmap

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2026-06-30 | Pete DeLine | Initial draft |

---

# 1. Purpose

This document describes the planned evolution of the Broadcast Engine beyond the initial MVP.

The MVP, defined in document 05, establishes the architectural foundation. It proves that the six-component architecture can receive authoritative baseball events, build appropriate context, generate play-by-play narration through an AI provider, and deliver that output to connected clients without disrupting the existing application.

The Roadmap describes what the Broadcast Engine becomes after that foundation is validated.

This document intentionally avoids committing to delivery timelines. Baseball is seasonal. AI capabilities are advancing rapidly. Priorities will shift as the system matures and real-world usage reveals what matters most to users. The Roadmap is therefore a statement of direction and sequencing rather than a delivery schedule.

Every phase described here should be understood as dependent on the successful completion of all prior phases. No phase should be started before its predecessors have been validated in a live environment.

---

# 2. Roadmap Philosophy

Two principles govern the sequencing of this Roadmap.

**Foundation before features.**

Each phase produces capabilities that subsequent phases depend upon. Voice synthesis, for example, depends on text narration quality that cannot be validated until the MVP has operated in production. Adding voice before narration quality is established would make the voice experience worse, not better, and would make quality problems harder to diagnose.

**Depth before breadth.**

It is more valuable to make play-by-play narration genuinely excellent than to add five mediocre capabilities in parallel. Each phase should be considered complete only when the capabilities it introduces have been validated against a quality threshold, not merely when the code is merged.

---

# 3. Phase Overview

The Broadcast Engine evolves through the following phases.

| Phase | Name | Focus |
|-------|------|-------|
| 1 | Foundation | MVP — play-by-play text narration |
| 2 | Narration Quality | Improve the core broadcast experience |
| 3 | Context Enrichment | Richer baseball knowledge for better narration |
| 4 | Ensemble Broadcast | Multiple announcer roles working together |
| 5 | Voice | Audio delivery of broadcast narration |
| 6 | Statcast Integration | Pitch and batted-ball data enrichment |
| 7 | Personalization | User-configurable broadcast experience |
| 8 | Extended Experiences | Recaps, notifications, and conversational features |

Phase 1 is the MVP. This document describes Phases 2 through 8.

---

# 4. Phase 2 — Narration Quality

## Objective

The MVP delivers functioning narration. Phase 2 makes that narration meaningfully better and makes the system easier to iterate on.

## Motivation

The first version of any AI-generated output is rarely excellent. Prompts need refinement. Context needs tuning. The system needs tooling that makes iteration fast and measurable. Phase 2 addresses these needs before expanding scope.

## Capabilities

**Streaming narration.**

AI providers that support token-level streaming can begin delivering narration as it is generated rather than waiting for the complete response. This reduces perceived latency for the end user. The Output Router already anticipates streaming as a future optimization; Phase 2 is when that optimization is implemented.

**Prompt versioning.**

Every prompt template used to generate narration should carry an explicit version identifier. Narration logs should record which prompt version produced each response. This allows quality comparisons across prompt iterations and makes regressions traceable. Without versioning, it is impossible to know whether a change in narration quality came from a prompt change, a model change, or a data change.

**Individual pitch narration policy.**

The MVP leaves individual pitch narration as an open question. Phase 2 defines and implements a precise policy: which pitch situations within an at-bat justify narration, which do not, and how that policy is configured without requiring code changes. The goal is a broadcast that feels like a natural human pace, not one that narrates every ball and strike mechanically.

**Client display experience.**

The MVP delivers narration to the realtime socket and defers the client display treatment. Phase 2 defines and implements that treatment: where narration appears, how it scrolls or fades, and how it coexists with the existing live game view. This is a client-side implementation that consumes the MVP's output contract.

**Cost and token observability dashboard.**

Token usage logging exists in the MVP but requires manual log inspection. Phase 2 produces a lightweight operational view of token consumption per game, per event type, and per AI provider. This is essential before expanding the system to additional phases, each of which increases AI usage.

## Acceptance

Phase 2 is complete when narration quality has been evaluated across a meaningful sample of live games and found to meet a subjectively acceptable bar, when prompt changes can be deployed and measured without code releases, and when the client display experience has been reviewed and approved.

---

# 5. Phase 3 — Context Enrichment

## Objective

Make narration more knowledgeable by providing the Broadcast Engine with richer information about the players, situations, and storylines it is describing.

## Motivation

The MVP narrates facts: a home run was hit, a strikeout occurred, an inning ended. Phase 3 narration understands *why these facts matter*. A home run hit by a batter with three strikeouts earlier in the game carries a different story than a home run hit by a player in the middle of a hot streak. Phase 3 gives the Broadcast Engine enough context to communicate that difference.

## Capabilities

**Season statistics enrichment.**

The Baseball application already exposes player season statistics through its REST API. Phase 3 routes relevant statistics into the Broadcast Context so the Narrator can reference them naturally. A batter's season average, a pitcher's ERA, and a player's home run count become available to the narration pipeline without requiring new data sources.

**Batter versus pitcher history.**

The application already tracks batter-versus-pitcher matchup splits. Phase 3 makes this history available to the Context Builder so that when a known matchup occurs, the narration can reference the historical dynamic between the two players.

**Streak and milestone detection.**

The Broadcast Director gains awareness of active streaks and approaching milestones. A batter in the middle of a hitting streak, a pitcher approaching a complete game, or a player closing in on a career home run milestone should influence narration emphasis without requiring manual configuration.

**Momentum tracking.**

The Memory Manager expands to track game momentum: which team has scored in recent innings, whether a pitcher appears to be tiring, whether a batter has worked deep into counts across multiple at-bats. This information enriches the Broadcast Context without duplicating game state — it is presentation knowledge, not baseball knowledge.

**Enhanced game start narration.**

The game introduction narration expands to include meaningful pre-game context: the teams' recent records, key injuries or lineup changes, and the significance of the matchup within the season. This requires access to standings and recent game results already available through the application.

## Acceptance

Phase 3 is complete when narration demonstrably references player statistics, matchup history, and situational context that it could not access in Phase 2, and when those references are factually accurate and narratively appropriate.

---

# 6. Phase 4 — Ensemble Broadcast

## Objective

Introduce additional announcer roles that collaborate with the play-by-play narrator to produce a richer, more natural broadcast experience.

## Motivation

Real baseball broadcasts include more than one voice. The play-by-play announcer describes what is happening. The color commentator explains why it matters. Together they produce a conversation that is more engaging than either role alone. Phase 4 introduces that dynamic within the Broadcast Engine.

## Architecture Note

The Broadcast Director already anticipates multiple narrator roles. The component architecture supports narrator selection without requiring structural changes. Phase 4 is therefore an extension of existing capability rather than a redesign.

## Capabilities

**Color commentator role.**

The color commentator is a second narrator responsible for strategic and analytical context. It participates when the Broadcast Director identifies a moment suited to deeper explanation: a pitching change, a critical strikeout, an unusual defensive alignment, or a manager's decision that reversed the game's momentum.

The color commentator does not interrupt play-by-play narration. It speaks in gaps — between pitches during a long at-bat, after an inning concludes, or following a significant event that the play-by-play announcer has already described factually.

The color commentator draws from the enriched context established in Phase 3: matchup history, statistical tendencies, and momentum tracking all become analytical fodder for this role.

**Broadcast Director coordination.**

Phase 4 requires the Broadcast Director to coordinate two narrators whose outputs must not overlap or conflict. The Director becomes responsible for scheduling: which announcer speaks next, whether a color comment is appropriate given the current pace of the game, and how to handle rapid event sequences where commentary would feel out of place.

**Handoff patterns.**

Natural broadcast conversations involve handoffs: the play-by-play announcer finishes a description and the color commentator responds. Phase 4 defines those handoff patterns and ensures the Memory Manager tracks them so that the conversation feels coherent rather than two independent narrators speaking in parallel.

**Field reporter role (conditional).**

The field reporter provides environmental and situational context: mound visits, injury updates, weather delays, notable crowd moments, and lineup changes beyond pitching substitutions. This role is conditional because it requires data sources — confirmed injury reports, mound visit reasons, weather observations — that the application may not initially possess. The field reporter should be introduced only when grounded data is available. It must never invent facts.

## Acceptance

Phase 4 is complete when a live broadcast including both the play-by-play announcer and color commentator has been evaluated across a full game and found to produce a conversational dynamic that feels natural and additive rather than redundant or disjointed.

---

# 7. Phase 5 — Voice

## Objective

Deliver broadcast narration as audio through a voice synthesis layer built upon the existing text narration output.

## Motivation

Text narration is readable. Voice narration is listenable. A user following a game while doing something else — commuting, exercising, cooking — benefits significantly from audio delivery that does not require looking at a screen.

## Architecture Note

Document 04 defines voice as a consumer of broadcast output, not a producer of narration. That distinction is critical. Voice synthesis receives the structured narration payload and converts it to audio. It does not change how narration is generated, what events are narrated, or what the content of narration says. Separating these responsibilities means voice can be introduced without touching the narration pipeline.

## Capabilities

**Voice synthesis provider abstraction.**

Voice synthesis is introduced through a provider abstraction identical in philosophy to the AI provider abstraction already established for narration generation. A single interface supports multiple synthesis providers — cloud TTS services, specialized sports voice models, or future speech-native AI systems — without requiring changes to the narration pipeline.

**Audio delivery.**

Synthesized audio is delivered to clients through the existing realtime infrastructure, extended to support binary or streaming audio payloads alongside the existing text narration events. Clients that subscribe to audio receive it; clients that do not are unaffected.

**Voice selection.**

The MVP announcer has one voice. Phase 5 introduces voice selection: each announcer role may be configured with a distinct voice identity appropriate to its personality. The play-by-play announcer and color commentator should sound different.

**Playback controls.**

The client gains basic audio playback controls: play, pause, and volume. A narration queue ensures that audio events arriving in rapid succession are played in sequence rather than overlapping.

**Interruption policy.**

A significant event — a home run, a scoring play, an unexpected development — may warrant interrupting ongoing audio to deliver more important narration immediately. Phase 5 defines an interruption policy that balances continuity with timeliness.

## Acceptance

Phase 5 is complete when a connected client can follow an entire live game by listening to broadcast audio without reading text, when audio quality is subjectively acceptable, and when audio does not conflict with simultaneously delivered text narration.

---

# 8. Phase 6 — Statcast Integration

## Objective

Enrich narration with pitch-level and batted-ball data from Statcast to enable commentary that goes beyond what the standard game feed provides.

## Motivation

The difference between "ground ball to third" and "a 103 mph ground ball hit directly at the shift — Gardner read it perfectly" is the difference between reporting and storytelling. Statcast data is what makes the latter possible.

## Architecture Note

Statcast is an enrichment source. It is not authoritative game state. A pitch outcome does not change because Statcast is unavailable. Narration must degrade gracefully when Statcast data is absent rather than blocking or fabricating values. This distinction is established in Engineering Principle EP-003 and must be preserved throughout Phase 6.

## Capabilities

**Pitch data enrichment.**

When a pitch is narrated, the Broadcast Context may include velocity, pitch type, spin rate, and location relative to the strike zone. A 99 mph four-seam fastball at the top of the zone that ends a long at-bat with a swinging strikeout carries a richer story than the bare fact of the strikeout.

**Batted-ball enrichment.**

Exit velocity, launch angle, and projected distance are available for balls in play. A home run narrated with its exact distance and trajectory is substantially more vivid than one described only by its result. A softly hit ground ball with a low exit velocity that found a hole between fielders tells a different story than a line drive.

**Expected outcomes context.**

Expected batting average and expected slugging percentage allow the color commentator to note when a result was fortunate or unfortunate relative to the quality of contact. A well-struck ball caught at the warning track deserves acknowledgment as good contact despite its result.

**Defensive metrics.**

Catch probability and outs above average allow the field reporter and color commentator to recognize outstanding defensive plays with the same specificity they bring to offensive events. A diving catch with a four percent catch probability is a story worth telling.

**Graceful degradation.**

When Statcast data for a specific play is unavailable — latency, outage, or simply a play type that is not tracked — the Narrator falls back to the existing narration quality without Statcast enrichment. The absence of Statcast data must never cause narration to fail or be suppressed.

## Acceptance

Phase 6 is complete when narration for home runs, strikeouts, and significant defensive plays demonstrably incorporates Statcast data where available, falls back gracefully where it is not, and has been reviewed for factual accuracy across multiple games.

---

# 9. Phase 7 — Personalization

## Objective

Allow users to configure their broadcast experience without changing the underlying narration pipeline.

## Motivation

Baseball fans vary enormously in what they want from a broadcast. A casual fan checking in during the seventh inning wants a brief, accessible summary. A devoted fan who watches every pitch wants depth, statistics, and nuance. A fan who has been following a particular player all season wants storylines that center on that player's performance. A single narration style cannot serve all of these users equally well.

## Architecture Note

Engineering Principle EP-019 establishes that future personalization should be driven through configuration rather than hardcoded branching. Phase 7 implements that principle. The Broadcast Engine's core components are unchanged; what changes is the configuration they receive, which influences context selection, prompt construction, and narration strategy.

## Capabilities

**Narration verbosity.**

Users may select a verbosity level ranging from minimal (scoring plays and game-changing moments only) to comprehensive (every narrated event including individual pitches in significant situations). The Broadcast Director's event evaluation logic consults the active verbosity setting to decide whether a given event should be narrated.

**Statistical depth.**

Users may configure how much statistical context the Narrator references. A low setting produces narration grounded in the current game only. A high setting incorporates season statistics, career context, and matchup history. Statistical depth preference feeds into the Context Builder's assembly logic.

**Announcer style preference.**

The Prompt Builder supports multiple announcer personalities. Phase 7 exposes those personalities as user-selectable options. Examples might include an analytical style that emphasizes data, an enthusiastic style that elevates emotional moments, and a neutral style that prioritizes factual clarity.

**Team focus.**

Users may indicate a preferred team. When a game involves that team, narration emphasizes their players' performances and storylines more prominently than the opposition's. This is a presentation preference, not a change to game state ownership.

**Broadcast enabled toggle.**

Users may enable or disable broadcast narration entirely. This setting is respected at the Output Router level; the narration pipeline runs as usual, but output is not delivered to users who have disabled the feature.

**Configuration storage and delivery.**

User preferences are stored and delivered to the Broadcast Engine through a configuration model. For the MVP of personalization, server-side defaults are overridden per user. A configuration UI for end users is a prerequisite for this phase.

## Acceptance

Phase 7 is complete when two users watching the same live game with different preference configurations receive demonstrably different narration appropriate to those preferences, and when enabling or disabling broadcast narration takes effect without disrupting other application functionality.

---

# 10. Phase 8 — Extended Experiences

## Objective

Apply the Broadcast Engine's communication capabilities to experiences beyond live narration: game recaps, push notifications, and conversational access to broadcast knowledge.

## Motivation

The Broadcast Engine understands communication. That capability is not limited to live play-by-play. The same architectural foundation — a Context Builder that assembles baseball knowledge, a Narrator that communicates it, and an Output Router that delivers it — can serve a post-game recap, a push notification about a home run, or a user asking a question about the game they just watched.

## Architecture Note

Each capability described in this phase is a new consumer of Broadcast Engine output, not a redesign of the engine itself. The Output Router routes to additional destinations. The Narrator may receive new prompt templates appropriate to each use case. But the Broadcast Director, Context Builder, Memory Manager, and Prompt Builder architecture remains intact.

## Capabilities

**Game recaps.**

After a game concludes, the Broadcast Engine can produce a structured written summary of the game's most significant events, storylines, and outcomes. The Memory Manager's session record provides a complete history of what happened and what was communicated. The Narrator receives a recap-specific prompt and produces a coherent multi-paragraph summary.

Recaps are a fundamentally different output from live narration: they require a holistic view of the game rather than event-by-event communication. The Context Builder must support a recap mode that aggregates across the full session rather than focusing on the most recent event.

**Push notifications.**

High-significance events — home runs, lead changes, walk-off results, no-hitter progress — may be communicated to users not currently watching the application through push notifications. The notification content is generated by the Narrator using a concise, notification-appropriate prompt template.

Notifications are not a live feed. They are selective. The Broadcast Director's significance evaluation logic determines which events are notification-worthy, and that threshold is necessarily higher than the threshold for live narration.

**Conversational access.**

A future capability allows users to ask questions about a game in natural language and receive answers grounded in the Broadcast Engine's session memory and the application's game state.

Examples of user questions the system should eventually answer:

- What has happened since I last checked?
- Tell me about that at-bat in the sixth.
- How has the starting pitcher looked today?
- When did we take the lead?

This capability requires a conversational context model that extends the Memory Manager significantly. It also requires careful constraints: the system must answer only from authoritative game state and session memory. It must not speculate, invent, or infer facts beyond what it knows.

Conversational access is the most technically ambitious item in the Roadmap. It should not be attempted until the narration quality established in earlier phases is excellent and the Memory Manager's session record is sufficiently rich to support retrospective questions.

## Acceptance

Phase 8 capabilities are accepted individually as each is implemented. A game recap is accepted when it is found to accurately summarize a full game's key events in coherent prose. Push notifications are accepted when they fire correctly for high-significance events and do not fire incorrectly for routine plays. Conversational access is accepted when it correctly answers a defined set of test questions using only authoritative game state and session memory.

---

# 11. Cross-Phase Concerns

Several concerns span multiple phases and should be managed continuously rather than addressed in a single phase.

## Prompt Quality

Prompts will require ongoing refinement throughout every phase. The prompt versioning capability introduced in Phase 2 makes this refinement measurable and reversible. Prompt quality is never complete; it improves incrementally as more games are observed, more edge cases are encountered, and AI models evolve.

## Cost Management

Each phase increases AI usage. Additional announcer roles, richer context, voice synthesis, and conversational features all drive additional provider invocations. The token observability established in Phase 2 must be consulted before every phase expansion to ensure usage remains within acceptable operational bounds.

## AI Provider Evolution

Language models, voice synthesis providers, and AI services will continue evolving throughout the lifetime of this Roadmap. The provider abstraction established in the MVP ensures that the Broadcast Engine can adopt better models as they become available without architectural changes. Provider updates should be pursued proactively, not reactively.

## Documentation

Each phase introduces new capabilities that the architecture package should reflect. The Engineering Principles and Architecture documents should remain the definitive reference throughout the Roadmap. Significant architectural decisions made during implementation should be recorded as Architecture Decisions in document 04.

---

# 12. What the Roadmap Does Not Commit To

This Roadmap describes direction, not delivery.

It does not commit to delivery timelines for any phase.

It does not commit to specific AI providers, voice synthesis vendors, or third-party services for any capability.

It does not commit to every feature described within each phase being delivered simultaneously. Phases may be partially implemented, with remaining capabilities carried forward.

It does not foreclose capabilities not described here. Future phases may be added as the application evolves and user needs become clearer.

The Roadmap exists to communicate that the MVP is the beginning of a deliberate architectural journey, not a complete destination.

---

# Closing

The Broadcast Engine's long-term value is not in any single feature.

It is in the architectural foundation that makes each successive phase a natural extension of the last.

A user who follows a game through live text narration today should eventually be able to listen to that same game broadcast in audio, ask questions about what happened, receive a recap after the final out, and configure the entire experience to match how they want to follow baseball.

Every capability described in this Roadmap builds toward that experience from the same architectural foundation established in the MVP.

The next document, AI Context (document 07), provides implementation-specific guidance for engineers and AI-assisted development tools building the capabilities described throughout this package.

---
