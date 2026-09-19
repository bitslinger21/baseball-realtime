Scorebook — What’s Hot Right Now Backend

Objective

Implement the backend foundation for the new Scorebook Home-page feature:

What’s Hot Right Now

The feature surfaces a small, ranked collection of significant MLB events that are happening now or happened recently.

This is not simply a live-game feature.

Hot events can originate from:

* live game state
* completed games
* player/team milestones
* transactions
* roster changes
* league events
* other future MLB data sources

Examples:

* Hunter Brown has a no-hitter through six innings.
* Kyle Tucker needs a triple to complete the cycle.
* Bases are loaded in the bottom of the ninth of a tied game.
* Hunter Brown has completed a no-hitter.
* Yordan Alvarez has been traded.
* A player has been placed on the injured list.

The architecture should support adding new event detectors/sources without redesigning the feature.

⸻

Core Concept

Separate:

1. Observation
2. Situation detection
3. Significance/ranking
4. Presentation

Do not make the Home-page API responsible for examining raw MLB data and figuring out what is interesting.

Conceptually:

MLB / external data
        │
        ▼
Situation Detection
        │
        ▼
Structured Baseball Event
        │
        ▼
Interest / Ranking
        │
        ▼
Hot Events
        │
        ├── Home / What's Hot
        │
        └── Baseball IQ

The structured event is the important abstraction.

⸻

Structured Event Model

Create a domain model representing something noteworthy that Scorebook has detected.

Exact implementation details should follow existing Scorebook conventions, but conceptually an event needs information similar to:

id
type
status
headline
description
occurredAt
detectedAt
updatedAt
expiresAt
importance
player(s)
team(s)
gamePk              optional
gameState           optional
source
sourceData
baseballIQContext   optional

Do not treat this as the required literal schema. Adapt it to the existing application architecture.

The important requirement is that downstream consumers receive a structured event rather than having to infer meaning from generated prose.

⸻

Event Types

Start with an extensible event-type model.

Initial live-game candidates might include:

NO_HIT_BID
PERFECT_GAME_BID
CYCLE_BID
MULTI_HOME_RUN_GAME
HIGH_STRIKEOUT_GAME
LATE_CLOSE_GAME
LATE_COMEBACK
WALK_OFF_OPPORTUNITY
RECORD_OR_MILESTONE

Non-game event types might eventually include:

TRADE
ROSTER_MOVE
INJURED_LIST
SIGNING
AWARD
RECORD

These are starting examples, not a closed enumeration of everything Scorebook may eventually detect.

⸻

Situation Detection

Situation detectors consume baseball data and emit structured candidate events.

Example:

Raw game state:

Hunter Brown
6.0 IP
0 H
2 BB
9 K
84 pitches

Detector recognizes:

type: NO_HIT_BID
player: Hunter Brown
inningsCompleted: 6
hitsAllowed: 0

Similarly:

Kyle Tucker
Single
Home Run
Double
Walk

can produce:

type: CYCLE_BID
missingHitType: TRIPLE

Detection should be deterministic wherever possible.

Do not use an LLM to determine basic baseball facts that can be calculated directly from structured MLB data.

⸻

Interest / Ranking

Detection does not automatically mean an event appears on Home.

A candidate event must be evaluated for significance.

Conceptually:

candidate event
      ↓
interest evaluation
      ↓
below threshold → ignored
above threshold → eligible for What's Hot

The ranking model should support factors such as:

* rarity
* game importance
* inning/game progression
* proximity to accomplishment
* historical significance
* recency
* whether the event is actively developing
* whether an event has just completed

Example:

A no-hitter through three innings should probably not qualify.

A no-hitter through six may qualify.

A perfect game entering the ninth should rank extremely highly.

Do not hardwire the Home page to display exactly N events.

Return only events that actually meet the significance threshold.

⸻

Maximum Items

The Home page displays:

* ideal: roughly 1–3 events
* maximum: 5
* valid: zero events

Backend should return events ordered by significance.

The API should never manufacture filler events simply because fewer than five qualify.

⸻

Event Lifecycle

Events need identity and state.

For example:

NO_HIT_BID
Brown through 6
      ↓
same event
Brown through 7
      ↓
same event
Brown through 8
      ↓
same event
NO_HITTER_COMPLETED
      ↓
recently completed
      ↓
expired

Avoid creating a completely unrelated event every inning.

The system should be able to update/evolve an existing situation.

Think in terms of:

DETECTED
ACTIVE
COMPLETED
EXPIRED

Exact names may differ.

Completed significant events should remain eligible for What’s Hot for some period rather than disappearing immediately when the game ends.

Ranking should decay with age.

⸻

No Dependency on Live Games

