/* global React, T */

// ============================================================
// GAME VIEW v2 — WIREFRAME r2 (Option A revised)
// Changes from r1:
//  · Pitch list gets INTERNAL scroll (fixed-height frame).
//  · Matchup detail moved BELOW the live block, with photos.
//  · Lineup REMOVED from page; reachable via drawer button in header.
//  · Sticky zone column stays.
// ============================================================

const W2 = {
  box: {
    background: '#ffffff',
    border: `1.5px dashed ${T.borderStrong}`,
    borderRadius: 8,
    padding: 16,
    color: T.textMuted,
    fontFamily: T.sans,
    fontSize: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  filled: {
    background: T.surfaceAlt,
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    color: T.textFaint,
    fontSize: 11,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontFamily: T.mono,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: T.text,
    fontFamily: T.sans,
  },
  hint: {
    fontSize: 11,
    color: T.textFaint,
    fontStyle: 'italic',
    fontFamily: T.sans,
  },
};

function W2Box({ label, hint, height, children, style }) {
  return (
    <div style={{ ...W2.box, minHeight: height, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={W2.label}>{label}</span>
        {hint && <span style={W2.hint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function W2Grey({ h, children, style }) {
  return <div style={{ ...W2.filled, height: h, ...style }}>{children}</div>;
}

// ---------- Header with lineup drawer button ----------

function W2Header() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      fontSize: 12,
      color: T.textMuted,
      fontFamily: T.sans,
    }}>
      <span>← Today's games &nbsp;·&nbsp; Houston Astros @ Chicago Cubs &nbsp;·&nbsp; Wrigley · ▼ 9th</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{
          padding: '6px 12px',
          border: `1px solid ${T.border}`,
          borderRadius: 999,
          background: T.bg,
          fontFamily: T.sans,
          color: T.text,
          fontWeight: 600,
        }}>
          Lineup ▾
        </span>
        <span>🔔 alerts (3)</span>
      </div>
    </div>
  );
}

// ---------- Scoreboard ----------

function W2Scoreboard() {
  return (
    <div style={{
      background: T.ink,
      borderRadius: 8,
      padding: 18,
      color: '#fff',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: 18,
    }}>
      <div style={{ ...W2.label, color: '#a1a1aa', fontFamily: T.sans }}>HOU score block</div>
      <div style={{ ...W2.label, color: '#fff', fontSize: 11 }}>▼ 9th · 2 OUT · LIVE</div>
      <div style={{ ...W2.label, color: '#a1a1aa', fontFamily: T.sans, textAlign: 'right' }}>CHC score block</div>
    </div>
  );
}

// ---------- Zone column (sticky) ----------

function W2ZoneColumn() {
  return (
    <W2Box
      label="Zone + last-pitch column"
      hint="sticky"
      style={{ position: 'sticky', top: 16, alignSelf: 'start' }}
    >
      <W2Grey h={300}>
        Strike zone diagram<br />
        (last 2 pitches plotted)
      </W2Grey>
      <W2Grey h={28}>zone legend · in play / ball / strike</W2Grey>
      <div style={{
        background: T.ink, color: '#fff', borderRadius: 6, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ ...W2.label, fontSize: 9, color: '#a1a1aa' }}>Last pitch · #2 of AB</div>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.sans }}>Four-Seam Fastball</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 700 }}>100</span>
          <span style={{ fontSize: 10, color: '#a1a1aa' }}>MPH</span>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: '#a1a1aa' }}>BALL · 1-0</span>
        </div>
      </div>
    </W2Box>
  );
}

// ---------- Pitch list (internal scroll) ----------

function W2PitchList() {
  // Show the OUTER FRAME (fixed height) and the INNER SCROLLING CONTENT.
  // PAs simulated: live one expanded with pitch table; others collapsed.
  return (
    <W2Box
      label="Pitch by pitch — fixed-height frame with internal scroll"
      hint="frame ~620px; content overflows internally"
      style={{ borderStyle: 'solid', borderColor: T.border, background: T.surface, padding: 0, gap: 0 }}
    >
      {/* Filter bar */}
      <div style={{ padding: 14, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={W2.label}>Pitch by pitch</span>
        <W2Grey h={28} style={{ width: 320 }}>⊟ All · Outcomes · Runs · K · HR · BB &nbsp;·&nbsp; ↓ Auto-scroll</W2Grey>
      </div>

      {/* Scroll frame */}
      <div style={{
        height: 560,
        overflow: 'hidden',
        position: 'relative',
        background: T.bg,
        borderTop: `1px dashed ${T.borderStrong}`,
        borderBottom: `1px dashed ${T.borderStrong}`,
      }}>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* LIVE PA, expanded */}
          <div style={{ background: T.accentSoft + '40', borderLeft: `3px solid ${T.accent}`, padding: 12, borderRadius: 4 }}>
            <div style={{ fontFamily: T.sans, fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 6 }}>
              BOT 9 · ● Bregman · At bat · 1-0 · <span style={{ color: T.accent }}>LIVE</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 80px 70px 1fr 60px',
              gap: 8,
              fontFamily: T.mono,
              fontSize: 11,
              color: T.textMuted,
              padding: '6px 0',
            }}>
              <span>1</span><span>Changeup</span><span>93.5</span><span>z5</span><span>In play, foul</span><span>0-0</span>
              <span>2</span><span>Four-Seam</span><span>100</span><span>z1</span><span style={{ color: T.accent, fontWeight: 600 }}>Ball</span><span>1-0</span>
            </div>
          </div>

          {/* Collapsed PAs */}
          {[
            'BOT 9 · 1B · Busch · Single to LF · 2-2',
            'BOT 9 · K  · Happ · Strikeout swinging · 1-2',
            'BOT 9 · BB · Suzuki · Walk · 3-1',
            'TOP 9 · HR · Allen · Home run to LCF · 412 ft',
            'TOP 9 · F8 · Vázquez · Flyout to CF',
            'TOP 9 · K  · Dezenzo · Strikeout looking',
            'BOT 8 · 3B · Smith · Triple to RF',
            'BOT 8 · K  · Meyers · Strikeout swinging',
          ].map((row, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              background: T.surface,
              fontFamily: T.sans,
              fontSize: 12,
              color: T.text,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{row}</span>
              <span style={{ color: T.textFaint }}>▸</span>
            </div>
          ))}
          <div style={{ padding: 12, color: T.textFaint, fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>
            ↓ scroll continues inside this frame · earlier innings below
          </div>
        </div>
        {/* fade-out hint at bottom of frame */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 30,
          background: `linear-gradient(to bottom, transparent, ${T.bg})`,
          pointerEvents: 'none',
        }} />
      </div>
    </W2Box>
  );
}

