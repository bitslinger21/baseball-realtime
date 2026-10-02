/* global React, T, TEAMS */

// ============================================================
// HOME — the front door.  Sep 19, 2026 · RE-LAID-OUT Sep 20, 2026.
//
// Home is NOT a summary of Games / Standings / Leaders. Those pages answer
// "show me everything"; Home answers "what deserves my attention". Three
// sections: What's hot right now (Scorebook chooses) · Following (the user
// chooses) · September (what is developing).
//
// ---- LAYOUT, Sep 20 2026. The data was right and the layout was not ("the
// information is good but the layout sucks"). Explored as three full
// candidates — broadsheet / rail / ledger, see `Home Layout A - Broadsheet.html`
// — and the RAIL model was chosen, with the broadsheet's September. Four
// structural changes from the first pass:
//
//   1 FOLLOWING IS A STICKY RIGHT RAIL, not the second of three stacked bands.
//     It is a dashboard of things that are true right now, so it should be
//     visible WHILE you read the page rather than 700px below it. In a 320px
//     rail it is also naturally one-per-line, which is the density it wanted.
//   2 RACES IS FULL WIDTH, BELOW BOTH — two side-by-side columns (Divisions ·
//     Wild card), with CHASES as its own full-width section beneath (Hitting ·
//     Pitching). Races lost their panels: the column is the container, and
//     eight panels in one band read as a grid of cards. The section is called
//     "Races" in every season state — it was "September", which only read right
//     for one month of six.
//   3 ONE LOCKED TYPE SCALE — `window.HS`, seven steps. The first pass had ~12
//     sizes between 9.5 and 17px, several one-offs (13.5 / 12.5 / 11.5 / 10.5)
//     tuned per element rather than composed.
//   4 TIGHTER: 40px between sections (was 64), rows at 22–26px, and the 20px
//     SECTION_INDENT is gone — the rail already divides the page vertically,
//     so hanging content inside its label was a third alignment to track.
//
// Mock data, the IQ panel and the follow mark now live in `home-data.jsx`,
// shared with the exploration candidates so only arrangement ever differed.
//
// DELIBERATELY ABSENT: timestamps. A relative time on every row is the single
// strongest tell of a news feed, and the brief asks for curated. Recency is
// already implied by the section's name.
// ============================================================

const HS = window.HS;

function SectionHead({ label, note, right, tight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, paddingBottom: 6, borderBottom: `1px solid ${T.borderStrong}`, marginBottom: tight ? 8 : 12 }}>
      <window.Eyebrow style={{ fontSize: HS.xs, color: T.text }}>{label}</window.Eyebrow>
      {note && <span style={{ fontFamily: T.sans, fontSize: HS.sm, color: T.textFaint }}>{note}</span>}
      <span style={{ flex: 1 }} />
      {right}
    </div>
  );
}

// ---- compact game context. SECONDARY to the event text, so it is a quiet
// bordered block, not a card: two team rows + the inning. In the single wide
// column it is the only right-hand element, so it anchors the row.
// The whole block is the link to the Game page.
function GameContext({ g }) {
  const [hov, setHov] = React.useState(false);
  const a = TEAMS[g.away], h = TEAMS[g.home];
  const lead = g.ra === g.rh ? null : (g.ra > g.rh ? 'a' : 'h');
  const done = g.half === 'final';
  const row = (t, runs, on) => (
    <div style={{ display: 'grid', gridTemplateColumns: '18px 34px 22px', alignItems: 'center', gap: 8 }}>
      <window.TeamDot team={t} size={18} />
      <span style={{ fontFamily: T.mono, fontSize: HS.sm, fontWeight: 600, color: on === false ? T.textMuted : T.text }}>{t.abbr}</span>
      <span style={{ fontFamily: T.mono, fontSize: HS.md, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: on === false ? T.textMuted : T.text }}>{runs}</span>
    </div>
  );
  return (
    <div onClick={() => window.openGameView && window.openGameView()}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 11px', flexShrink: 0, cursor: 'pointer', border: `1px solid ${hov ? T.borderStrong : T.border}`, borderRadius: T.r.md, background: hov ? T.surface : 'transparent' }}>
      <div style={{ display: 'grid', gap: 3 }}>{row(a, g.ra, lead === null ? null : lead === 'a')}{row(h, g.rh, lead === null ? null : lead === 'h')}</div>
      {/* A FINISHED game says FINAL. `Inning` only knows top/bottom, so a final
          passed through it drew a rust ▼9 — which in this language means "live,
          bottom of the ninth" — for a game that had ended. Rust is reserved for
          live; a final is neutral. */}
      {done
        ? <window.Eyebrow style={{ fontSize: HS.xs, color: T.textMuted }}>Final</window.Eyebrow>
        : <window.Inning half={g.half} num={g.inn} size={12} color={T.accent} />}
    </div>
  );
}

// ---- non-game context: a club move, drawn as marks, not a scoreboard.
// Never force scoreboard chrome onto an event that has no game.
function MoveContext({ m }) {
  const from = TEAMS[m.from], to = m.to ? TEAMS[m.to] : null;
  if (!from) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
      <window.TeamDot team={from} size={18} />
      <span style={{ fontFamily: T.mono, fontSize: HS.sm, color: T.textMuted }}>{from.abbr}</span>
      {to && <React.Fragment>
        <span style={{ fontFamily: T.sans, fontSize: HS.base, color: T.textFaint }}>&rarr;</span>
        <window.TeamDot team={to} size={18} />
        <span style={{ fontFamily: T.mono, fontSize: HS.sm, color: T.textMuted }}>{to.abbr}</span>
      </React.Fragment>}
    </div>
  );
}

