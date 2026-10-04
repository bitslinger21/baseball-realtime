/* global React, T */

// ============================================================
// LIVE SCORING WIDGET — synced from the shipped app
// (client/src/pages/dailyGames/ScoringWidget.tsx + .css, Aug 25 2026)
//
// 425×195 frame, six slides in the app's order:
//   Front (live state) · Line score (R/H/E) · Win Prob · Pitch Mix · Field · Weather
// The app's Matchup slide (si === 2) is deliberately absent — it is being
// removed from the app (CARD_COUNT 7 → 6).
//
// Interaction: edge chevrons and swipe page the carousel; tapping the body
// enters the game; the minimise button sends it to the dock. The `Enter game →`
// verb lives in the wrapper below the frame, matching the final/upcoming cards.
// Missing data renders as an empty state per slide — never fabricated sample
// numbers (the app's SAMPLE_* fallbacks + badge are dropped).
// ============================================================

// headerH = FALLBACK only. Every slide reserves a top band for its title + minimise
// button, but the bands are NOT all the same height (the front card's two person rows
// make it ~69px, a titled slide is shorter), so the carousel's edge buttons MEASURE the
// current slide's band and hug the rule beneath it. A constant left a 16px gap above the
// divider on the front card.
const SW = { w: 425, h: 195, headerH: 52 };
const swFrame = {
  width: SW.w, height: SW.h, position: 'relative', overflow: 'hidden',
  borderRadius: T.r.md, border: `1px solid ${T.borderStrong}`,
  boxShadow: T.sh.md, background: T.surface, cursor: 'pointer', flexShrink: 0,
};
const swSlide = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const label = { fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' };
const title14 = { fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.ink };
const mono = (size, weight = 700, color = T.ink) => ({ fontFamily: T.mono, fontSize: size, fontWeight: weight, color, fontVariantNumeric: 'tabular-nums' });
const emptyState = (text) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.sans, fontSize: 12, color: T.textMuted }}>{text}</div>
);

function MinimizeBtn({ onMinimize }) {
  return (
    <button aria-label="Minimize" onClick={(e) => { e.stopPropagation(); onMinimize && onMinimize(); }}
      style={{ width: 24, height: 24, flexShrink: 0, display: 'grid', placeItems: 'center', padding: 0, border: `1px solid ${T.borderStrong}`, borderRadius: 4, background: T.surfaceAlt, color: T.textMuted, cursor: 'pointer' }}>
      <span style={{ display: 'block', width: 10, height: 1, background: 'currentColor' }} />
    </button>
  );
}

function TeamColumn({ team, score }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <img src={team.logoUrl || (window.teamLogoUrl && window.teamLogoUrl(team))} alt={team.abbr} style={{ width: 42, height: 42, objectFit: 'contain', display: 'block' }} />
      <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '0.3px' }}>{team.abbr}</div>
      <div style={{ ...mono(34, 800), lineHeight: 1 }}>{score == null ? '—' : score}</div>
    </div>
  );
}

