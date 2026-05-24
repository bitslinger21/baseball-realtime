# Plan G Execution Plan — At-Bat Card System

## Detailed Analysis Summary

### Change Impact Assessment

| Area | Impact | Description |
|---|---|---|
| User-facing | YES | GamePage feed completely redesigned — pitch rows replaced with at-bat card blocks |
| Structural | YES | New AtBatCard component tree; GamePage feed state restructured |
| Data model | YES | PlayUpdateWire gains 4 new fields; SDK republish required |
| API | YES | WebSocket payload changes; SDK version bump |
| NFR | NO | No new performance, security, or scalability concerns |

### Component Relationships

| Component | Change Type | Reason |
|---|---|---|
| `api/src/poller/poller.service.ts` | Minor | Extract pX, pZ, szTop, szBottom from framePitch.pitchData |
| `api/src/realtime/realtime.types.ts` | Minor | Add 4 fields to PlayUpdateWire |
| `client/src/pages/GamePage.tsx` | Major | Feed restructure — at-bat block state management |
| `client/src/components/AtBatCard/` | New | Zone diagram + batter info + pitch log |
| SDK (baseball-realtime-client) | Minor | Version bump, new fields published |

### Risk Assessment

- **Risk Level**: Medium
- **Rollback Complexity**: Moderate — SDK publish is the only external side-effect; all changes are local
- **Testing Complexity**: Moderate — zone coordinate rendering + real-time accumulation logic

---

## Workflow Visualization

```mermaid
flowchart TD
    Start(["Plan G Request"])

    subgraph INCEPTION["🔵 INCEPTION PHASE"]
        WD["Workspace Detection\nCOMPLETED"]
        RA["Requirements Analysis\nCOMPLETED"]
        US["User Stories\nSKIP"]
        WP["Workflow Planning\nCOMPLETED"]
        AD["Application Design\nEXECUTE"]
        UG["Units Generation\nEXECUTE"]
    end

    subgraph CONSTRUCTION["🟢 CONSTRUCTION PHASE"]
        FD_U25["Functional Design U25\nSKIP"]
        FD_U26["Functional Design U26\nEXECUTE"]
        NFR["NFR Requirements\nSKIP"]
        NFRD["NFR Design\nSKIP"]
        ID["Infrastructure Design\nSKIP"]
        CG["Code Generation\nEXECUTE"]
        BT["Build and Test\nEXECUTE"]
    end

    subgraph OPERATIONS["🟡 OPERATIONS PHASE"]
        OPS["Operations\nPLACEHOLDER"]
    end

    Start --> WD --> RA --> WP --> AD --> UG
    UG --> FD_U25
    UG --> FD_U26
    FD_U26 --> CG
    FD_U25 --> CG
    CG --> BT --> OPS --> End(["Complete"])

    style WD fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style RA fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style WP fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style AD fill:#FFA726,stroke:#E65100,stroke-width:3px,stroke-dasharray: 5 5,color:#000
    style UG fill:#FFA726,stroke:#E65100,stroke-width:3px,stroke-dasharray: 5 5,color:#000
    style FD_U26 fill:#FFA726,stroke:#E65100,stroke-width:3px,stroke-dasharray: 5 5,color:#000
    style FD_U25 fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style US fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFR fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFRD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style ID fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style CG fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style BT fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style OPS fill:#FFF59D,stroke:#F57F17,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style Start fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000
    style End fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000
    style INCEPTION fill:#BBDEFB,stroke:#1565C0,stroke-width:3px,color:#000
    style CONSTRUCTION fill:#C8E6C9,stroke:#2E7D32,stroke-width:3px,color:#000
    style OPERATIONS fill:#FFF59D,stroke:#F57F17,stroke-width:3px,color:#000

    linkStyle default stroke:#333,stroke-width:2px
```

---

## Phases to Execute

### 🔵 INCEPTION PHASE

| Stage | Decision | Rationale |
|---|---|---|
| Workspace Detection | COMPLETED | Brownfield detected, prior state loaded |
| Reverse Engineering | COMPLETED | Prior artifacts current, no rerun needed |
| Requirements Analysis | COMPLETED | plan-g-requirements.md |
| User Stories | SKIP | Single developer, no acceptance criteria complexity, clear feature scope |
| Workflow Planning | COMPLETED (this doc) | |
| Application Design | **EXECUTE** | New AtBatCard component tree with sub-components; component boundaries and data flow need definition before code |
| Units Generation | **EXECUTE** | Two natural units with hard dependency: U25 (API + SDK) must complete before U26 (client) can consume new fields |

### 🟢 CONSTRUCTION PHASE

| Stage | Decision | Rationale |
|---|---|---|
| Functional Design — U25 | SKIP | Simple field extraction additions to existing poller; no new business logic |
| Functional Design — U26 | **EXECUTE** | Zone coordinate math, at-bat boundary detection, expand/collapse state — worth designing before coding |
| NFR Requirements | SKIP | No new NFR requirements beyond existing |
| NFR Design | SKIP | Same reason |
| Infrastructure Design | SKIP | No infrastructure changes |
| Code Generation | **EXECUTE** (both units) | Always runs |
| Build and Test | **EXECUTE** | Always runs |

---

## Package Change Sequence

```
Wave 1 — U25: API + SDK
  api/src/poller/poller.service.ts      (extract new pitch fields)
  api/src/realtime/realtime.types.ts    (add to PlayUpdateWire)
  → spec:check → spec:gen → client:build → client:publish
  → client: yarn add baseball-realtime-client@latest

Wave 2 — U26: Client UI  (depends on Wave 1 SDK)
  client/src/components/AtBatCard/      (new component tree)
  client/src/pages/GamePage.tsx         (feed restructure)
```

---

## Estimated Timeline

- **Total units**: 2 (U25, U26)
- **U25 — API enrichment**: Small (2–3 hrs)
- **U26 — AtBatCard + feed**: Large (6–9 hrs)
- **Total**: Medium-Large (8–12 hrs)

---

## Success Criteria

- `PlayUpdateWire` carries `pitchX`, `pitchZ`, `strikeZoneTop`, `strikeZoneBottom` on every pitch event
- AtBatCard renders zone diagram with color-coded numbered dots at correct coordinates
- Zone height scales dynamically from `strikeZoneTop`/`strikeZoneBottom`
- GamePage feed shows batter name rows with live at-bat card below; past at-bats collapse/expand on click
- No regression to box score, alerts, score header, or replay functionality
