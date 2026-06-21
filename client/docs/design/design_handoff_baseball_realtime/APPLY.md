# How to land this sync (I can't push — read-only GitHub access)

This bundle is the **delta** to sync `client/docs/design/design_handoff_baseball_realtime/` in
`bitslinger21/baseball-realtime` up to the official design docs as of **Jun 21, 2026**. The rest of
that directory is already in sync; this adds **F-007 (Scout mode)** and the **status reconciliation**.

## What goes where (target: `client/docs/design/design_handoff_baseball_realtime/`)
```
PROMPT_F007_scout_mode.md            ← new (top-level, alongside the other PROMPT_*)
STATUS_RECONCILIATION.md             ← new (Jun-21 corrected statuses + apply steps)
scout_mode/                          ← new subfolder (mirrors position_model/)
  README.md
  Game Scout Mode.html
  holistic/shared.jsx
  holistic/game-v2.jsx
  holistic/game-scout.jsx
```
Plus these **edits** to existing files (from `STATUS_RECONCILIATION.md`):
- `bug-list.md` — BUG-008 → FIXED; BUG-011 → DONE (lean tab); renumber the duplicate `BUG-010`
  (Stats-tab HR note) to `BUG-012`.
- `README.md` / `MIGRATION.md` — mark PR 6.6 DONE & verified, F-003 DONE, add F-007 (designed/pending).
- (design-side `future.md` lives in the design repo, not here — move F-007 to active there when it ships.)

---

## Option A — let Claude Code make the branch + PR (recommended; it has write access)

1. Download this bundle and unzip it **into the repo working tree** so the files sit at
   `client/docs/design/design_handoff_baseball_realtime/` (create the `scout_mode/` subfolder; drop
   `PROMPT_F007_scout_mode.md` + `STATUS_RECONCILIATION.md` at the top of that dir).
2. In a Claude Code session on the repo, paste:

> Sync the design handoff. The new/added files are already staged in
> `client/docs/design/design_handoff_baseball_realtime/` (`PROMPT_F007_scout_mode.md`,
> `STATUS_RECONCILIATION.md`, and the `scout_mode/` subfolder). Now apply the corrections in
> `STATUS_RECONCILIATION.md` to `bug-list.md`, `README.md`, and `MIGRATION.md` in that same dir:
> mark **BUG-008 FIXED**, **F-003 DONE**, **PR 6.6 + the BUG-011 lean Pitching tab DONE & verified**,
> renumber the duplicate **BUG-010** (Stats-tab HR note) to **BUG-012**, and record **F-007 (Scout mode)
> as designed/pending**. Do it on a branch `design/handoff-sync-jun21` off `main`, commit with a clear
> message, push, and open a PR against `main` titled
> **"Design handoff sync — F-007 Scout mode + Jun-21 status reconciliation"**. List the added files and
> the status edits in the PR body. Touch only `client/docs/design/design_handoff_baseball_realtime/`.

---

## Option B — do it yourself with git/gh

```bash
# from the repo root, on an up-to-date main
git checkout -b design/handoff-sync-jun21

# copy this bundle's files into the handoff dir
DEST=client/docs/design/design_handoff_baseball_realtime
cp PROMPT_F007_scout_mode.md "$DEST"/
cp STATUS_RECONCILIATION.md   "$DEST"/
mkdir -p "$DEST"/scout_mode
cp -R scout_mode/* "$DEST"/scout_mode/

# (manually apply the bug-list / README / MIGRATION edits per STATUS_RECONCILIATION.md)

git add "$DEST"
git commit -m "Design handoff sync — F-007 Scout mode + Jun-21 status reconciliation"
git push -u origin design/handoff-sync-jun21

# open the PR (GitHub CLI), or use the web UI link git prints
gh pr create --base main --head design/handoff-sync-jun21 \
  --title "Design handoff sync — F-007 Scout mode + Jun-21 status reconciliation" \
  --body "Adds F-007 Scout mode (PROMPT + scout_mode/ prototype) and the Jun-21 status reconciliation (BUG-008 fixed, F-003 done, PR 6.6/BUG-011 done, BUG-010 renumbered to BUG-012, F-007 designed/pending)."
```

Either way the result is one PR into `main` touching only the handoff directory.