// ---- RACE CONTEXT — the THIRD context type (Sep 21, 2026).
//
// Added after running the real Sep 21 league state through this page: today's
// genuine significance is almost all race state (one-game division leads, a tie
// broken only by head-to-head, three clubs alive for one berth), and the slot
// beside a hot item only knew how to be a game score or a club move. A race
// fact rendered with an empty slot throws away the only numbers that matter.
//
// Deliberately NOT a fourth visual language: logo · abbr · games-back, the same
// row the Races board uses, two or three rows of it. The leader's dash is the
// leader's dash everywhere on this page.
function RaceContext({ r }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flexShrink: 0, minWidth: 152, padding: '7px 11px 8px', cursor: 'pointer',
        border: `1px solid ${hov ? T.borderStrong : T.border}`, borderRadius: T.r.md, background: hov ? T.surface : 'transparent' }}>
      <window.Eyebrow style={{ fontSize: HS.xs, color: T.textFaint }}>{r.title}</window.Eyebrow>
      <div style={{ marginTop: 5 }}>
        {r.rows.map(([abbr, gb], i) => (
          <div key={abbr} style={{ display: 'grid', gridTemplateColumns: '16px 34px 1fr', alignItems: 'center', gap: 7, height: 22 }}>
            <window.TeamDot team={TEAMS[abbr]} size={16} />
            <span style={{ fontFamily: T.mono, fontSize: HS.sm, fontWeight: i === 0 ? 700 : 500 }}>{abbr}</span>
            {/* A clinch marker per row is redundant under an eyebrow that
                already reads CLINCHED — and a bare 'x' in a tabular-nums mono
                column reads as a data glitch (the same defect fixed in
                RaceCard, where the column IS load-bearing so it became a green
                IN). Here the column simply goes empty. */}
            {gb === 'x'
              ? <span />
              : <span style={{ fontFamily: T.mono, fontSize: HS.sm, fontWeight: i === 0 ? 700 : 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: i === 0 ? T.text : T.textMuted }}>{gb}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- one hot item. TEXT FIRST: the sentence is the item, and it is allowed to
// change under the user (through six → through seven → three outs away →
// thrown) without the row changing shape. Everything else is context.
// Rows are separated by a hairline now that they sit in a column beside the
// rail — space alone let them drift into the rail's rows.
function HotItem({ item, open, onToggleIQ }) {
  const [hov, setHov] = React.useState(false);
  return (
    <div style={{ padding: '13px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) auto', gap: 13, alignItems: 'start' }}>
        {/* BULLET. The red diamond is not decoration and not an IQ button bolted
            onto every row — it MEANS "Baseball IQ has context for this event".
            No context → plain bullet. Never a disabled diamond. */}
        {item.iq ? (
          <button onClick={onToggleIQ} title="Baseball IQ has context for this"
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ marginTop: 2, width: 24, height: 24, display: 'grid', placeItems: 'center', padding: 0, background: (hov || open) ? T.accentSoft : 'transparent', border: 'none', borderRadius: T.r.pill, cursor: 'pointer' }}>
            <window.IQDiamond size={16} />
          </button>
        ) : (
          <span style={{ marginTop: 2, width: 24, height: 24, display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.textFaint }} />
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: T.sans, fontSize: HS.lg, fontWeight: 500, lineHeight: 1.38, color: T.text, textWrap: 'pretty', maxWidth: 560 }}>{item.text}</p>
          {item.move && <MoveContext m={item.move} />}
          {open && <window.HomeIQPanel item={item} onClose={onToggleIQ} width={560} />}
        </div>
        {item.game && <GameContext g={item.game} />}
        {!item.game && item.race && <RaceContext r={item.race} />}
      </div>
    </div>
  );
}

// ---- ONE GAME IN THE DAY-AHEAD LIST. A ROW, not a card: a card grid of five
// is a scoreboard, and Home is not the Games page. A row also puts the games in
// time order down a column, which is the order a day actually has.
function MarqueeRow({ g }) {
  const [hov, setHov] = React.useState(false);
  const a = TEAMS[g.away], h = TEAMS[g.home];
  const side = (t, p, ph) => (
    <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', gap: 9, alignItems: 'center', minWidth: 0 }}>
      <window.TeamDot team={t} size={22} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.short}</div>
        <div style={{ fontFamily: T.mono, fontSize: HS.sm, color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p} &middot; {ph}</div>
      </div>
    </div>
  );
  return (
    <div onClick={() => window.openGameView && window.openGameView()}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) minmax(0,1fr)', gap: 14, alignItems: 'center', padding: '9px 8px', margin: '0 -8px', borderTop: `1px solid ${T.border}`, cursor: 'pointer', background: hov ? T.surface : 'transparent' }}>
      {/* Time and the stake share one column. The stake was a right-hand chip,
          which cost ~100px of the row and ellipsised both pitchers' lines — and
          a listing's left edge is where you look for when and why anyway. */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: T.mono, fontSize: HS.base, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{g.time}</div>
        <window.Eyebrow style={{ fontSize: HS.xs, color: T.textFaint }}>{g.note}</window.Eyebrow>
      </div>
      {side(a, g.pa, g.pah)}
      {side(h, g.ph, g.phh)}
    </div>
  );
}

// ---- THE DAY AHEAD. Two jobs, one component:
//
//   · When NOTHING is hot it is the section's whole body. Before first pitch
//     that is the normal state, not an error: the sentence is honest about
//     having nothing to SAY, and the day ahead is worth looking at instead.
//   · When ONE OR TWO things are hot it is the section's TAIL, filling the
//     column to about the rail's height. This is not padding — the games are
//     real, and on a quiet morning the day ahead is the honest answer to "what
//     deserves my attention". It disappears at three or more hot items, where
//     the column stands on its own.
//
// FOUR ROWS MAX, and the count links out. A 15-game Sunday is not fifteen rows
// here; Games owns the full slate, and duplicating it would make Home a summary
// page, which is the one thing it is defined against.
function DayAhead({ games, tail }) {
  return (
    <div style={{ marginTop: tail ? 18 : 0 }}>
      {tail
        ? <window.Eyebrow style={{ fontSize: HS.xs, color: T.textFaint }}>Coming up today</window.Eyebrow>
        : <div style={{ fontFamily: T.sans, fontSize: HS.md, color: T.textMuted, marginBottom: 11 }}>Nothing cooking yet — here is the day ahead.</div>}
      <div style={{ marginTop: tail ? 7 : 0 }}>
        {games.map(g => <MarqueeRow key={g.home} g={g} />)}
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 0 }}>
        <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 600, color: T.accent, cursor: 'pointer' }}>All {window.HOME_TODAY_COUNT} games today &rarr;</span>
      </div>
    </div>
  );
}

// ---- RAIL ROW. One followed entity per line, because the rail is 320px and a
// line is what fits. A DASHBOARD face: the line is true RIGHT NOW and rewrites
// itself in place. It never narrates ("Judge homered in the 4th") — that is
// What's Hot's job, done with editorial judgment rather than chronology.
//
// RECENCY FIRST, THEN SEASON governs face 1: today's live line → today's final
// line (holds for the rest of today) → tonight's game → season state once today
// is over. The EdgeButton cycles the remaining faces in place, and appears only
// when there IS more than one — a lone row must not look like it is missing a
// control.
//
// Rows breathe more than the first rail build: 13px of vertical padding, so the
// hairline reads as a divider between two entities rather than a table rule.
// VIDEO LAYERS (Sep 26, 2026 — clips options). A followed player or team with clips today
// gets ONE LAYER PER CLIP, placed right after face 1 (they are today's), newest first. A
// clip layer is the one allowed exception to "never narrate": its VIDEO label marks it as a
// clip, not a status. The card line is written FROM THE PLAY (result · half · score), so it
// always fits 320px and is always true; the clip's own title, if any, belongs in the player.
// The same clip may appear on a player card and his team's card (user's call).
// A ▶ mark after the name says "this card holds video" — layers past face 1 are otherwise
// invisible until cycled. It is a mark, not a button; the play button lives on the layer.
const CLIP_RESULT = { HR: 'Home run', '1B': 'Single', '2B': 'Double', '3B': 'Triple', K: 'Strikeout', BB: 'Walk', F8: 'Catch in center', F7: 'Catch in left', F9: 'Catch in right' };
const clipHalf = inn => (inn.startsWith('TOP') ? '\u25b2' : '\u25bc') + inn.split(' ')[1];
function clipCardLine(c) {
  const what = CLIP_RESULT[c.code] || c.code;
  const tail = c.scored && c.scored.score ? c.scored.score.replace(/ \u2013 /g, '\u2013') : null;
  return [`${c.batter.split(' ').slice(-1)[0]} ${what.toLowerCase()}`, clipHalf(c.inning), tail].filter(Boolean).join(' \u00b7 ');
}