// ---------- Slide 0 — live game state ----------
function FrontCard({ g = GAMES[0], onMinimize }) {
  const div = <div style={{ background: T.border, width: 1, alignSelf: 'stretch', margin: '10px 0' }} />;
  const pipRow = (name, filled, total) => (
    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ ...label, width: 44, textAlign: 'right' }}>{name}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: '50%', border: `1px solid ${i < filled ? T.ink : T.borderStrong}`, background: i < filled ? T.ink : T.surface }} />
        ))}
      </div>
    </div>
  );
  const base = (on, row, col) => (
    <div style={{ gridRow: row, gridColumn: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, lineHeight: 1, color: on ? T.accent : T.borderStrong }}>{on ? '◆' : '◇'}</div>
  );
  const person = (p, s1, s2) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px 58px', alignItems: 'baseline', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
        <img src={p.logoUrl} alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
      </div>
      <span style={{ fontSize: 12, color: T.textMuted, textAlign: 'right', whiteSpace: 'nowrap' }}>{s1}</span>
      <span style={{ ...mono(12, 400, T.textMuted), textAlign: 'right', whiteSpace: 'nowrap' }}>{s2}</span>
    </div>
  );
  return (
    <div style={swSlide}>
      <div data-sw-band style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {person(g.pitcher, g.pitcher.era, `${g.pitcher.pc} PC`)}
          {person(g.batter, g.batter.avg, `${g.batter.h}-${g.batter.ab}`)}
        </div>
        <MinimizeBtn onMinimize={onMinimize} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '88px 1px 1fr 1px 140px 1px 88px', alignItems: 'center', padding: '0 12px' }}>
        <TeamColumn team={g.away} score={g.awayScore} />
        {div}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            <span style={mono(17, 800)}>{g.inningLabel}</span>
            <span style={{ fontSize: 13, marginLeft: 3 }}>{g.half === 'top' ? '▲' : '▼'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 18px)', gridTemplateRows: 'repeat(3, 18px)', gap: 2 }}>
            {base(g.bases.second, 1, 2)}
            {base(g.bases.third, 2, 1)}
            {base(g.bases.first, 2, 3)}
          </div>
        </div>
        {div}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', alignItems: 'flex-start', height: '100%', padding: '0 14px' }}>
          {pipRow('Balls', g.balls, 3)}
          {pipRow('Strikes', g.strikes, 2)}
          {pipRow('Outs', g.outs, 2)}
        </div>
        {div}
        <TeamColumn team={g.home} score={g.homeScore} />
      </div>
    </div>
  );
}

