# Nav: hamburger merged into title (PageMenu) + alerts bell removed — Aug 1, 2026

Files: `holistic/shared.jsx`, `holistic/game-v2.jsx`, `holistic/landing.jsx`,
`holistic/player.jsx`, `holistic/leaders.jsx`, `holistic/standings.jsx`, `future.md`.

## Status
Design-side iteration on the nav work from the prior `PROMPT_pagenav.md` handoffs. Ready for
sign-off review, then port. Supersedes those two docs' specifics on placement — the underlying
router-history back-navigation requirement is unchanged.

## What changed
1. **One nav control, not two.** The previous `PageNav` (Back button + separate ▾ chevron) is
   replaced by `window.PageMenu`: a single ☰ hamburger rendered INLINE, directly to the left of
   the `<h1>` page title (new `navMenu` prop on `PageTitle`). A caret reads as "expand this," a
   hamburger reads as "other places to go" — clearer with one control instead of two adjacent ones.
2. **Menu content, top to bottom:** the contextual return ("← [context]", e.g. "← Today's games")
   first, a divider, then the fixed destination list — **Today's games / Standings / Leaders**
   (order and copy now match the live app's existing hamburger). **Settings is present in the
   data but filtered from render** (`hidden: true` on that item) — not needed right now, flip
   the flag to bring it back.
3. **Active-state styling** uses `accentSoft`/`accent` (rust) to match the live app's selected-row
   treatment, with icons per item (📅 📊 🏆).
4. **Alerts bell removed.** It had no clear home once the header bar collapsed into the inline
   hamburger. Parked as **`future.md` F-009** with a content/placement sketch — not designed,
   needs a nav pass once a spot (or persistent shell) exists for it.
5. Landing (root, no back target) passes `showBack={false}` — hamburger renders with no back
   item/divider, just the destination list.

## Port note (unchanged from prior prompts)
The real fix is router-history-aware back navigation with a per-screen fallback — not a
hardcoded label/target. Every `PageMenu` call's `backLabel` needs to resolve from actual
route/history state at build time (games list, the game a player came from, etc). The
destinations list should route to the SAME existing Leaders/Standings pages/handlers already
wired in the app — nothing there changes, just the trigger's visual home.
