# Game page Highlights row: lazy load

**Rev 1 · Oct 2, 2026.** Not gated, and no new API. It changes WHEN the clips are fetched, not what is fetched.

Design reference: `holistic/clips.jsx` → `GameHighlightsRow`, shown in `Clips - Options.html` (bottom of the game page frames). Port the layout values verbatim.

## Behaviour
1. **Closed by default** on every game page load: live, final and Scout/replay.
2. **The header is the toggle.** The whole header bar is one `<button aria-expanded>`, at least 44px tall, on `surfaceAlt`:
   - left: `HIGHLIGHTS · THIS GAME` (eyebrow, unchanged)
   - right: `Show clips ▾` when closed, `Hide ▴` when open (DM Sans 12.5 / 700; the chevron rotates 180°)
   - the bottom hairline appears only when open
3. **Nothing loads while closed.** No clip-list request for this row, no thumbnail images, no `<video>` elements and no mp4 preload. The row's content is not mounted at all; it isn't just hidden with CSS.
4. **First open:**
   - start the fetch
   - show `Loading clips…` (13.5px, textMuted, padding 16/18/18) in the body until it resolves
   - then render the clip cards as before (horizontal scroller, EdgeButtons on hover)
5. **Count:** the header's mono summary (`7 clips · latest first`, plus `· through ▼3rd` in Scout) appears only once loaded. While closed or loading it's empty; don't show a placeholder number.
6. **Close and re-open** keeps the loaded list and does not refetch. A new game page starts closed again.
7. **Empty result:** keep the existing "No clips yet…" line, shown after loading.
8. **Fetch error:** show `Couldn't load clips.` with a `Try again` link (rust) in the same body slot, and keep the header toggle working. (The design has no error state; this is the dev default.)

## Not affected
- **Watch buttons on at-bat rows** and **▶ marks on scorecard boxes** still need to know which plays have a clip, so keep loading that light play → clip-id mapping with the page.
- If the current clip-list call returns both the mapping and the full clip metadata (thumbnails, URLs), split it. Otherwise this change saves nothing.
- Playback (the clip in the at-bat box, the clip on top of the page) is unchanged. The `<video>` mounts only when a clip is played.

## Acceptance
1. Load a live game page: the network panel shows no thumbnail or mp4 requests for the Highlights row, and the row is just its header.
2. Click "Show clips": `Loading clips…` appears, then the cards. The header gains the clip count.
3. Click "Hide", then "Show clips" again: the cards appear instantly, with no new request.
4. Scout/replay behaves the same, and the count includes `· through {inning}`.
5. The Watch buttons on at-bat rows still appear on page load without opening the row.
