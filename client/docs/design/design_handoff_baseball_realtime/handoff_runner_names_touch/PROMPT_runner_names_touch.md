# Runner names on the bases: touch + keyboard (Oct 21, 2026) · rev 1

> Version stamp: **rev 1, Oct 21, 2026.** If your copy has no stamp, it's stale.

**Ungated. No new API. Small.** The bases diamond in the play-state eyebrow (and anywhere else the shared `Bases` atom gets
`runners`) shows a card naming who's on base, but **only on mouse hover**. Touch users and keyboard users can't get it at all.

Design reference (read, don't copy): `holistic/shared.jsx` → `window.Bases`.

## Behaviour

| Input | Opens | Closes |
|---|---|---|
| Mouse | hover (unchanged) | leave (unchanged) |
| Touch / pen | **tap** the diamond | tap it again, tap **anywhere else**, or Esc |
| Keyboard | **Tab** to the diamond (focus shows the card); **Enter / Space** toggle it | Tab away, Esc |

- One target for the whole diamond, as now. Don't split it into three bases (each is ~6px at 26px).
- **Touch target ≥ 44 × 44px**: pad the invisible hit area around the diamond to `(44 − size) / 2` on each side.
- Interactive only when at least one base is occupied **and** has a name. Empty bases stay inert (no focus stop, no cursor).
- Accessibility: `role="button"`, `tabIndex=0`, `aria-expanded`, and `aria-label="Runners: 1st Bregman, 3rd Peña"` so a
  screen reader gets the names without opening the card. The card has `role="tooltip"`.
- The focus card shows only on **keyboard** focus (`:focus-visible`), not after a mouse click.
- A tap must not also count as a hover: decide by `pointerType` (mouse → hover; touch/pen → toggle on `pointerup`).
- `touch-action: manipulation` on the diamond (no double-tap zoom delay).

## Card (unchanged)
The same card as today: below the diamond, `1st / 2nd / 3rd` in mono 11px + the runner's name 13px/600. **Names only.**
Runner detail beyond the name (speed, stolen bases, lead) is still not designed.

## Acceptance
- iPhone/iPad: tapping the diamond shows the runners; tapping elsewhere hides them; no zoom, no stuck hover.
- Keyboard: Tab reaches the diamond when runners are on and the card appears; Esc hides it; Tab skips it when the bases are empty.
- Desktop mouse behaviour is unchanged.