// ---------- Slide 1 — line score (R/H/E) ----------
function LineScoreCard({ g = GAMES[0], onMinimize }) {
  const row = (t, r, h, e) => (
    <React.Fragment>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <img src={t.logoUrl} alt={t.abbr} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
      </div>
      <div style={{ ...mono(18, 700), textAlign: 'right' }}>{r}</div>
      <div style={{ ...mono(18, 600, T.textMuted), textAlign: 'right' }}>{h}</div>
      <div style={{ ...mono(18, 600, T.textMuted), textAlign: 'right' }}>{e}</div>
    </React.Fragment>
  );
  return (
    <div style={swSlide}>
      <div style={{ padding: '10px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
        <span style={{ fontFamily: T.sans, fontSize: 17, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.venue}</span>
        <MinimizeBtn onMinimize={onMinimize} />
      </div>
      <div data-sw-band style={{ padding: '0 12px 7px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
        <span style={mono(15, 600)}>{g.elapsed}</span>
        <span style={{ ...label, letterSpacing: '0.07em' }}>elapsed</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px', gap: '10px 8px', alignItems: 'center' }}>
          <div />
          {['R', 'H', 'E'].map(k => <div key={k} style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.textMuted, textAlign: 'right' }}>{k}</div>)}
          {row(g.away, g.awayScore, g.awayHits, g.awayErrors)}
          {row(g.home, g.homeScore, g.homeHits, g.homeErrors)}
        </div>
      </div>
    </div>
  );
}

// ---------- Slide 2 — win probability ----------
function WinProbCard({ g = GAMES[0], onMinimize }) {
  const wp = g.winProb;
  const X0 = 8, X1 = 344, YM = 58, YR = 38;
  const maxInning = 9;
  const pts = wp ? wp.dataPoints.map(p => ({ x: X0 + (p.inning / maxInning) * (X1 - X0), y: YM - (p.prob / 100) * YR })) : [];
  const homeLeading = wp && wp.homeTeamWinProb >= 50;
  const lead = homeLeading ? g.home : g.away;
  const leadPct = wp ? (homeLeading ? wp.homeTeamWinProb : 100 - wp.homeTeamWinProb) : null;
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fill = pts.length > 1 ? `${d} L${pts[pts.length - 1].x.toFixed(1)} ${YM} L${pts[0].x.toFixed(1)} ${YM} Z` : '';
  return (
    <div style={swSlide}>
      <div data-sw-band style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
        <span style={title14}>Win Probability</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {leadPct != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={lead.logoUrl} alt={lead.abbr} style={{ width: 18, height: 18, objectFit: 'contain' }} />
              <span style={mono(14, 700)}>{leadPct}%</span>
            </div>
          )}
          <MinimizeBtn onMinimize={onMinimize} />
        </div>
      </div>
      {pts.length > 1 ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', padding: '4px 10px 8px' }}>
          <svg viewBox="0 0 380 120" width="100%" height="100%" preserveAspectRatio="none" style={{ flex: 1 }}>
            <defs>
              <clipPath id="swwpa"><rect x="0" y="0" width="380" height={YM} /></clipPath>
              <clipPath id="swwpb"><rect x="0" y={YM} width="380" height={120 - YM} /></clipPath>
              <linearGradient id="swwpag" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={T.accent} stopOpacity="0.25" /><stop offset="100%" stopColor={T.accent} stopOpacity="0.08" /></linearGradient>
              <linearGradient id="swwpbg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={T.info} stopOpacity="0.08" /><stop offset="100%" stopColor={T.info} stopOpacity="0.25" /></linearGradient>
            </defs>
            <line x1={X0} y1="20" x2={X1} y2="20" stroke={T.borderStrong} strokeWidth="0.8" />
            <line x1={X0} y1={YM} x2={X1} y2={YM} stroke={T.border} strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1={X0} y1="96" x2={X1} y2="96" stroke={T.borderStrong} strokeWidth="0.8" />
            <path d={fill} fill="url(#swwpag)" clipPath="url(#swwpa)" />
            <path d={fill} fill="url(#swwpbg)" clipPath="url(#swwpb)" />
            <path d={d} fill="none" stroke={T.ink} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill={T.accent} stroke={T.surface} strokeWidth="1.5" />
            {[[13, '100'], [YM, '50'], [113, '100']].map(([y, t]) => (
              <text key={y} x="351" y={y} fontFamily="JetBrains Mono, monospace" fontSize="11" fill={T.textFaint}>{t}</text>
            ))}
            {Array.from({ length: maxInning }, (_, i) => {
              const n = i + 1, x = X0 + (n / maxInning) * (X1 - X0);
              return (
                <g key={n}>
                  <line x1={x} y1={YM} x2={x} y2={YM + 2} stroke={T.ink} strokeWidth="1" />
                  <text x={x} y={YM + 10} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={T.ink}>{n}</text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : emptyState('No data yet')}
    </div>
  );
}

// ---------- Slide 3 — pitch mix ----------
function PitchMixCard({ g = GAMES[0], onMinimize }) {
  const pm = g.pitchMix;
  const C = 2 * Math.PI * 40;
  let cum = 0;
  const arcs = pm ? pm.entries.map(e => { const dash = (e.percent / 100) * C; const off = cum; cum += dash; return { ...e, dash, off }; }) : [];
  return (
    <div style={swSlide}>
      <div data-sw-band style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...title14, lineHeight: 1 }}>Pitch Mix</span>
          <MinimizeBtn onMinimize={onMinimize} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <img src={g.pitcher.logoUrl} alt="" style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }} />
          <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 500, color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.pitcher.name}</span>
        </div>
      </div>
      {pm ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '6px 12px 6px 10px', overflow: 'hidden' }}>
          <div style={{ alignSelf: 'stretch', aspectRatio: '1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%' }} aria-hidden="true">
              <circle cx="60" cy="60" r="40" fill="none" stroke={T.border} strokeWidth="1" />
              <g transform="rotate(-90 60 60)">
                {arcs.map(a => <circle key={a.code} cx="60" cy="60" r="40" fill="none" stroke={a.color} strokeWidth="22" strokeDasharray={`${a.dash} ${C}`} strokeDashoffset={-a.off} opacity="0.85" />)}
              </g>
              <text x="60" y="56" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" fill={T.textMuted}>Seen</text>
              <text x="60" y="69" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="12" fontWeight="700" fill={T.ink}>{pm.seenCount}</text>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 5 }}>
              {pm.entries.map(e => (
                <div key={e.code} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                  <span style={{ ...mono(11, 700, T.textMuted), textAlign: 'right', flexShrink: 0 }}>{e.percent}%</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ ...label, fontSize: 10 }}>Avg velocity</span>
              <span style={mono(13, 700)}>{pm.avgVelocity}</span>
            </div>
          </div>
        </div>
      ) : emptyState('No pitch data yet')}
    </div>
  );
}

