# PROMPT — navigation/header remainder (post-audit)

31 August 2026. The `handoff_navigation/` package audited as **PARTIALLY landed** — most of it is
already shipped. This supersedes those two prompts: **do not port them.** What follows is the only
outstanding work, plus two spec deviations that are being resolved in the app's favour.

Ungated. No new endpoint, no new fields.

---

## 1 · Fix the Team / Schedule page gutter (two one-line changes)

`.tp__wrap` (`TeamPage.css`) and `.sp__hdr-inner` (`SchedulePage.css`) are missing
`box-sizing: border-box`. With `content-box` their rendered width is 1240 + 56px padding = **1296px**,
against `BrandHeader__inner`'s 1240px border-box column — both centred, so the h1 lands **28px left
of the wordmark** on those two routes.

```css
.tp__wrap    { box-sizing: border-box; }
.sp__hdr-inner { box-sizing: border-box; }
```

Same class of bug as the one already fixed on `BrandHeader__inner`. Worth a grep for any other
`max-width: 1240` / `max-width: 1600` container missing `border-box` — this is the second instance,
so there may be a third.

**The rest of the alignment audit came back clean** — the hairline is genuinely full-bleed on every
route, and wordmark/h1 align on Landing, Standings, Leaders, Teams, Settings, Game view and Player.
The earlier "double gutter everywhere" diagnosis was wrong; the real defect is these two pages only.

---

## 2 · Move Leaders' league filter into the eyebrow slot

`LeadersPage.tsx:296-311` renders both switches in a `.leaders-page__controls` div below
`PageTitle`. The **League · MLB / AL / NL** filter belongs in `PageTitle`'s `subtitleRight`.

**`Batting / Pitching` stays exactly where it is**, below the header and left-anchored. This is not
an inconsistency — it is the slot rule working:

- League changes *what set of leaders this page is about* → page-level → header control
- Batting/Pitching changes *which categories the body lists* → region-level → stays with the body

Every other screen already slots correctly, so Leaders is the last one out of step.

---

## 3 · Wordmark: keep `LogoLockup`. Design source amended.

The audit flagged the app using `<LogoLockup variant="allcaps">` (inline SVG) where the design
source references `assets/logo-wordmark-light.png`.

**Resolved in the app's favour — `LogoLockup` is correct, do nothing.** It renders the same final
mark (all-caps `SC◆REBOOK`, simplified diamond with only the home-plate square), and inline SVG
scales cleanly, inherits colour for dark contexts, and adds no asset request. The PNG exists only
because the static design mocks cannot mount a React component.

The design files keep the `<img>` for that reason; that divergence is **intentional and closed**.
Do not introduce the PNG, and do not re-open this.

---

## 4 · `onMenu` prop: not wanted. Design source amended.

The spec gave `BrandHeader` an `onMenu` prop and rendered the hamburger only when it was passed.
The app instead makes the hamburger unconditional and owns drawer state internally
(`BrandHeader.tsx:24,41-47`).

**The app's version is better and stays.** The spec's own stated risk was that a screen forgetting
to pass `onMenu` silently ends up with no navigation and no error — the app's design makes that
failure mode structurally impossible. A global header should not be able to lose its nav because
of a mount-site omission.

**Do not add an external control.** If a future screen genuinely needs to intercept the hamburger,
add it then, with that screen's requirement in hand.

---

## Done means

- Team page and Schedule page h1s align with the wordmark (both at the 28px column edge)
- No other `max-width` header/content container is missing `box-sizing: border-box`
- Leaders' League · MLB / AL / NL sits in the eyebrow row's right slot
- Leaders' Batting / Pitching is unchanged, still below the header
- `LogoLockup` and the internal hamburger state are untouched