// Clips run in GAME ORDER on a card — inning 1 through the end — so cycling reads as the game.
const clipOrder = c => parseInt(c.inning.split(' ')[1], 10) * 2 + (c.inning.startsWith('BOT') ? 1 : 0);
const clipOrd = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const clipHalfOrd = inn => (inn.startsWith('TOP') ? '\u25b2' : '\u25bc') + clipOrd(parseInt(inn.split(' ')[1], 10));

// RICH LAYERS (Sep 26, clips options — Home - Following with Clips.html only; Home.html is
// unchanged until signed off). `faces` = [{ label: 'TODAY' | 'SEASON' | 'NEXT GAME', lines: [..] }]
// replaces the one-string tiles. Every layer is THREE LINES: name · LABEL, then two content
// lines, at a FIXED height so cycling never moves the rail. Order: face 1 → one VIDEO layer per
// clip (game order) → remaining faces. Previous + next edge buttons; wraps both ways.
function RailRow({ f, clips, onClip, faces }) {
  const [i, setI] = React.useState(0);
  const [hov, setHov] = React.useState(false);
  const [playHov, setPlayHov] = React.useState(false);
  const rich = !!faces;
  const vids = (clips || []).slice().sort((x, y) => clipOrder(x) - clipOrder(y));
  const base = rich ? faces : f.tiles.map(t => ({ lines: [t] }));
  const layers = [base[0], ...vids.map(c => ({ label: 'VIDEO', clip: c })), ...base.slice(1)];
  const n = layers.length;
  const many = n > 1;
  const at = ((i % n) + n) % n;
  const L = layers[at];
  const lineMono = { fontFamily: T.mono, fontSize: HS.sm, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '18px' };
  const last = c => c.batter.split(' ').slice(-1)[0];
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setPlayHov(false); }}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: rich ? '12px 10px 12px 34px' : '13px 10px 13px 11px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: hov ? T.surface : 'transparent', minWidth: 0, overflow: 'hidden' }}>
      {/* live = a 2px rust leading edge. The edge slot belongs to STATE, not
          identity: team colour was tried and a quarter of the league (BAL, SFG,
          CIN, STL, TEX, LAA, ARI) is close enough to rust to read as live. */}
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: f.live ? T.accent : 'transparent' }} />
      <window.FollowMark f={f} size={28} />
      <div style={{ minWidth: 0, flex: 1, paddingRight: many ? 20 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
          <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{f.name}</span>
          {rich && L.label && <span style={{ flexShrink: 0, fontFamily: T.sans, fontSize: HS.xs, fontWeight: 700, letterSpacing: '0.08em', color: L.clip ? T.text : T.textMuted }}>· {L.label}</span>}
          {rich && many && (
            // Layer counter (Sep 26) — replaces the ▶ video mark in rich mode: it says "there is
            // more on this card" for every card, video or not, and where you are in the stack.
            <span style={{ flexShrink: 0, marginLeft: 'auto', fontFamily: T.mono, fontSize: HS.xs, fontWeight: 600, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{at + 1}/{n}</span>
          )}
          {!rich && vids.length > 0 && (
            <span title={vids.length === 1 ? 'Has a video clip' : `Has ${vids.length} video clips`} style={{ flexShrink: 0, marginLeft: 'auto', alignSelf: 'center', display: 'inline-flex' }}>
              <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden="true" style={{ display: 'block' }}><path d="M0 0L8 4.5L0 9Z" fill={T.textMuted} /></svg>
            </span>
          )}
        </div>
        <div style={{ height: rich ? 36 : 'auto', marginTop: 2, minWidth: 0 }}>
          {L.clip ? (
            <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', columnGap: 8, alignItems: 'center', minWidth: 0 }}>
              <button onClick={e => { e.stopPropagation(); onClip && onClip(f.name, L.clip.id); }}
                onMouseEnter={() => setPlayHov(true)} onMouseLeave={() => setPlayHov(false)}
                aria-label={`Play: ${L.clip.batter}, ${L.clip.desc}`}
                style={{ gridRow: rich ? '1 / span 2' : 'auto', width: 22, height: 22, borderRadius: '50%', border: 'none', padding: 0, background: playHov ? T.accent : T.ink, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <svg width="7" height="8" viewBox="0 0 8 9" aria-hidden="true" style={{ display: 'block', marginLeft: 1 }}><path d="M0 0L8 4.5L0 9Z" fill="#fff" /></svg>
              </button>
              <span style={{ fontFamily: T.sans, fontSize: HS.sm, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '18px', minWidth: 0 }}>
                {f.kind === 'team' ? `${last(L.clip)} · ` : ''}{L.clip.desc}
              </span>
              {rich && <span style={{ ...lineMono, color: T.textMuted }}>{[clipHalfOrd(L.clip.inning), L.clip.scored && L.clip.scored.score, L.clip.dur].filter(Boolean).join(' \u00b7 ')}</span>}
            </div>
          ) : (
            (L.lines || []).slice(0, rich ? 2 : 1).map((t, k) => (
              <div key={k} style={{ ...lineMono, color: k === 0 && (f.live || rich) ? T.text : T.textMuted }}>{t}</div>
            ))
          )}
        </div>
      </div>
      {rich && <window.EdgeButton side="left" show={many} self label={`Previous view for ${f.name}`} thickness={24}
        onClick={() => setI(v => v - 1)} />}
      <window.EdgeButton side="right" show={rich ? many : many && hov} self={rich} label={`Next view for ${f.name}`} thickness={24}
        onClick={() => setI(v => v + 1)} />
    </div>
  );
}

// ---- THE RAIL as a bounded scroll region (Sep 21, 2026).
//
// Eight rows fit a viewport; twenty do not — and a sticky element TALLER than
// the viewport stops behaving like one (it pins at its own bottom, so the top
// of the list is unreachable while Races is on screen). So the rail scrolls
// internally, which keeps the sticky promise: the dashboard stays put while the
// page moves under it.
//
// WHAT BOUNDS IT IS THE COLUMN BESIDE IT, NOT THE WINDOW. Capping to the
// viewport (`calc(100vh - 120px)`) was the first attempt and it reintroduced
// the dead space this layout was fixed for: 20 follows next to 3 hot items gave
// a 911px rail beside a 364px column — ~546px of empty left column above
// Races, worse than the hole the DayAhead tail was built to close. The rail is
// a DASHBOARD, so it is happy at any height and can scroll the rest; the hot
// list is prose, and stretching prose to match a list is not an option. So the
// rail is bounded by `min(hot-section height, viewport)` — MEASURED in
// HomeScreen with a ResizeObserver, not declared as a percentage: while the
// grid sizes its row a percentage max-height is ignored, so the 20-row content
// would set the row height and strand the column all the same.
//
// AND THE COLUMN GROWS TOWARD THE RAIL. Bounding the rail to the hot column
// alone would answer a short hot list by cramping a long follow list — one hot
// item and 20 follows would show four of them. So the relationship runs both
// ways: the rail reports its content height, and What's hot extends its
// day-ahead tail (up to five real games) to meet it. Whichever runs out of
// content first sets the row, and neither side leaves a hole.
//
// The scrollbar is NOT the affordance — `EdgeButton` is, top and bottom, the
// same atom the widget slides and the Leaders tables use. Same posture as
// everywhere else: hidden at rest, revealed on container hover, solid ground.
// A page with three different "there is more this way" treatments was the
// reason that atom exists.
//
// Declared at MODULE level, not inside HomeScreen: a component minted inside a
// parent is a new type on every parent render, so React remounts it and the
// scroll position resets — exactly the bug the line-score band shipped with.
function FollowRail({ follows, onContent, followClips, onFollowClip, followFaces }) {
  const ref = React.useRef(null);
  const [hov, setHov] = React.useState(false);
  const [edge, setEdge] = React.useState({ up: false, down: false });
  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setEdge({ up: el.scrollTop > 2, down: max > 2 && el.scrollTop < max - 2 });
    // Reported UP so the hot column can grow TOWARD the rail — see the fill
    // rule in HomeScreen. Only the rail knows its full content height; the page
    // cannot infer it from the follow count.
    onContent && onContent(el.scrollHeight);
  }, [onContent]);
  React.useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, follows.length]);
  // Three rows a press — enough to feel like progress, little enough to keep
  // your place. Native scroll and the wheel still work; this is an addition.
  const page = dir => () => {
    const el = ref.current;
    if (!el) return;
    // ASSIGN scrollTop — and the container must NOT carry CSS
    // `scroll-behavior: smooth`, because in this engine a smooth container
    // routes an ASSIGNMENT through the same broken animation path and the
    // assignment becomes a no-op too. `scrollBy({behavior:'smooth'})` fails
    // the same way. Paging is therefore INSTANT by design: a button that
    // moves the list is worth more than one that glides and sometimes doesn't.
    el.scrollTop = el.scrollTop + dir * 174;
    // Measure immediately: a programmatic scroll fires no scroll event here, so
    // onScroll never re-runs and the edge buttons would go stale.
    measure();
  };
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
      <div ref={ref} onScroll={measure} className="fw-rail"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <style>{'.fw-rail::-webkit-scrollbar{width:0;height:0}'}</style>
        {follows.map(f => <RailRow key={f.name} f={f} clips={followClips && followClips[f.name]} onClip={onFollowClip} faces={followFaces && followFaces[f.name]} />)}
      </div>
      <window.EdgeButton side="top" show={hov && edge.up} onClick={page(-1)} label="Earlier in your follows" thickness={22} />
      <window.EdgeButton side="bottom" show={hov && edge.down} onClick={page(1)} label="More of your follows" thickness={22} />
    </div>
  );
}