// ---------- Slide 4 — field ----------
function FieldCard({ g = GAMES[0], onMinimize }) {
  const fc = g.field;
  return (
    <div style={swSlide}>
      <div data-sw-band style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.venue}</div>
          <div style={{ fontFamily: T.sans, fontSize: 13, color: T.textMuted, marginTop: 3 }}>{g.venueCity}</div>
        </div>
        <MinimizeBtn onMinimize={onMinimize} />
      </div>
      {fc ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 32, alignItems: 'center', padding: '10px 14px', overflow: 'hidden' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 175, borderRight: `1px solid ${T.border}`, height: '100%' }}>
            <img src="uploads/ballpark.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 4 }} />
            <span style={{ position: 'absolute', top: 35, left: 20, fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.surface }}>{fc.distLF}</span>
            <span style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.surface }}>{fc.distCF}</span>
            <span style={{ position: 'absolute', top: 35, right: 20, fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.surface }}>{fc.distRF}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center', paddingLeft: 65 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ ...label, fontSize: 10, fontWeight: 600 }}>Altitude</span>
              <span style={mono(18, 700)}>{fc.altitude} ft</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ ...label, fontSize: 10, fontWeight: 600 }}>HR 2026</span>
              <span style={mono(18, 700)}>{fc.seasonHR}</span>
            </div>
          </div>
        </div>
      ) : emptyState('No park data')}
    </div>
  );
}

// ---------- Slide 5 — weather ----------
function WeatherCard({ g = GAMES[0], onMinimize }) {
  const wx = g.weather;
  const condIcon = (c) => {
    if (!c) return '🌡️';
    const s = c.toLowerCase();
    if (s.includes('thunder') || s.includes('storm')) return '⛈️';
    if (s.includes('rain') || s.includes('shower')) return '🌧️';
    if (s.includes('partly') || s.includes('mostly cloudy')) return '⛅';
    if (s.includes('cloud') || s.includes('overcast')) return '☁️';
    return '☀️';
  };
  const condRow = (k, v) => (
    <div style={{ color: T.textMuted, lineHeight: 1.5, width: '100%' }}>
      <span style={{ display: 'inline-block', minWidth: 52 }}>{k}</span>{' '}
      <span style={{ ...mono(12, 600), fontFamily: T.mono }}>{v}</span>
    </div>
  );
  return (
    <div style={swSlide}>
      <div data-sw-band style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, fontFamily: T.sans }}>Weather</div>
          <MinimizeBtn onMinimize={onMinimize} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 13, color: T.textMuted }}>{g.venue}</span>
          <span style={{ fontSize: 13, color: T.textMuted }}>GAME TIME <span style={mono(13, 700)}>{g.startTime}</span></span>
        </div>
      </div>
      {wx ? (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: '0 0 100px', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4, padding: '12px 8px' }}>
            <span style={{ fontSize: 32, lineHeight: 1 }}>{condIcon(wx.condition)}</span>
            <span style={mono(28, 700)}>{wx.temp}°</span>
          </div>
          <div style={{ flex: 1, borderRight: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '10px 0', overflow: 'hidden' }}>
            <div style={{ flex: 1, minWidth: 104, height: 110, position: 'relative', overflow: 'hidden' }}>
              <img src="uploads/ballpark.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 3 }} />
              <svg viewBox="0 0 80 80" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: `rotate(${wx.windRotation}deg)`, filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.7))' }} aria-hidden="true">
                {[25, 35, 45, 55].map(x => (
                  <g key={x}>
                    <path d={`M ${x} 10 Q ${x + 2} 14 ${x} 18 Q ${x - 2} 22 ${x} 26 Q ${x + 2} 30 ${x} 38`} stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeOpacity="0.9" />
                    <path d={`M ${x} 10 Q ${x + 2} 14 ${x} 18 Q ${x - 2} 22 ${x} 26 Q ${x + 2} 30 ${x} 38`} stroke="#FAF59A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <polygon points={`${x} 44, ${x - 3} 37, ${x + 3} 37`} fill="#FAF59A" />
                  </g>
                ))}
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '0 8px', minWidth: 60, flexShrink: 0 }}>
              <span style={{ ...mono(18, 700), lineHeight: 1 }}>{wx.windSpeed} mph</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted, wordBreak: 'break-word' }}>{wx.windDir}</span>
            </div>
          </div>
          <div style={{ flex: '0 0 118px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: 3, padding: '12px 12px', fontSize: 12 }}>
            <div style={{ color: T.ink, fontWeight: 600, lineHeight: 1.5 }}>{wx.condition}</div>
            {condRow('Humidity', wx.humidity == null ? '—' : `${wx.humidity}%`)}
            {condRow('Pressure', wx.pressure == null ? '—' : wx.pressure)}
            {condRow('Precip', '—')}
          </div>
        </div>
      ) : emptyState('No weather yet')}
    </div>
  );
}

