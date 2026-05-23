# U2 Code Generation Plan — Team Branding Unification

**Branch**: `unit/2-branding-unification`  
**Wave**: 1  
**Packages**: `api/`

---

## Unit Context

**Stories implemented**: FR-ARCH-2 (branding via TeamsMetaService), FR-ARCH-5 (startup resilience)

**Key files to modify**:
- `api/src/poller/poller.service.ts`
- `api/src/teams/teams-meta.service.ts`
- `api/src/poller/poller.module.ts` *(verify — TeamsMetaModule already imported)*

**Note**: `@nestjs/schedule` is not installed. Daily refresh uses `setTimeout`-based scheduling to avoid adding a new package dependency.

---

## Generation Steps

- [ ] **Step 1 — Create branch**  
  `git checkout -b unit/2-branding-unification`

- [ ] **Step 2 — Inject `TeamsMetaService` into `PollerService`**  
  In `poller.service.ts`:
  - Add import: `import { TeamsMetaService } from '../teams/teams-meta.service';`
  - Add to constructor: `private readonly teamsMeta: TeamsMetaService`

- [ ] **Step 3 — Replace `getBrandingForTeam()` with `getBrandingForAbbr()`**  
  In `poller.service.ts`:
  - Rename private method from `getBrandingForTeam(teamId: number | undefined)` to `getBrandingForAbbr(abbr: string | undefined)`
  - Method body: call `this.teamsMeta.getByAbbr(abbr)` and return `{ primaryColor: meta.primaryColorHex ?? '', logoUrl: meta.logoUrl ?? '' }` or `undefined` if not found
  - Update call sites in `fetchGameMeta()`: replace `this.getBrandingForTeam(homeTeamId)` with `this.getBrandingForAbbr(homeAbbr)` and same for away
  - Update call sites in `fetchLatest()`: same substitution

- [ ] **Step 4 — Remove `TEAM_BRANDING_BY_ID`**  
  Delete the `TEAM_BRANDING_BY_ID` constant (bottom of `poller.service.ts`, ~line 1017–1038)

- [ ] **Step 5 — Add startup resilience to `TeamsMetaService`**  
  In `teams-meta.service.ts`:
  - Add private timers: `private retryTimer: NodeJS.Timeout | null = null;`
  - Wrap `onModuleInit()` body in try-catch: on error, log warning and schedule 60s retry via `setTimeout`
  - Add `private async retryInit()` that retries refresh and reschedules on failure
  - After successful load, call `this.scheduleDailyRefresh()`

- [ ] **Step 6 — Add daily 6am ET refresh to `TeamsMetaService`**  
  Add private methods:
  - `scheduleDailyRefresh()`: compute ms until next 6am ET, set `this.dailyTimer` to fire refresh then reschedule
  - `msUntilNextSixAmEt()`: compute ms from now until next 6:00am America/New_York

- [ ] **Step 7 — TypeScript check**  
  Run `cd api && npx tsc --noEmit`. Resolve any type errors.

- [ ] **Step 8 — SDK spec check**  
  Run `cd api && yarn spec:check`. U2 makes no API surface changes; expected: no diff.

- [ ] **Step 9 — Smoke test**  
  Start the dev server. Verify:
  - Server starts cleanly (TeamsMetaService loads 30 teams from ESPN)
  - Live game feed carries `homePrimaryColor` / `homeLogoUrl` branding fields for all teams
  - No reference to `TEAM_BRANDING_BY_ID` remains in codebase

- [ ] **Step 10 — Commit**

---

## Story Traceability

| Story | Step(s) |
|---|---|
| FR-ARCH-2 Live branding via TeamsMetaService | Steps 2, 3, 4 |
| FR-ARCH-5 Startup resilience | Steps 5, 6 |
