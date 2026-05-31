/* global React, T, TEAMS */

// ============================================================
// GAME VIEW v2 — WIREFRAME r4
//  · Play-state eyebrow LIGHTENED (cream surface, dark text)
//  · Dark band becomes THREE zones:
//      line score | scoring summary | game leaders
// ============================================================

const W4 = {
  label: { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text, fontFamily: T.sans },
  hint: { fontSize: 11, color: T.textFaint, fontStyle: 'italic', fontFamily: T.sans },
  grey: {
    background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6,
    color: T.textFaint, fontSize: 11, padding: '10px 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    fontFamily: T.mono,
  },
};

function W4Box({ label, hint, children, style }) {
  return (
    <div style={{
      background: '#fff', border: `1.5px dashed ${T.borderStrong}`, borderRadius: 8,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10, ...style,
    }}>
      {label !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={W4.label}>{label}</span>
          {hint && <span style={W4.hint}>{hint}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

// ---------- Dark band: line score + scoring summary + game leaders ----------

function W4DarkBand() {
  const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const hou = [0, 1, 0, 0, 2, 0, 1, 4, null];
  const chc = [0, 0, 1, 2, 0, 1, 1, 0, null];
  const cur = 9;

  const cell = (v, isCur) => (
    <div style={{
      width: 28, textAlign: 'center',
      fontFamily: T.mono, fontSize: 14, fontVariantNumeric: 'tabular-nums',
      color: v === null ? '#52525b' : '#fff',
      background: isCur ? 'rgba(184,66,30,0.22)' : 'transparent',
      padding: '5px 0', borderRadius: 4,
    }}>{v === null ? '–' : v}</div>
  );
  const rhe = (v, accent) => (
    <div style={{ width: 34, textAlign: 'center', fontFamily: T.mono, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: accent ? '#fff' : '#d4d4d8' }}>{v}</div>
  );
  const Row = ({ team, name, runs, r, h, e, bold }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 132, display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 24, height: 24, borderRadius: 5, background: team.primary, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.sans, fontSize: 9, fontWeight: 700 }}>{team.abbr}</div>
        <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: bold ? 700 : 600, color: '#fff' }}>{name}</span>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>{runs.map((v, i) => <React.Fragment key={i}>{cell(v, innings[i] === cur)}</React.Fragment>)}</div>
      <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
        {rhe(r, true)}{rhe(h)}{rhe(e)}
      </div>
    </div>
  );

  const ZoneHead = ({ children }) => (
    <div style={{ fontSize: 9, color: '#71717a', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>{children}</div>
  );

  return (
    <div style={{ background: T.ink, borderRadius: 10, padding: '16px 20px', display: 'grid', gridTemplateColumns: '660px 1fr 1fr', gap: 0 }}>
      {/* Zone 1 — line score */}
      <div style={{ paddingRight: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 132, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ fontSize: 9, color: '#a1a1aa', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Live · ▼9th</span>
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {innings.map(i => <div key={i} style={{ width: 28, textAlign: 'center', fontFamily: T.mono, fontSize: 10, color: i === cur ? T.accent : '#71717a', fontWeight: 700 }}>{i}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 2, paddingLeft: 10, marginLeft: 8, borderLeft: '1px solid #3f3f46' }}>
            {['R', 'H', 'E'].map(x => <div key={x} style={{ width: 34, textAlign: 'center', fontFamily: T.sans, fontSize: 10, color: '#71717a', fontWeight: 700 }}>{x}</div>)}
          </div>
        </div>
        <Row team={TEAMS.HOU} name="Houston" runs={hou} r={8} h={11} e={0} bold />
        <div style={{ height: 1, background: '#27272a', margin: '6px 0' }} />
        <Row team={TEAMS.CHC} name="Chicago Cubs" runs={chc} r={5} h={9} e={1} />
      </div>

      {/* Zone 2 — scoring summary */}
      <div style={{ padding: '0 20px', borderLeft: '1px solid #27272a' }}>
        <ZoneHead>Scoring summary</ZoneHead>
        {[
          { inn: '3rd', txt: 'Suzuki RBI single (CHC 1–0)', team: TEAMS.CHC },
          { inn: '5th', txt: 'Tucker 2-run HR (HOU 2–1)', team: TEAMS.HOU },
          { inn: '8th', txt: 'Bregman bases-clearing 2B', team: TEAMS.HOU },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'baseline' }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, fontWeight: 700, width: 26, flexShrink: 0 }}>{s.inn}</span>
            <span style={{ fontFamily: T.sans, fontSize: 12, color: '#d4d4d8', lineHeight: 1.35 }}>{s.txt}</span>
          </div>
        ))}
        <div style={{ ...W4.hint, color: '#52525b' }}>+ 2 more · scrolls or truncates</div>
      </div>

      {/* Zone 3 — game leaders */}
      <div style={{ padding: '0 0 0 20px', borderLeft: '1px solid #27272a' }}>
        <ZoneHead>Game leaders</ZoneHead>
        {[
          { team: TEAMS.HOU, name: 'Yordan Álvarez', line: '2-4 · HR · 3 RBI' },
          { team: TEAMS.CHC, name: 'Seiya Suzuki', line: '2-3 · 2B · BB' },
        ].map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: g.team.primary, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.sans, fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{g.team.abbr}</div>
            <div>
              <div style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: '#fff' }}>{g.name}</div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: '#a1a1aa' }}>{g.line}</div>
            </div>
          </div>
        ))}
        <div style={{ ...W4.hint, color: '#52525b' }}>top batter each side · could add pitching leader</div>
      </div>
    </div>
  );
}