// ---------- Sample games for the mock ----------
const L = (id) => `https://www.mlbstatic.com/team-logos/${id}.svg`;
const GAMES = [
  {
    away: { abbr: 'PIT', name: 'Pirates', logoUrl: L(134) },
    home: { abbr: 'TOR', name: 'Blue Jays', logoUrl: L(141) },
    awayScore: 1, homeScore: 0, awayHits: 4, homeHits: 3, awayErrors: 0, homeErrors: 1,
    inningLabel: '1st', half: 'top', balls: 2, strikes: 1, outs: 1,
    bases: { first: true, second: false, third: false },
    pitcher: { name: 'K. Gausman', era: '3.24', pc: 18, logoUrl: L(141) },
    batter: { name: 'O. Cruz', avg: '.268', h: 1, ab: 2, logoUrl: L(134) },
    venue: 'Rogers Centre', venueCity: 'Toronto, ON', elapsed: '32M', startTime: '7:07 PM',
    broadcasts: [
      { type: 'TV', name: 'SportsNet PIT', homeAway: 'away', language: 'en' },
      { type: 'TV', name: 'Sportsnet', homeAway: 'home', language: 'en' },
      { type: 'TV', name: 'MLB.TV', homeAway: 'home', language: 'en' },
      { type: 'AM', name: 'Sportsnet 590 The FAN', homeAway: 'home', language: 'en' },
    ],
    winProb: { homeTeamWinProb: 44, dataPoints: [{ inning: 0, prob: 0 }, { inning: 1, prob: -12 }] },
    pitchMix: { seenCount: 18, avgVelocity: '94.1 mph', entries: [
      { code: 'FF', name: '4-Seam FB', color: '#b8421e', percent: 50 },
      { code: 'SL', name: 'Splitter', color: '#2c4a78', percent: 28 },
      { code: 'CU', name: 'Curveball', color: '#4a7c3e', percent: 22 },
    ] },
    field: { altitude: 249, seasonHR: 118, distLF: 328, distCF: 400, distRF: 328 },
    weather: { temp: 71, condition: 'Roof closed', windSpeed: 0, windDir: 'Calm', windRotation: 0, humidity: 48, pressure: null },
  },
  {
    away: { abbr: 'HOU', name: 'Astros', logoUrl: L(117) },
    home: { abbr: 'CHC', name: 'Cubs', logoUrl: L(112) },
    awayScore: 8, homeScore: 5, awayHits: 11, homeHits: 8, awayErrors: 0, homeErrors: 0,
    inningLabel: '9th', half: 'bottom', balls: 1, strikes: 2, outs: 2,
    bases: { first: true, second: true, third: false },
    pitcher: { name: 'R. Pressly', era: '2.86', pc: 12, logoUrl: L(117) },
    batter: { name: 'D. Swanson', avg: '.244', h: 2, ab: 4, logoUrl: L(112) },
    venue: 'Wrigley Field', venueCity: 'Chicago, IL', elapsed: '3H 04M', startTime: '8:05 PM',
    broadcasts: [
      { type: 'TV', name: 'Space City Home Network', homeAway: 'away', language: 'en' },
      { type: 'TV', name: 'Marquee Sports Network', homeAway: 'home', language: 'en' },
      { type: 'TV', name: 'ESPN Deportes', homeAway: 'home', language: 'es' },
    ],
    winProb: { homeTeamWinProb: 18, dataPoints: [
      { inning: 0, prob: 0 }, { inning: 1, prob: 8 }, { inning: 2, prob: -6 }, { inning: 3, prob: 14 },
      { inning: 4, prob: 5 }, { inning: 5, prob: 22 }, { inning: 6, prob: 31 }, { inning: 7, prob: 19 },
      { inning: 8, prob: 24 }, { inning: 9, prob: 32 },
    ] },
    pitchMix: { seenCount: 47, avgVelocity: '93.4 mph', entries: [
      { code: 'FF', name: '4-Seam FB', color: '#b8421e', percent: 42 },
      { code: 'SL', name: 'Slider', color: '#2c4a78', percent: 28 },
      { code: 'CH', name: 'Changeup', color: '#4a7c3e', percent: 18 },
      { code: 'CU', name: 'Curveball', color: '#c8941c', percent: 12 },
    ] },
    field: { altitude: 594, seasonHR: 142, distLF: 355, distCF: 400, distRF: 353 },
    weather: { temp: 72, condition: 'Partly Cloudy', windSpeed: 8, windDir: 'Out to LF', windRotation: 225, humidity: 61, pressure: null },
  },
];