// ---------- Matchup detail (below the live block, with photos) ----------

function W2MatchupDetail() {
  const card = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: 16,
    display: 'grid',
    gridTemplateColumns: '96px 1fr',
    gap: 14,
    alignItems: 'center',
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {/* Pitcher card */}
      <div style={card}>
        <W2Grey h={96} style={{ borderRadius: 6, fontSize: 10 }}>Pitcher photo<br />(headshot)</W2Grey>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ ...W2.label, fontSize: 9 }}>Pitching · HOU</span>
          <span style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 700, color: T.text }}>Nate Pearson</span>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>RHP · 0.00 ERA · 14 P</span>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>
            <span>Today: 2 IP · 1 H · 0 R · 3 K</span>
            <span>Season: 1-0 · 0.96 WHIP</span>
          </div>
        </div>
      </div>

      {/* Batter card */}
      <div style={card}>
        <W2Grey h={96} style={{ borderRadius: 6, fontSize: 10 }}>Batter photo<br />(headshot)</W2Grey>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ ...W2.label, fontSize: 9 }}>At bat · CHC</span>
          <span style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 700, color: T.text }}>Alex Bregman</span>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>3B · R/R · .250 / .338 / .346</span>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>
            <span>Today: 1-for-4 · 1B · K · F8 · BB</span>
            <span>vs Pearson: 0-for-2 (career)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Context strip (win prob + leverage, smaller) ----------

function W2ContextStrip() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
    }}>
      <W2Grey h={56}>Win probability · 84% HOU · ▲ +6</W2Grey>
      <W2Grey h={56}>Leverage · 2.4× · HIGH</W2Grey>
    </div>
  );
}

// ---------- Drawer shadow (off-canvas reminder) ----------

function W2DrawerHint() {
  return (
    <div style={{
      marginTop: 4,
      padding: '8px 12px',
      background: T.surfaceAlt,
      border: `1px dashed ${T.borderStrong}`,
      borderRadius: 6,
      fontSize: 11,
      color: T.textMuted,
      fontFamily: T.sans,
    }}>
      <strong>Lineup drawer</strong> · slides in from right when "Lineup ▾" is clicked. Holds both teams' batting + pitching lines. Not part of the page flow — no scroll cost on the main view.
    </div>
  );
}

// ---------- Assembly ----------

window.GameScreenV2Wireframe = function GameScreenV2Wireframe() {
  return (
    <div style={{ background: T.bg, minHeight: '100%', padding: 24, fontFamily: T.sans, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <W2Header />
      <W2Scoreboard />

      {/* THE FOLD — everything above this line is what the user sees on load.
          Zone column is sticky; pitch list has its own internal scroll. */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 14, alignItems: 'start' }}>
        <W2ZoneColumn />
        <W2PitchList />
      </div>
      {/* fold indicator */}
      <div style={{
        position: 'relative', textAlign: 'center', margin: '4px 0',
        fontSize: 10, letterSpacing: '0.2em', color: T.accent, fontWeight: 700,
        fontFamily: T.sans,
      }}>
        <span style={{ background: T.bg, padding: '0 12px', position: 'relative', zIndex: 1 }}>↓ approx fold ↓</span>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, borderTop: `1px dashed ${T.accent}`, zIndex: 0 }} />
      </div>

      <W2MatchupDetail />
      <W2ContextStrip />
      <W2DrawerHint />

      <div style={{
        marginTop: 8,
        padding: '10px 14px',
        background: T.highlightSoft,
        border: `1px dashed ${T.highlight}`,
        borderRadius: 6,
        fontSize: 11,
        color: T.text,
        fontFamily: T.sans,
      }}>
        <strong>Wireframe r2.</strong> Above the fold: scoreboard + zone column + pitch-list frame (internal scroll, ~620px high). The list never pushes the page. Below the fold: matchup detail (pitcher + batter cards with photos), then context (win prob, leverage). Lineup is now a drawer accessed from the header — no longer competing for page real estate.
      </div>
    </div>
  );
};
