# Remove the old alerts system (Oct 21, 2026) · rev 1

> Version stamp: **rev 1, Oct 21, 2026.** If your copy has no stamp, it's stale.

**Ungated. No new API. No new design.** This is a deletion. The new alerts system (built Oct 9, @ed1a8ae) is the
only alerts system the design has. The older one was never part of the alerts design and should go.

## What stays (the spec — do not touch)

- Server: `api/src/alerts/alert-detect.ts` + `alert-feed.service.ts`. The four trigger families: no-hitter from the 7th,
  cycle watch, 3 HR, 15 K, plus milestones about to happen, and the second alert when a story ends.
- Client: `components/alerts/` (`AlertsProvider`, `AlertsBell` in `BrandHeader`, `AlertToast` with countdown + Later),
  plus the tray behind the bell.
- Surface rule: **header bell + tray ONLY**, with a pop-up for big moments. No other alert surface exists.

## What goes

1. **`alerts.service.ts`** (the older service: cycle-watch / score-change / lead-change).
2. **`AlertHistoryDrawer`** on `GamePage`: the component, its trigger button/state in `GamePage`, and its styles.
3. Anything that only exists to feed those two: routes/endpoints, socket events, hooks, context, types, store slices,
   tests, mocks, and constants. Find them by following imports from 1 and 2.

## Step 1: audit first (read-only), then report

Before deleting anything, list:

- every file that imports either item, and every endpoint/event the old service emits, along with every consumer of those;
- anything **shared** between old and new: types, the cycle-watch logic, socket channels, storage keys. Shared code
  must stay and be re-homed under the new system; don't delete the new system's dependency;
- whether the old **cycle-watch** detector duplicates the new one. Expected: yes, the new `alert-detect.ts` covers the
  cycle. If the new one *imports* the old one, move the logic into `alert-detect.ts` first;
- any persisted data (localStorage keys, DB tables/collections) owned only by the old system.

If the audit finds anything the new system depends on, stop and report before deleting.

## Step 2: delete

Remove everything in "What goes". On `GamePage`, remove the drawer and its trigger cleanly. **No layout hole**: whatever
sat next to the trigger closes up. The game page's header keeps its one-header, one-return rule.

**Score-change and lead-change alerts are dropped, not migrated.** That's a design decision: the alerts spec is history
in progress + milestones only. A routine score change is not an alert, and the live game view already shows the score.

Persisted data: delete old-only localStorage keys on load (one-time cleanup) and drop old-only server storage via the
normal migration path.

## Acceptance

- `grep -ri "alerts.service\|AlertHistoryDrawer\|scoreChange\|leadChange"` (plus whatever names the audit turned up)
  returns zero hits in `api/` and `client/`, apart from this doc.
- The build and type-check pass; tests pass, with the old system's tests removed rather than skipped.
- The game page has no alert drawer or trigger, and no gap where it was.
- New alerts still work end to end: the toast arrives, counts down, lands in the tray, and the bell count goes up by one
  pulse afterwards. Cycle watch still fires (check a replayed cycle game if one is available).
- No duplicate alerts: the same cycle event produces one alert, not two.

## Report back

The audit list from step 1, what was deleted, anything kept because it was shared (and where it now lives), and the
commit sha.