// ---------- The widget ----------
window.LiveWidget = function LiveWidget({ game = 0, onMinimize }) {
  const g = GAMES[game] || GAMES[0];
  const slides = [FrontCard, LineScoreCard, WinProbCard, PitchMixCard, FieldCard, WeatherCard];
  const [i, setI] = React.useState(0);
  const [hover, setHover] = React.useState(null);
  // Measure the active slide's header band so the edge buttons start exactly at its rule.
  const frameRef = React.useRef(null);
  const [bodyTop, setBodyTop] = React.useState(SW.headerH);
  React.useLayoutEffect(() => {
    // Measure the TAGGED band, not a positional guess: on the line-score slide the band
    // is the slide's second child, and firstChild.firstChild resolved to the title block.
    const f = frameRef.current;
    const band = f && f.querySelector('[data-sw-band]');
    if (!band) return;
    const y = band.getBoundingClientRect().bottom - f.getBoundingClientRect().top;
    if (y > 0) setBodyTop(Math.round(y));
  });
  const go = (d) => setI(v => (v + d + slides.length) % slides.length);
  const Slide = slides[i];
  // Slide arrows use the shared EdgeButton (shared.jsx) — the app's one edge
  // affordance. They start BELOW the header band so the hit area never covers the
  // minimise button. Was a bespoke 40px gradient fade; see the atom's note.
  return (
    <div style={{ width: SW.w, display: 'flex', flexDirection: 'column' }}>
      <div style={swFrame} ref={frameRef}>
        <Slide g={g} onMinimize={onMinimize} />
        {/* Each strip owns its own hover, so the pointer reveals only the arrow it is on.
            The button fills the slide BODY — from the rule under the header band down to
            the bottom edge — so it reads as a division of the body, the same as Following's
            tile cycler. */}
        {['left', 'right'].map(side => (
          <div key={side} style={{ position: 'absolute', top: bodyTop, bottom: 0, [side]: 0, width: 40 }}
            onMouseEnter={() => setHover(side)} onMouseLeave={() => setHover(null)}>
            <window.EdgeButton side={side} show={hover === side} thickness={34}
              label={side === 'left' ? 'Previous' : 'Next'} onClick={() => go(side === 'left' ? -1 : 1)} />
          </div>
        ))}
        <div style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, pointerEvents: 'none' }}>
          {slides.map((_, n) => <span key={n} style={{ width: 5, height: 5, borderRadius: '50%', background: T.ink, opacity: n === i ? 0.65 : 0.2 }} />)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '8px 2px 0' }}>
        <window.BroadcastLine broadcasts={g.broadcasts} />
        <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: T.accent, cursor: 'pointer', marginLeft: 'auto', flexShrink: 0 }}>Enter game →</span>
      </div>
    </div>
  );
};

