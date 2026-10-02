# At-bat list: live at-bat badge = empty dashed scorebook cell (replaces the rust donut)

**Rev 1 · Sep 30, 2026.** A visual swap only. Not gated, and no API change.

## Change
In `PitchByPitchV2`, the live at-bat's row badge (the result slot at the left of the row) is currently a solid rust 32px circle with a white dot, the "donut". **Delete it.** Render the shared `ScorebookCell` in its place:

```
<ScorebookCell inn="" code="" live state="active" width={44} codeIn />
```

- It's an empty diamond with a **rust dashed outline**. That's the same cell the batter card's At-bats row shows for the current at-bat, so the live at-bat looks the same in both places on the screen.
- It's the same 44px width and compact (`codeIn`) form as the finished at-bats' badges in that list, so the column stays aligned.
- It applies in both places the donut appears: the pinned live-batter header and the live row in the list.
- When the at-bat ends, the cell fills with its result like every other row. There's no special transition.

## Acceptance
1. No solid rust circle remains anywhere in the at-bat list.
2. The live at-bat's badge matches the live cell under the batter's headshot.
3. Badge column alignment is unchanged.