// ---- ONE Manage panel, TWO entrances: the "Manage" link when you already
// follow things, and the empty state's button when you don't. Same object either
// way — it just arrives empty from the second entrance. A separate onboarding
// picker PLUS a separate editor would be two things to build and two to keep in
// step, for no gain. In the rail it opens inline under the section head.
function ManagePanel({ list, onRemove, onAdd, onClose }) {
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const have = new Set(list.map(f => f.name));
  const CAP = window.HOME_FOLLOW_CAP;
  const full = list.length >= CAP;
  const hits = q.trim()
    ? window.HOME_FOLLOW_SEARCH.filter(r => r.name.toLowerCase().includes(q.trim().toLowerCase()) && !have.has(r.name))
    : [];
  return (
    <div style={{ marginBottom: 12, background: T.surface, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.accent}`, borderRadius: `0 0 ${T.r.md}px ${T.r.md}px`, boxShadow: T.sh.md }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderBottom: `1px solid ${T.border}` }}>
        <window.Eyebrow style={{ fontSize: HS.xs, color: T.text }}>Following</window.Eyebrow>
        <span style={{ fontFamily: T.mono, fontSize: HS.sm, color: full ? T.accent : T.textFaint, fontVariantNumeric: 'tabular-nums' }}>{list.length}/{CAP}</span>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} aria-label="Close" style={{ ...window.iconBtn, width: 26, height: 26, fontSize: HS.sm }}>&#10005;</button>
      </div>
      <div style={{ padding: '11px 13px 13px' }}>
        {/* At the cap the field still ACCEPTS typing — disabling it leaves the
            user guessing why. The results area explains the cap instead. */}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Add a team or player…"
          style={{ width: '100%', boxSizing: 'border-box', height: 34, padding: '0 12px', background: T.bg, border: `1px solid ${T.borderStrong}`, borderRadius: T.r.pill, fontFamily: T.sans, fontSize: HS.base, color: T.text, outline: 'none' }} />
        {full && !!q.trim() && (
          <div style={{ marginTop: 9, fontFamily: T.sans, fontSize: HS.base, color: T.textMuted, textWrap: 'pretty' }}>You’re following {CAP} — remove one to add another.</div>
        )}
        {!full && !!hits.length && (
          <div style={{ marginTop: 8, display: 'grid', gap: 2 }}>
            {hits.map(r => (
              <div key={r.name} onClick={() => { onAdd(r); setQ(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: T.r.sm, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <window.FollowMark f={r} size={22} />
                <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: T.sans, fontSize: HS.sm, fontWeight: 600, color: T.accent }}>Follow</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12, display: 'grid', gap: 1, maxHeight: 268, overflowY: 'auto' }}>
          {list.length === 0 && <span style={{ fontFamily: T.sans, fontSize: HS.base, color: T.textMuted, padding: '2px' }}>Nothing followed yet — search above.</span>}
          {list.map(f => (
            <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: T.r.sm }}>
              <window.FollowMark f={f} size={22} />
              <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
              <span style={{ flex: 1 }} />
              <button onClick={() => onRemove(f.name)} aria-label={`Unfollow ${f.name}`} style={{ ...window.iconBtn, width: 24, height: 24, fontSize: HS.xs }}>&#10005;</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- a race, stripped to a ledger. NO PANEL: the column it sits in is the
// container, and eight panels in one band read as a grid of cards. Two numbers
// per row — record and games back. GAMES REMAINING is a property of the RACE,
// so it sits in the race header and costs no column. CLINCHED is a race-level
// state; ELIMINATED teams are simply absent (a listed club is by definition
// alive), which is what lets a fixed set of eight races stay short.
function RaceCard({ r }) {
  // ---- A DECIDED RACE IS ONE LINE (Sep 21, 2026). It used to render as a card
  // header with a single row beneath it, which read as a table that had lost
  // its rows. There is nothing left to compare, so there is no table: race name
  // and CLINCHED on the left, the winner right-justified.
  if (r.clinched) {
    const t = TEAMS[r.clinched];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 34, marginBottom: 14, borderTop: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 700, color: T.text }}>{r.title}</span>
        <span style={{ fontFamily: T.sans, fontSize: HS.xs, fontWeight: 700, letterSpacing: '0.05em', color: T.positive }}>CLINCHED</span>
        <span style={{ flex: 1 }} />
        <window.TeamDot team={t} size={18} />
        <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.name}</span>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
        <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 700, color: T.text }}>{r.title}</span>
        <span style={{ fontFamily: T.sans, fontSize: HS.xs, color: T.textFaint }}>{r.wc ? `${r.spots} spots \u00b7 ${r.left} left` : `${r.left} left`}</span>
      </div>
      {r.rows.map(row => {
        const lead = row.gb === '\u2014';
        const held = r.wc && row.in;
        const out = r.wc && !row.in;
        const t = TEAMS[row.abbr];
        return (
          <div key={row.abbr} style={{ display: 'grid', gridTemplateColumns: row.wl ? '4px 18px minmax(0,1fr) 64px 42px' : '4px 18px minmax(0,1fr) 42px', alignItems: 'center', gap: 7, height: 25, borderTop: `1px solid ${T.border}` }}>
            {/* cut line: a rust tick in a left gutter on the clubs currently
                holding a wild-card spot — never a horizontal rule. */}
            <span style={{ width: 3, height: 13, borderRadius: 2, background: held ? T.accent : 'transparent' }} />
            {/* Logo + FULL NAME (Sep 21, 2026). Three-letter codes are a
                scoreboard convention — they save width this column has, and
                they ask the reader to decode. Dimmed by opacity for clubs
                outside the cut: a greyed logo has no grey. */}
            <span style={{ display: 'flex', opacity: out ? 0.45 : 1 }}><window.TeamDot team={t} size={18} /></span>
            <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: lead || held ? 700 : 500, color: out ? T.textMuted : T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
            {/* Win-loss is OPTIONAL: a real board without today's records drops
                the column rather than showing a plausible fake. */}
            {row.wl && <span style={{ fontFamily: T.mono, fontSize: HS.sm, color: T.textMuted, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{row.wl}</span>}
            {/* A clinched berth carries MLB's own 'x' rather than a games-back
                number. In a mono numeric column that token reads as a data
                glitch, so it is drawn in the positive green the board already
                uses for CLINCHED, in sans, and titled. */}
            {row.gb === 'x'
              ? <span title="Clinched a berth" style={{ fontFamily: T.sans, fontSize: HS.xs, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'right', color: T.positive }}>IN</span>
              : <span style={{ fontFamily: T.mono, fontSize: HS.base, fontWeight: lead ? 700 : 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: lead ? T.text : T.textMuted }}>{row.gb}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ---- an individual chase. Same rhythm as a race, different object: a stat
// title has no elimination, no deadline and no cut line, so no tick and no
// games-left note.
//
// CLUB IS ABBREVIATED HERE, unlike a race row (user's call, Sep 21). The two
// boards read differently: a race row's subject IS the club, so it earns the
// full name; a chase row's subject is the PERSON, and a full club name after
// every surname competes with the name it is qualifying. Three letters answer
// "which one is he" without becoming the loudest thing in the row.
//
// LEAGUE-SCOPED (Sep 22, 2026). Rows come from `c[lg]`, driven by the section
// header's AL/NL toggle. `c.rows` is still honoured for the flat exploration
// data. Every one of these titles is a per-league title in real baseball, so
// the toggle replaced the old 'AL Batting' + 'NL Batting' pair rather than
// adding a filter on top of it.
function ChaseCard({ c, lg = 'al' }) {
  const rows = c.rows || c[lg] || [];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 700, marginBottom: 3 }}>{c.title}</div>
      {rows.map(([name, v, k], i) => (
        <div key={name} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr) 46px', alignItems: 'center', gap: 7, height: 25, borderTop: `1px solid ${T.border}` }}>
          <span style={{ display: 'flex' }}><window.TeamDot team={TEAMS[k]} size={18} /></span>
          <span style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6, overflow: 'hidden' }}>
            <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: i === 0 ? 700 : 500, whiteSpace: 'nowrap' }}>{name}</span>
            <span style={{ fontFamily: T.mono, fontSize: HS.sm, color: T.textMuted, whiteSpace: 'nowrap' }}>{TEAMS[k].abbr}</span>
          </span>
          <span style={{ fontFamily: T.mono, fontSize: HS.base, fontWeight: i === 0 ? 700 : 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ---- EARLY-SEASON mode. In April everyone is within a few games of everyone,
// nothing is a race, and every club is mathematically alive — the full board
// would be forty rows of noise. So each division shrinks to ONE line: leader,
// record, margin.
//
// DIVISIONS ONLY, deliberately: in April nobody is chasing a cut line, a
// wild-card race has no single leader for anything to be "by", and both devices
// that explain its signed numbers (the tick, the "3 spots" note) belong to the
// full board. Chases are out for the same reason — a .400 April average is noise.
//
// The switch is a CONDITION, not a calendar date: the board opens up once
// elimination math starts to bite (dev: gate on games-remaining).
function QuietRace({ r }) {
  const e = window.HOME_SEPT_EARLY[r.id];
  if (!e) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 700, marginBottom: 3 }}>{r.title}</div>
      {/* "14–6 by 2.0" was unreadable — an unlabelled number beside a record
         reads as another record. The margin now says what it is. A tie has no
         margin to state, so it says that instead. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 25, borderTop: `1px solid ${T.border}` }}>
        <window.TeamDot team={TEAMS[e.abbr]} size={18} />
        <span style={{ fontFamily: T.sans, fontSize: HS.base, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TEAMS[e.abbr].name}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: T.mono, fontSize: HS.sm, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{e.wl}</span>
        {Number(e.by) > 0
          ? <span style={{ fontFamily: T.sans, fontSize: HS.sm, color: T.textMuted, whiteSpace: 'nowrap' }}>leads by <span style={{ fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' }}>{e.by}</span></span>
          : <span style={{ fontFamily: T.sans, fontSize: HS.sm, color: T.textMuted, whiteSpace: 'nowrap' }}>tied at the top</span>}
      </div>
    </div>
  );
}

// Columns in the September band are divided by a vertical rule. Horizontal rules
// on this page mean "a section starts here"; a column divider is not one.
const colRule = { borderLeft: `1px solid ${T.border}`, paddingLeft: 20 };

function GroupLabel({ children }) {
  return <window.Eyebrow style={{ fontSize: HS.xs, color: T.textFaint }}>{children}</window.Eyebrow>;
}

// ---- IN THE NEWS — a SEPARATE section, deliberately (Sep 21, 2026).
//
// The boundary rule is the whole design: What's hot is what the app's own feeds
// PROVE is happening — generated, carrying structured context (a score, a race,
// a move), in the app's voice, and IQ can answer questions about it. A headline
// is what someone ELSE is claiming — fetched from a news API, carrying a source
// and a link, with no structured context at all. Merging them would put an IQ
// insight and an outside claim at equal weight in one list, and the reader
// could no longer tell which is the app's own judgment. That distinction is the
// most valuable thing this page has.
//
// Four rules follow:
//
//   1 HEADLINES VERBATIM AND ATTRIBUTED, never rewritten into our voice — a
//     paraphrased headline is a claim we did not verify. Every row links OUT;
//     this is a doorway, not a reader.
//   2 TIMESTAMPS ARE LEGITIMATE HERE AND NOWHERE ELSE on the page. Home drops
//     them everywhere else because a relative time on every row is the tell of
//     a news feed. But a headline's trustworthiness IS its source plus its age:
//     a three-hour-old report and a three-day-old one are different objects.
//   3 NO THUMBNAILS. One 80px image per row would out-weigh every generated
//     insight above it and turn Home into a portal.
//   4 DEDUPED AGAINST THE HOT LIST. If a headline's `subject` matches a hot
//     item, the hot item WINS and the headline is dropped — otherwise the page
//     states one fact twice with two provenances, which reads as a bug and
//     quietly devalues the generated version.
//
// It sits LAST and full width: the least authoritative content on the page gets
// the least prominent position. Two columns, so six rows cost one screen-inch.
function NewsRow({ n }) {
  const [hov, setHov] = React.useState(false);
  return (
    <a href="#" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'block', padding: '10px 8px 11px', margin: '0 -8px', borderTop: `1px solid ${T.border}`, textDecoration: 'none', background: hov ? T.surface : 'transparent' }}>
      <div style={{ fontFamily: T.sans, fontSize: HS.md, fontWeight: 500, lineHeight: 1.4, color: T.text, textWrap: 'pretty' }}>{n.title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 4 }}>
        <span style={{ fontFamily: T.sans, fontSize: HS.sm, fontWeight: 600, color: hov ? T.accent : T.textMuted }}>{n.source}</span>
        <span style={{ fontFamily: T.mono, fontSize: HS.sm, color: T.textFaint, fontVariantNumeric: 'tabular-nums' }}>{n.ago}</span>
      </div>
    </a>
  );
}

function NewsSection({ news, suppress }) {
  const shown = news.filter(n => !n.subject || !suppress.has(n.subject));
  if (!shown.length) return null;
  const cut = Math.ceil(shown.length / 2);
  return (
    <section style={{ gridColumn: '1 / -1', minWidth: 0 }}>
      <SectionHead label="In the news" note="From the wires · not Scorebook’s own reporting" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', columnGap: 24, alignItems: 'start' }}>
        <div>{shown.slice(0, cut).map(n => <NewsRow key={n.id} n={n} />)}</div>
        <div style={colRule}>{shown.slice(cut).map(n => <NewsRow key={n.id} n={n} />)}</div>
      </div>
    </section>
  );
}

// ---- WHAT'S HOT HAS A CEILING OF FIVE, and the sixth is not dropped — it is
// folded. Sep 21, 2026, from the 6-item state.
//
// The generator is supposed to be selective (1–3 is a typical day), but the
// client cannot assume it: on a Sunday in September six things can genuinely
// clear the bar. Letting the list run turns the section into the feed the page
// was designed against — and the sixth item pushes September below the fold to
// no one's benefit. So five show, the rest collapse behind one quiet line.
//
// It is an EXPANDER, not a "view all" link: there is no page of hot items to go
// to, and there should not be. Dropping the extras silently was the other
// option and it is worse — the user would never know the day had more in it.
const HOT_SHOWN = 5;

// ---- THE SEASON MODEL — three states, not two (Sep 21, 2026).
//
// The first pass had April (quiet) and the run-in (full board), which left June
// — most of the season — with nowhere to sit. Mid-season is a real third state:
// the standings mean something, so the full board is right, but nothing is
// decided, no club has clinched, and the cut line is not yet a deadline.
//
// THE SECTION IS CALLED "RACES" IN EVERY STATE (user's call, Sep 21). It was
// "September" in the run-in — named for the destination — which read as a
// mistake in the other two thirds of the season. The season now lives in the
// note beside the label ("9 games left in the regular season"), which is where
// a changing fact belongs; the label itself never moves.
//
// The switch between boards is a CONDITION (games remaining), never a calendar
// date — dev: one threshold, tuned, shared with the membership rule in
// `home-data.jsx`. `date` is MOCK: the page's dateline has to agree with the
// board beneath it, or the state reads as a bug rather than a season.
const SEASONS = {
  april: { label: 'Races', note: 'Opening weeks · nothing decided yet', date: 'Tuesday, April 14', quiet: true },
  june: { label: 'Races', note: '88 games left · nothing decided', date: 'Sunday, June 21', races: () => window.HOME_RACES_MID, chases: () => window.HOME_CHASES_MID },
  sept: { label: 'Races', note: '9 games left in the regular season', date: 'Friday, September 19', races: () => window.HOME_SEPT_TEAMS, chases: () => window.HOME_CHASES_RUNIN },
  // POSTSEASON (Sep 28, first pass): once the field is set, Races is irrelevant — the section
  // becomes the bracket (bracket.jsx), same slot, full width. Chases go too: the season is over.
  // Trigger = all 12 berths clinched (a CONDITION, like the other states), not a date.
  postset: { label: 'Postseason', note: 'Field set · Wild Card Series start Tuesday', date: 'Monday, September 28', post: 'set' },
  postds: { label: 'Postseason', note: 'Division Series · 8 clubs left', date: 'Wednesday, October 7', post: 'ds' },
};

// ---- NARROW LAYOUT (Sep 21, 2026).
//
// The two-column row is only a layout while both columns can hold their
// content. The rail is a FIXED 320px, so at an 850px frame it takes 43% of the
// width and the hot sentence — the most important text on the page — was
// squeezed to a ~214px measure: six lines of 18px type with three words
// orphaned on the last. The page's least important column had the only
// guaranteed width.
//
// So below 1000px the grid collapses to ONE column and the rail moves out of
// row 1, under What's hot. It stops being a rail (nothing to sit beside) and
// stops being sticky (nothing to stay level with), and its height is no longer
// matched to the hot column — there is no column beside it to match.
function useNarrow(px = 1000) {
  const q = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = React.useState(() => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(q);
    const on = e => setNarrow(e.matches);
    setNarrow(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, [q]);
  return narrow;
}

window.HomeScreen = function HomeScreen({ initialCount = 3, initialFollows, initialSeason = 'sept', date, hotSource, racesSource, seasonNote, newsSource, showChases = true, showControls = true, followClips, onFollowClip, followFaces }) {
  const [count, setCount] = React.useState(initialCount); // MOCK CONTROL — not for port
  const [chaseLg, setChaseLg] = React.useState('al'); // Chases league scope — AL / NL
  const [openIQ, setOpenIQ] = React.useState(null);
  const [showAllHot, setShowAllHot] = React.useState(false);
  // Follow set — device-local in the app (localStorage now, an account record later).
  const [rawFollows, setFollows] = React.useState(initialFollows === undefined ? window.HOME_FOLLOWING : initialFollows);
  const [managing, setManaging] = React.useState(false);
  const [season, setSeason] = React.useState(initialSeason); // MOCK — april / june / run-in
  const S = SEASONS[season];
  // LIVE FIRST, then the given order. It is the sort that matters at twenty: a
  // live row below the fold of a scrolling rail is a row you will not see.
  const follows = React.useMemo(
    () => rawFollows.slice().sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0)),
    [rawFollows]);
  const hot = (hotSource || window.HOME_HOT).slice(0, count);
  const items = showAllHot ? hot : hot.slice(0, HOT_SHOWN);
  const hidden = hot.length - items.length;
  const narrow = useNarrow(1000);
  const races = S.post ? [] : S.quiet ? window.HOME_SEPT_TEAMS : (racesSource || S.races());
  const col = { maxWidth: 1240, margin: '0 auto' };
  const tog = id => () => setOpenIQ(openIQ === id ? null : id);

  // ---- THE TWO COLUMNS SIZE EACH OTHER (Sep 21, 2026).
  // The rail is capped by the hot column (`hotH`), and the hot column grows its
  // day-ahead tail toward the rail's content (`railH`). Both are MEASURED: a
  // percentage max-height is ignored while the grid sizes its row, and only the
  // rail knows how tall 20 rows actually are.
  const hotRef = React.useRef(null);
  const [hotH, setHotH] = React.useState(0);
  const coreRef = React.useRef(null);   // the hot list WITHOUT the day-ahead tail
  const [coreH, setCoreH] = React.useState(0);
  const [railH, setRailH] = React.useState(0); // the rail's full content height
  const [vh, setVh] = React.useState(typeof window !== 'undefined' ? window.innerHeight : 900);
  React.useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const obs = [];
    const watch = (el, set) => { if (!el) return; const ro = new ResizeObserver(() => set(el.offsetHeight)); ro.observe(el); set(el.offsetHeight); obs.push(ro); };
    watch(hotRef.current, setHotH);
    watch(coreRef.current, setCoreH);
    return () => obs.forEach(ro => ro.disconnect());
  }, []);

  // The day-ahead count is DERIVED, not fixed: enough real games to bring the
  // hot column up to the rail, capped at five (a shortlist, not the slate) and
  // at what the generator offered. No oscillation — `coreH` excludes the tail,
  // so growing the tail cannot change the input that sized it.
  const ROW = 47; // one day-ahead row
  const target = narrow ? 0 : Math.min(railH || 0, vh - 36);
  const fill = items.length === 0 ? 4
    : (coreH && target > coreH ? Math.min(5, Math.ceil((target - coreH) / ROW)) : 0);
  const ahead = window.HOME_TODAY.slice(0, fill);

  return (
    <div style={{ width: '100%', background: T.bg, color: T.text, fontFamily: T.sans, minHeight: 900, position: 'relative' }}>
      {/* iqContext names the page so an answer's scope is never a guess. */}
      <window.BrandHeader active="home" colStyle={col} iqContext="Today across the league" iqScope={{ kind: 'league' }} />
      <div style={col}>
        <window.PageTitle title="Home" subtitle={date || S.date} />

        {/* The rail is a real column, not a floating panel: it shares the page's
            gutters and carries its own section head, so it reads as part of the
            page rather than an ad slot.

            ---- TWO ROWS, not two columns (Sep 21, 2026). The rail only ever
            holds eight rows (≈430px) and What's hot is about the same height, so
            a rail spanning the whole grid left Races in an 824px column with
            empty rail beside it. Races now spans the FULL 1184 in row 2, which
            is what lets Divisions · Wild card · Chases be three real columns
            rather than 2 + a wrapped orphan.
            The cost, accepted: the rail's sticky travel ends with row 1, so
            Following scrolls away once you are reading the board. It is a
            dashboard of what is true now — the board is not competing with it
            for the same glance. */}
        <div style={{ padding: '2px 28px 56px', display: 'grid', gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) 320px', columnGap: 40, rowGap: 40, alignItems: 'start' }}>

          {/* ---- 1 WHAT'S HOT RIGHT NOW — the dominant section. Sized by its
               content, never padded to a fixed height: 1 item is a legitimate
               day, and so is 0. ---- */}
          <section style={{ minWidth: 0 }} ref={hotRef}>
              <div ref={coreRef}>
              <SectionHead label="What's hot right now" />
              {items.length === 0 ? (
                <DayAhead games={ahead} />
              ) : items.map(it => (
                <HotItem key={it.id} item={it} open={openIQ === it.id} onToggleIQ={tog(it.id)} />
              ))}
              {/* The fold. One line, no border of its own — it is the list's
                  last row, not a control bar. */}
              {hot.length > HOT_SHOWN && (
                <button onClick={() => setShowAllHot(v => !v)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 0 0 37px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.sans, fontSize: HS.base, fontWeight: 600, color: T.accent }}>
                  {showAllHot ? 'Show fewer' : `${hidden} more`}
                </button>
              )}
              </div>
              {items.length > 0 && ahead.length > 0 && <DayAhead games={ahead} tail />}
            </section>

          {/* ---- 2 FOLLOWING — a DASHBOARD of current state, not a feed, and a
               sticky rail so it is readable while the rest of the page is.
               Teams and players only, ≤20, sorted live-first.
               The grid item STRETCHES to the row (i.e. to the hot list's
               height) and the sticky panel inside it is bounded by that — which
               is what stops a 20-row rail from stranding the left column. See
               FollowRail. ---- */}
          <aside style={{ minWidth: 0, gridColumn: narrow ? '1 / -1' : 2, gridRow: narrow ? 'auto' : 1 }}>
            <div style={narrow
              ? { display: 'flex', flexDirection: 'column', maxHeight: '70vh' }
              : { position: 'sticky', top: 18, display: 'flex', flexDirection: 'column',
                  maxHeight: hotH ? `min(${hotH}px, calc(100vh - 36px))` : 'calc(100vh - 36px)' }}>
            <SectionHead label="Following" tight
              note={follows.length ? (follows.length > 8 ? `${follows.length}` : null) : 'Nothing followed yet'}
              right={follows.length
                ? <span onClick={() => setManaging(m => !m)} style={{ fontFamily: T.sans, fontSize: HS.sm, fontWeight: 600, color: T.accent, cursor: 'pointer' }}>Manage</span>
                : null} />
            {managing && (
              <ManagePanel list={follows} onClose={() => setManaging(false)}
                onRemove={name => setFollows(fs => fs.filter(f => f.name !== name))}
                onAdd={r => setFollows(fs => fs.concat([{ ...r, tiles: ['Season line pending'] }]))} />
            )}
            {/* FIRST RUN is the default state for every new user, not an edge
                case: the button is the SECOND entrance to the same panel. */}
            {follows.length === 0 && !managing && (
              <div style={{ padding: '6px 0 4px', display: 'grid', gap: 12, justifyItems: 'start' }}>
                <span style={{ fontFamily: T.sans, fontSize: HS.base, color: T.textMuted, textWrap: 'pretty' }}>
                  Follow teams and players to see how they are doing without going to look.
                </span>
                <button onClick={() => setManaging(true)} style={{ ...window.btnPrimary }}>Choose teams and players</button>
              </div>
            )}
            {follows.length > 0 && <FollowRail follows={follows} onContent={setRailH} followClips={followClips} onFollowClip={onFollowClip} followFaces={followFaces} />}
            </div>
          </aside>

          {/* ---- 3 RACES — the fixed board: all eight team races every day in a
               constant order. FULL WIDTH, spanning both columns in row 2, and
               TWO columns: Divisions · Wild card. ---- */}
          <section style={{ gridColumn: '1 / -1', minWidth: 0 }}>
            <SectionHead label={S.label} note={seasonNote || S.note} />
            {S.post ? (
              window.PlayoffBracket ? <window.PlayoffBracket state={S.post} followed={follows.filter(f => f.kind === 'team').map(f => f.k)} /> : null
            ) : S.quiet ? (
              /* Quiet mode: six division one-liners. No wild cards, no chases. */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
                <div>{races.filter(r => !r.wc).slice(0, 3).map(r => <QuietRace key={r.id} r={r} />)}</div>
                <div style={colRule}>{races.filter(r => !r.wc).slice(3).map(r => <QuietRace key={r.id} r={r} />)}</div>
                <div style={colRule}>
                  <span style={{ fontFamily: T.sans, fontSize: HS.base, color: T.textFaint, textWrap: 'pretty' }}>Wild cards and chases open up once elimination math starts to bite.</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, alignItems: 'start' }}>
                <div>
                  <GroupLabel>Divisions</GroupLabel>
                  <div style={{ marginTop: 9 }}>{races.filter(r => !r.wc).map(r => <RaceCard key={r.id} r={r} />)}</div>
                </div>
                <div style={colRule}>
                  <GroupLabel>Wild card</GroupLabel>
                  <div style={{ marginTop: 9 }}>{races.filter(r => r.wc).map(r => <RaceCard key={r.id} r={r} />)}</div>
                </div>
              </div>
            )}
          </section>

          {/* ---- 4 CHASES — ITS OWN SECTION (user's call, Sep 21), not a group
               inside Races. "A batting title is a race" was true of the word and
               false of the object: a team race has a cut line, a deadline and an
               elimination rule, and every device on a race row (the rust tick,
               "3 spots", games left) belongs to that. A chase has none of them,
               so sharing one band forced a single set of column rules onto two
               different things — and in a four-column band the reader had to
               scan past the wild card to find Judge.
               Absent in quiet mode: a .400 April average is noise. ---- */}
          {!S.quiet && !S.post && showChases && (
            <section style={{ gridColumn: '1 / -1', minWidth: 0 }}>
              {/* AL/NL sits in the header row, right-justified: it scopes the
                  whole section, so it belongs to the section's own line rather
                  than repeating above Hitting and Pitching. Races need no such
                  control — both leagues' boards are on screen at once; a chase
                  is a per-league title, so one league shows at a time. */}
              <SectionHead label="Chases" note="Individual leaders · top three"
                right={<div style={{ alignSelf: 'center' }}><window.Segmented items={['AL', 'NL']} active={chaseLg === 'al' ? 0 : 1}
                  onClick={i => setChaseLg(i === 0 ? 'al' : 'nl')} size="sm" /></div>} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, alignItems: 'start' }}>
                <div>
                  <GroupLabel>Hitting</GroupLabel>
                  <div style={{ marginTop: 9 }}>{S.chases().hitting.map(c => <ChaseCard key={c.id} c={c} lg={chaseLg} />)}</div>
                </div>
                <div style={colRule}>
                  <GroupLabel>Pitching</GroupLabel>
                  <div style={{ marginTop: 9 }}>{S.chases().pitching.map(c => <ChaseCard key={c.id} c={c} lg={chaseLg} />)}</div>
                </div>
              </div>
            </section>
          )}

          {/* ---- 5 IN THE NEWS — last, because it is the least authoritative
               content on the page. See NewsSection for the boundary rule. ---- */}
          <NewsSection news={newsSource || window.HOME_NEWS} suppress={new Set(items.map(it => it.id))} />
        </div>
      </div>

      {/* MOCK CONTROL — NOT FOR PORT. Proves the sections hold at every size.
          IN NORMAL FLOW, at the foot of the page, NOT viewport-fixed: as a
          fixed panel it covered whatever sat bottom-right, and in the narrow
          layout that was Following's head — the Manage link became unclickable
          (clicks landed on the Season toggle). Collapsing it to a chip only
          shrank the blocked area. A review control must never sit on top of the
          thing being reviewed, so it takes its own row instead. */}
      {showControls && <div style={{ ...col }}>
        <div style={{ margin: '0 28px 28px', padding: '10px 13px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, background: T.surfaceAlt, border: `1px dashed ${T.borderStrong}`, borderRadius: T.r.md }}>
          <window.Eyebrow style={{ fontSize: HS.xs, color: T.textFaint }}>Mock states · not for port</window.Eyebrow>
          <span style={{ flex: 1 }} />
          <window.Eyebrow style={{ fontSize: HS.xs, color: T.textFaint }}>Hot</window.Eyebrow>
          <window.Segmented items={['0', '1', '3', '6']} active={[0, 1, 3, 6].indexOf(count)} onClick={i => { setCount([0, 1, 3, 6][i]); setOpenIQ(null); setShowAllHot(false); }} size="sm" />
          <window.Eyebrow style={{ fontSize: HS.xs, color: T.textFaint }}>Follows</window.Eyebrow>
          <window.Segmented items={['0', '8', '20']} active={follows.length === 0 ? 0 : follows.length > 8 ? 2 : 1}
            onClick={i => { setFollows(i === 0 ? [] : i === 1 ? window.HOME_FOLLOWING : window.HOME_FOLLOWING_MANY); setManaging(false); }} size="sm" />
          <window.Eyebrow style={{ fontSize: HS.xs, color: T.textFaint }}>Season</window.Eyebrow>
          <window.Segmented items={['April', 'June', 'Run-in', 'Field set', 'Oct · DS']} active={['april', 'june', 'sept', 'postset', 'postds'].indexOf(season)} onClick={i => setSeason(['april', 'june', 'sept', 'postset', 'postds'][i])} size="sm" />
        </div>
      </div>}
    </div>
  );
};
