/* global React, T, TEAMS */

// ============================================================
// GAME VIEW v2 — WIREFRAME r3
// Testing two changes:
//  1. Dark line score REPLACES the score strip (runs per inning + R/H/E)
//  2. Play-state (inning · bases · B/S/O) moves to TOP of sticky zone card
// ============================================================

const W3 = {
  label: { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text, fontFamily: T.sans },
  hint: { fontSize: 11, color: T.textFaint, fontStyle: 'italic', fontFamily: T.sans },
  grey: {
    background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6,
    color: T.textFaint, fontSize: 11, padding: '10px 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    fontFamily: T.mono, letterSpacing: '0.04em', textTransform: 'uppercase',
  },
};

function W3Box({ label, hint, children, style }) {
  return (
    <div style={{
      background: '#fff', border: `1.5px dashed ${T.borderStrong}`, borderRadius: 8,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10, ...style,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={W3.label}>{label}</span>
        {hint && <span style={W3.hint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ---------- The new line score (dark) ----------

function W3LineScore() {
  const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const hou = [0, 1, 0, 0, 2, 0, 1, 4, null];
  const chc = [0, 0, 1, 2, 0, 1, 1, 0, null];
  const cur = 9; // current inning (highlight column)

  const cell = (v, isCur) => (
    <div style={{
      width: 34, textAlign: 'center',
      fontFamily: T.mono, fontSize: 15, fontVariantNumeric: 'tabular-nums',
      color: v === null ? '#52525b' : '#fff',
      background: isCur ? 'rgba(184,66,30,0.22)' : 'transparent',
      padding: '6px 0', borderRadius: 4,
    }}>{v === null ? '–' : v}</div>
  );

  const rheCell = (v, accent) => (
    <div style={{
      width: 40, textAlign: 'center',
      fontFamily: T.mono, fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
      color: accent ? '#fff' : '#d4d4d8',
    }}>{v}</div>
  );

  const Row = ({ team, name, runs, r, h, e, bold }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <div style={{ width: 150, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 5, background: team.primary, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.sans, fontSize: 10, fontWeight: 700 }}>{team.abbr}</div>
        <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: bold ? 700 : 600, color: '#fff' }}>{name}</span>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {runs.map((v, i) => <React.Fragment key={i}>{cell(v, innings[i] === cur)}</React.Fragment>)}
      </div>
      <div style={{ width: 14 }} />
      <div style={{ display: 'flex', gap: 4, paddingLeft: 12, borderLeft: '1px solid #3f3f46' }}>
        {rheCell(r, true)}{rheCell(h)}{rheCell(e)}
      </div>
    </div>
  );

  return (
    <div style={{ background: T.ink, borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* column headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <div style={{ width: 150, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Live · ▼ 9th</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {innings.map(i => (
            <div key={i} style={{ width: 34, textAlign: 'center', fontFamily: T.mono, fontSize: 11, color: i === cur ? T.accent : '#71717a', fontWeight: 700 }}>{i}</div>
          ))}
        </div>
        <div style={{ width: 14 }} />
        <div style={{ display: 'flex', gap: 4, paddingLeft: 12, borderLeft: '1px solid #3f3f46' }}>
          {['R', 'H', 'E'].map(x => (
            <div key={x} style={{ width: 40, textAlign: 'center', fontFamily: T.sans, fontSize: 11, color: '#71717a', fontWeight: 700, letterSpacing: '0.08em' }}>{x}</div>
          ))}
        </div>
      </div>

      <Row team={TEAMS.HOU} name="Houston" runs={hou} r={8} h={11} e={0} bold />
      <div style={{ height: 1, background: '#27272a' }} />
      <Row team={TEAMS.CHC} name="Chicago Cubs" runs={chc} r={5} h={9} e={1} />
    </div>
  );
}

// ---------- Sticky zone card with play-state moved to top ----------

function W3ZoneCard() {
  return (
    <W3Box label="" style={{ position: 'sticky', top: 16, padding: 0, gap: 0, overflow: 'hidden' }}>
      {/* NEW: play-state eyebrow at the very top */}
      <div style={{
        background: T.ink, color: '#fff', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* inning */}
          <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700 }}>▼ 9th</span>
          {/* bases diamond placeholder */}
          <span style={{ ...W3.grey, width: 40, height: 30, background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa', fontSize: 9 }}>◆</span>
          {/* B/S/O */}
          <div style={{ display: 'flex', gap: 12, fontFamily: T.mono, fontSize: 12, color: '#d4d4d8' }}>
            <span>B ●●○</span><span>S ●○</span><span>O ●●</span>
          </div>
        </div>
        <span style={{ background: T.accent, color: '#fff', padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={W3.hint}>↑ play-state (inning · bases · balls/strikes/outs) now lives here, above the zone — relates to the whole live unit, not just the batter</span>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14 }}>
          <div style={{ ...W3.grey, height: 240, flexDirection: 'column', gap: 8 }}>
            Strike zone<br />(all pitches this AB)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={W3.label}>Batter card</span>
            <div style={{ ...W3.grey, height: 64 }}>photo</div>
            <div style={{ ...W3.grey, height: 20, justifyContent: 'flex-start', paddingLeft: 10 }}>Bregman · 3B · R/R</div>
            <div style={{ ...W3.grey, height: 20, justifyContent: 'flex-start', paddingLeft: 10 }}>.250 / .338 / .346</div>
            <div style={{ ...W3.grey, height: 28, justifyContent: 'flex-start', paddingLeft: 10 }}>Today 1-for-4 · vs Pearson 0-for-2</div>
          </div>
        </div>

        {/* last pitch headline — note: NO bases/count here anymore */}
        <div style={{ background: T.ink, color: '#fff', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: '#a1a1aa', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Last pitch · #2 of AB</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Four-Seam Fastball</div>
          </div>
          <span style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700 }}>100<span style={{ fontSize: 10, color: '#a1a1aa' }}> MPH</span></span>
        </div>
      </div>
    </W3Box>
  );
}

// ---------- Assembly ----------

window.GameScreenV2WireframeR3 = function GameScreenV2WireframeR3() {
  return (
    <div style={{ background: T.bg, minHeight: '100%', padding: 24, fontFamily: T.sans, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.textMuted }}>
        <span>← Today's games · Houston Astros @ Chicago Cubs · Wrigley</span>
        <span style={{ display: 'flex', gap: 8 }}><span style={{ padding: '4px 12px', border: `1px solid ${T.border}`, borderRadius: 999, background: T.bg, color: T.text, fontWeight: 600 }}>Lineup ▾</span><span>🔔 (3)</span></span>
      </div>

      {/* CHANGE 1: line score replaces the dark score strip */}
      <W3LineScore />

      {/* two-column row; CHANGE 2 is inside the left card */}
      <div style={{ display: 'grid', gridTemplateColumns: '600px 1fr', gap: 14, alignItems: 'start' }}>
        <W3ZoneCard />
        <W3Box label="Pitch by pitch" hint="internal scroll, unchanged" style={{ height: 560 }}>
          <div style={{ ...W3.grey, flex: 1, flexDirection: 'column', gap: 8 }}>
            live PA expanded · finished PAs collapsed<br />newest at top · internal scroll
          </div>
        </W3Box>
      </div>

      {/* below fold unchanged */}
      <W3Box label="On the mound — pitcher card" hint="unchanged" style={{ height: 120 }}>
        <div style={{ ...W3.grey, flex: 1 }}>Pearson · photo · ERA · pitch count · today's line</div>
      </W3Box>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <W3Box label="Win probability" style={{ height: 90 }}><div style={{ ...W3.grey, flex: 1 }}>84% HOU</div></W3Box>
        <W3Box label="Leverage" style={{ height: 90 }}><div style={{ ...W3.grey, flex: 1 }}>2.4×</div></W3Box>
      </div>

      <div style={{ padding: '10px 14px', background: T.highlightSoft, border: `1px dashed ${T.highlight}`, borderRadius: 6, fontSize: 11, color: T.text }}>
        <strong>Wireframe r3.</strong> Two changes under test: (1) the flat HOU 8 / CHC 5 score strip becomes a <strong>dark line score</strong> — runs per inning + R/H/E, current inning highlighted in rust; (2) <strong>play-state moves</strong> out of the score area and into a dark eyebrow at the top of the sticky zone card, so bases/count/outs sit with the live action. The "last pitch" headline no longer carries the count.
      </div>
    </div>
  );
};
