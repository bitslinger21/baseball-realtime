# Unit of Work Plan

## Context

10 units are already defined in `execution-plan.md` across 5 waves. This plan formalizes them into the three required artifacts: `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`.

**Units in scope**:
| Unit | Name | Wave |
|---|---|---|
| U1 | Production Code Cleanup | 1 |
| U2 | Team Branding Unification | 1 |
| U3 | API Response Caching | 1 |
| U4 | BullMQ Queue Separation | 1 |
| U5 | GameDto Type Safety + WebSocket URL Config | 2 |
| U6 | Confirmed High-Priority Bug Fixes | 3 |
| U7 | Standings Page | 4 |
| U8 | Player "Today" Performance | 4 |
| U9 | Player Splits Tab | 4 |
| U10 | Alert History Panel | 5 |

---

## Plan Checkboxes

- [x] Collect user answers to all questions below
- [x] Resolve any ambiguities from answers
- [x] Generate `unit-of-work.md`
- [x] Generate `unit-of-work-dependency.md`
- [x] Generate `unit-of-work-story-map.md`

---

## Questions

> **Instructions**: Fill in the `[Answer]:` lines below.

---

### Q1 — Unit 6 disposition

The execution plan notes that U6 ("Confirmed High-Priority Bug Fixes") may be entirely absorbed by U1, since bugs #2 and #3 (console.log removals) are already in U1's scope.

Option A: **Merge U6 into U1** — Remove U6 as a separate unit. U1 covers all HIGH bugs. U6 becomes a checkbox inside U1's completion criteria rather than its own branch.

Option B: **Keep U6 as a verification unit** — Retain U6 as a dedicated pass after U1 is complete. A short unit that confirms all HIGH bugs are resolved and nothing was missed. Still maps to its own branch even if the branch is small.

[Answer]: B

---

### Q2 — Branch naming convention

What naming pattern should the unit branches use?

Option A: `unit/1-code-cleanup`, `unit/2-branding-unification`, etc. — prefixed by unit number.

Option B: `feature/code-cleanup`, `feature/branding-unification`, etc. — feature-style, no number.

Option C: `u1-code-cleanup`, `u2-branding-unification`, etc. — short prefix.

[Answer]: A

---

### Q3 — Within-wave parallelism

Units within the same wave have no code dependencies on each other. During implementation, should they be treated as:

Option A: **Strictly sequential** — one branch merged before the next opens. Simpler history, easier to review.

Option B: **Parallel-capable** — multiple unit branches can be open simultaneously if you choose to work on them at the same time. Branches each base off `main` (or the prior merged unit).

[Answer]: B

---

### Q4 — PR merge strategy

When merging unit branches back to `main`, which strategy?

Option A: **Squash merge** — each unit lands as a single commit on `main`. Clean history, loses intra-unit commit granularity.

Option B: **Merge commit** — preserves all intra-unit commits. More granular history.

Option C: **Rebase** — linear history, no merge commits.

[Answer]: B
