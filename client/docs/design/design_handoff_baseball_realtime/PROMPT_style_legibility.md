# Style / legibility pass — dev handoff (Jul 4, 2026)

Three self-contained, **ungated** changes. No new API, no data, no logic. Pure token + CSS values.
All are in the design at `holistic/shared.jsx` + `holistic/game-v2.jsx` (and the handoff copies under
`design_handoff_baseball_realtime/holistic/`). Reference artifact: `Contrast Pass — Before After.html`.

---

## 1. Token contrast hardening — `shared.jsx` `window.T` (affects EVERY screen)

A WCAG audit found four failing/borderline text tokens on the cream surfaces. Fix at the token
source; do NOT patch per-component. In the target app these are the CSS custom properties / token
constants — change the value in one place.

| Token | Before | After | Why |
|---|---|---|---|
| `textFaint` | `#a39d92` | **`#6f685f`** | 2.4 → ~4.9. The big one — washed-out captions/labels/axis text everywhere. |
| `textMuted` | `#75706a` | **`#5c574f`** | 4.1–4.7 (borderline) → ~6. Clears AA on all three surfaces. |
| `positive` | `#4a7c3e` | **`#3f6b34`** | 4.1 → ~5.5. (Also darkens the green pill fg — better.) |
| `highlightText` *(new)* | — | **`#7a5c0e`** | Gold used as **text** (raw `#c8941c` fails at 2.4). Use this token wherever gold is text; keep raw `highlight` for shapes/fills/dots/bars only. |
| `border` | `#e0dccd` | **`#cfc8b4`** | Cards barely separated from `bg` (1.08:1 surface); stronger edge. |
| `borderStrong` | `#c4bfae` | **`#b4ae9b`** | Matches. |

**Unchanged (already AA):** `text` (15+), `accent` rust (4.85), `info` navy (7.9), `ink`, all
`*Soft` pill backgrounds. The soft pills already use darkened fg's (e.g. the gold pill fg is
`#7a5c0e`), so they pass — leave them.

Verify after: worst-case (on `surfaceAlt`) ratios — text 15.0 · info 7.4 · textMuted 5.5 · positive
5.2 · highlightText 5.2 · textFaint 4.6 · accent 4.6. All ≥4.5 AA.

---

## 2. Dark line-score band — `LineScoreBand` + `PregameLineScoreBand` in `game-v2.jsx`

The band is **dark** and uses its own hardcoded dark-mode grays (NOT the tokens in §1), so §1 doesn't
touch it. It had one weak gray + small labels. Apply to BOTH the live and pregame band:

- **Dim gray** `#71717a` → **`#b0b0b8`** (3.7 → 8.4, AAA) — on inning numbers, R/H/E headers, zone
  titles (SCORING SUMMARY / GAME LEADERS / PROBABLE PITCHERS / COMING IN), the status eyebrow
  (LIVE / SCHEDULED), and the "View all N scoring plays" link.
- **Sizes:** inning numbers + R/H/E headers 10→**14px**; zone titles 9→**12px**; team-name 12→**14px**;
  R/H/E values 15→**17px**; scoring-play text 12→**16px** (and brighter, `#d4d4d8`→**`#e4e4e7`**);
  leader/probable secondary lines →**13–15px** (`#a1a1aa`→**`#c4c4cc`**).

Everything already bright (team names #fff, run values, the rust current-inning number) is unchanged.

---

## 3. Game-view small-label floor — `game-v2.jsx` (targeted, NOT a blanket scale)

The user explicitly **rejected** an across-the-board type increase. This is targeted: every sub-11px
**word** label (eyebrows, stat labels, captions) lifted to an **11 / 11.5px floor**:

- `fontSize: 9` and `9.5` → **11**
- `fontSize: 10` → **11.5**
- **Left as-is:** the compact **8px** pills/badges (AT BAT, On deck, In · Nth) and everything **11px+**.

~42 sizes. Affected labels include: "At bat · CHC", "Today", "vs Pearson", "At-bats" / "tap to replay
in zone", "Last pitch" / "MPH" / pitch note, "This matchup", "Due up", and the lineup-tray row
position/status text. The big elements (player name, slash line, MPH readout, pitch name) are
untouched, so the size hierarchy holds — do not scale those up.

**Scope note:** this floor was applied to the **game view only** so far. The player + landing screens
share the same eyebrow/label patterns and will want the same targeted floor in a later pass — not
included here.

---

## Acceptance
- Captions/labels that were faint gray are legible on all cream surfaces; cards visibly separate from `bg`.
- The dark scoring band's inning numbers, zone titles, and scoring plays read clearly and larger.
- No game-view word label renders below 11px; 8px pills and 11px+ text unchanged; no overflow.
- Nothing else resized — this is legibility, not a redesign.