// ---------- Sticky zone card with LIGHTENED play-state eyebrow ----------

function W4ZoneCard() {
  const pip = (filled, color) => (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: filled ? color : 'transparent', border: `1.5px solid ${filled ? color : T.borderStrong}`, display: 'inline-block' }} />
  );
  return (
    <W4Box style={{ position: 'sticky', top: 16, padding: 0, gap: 0, overflow: 'hidden' }}>
      {/* LIGHTENED play-state eyebrow — cream surface, dark text */}
      <div style={{
        background: T.surfaceAlt, color: T.text, padding: '11px 16px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text }}>▼ 9th</span>
          {/* bases diamond placeholder */}
          <span style={{ ...W4.grey, width: 38, height: 28, fontSize: 9, color: T.textMuted }}>◆ 1,2</span>
          {/* B / S / O with pips */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.textMuted }}>B</span>{pip(1, T.info)}{pip(1, T.info)}{pip(0)}</span>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.textMuted }}>S</span>{pip(1, T.text)}{pip(0)}</span>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.textMuted }}>O</span>{pip(1, T.accent)}{pip(1, T.accent)}</span>
          </div>
        </div>
        <span style={{ background: T.accent, color: '#fff', padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={W4.hint}>↑ play-state eyebrow now LIGHT (cream surface, dark text + colored pips) — only the line score band stays dark up top</span>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14 }}>
          <div style={{ ...W4.grey, height: 240, flexDirection: 'column', gap: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Strike zone<br />(all pitches this AB)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={W4.label}>Batter card</span>
            <div style={{ ...W4.grey, height: 60 }}>photo</div>
            <div style={{ ...W4.grey, height: 20, justifyContent: 'flex-start', paddingLeft: 10 }}>Bregman · 3B · R/R</div>
            <div style={{ ...W4.grey, height: 20, justifyContent: 'flex-start', paddingLeft: 10 }}>.250 / .338 / .346</div>
            <div style={{ ...W4.grey, height: 28, justifyContent: 'flex-start', paddingLeft: 10 }}>Today 1-for-4 · vs Pearson 0-for-2</div>
          </div>
        </div>

        <div style={{ background: T.ink, color: '#fff', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: '#a1a1aa', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>Last pitch · #2 of AB</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Four-Seam Fastball</div>
          </div>
          <span style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700 }}>100<span style={{ fontSize: 10, color: '#a1a1aa' }}> MPH</span></span>
        </div>
      </div>
    </W4Box>
  );
}

// ---------- Assembly ----------

window.GameScreenV2WireframeR4 = function GameScreenV2WireframeR4() {
  return (
    <div style={{ background: T.bg, minHeight: '100%', padding: 24, fontFamily: T.sans, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.textMuted }}>
        <span>← Today's games · Houston Astros @ Chicago Cubs · Wrigley</span>
        <span style={{ display: 'flex', gap: 8 }}><span style={{ padding: '4px 12px', border: `1px solid ${T.border}`, borderRadius: 999, background: T.bg, color: T.text, fontWeight: 600 }}>Lineup ▾</span><span>🔔 (3)</span></span>
      </div>

      {/* dark band: line score + scoring summary + game leaders */}
      <W4DarkBand />

      <div style={{ display: 'grid', gridTemplateColumns: '600px 1fr', gap: 14, alignItems: 'start' }}>
        <W4ZoneCard />
        <W4Box label="Pitch by pitch" hint="internal scroll, unchanged" style={{ height: 560 }}>
          <div style={{ ...W4.grey, flex: 1, flexDirection: 'column', gap: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>live PA expanded · finished collapsed<br />newest at top · internal scroll</div>
        </W4Box>
      </div>

      <W4Box label="On the mound — pitcher card" hint="unchanged" style={{ height: 110 }}>
        <div style={{ ...W4.grey, flex: 1 }}>Pearson · photo · ERA · pitch count · today's line</div>
      </W4Box>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <W4Box label="Win probability" style={{ height: 84 }}><div style={{ ...W4.grey, flex: 1 }}>84% HOU</div></W4Box>
        <W4Box label="Leverage" style={{ height: 84 }}><div style={{ ...W4.grey, flex: 1 }}>2.4×</div></W4Box>
      </div>

      <div style={{ padding: '10px 14px', background: T.highlightSoft, border: `1px dashed ${T.highlight}`, borderRadius: 6, fontSize: 11, color: T.text }}>
        <strong>Wireframe r4.</strong> Play-state eyebrow is now <strong>light</strong> (cream surface, dark text, colored B/S/O pips) so only the line-score band reads dark up top. The dark band fills its right side with <strong>two zones</strong>: scoring summary (when/how runs scored) and game leaders (top batter each side). ~660px line score + ~360px + ~360px fits comfortably at 1440.
      </div>
    </div>
  );
};