This is an explicit requirement.

Do NOT implement logic equivalent to:

if no live games:
    what's hot = empty

What’s Hot represents significant MLB activity, not live game activity.

For example:

Yordan Alvarez has been traded.

may be the top Hot item at noon when no games are being played.

Conversely, ten games may be underway and zero situations may meet the Hot threshold.

The two concepts are independent.

⸻

Empty State

If no events meet the threshold, return an empty collection.

The UI will display:

Nothing cooking yet.

Do not return a synthetic empty-state event from the backend.

⸻

Baseball IQ Integration

Hot events and Baseball IQ should be able to consume the same structured situation/event model.

However, Baseball IQ context is optional.

Not every Hot event needs contextual Baseball IQ content.

For example:

NO_HIT_BID
Hunter Brown
6 innings
0 hits

may have useful contextual Baseball IQ content.

A transaction such as:

Yordan Alvarez has been traded.

may simply be presented as an informational Hot item with no Baseball IQ context.

Do not manufacture Baseball IQ content merely because an event qualifies for What’s Hot.

Frontend Contract

The frontend must be able to determine unambiguously whether Baseball IQ contextual content is available for a Hot event.

The UI uses this information to choose the item’s bullet:

Baseball IQ context available
        ↓
◇ red Scorebook diamond

versus:

No Baseball IQ context
        ↓
• standard bullet

Do not require the frontend to infer this from event type, headline, description, or other content.

This could be represented by the presence of baseballIQContext, an explicit capability flag, or another mechanism consistent with existing Scorebook API conventions.

The contract simply needs to be explicit.

Baseball IQ Context

When available, Baseball IQ should receive structured context.

Example:

type: NO_HIT_BID
player: Hunter Brown
team: HOU
opponent: ATL
inningsCompleted: 6
hitsAllowed: 0
walks: 2
strikeouts: 9
pitchCount: 84
gamePk: ...

This context can support questions such as:

* When was the Astros’ last no-hitter?
* Has Brown ever thrown a complete-game shutout?
* How many no-hitters have occurred this season?
* How often does a no-hitter through six become a completed no-hitter?

Baseball IQ should not parse the What’s Hot display headline to reconstruct this information.

The structured event is the contract.

What’s Hot does not need to implement or expose Baseball IQ’s application-wide Ask Me Anything behavior.

⸻

Presentation Text

Keep detection logic separate from presentation text.

For example, the detector should establish:

NO_HIT_BID
inningsCompleted = 6

rather than defining the baseball situation solely as:

"Hunter Brown has a no-hitter going into the seventh inning."

The latter is presentation.

This distinction allows:

* alternate UI treatments
* Baseball IQ reuse
* event updates
* localization
* richer notifications later

The API can still return display-ready headline/description fields for the frontend.

⸻

Game Context

Events associated with games should provide enough structured game information for the Home UI to render its compact game context.

Conceptually:

game:
    gamePk
    awayTeam
    awayScore
    homeTeam
    homeScore
    inning
    inningHalf
    gameStatus

Use existing Scorebook game models/DTOs rather than duplicating game-state representations unnecessarily.

The frontend will use the game identifier to navigate from the compact game context to the existing Game page.

Non-game Hot events do not require game context.

⸻

API

Expose a Home/What’s Hot endpoint using existing Scorebook API conventions.

Conceptually:

GET /home/hot

Response:

events: [
    {
        id,
        type,
        status,
        headline,
        description,
        importance,
        occurredAt,
        game,                   // optional
        players,
        teams,
        baseballIQContext       // optional
    }
]

Maximum five results, ordered most significant first.

Use existing Scorebook DTO/API conventions rather than adopting this example literally.

⸻

Initial Implementation Scope

Do not attempt to solve every possible MLB event in the first implementation.

Build the extensible architecture and prove it with a small set of deterministic live-game detectors.

Recommended initial detectors:

1. No-hit bid
2. Perfect-game bid
3. Cycle bid
4. Three-home-run game / possible fourth HR
5. High-leverage late-game situation

Then add non-game event sources such as transactions separately once the core event pipeline works.

The important deliverable is not the number of detectors.

It is proving:

data
  → detect situation
  → create/update structured event
  → score significance
  → rank
  → expose via API
  → optionally expose Baseball IQ context

⸻

Architectural Principle

What’s Hot and Baseball IQ should not become two unrelated systems.

The long-term model is:

Scorebook understands the current baseball world as structured situations/events.

What’s Hot asks:

Which of those situations are important enough to show the user?

Baseball IQ asks:

For the situations where additional context is available, what can we tell the user about them?

A Hot event does not require Baseball IQ content.

Build the event model with both consumers in mind without unnecessarily coupling them.