window.FrontCard = FrontCard;
window.LineScoreCard = LineScoreCard;
window.PitchMixCard = PitchMixCard;
window.WinProbCard = WinProbCard;
window.FieldCard = FieldCard;
window.WeatherCard = WeatherCard;
window.SW_GAMES = GAMES;

// ---------- Minimised chip (the dock) ----------
// Shows score + inning ONLY. The inning is inning label + half caret (▲ top / ▼ bottom) —
// the caret is part of the indicator, not an optional flourish: "9" alone doesn't say whether
// the home team still has a turn to bat, which is the whole point of a glanceable chip.
// Same ▲/▼ convention as the expanded FrontCard, so minimising doesn't change vocabulary.
// Data-driven off GAMES so the two dock chips can't drift from each other or from the widget.
window.LiveWidgetMini = function LiveWidgetMini({ game = 0, onRestore }) {
  const g = GAMES[game] || GAMES[0];
  const top = g.half === 'top';
  const side = (t, score, logoSize, pad, extra) => (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: pad, borderRight: `1px solid ${T.border}`, ...extra }}>
      <img src={t.logoUrl} alt={t.abbr} style={{ width: logoSize, height: logoSize, flexShrink: 0 }} />
      <span style={{ color: T.ink }}>{score}</span>
    </div>
  );
  return (
    <button onClick={onRestore} aria-label={`${g.away.abbr} ${g.awayScore}, ${g.home.abbr} ${g.homeScore} — ${top ? 'top' : 'bottom'} of the ${g.inningLabel}. Restore widget.`}
      style={{ border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', border: `1px solid ${T.borderStrong}`, borderRadius: T.r.sm, maxWidth: 74, fontSize: 12, fontWeight: 600, fontFamily: T.mono, paddingRight: 5, background: T.surface, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {side(g.away, g.awayScore, 20, '6px 8px 2px 8px')}
          {side(g.home, g.homeScore, 18, '2px 8px 6px 8px', { borderTop: `1px solid ${T.border}` })}
        </div>
        <div style={{ color: T.ink, display: 'flex', alignItems: 'center', gap: 2, lineHeight: 1 }}
          title={`${top ? 'Top' : 'Bottom'} of the ${g.inningLabel}`}>
          <span>{parseInt(g.inningLabel, 10)}</span>
          <span style={{ fontSize: 11, lineHeight: 1, color: T.textMuted }} aria-hidden="true">{top ? '▲' : '▼'}</span>
        </div>
      </div>
    </button>
  );
};

// Standalone frame for reviewing one slide outside the carousel (used by the canvas artboards).
window.SWFrame = function SWFrame({ children }) {
  return <div style={swFrame}>{children}</div>;
};
