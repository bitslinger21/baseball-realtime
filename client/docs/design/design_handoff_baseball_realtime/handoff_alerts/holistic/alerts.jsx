/* global React, T, TEAMS, TeamDot, Headshot, iconBtn */
// ============================================================
// ALERTS — first design pass (Oct 3, 2026). Three directions for bell + tray + pop-up.
// Scope decided: triggers = HISTORY IN PROGRESS (no-hitter from the 7th, cycle watch, 3 HR, 15 K)
// + MILESTONES ABOUT TO HAPPEN. In-app only. Header bell + tray is the only surface.
// Pop-up ONLY for big moments; everything else waits in the tray. A story that ends sends a
// SECOND alert (the first one stays, closed). Tap = the clip when the moment is over, else the game.
// No mute for the game on screen.
// ============================================================

window.ALERTS = [
  { id: 'cy', kind: 'Cycle watch', big: true, live: true, unread: true,
    who: { short: 'Witt Jr.', mlbId: 677951, team: 'KC' },
    title: 'needs a triple for the cycle', sub: 'At bat now', time: '9:44p',
    game: { away: 'MIN', home: 'KC', score: [4, 6], half: '▼8' }, prog: { type: 'cycle', have: ['1B', '2B', 'HR'] } },
  { id: 'nh', kind: 'No-hitter', big: true, live: true, unread: true,
    who: { short: 'Skubal', mlbId: 669373, team: 'DET' },
    title: 'has a no-hitter through 7', sub: '94 pitches · 9 K · 1 BB', time: '9:31p',
    game: { away: 'DET', home: 'CLE', score: [3, 0], half: '▲8' }, prog: { type: 'innings', done: 7 } },
  { id: 'ms', kind: 'Milestone', big: false, live: true, unread: false,
    who: { short: 'Judge', mlbId: 592450, team: 'NYY' },
    title: 'is one home run from 400', sub: 'On deck', time: '9:38p',
    game: { away: 'NYY', home: 'BOS', score: [2, 2], half: '▲7' }, prog: { type: 'count', from: 399, to: 400, unit: 'career HR' } },
  { id: 'end', kind: 'No-hitter ended', big: false, live: false, unread: false,
    who: { short: 'Greene', mlbId: 668881, team: 'CIN' },
    title: 'lost the no-hitter in the 8th', sub: 'Ohtani single to right · 7 1/3 IP', time: '9:12p', clip: true,
    game: { away: 'LAD', home: 'CIN', score: [1, 3], half: '▲8' } },
  { id: 'nh0', kind: 'No-hitter', big: true, live: false, unread: false,
    who: { short: 'Greene', mlbId: 668881, team: 'CIN' },
    title: 'had a no-hitter through 7', sub: 'Ended in the 8th', time: '8:58p',
    game: { away: 'LAD', home: 'CIN', score: [0, 3], half: '▲8' } },
  { id: 'hr', kind: 'Three-homer game', big: false, live: false, unread: false,
    who: { short: 'Alvarez', mlbId: 670541, team: 'HOU' },
    title: 'hit his third home run', sub: 'Solo shot to right · 412 ft', time: '8:52p', clip: true,
    game: { away: 'SEA', home: 'HOU', score: [2, 9], half: 'Final' } },
];

const alMono = { fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' };
// Feed abbreviations → window.TEAMS keys (display text stays the feed's abbreviation).
const alTeam = (k) => TEAMS[k] || TEAMS[{ KC: 'KCR', SD: 'SDP', SF: 'SFG', TB: 'TBR', WSH: 'WSN', CWS: 'CHW' }[k]];
const alRustOnDark = '#f08a63';
const alEyebrow = (c) => ({ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c });
const alAction = (a) => (a.live ? 'Open game →' : a.clip ? '▶ Watch clip' : 'Open game →');

function AlGame({ g, live, onDark }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <TeamDot team={alTeam(g.away)} size={14} onDark={onDark} />
      <span style={{ ...alMono, fontSize: 12, fontWeight: 700, color: onDark ? '#e4e4e7' : T.text, whiteSpace: 'nowrap' }}>{g.away} {g.score[0]} – {g.score[1]} {g.home}</span>
      <TeamDot team={alTeam(g.home)} size={14} onDark={onDark} />
      <span style={{ ...alMono, fontSize: 11.5, fontWeight: 700, marginLeft: 3, whiteSpace: 'nowrap', color: live ? (onDark ? alRustOnDark : T.accent) : (onDark ? '#b0b0b8' : T.textMuted) }}>{live ? '● ' : ''}{g.half}</span>
    </span>
  );
}
function AlLink({ a, onDark, style }) {
  return <a href="#" onClick={(e) => e.preventDefault()} style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: onDark ? alRustOnDark : T.accent, textDecoration: 'none', whiteSpace: 'nowrap', ...style }}>{alAction(a)}</a>;
}
function AlX({ onClick, onDark }) {
  return (
    <button onClick={onClick} aria-label="Dismiss" style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke={onDark ? '#c4c4cc' : T.textMuted} strokeWidth="1.8" strokeLinecap="round" /></svg>
    </button>
  );
}
function AlBellGlyph({ color = T.text }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M9 2.2a4.6 4.6 0 0 0-4.6 4.6v2.7L3 12.4h12l-1.4-2.9V6.8A4.6 4.6 0 0 0 9 2.2z" />
      <path d="M7.2 14.6a1.9 1.9 0 0 0 3.6 0" />
    </svg>
  );
}
// Bell: A/B = icon + unread count badge. C = pill that also says how many stories are live.
function AlBell({ dir, unread, live, open, onClick, pulse }) {
  if (dir === 'C') {
    return (
      <button onClick={onClick} aria-label={`Alerts, ${live} live`} aria-expanded={open}
        style={{ ...iconBtn, height: 38, width: 'auto', flexShrink: 0, padding: '0 12px 0 10px', display: 'inline-flex', alignItems: 'center', gap: 7, background: open ? T.accentSoft : undefined, borderColor: open || live ? T.accent : undefined, animation: pulse ? 'alPulse .9s ease 2' : 'none' }}>
        <style>{'@keyframes alPulse{0%,100%{box-shadow:0 0 0 0 rgba(184,66,30,0)}40%{box-shadow:0 0 0 6px rgba(184,66,30,.22)}}'}</style>
        <AlBellGlyph color={live ? T.accent : T.text} />
        {live > 0 && <span style={{ ...alMono, fontSize: 12, fontWeight: 700, color: T.accent, whiteSpace: 'nowrap' }}>{live} live</span>}
      </button>
    );
  }
  return (
    <button onClick={onClick} aria-label={`Alerts, ${unread} unread`} aria-expanded={open}
      style={{ ...iconBtn, width: 38, height: 38, padding: 0, position: 'relative', display: 'grid', placeItems: 'center', background: open ? T.accentSoft : undefined, borderColor: open ? T.accent : undefined }}>
      <AlBellGlyph />
      {unread > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', borderRadius: 999, background: T.accent, color: '#fff', ...alMono, fontSize: 10.5, fontWeight: 700, display: 'grid', placeItems: 'center', border: `2px solid ${T.bg}` }}>{unread}</span>}
    </button>
  );
}

// ---------- Progress visuals (direction C) ----------
function AlProg({ p, big }) {
  if (!p) return null;
  if (p.type === 'innings') {
    const s = big ? 16 : 12;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: 9 }, (_, i) => <span key={i} style={{ width: s, height: s, borderRadius: 2, boxSizing: 'border-box', background: i < p.done ? T.accent : 'transparent', border: `1.5px solid ${i < p.done ? T.accent : T.borderStrong}` }} />)}
        </div>
        <span style={{ ...alMono, fontSize: 11.5, fontWeight: 700, color: T.textMuted }}>{9 - p.done} to go</span>
      </div>
    );
  }
  if (p.type === 'cycle') {
    return (
      <div style={{ display: 'flex', gap: 5 }}>
        {['1B', '2B', '3B', 'HR'].map((k) => {
          const has = p.have.includes(k);
          return <span key={k} style={{ ...alMono, width: big ? 44 : 34, height: big ? 28 : 22, boxSizing: 'border-box', borderRadius: 5, display: 'grid', placeItems: 'center', fontSize: big ? 13 : 11, fontWeight: 700, background: has ? T.ink : 'transparent', color: has ? '#fff' : T.accent, border: has ? 'none' : `1.5px dashed ${T.accent}` }}>{k}</span>;
        })}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ ...alMono, fontSize: 18, fontWeight: 800, color: T.text }}>{p.from}</span>
      <span style={{ fontSize: 13, color: T.textMuted }}>→</span>
      <span style={{ ...alMono, fontSize: 18, fontWeight: 800, color: T.accent }}>{p.to}</span>
      <span style={{ fontSize: 12, color: T.textMuted }}>{p.unit}</span>
    </div>
  );
}

// ---------- Direction A · Panel ----------
function RowA({ a, last }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr)', gap: 12, padding: '12px 16px', borderBottom: last ? 'none' : `1px solid ${T.border}`, cursor: 'pointer' }}>
      <Headshot team={alTeam(a.who.team)} mlbId={a.who.mlbId} size={34} ratio={1.2} />
      <div style={{ minWidth: 0, display: 'grid', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {a.unread && <span style={{ width: 7, height: 7, borderRadius: 99, background: T.accent }} />}
          <span style={alEyebrow(a.live ? T.accent : T.textMuted)}>{a.kind}</span>
          <span style={{ ...alMono, fontSize: 11, color: T.textMuted, marginLeft: 'auto' }}>{a.time}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, textWrap: 'pretty' }}><b style={{ fontWeight: 800 }}>{a.who.short}</b> {a.title}</div>
        <div style={{ fontSize: 12.5, color: T.textMuted }}>{a.sub}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}><AlGame g={a.game} live={a.live} /><AlLink a={a} style={{ marginLeft: 'auto' }} /></div>
      </div>
    </div>
  );
}
function AlSection({ label, children }) {
  return <React.Fragment><div style={{ padding: '10px 16px 4px', ...alEyebrow(T.textMuted) }}>{label}</div>{children}</React.Fragment>;
}
function TrayA({ items }) {
  const now = items.filter((a) => a.live), earlier = items.filter((a) => !a.live);
  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 440, zIndex: 80, background: T.surface, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.accent}`, borderRadius: `0 0 ${T.r.md}px ${T.r.md}px`, boxShadow: T.sh.lg || T.sh.md, maxHeight: 600, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Alerts</span>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: T.textMuted, textDecoration: 'none' }}>Mark all read</a>
      </div>
      <AlSection label="Happening now">{now.map((a, i) => <RowA key={a.id} a={a} last={i === now.length - 1} />)}</AlSection>
      <div style={{ borderTop: `1px solid ${T.border}` }} />
      <AlSection label="Earlier tonight">{earlier.map((a, i) => <RowA key={a.id} a={a} last={i === earlier.length - 1} />)}</AlSection>
    </div>
  );
}
function ToastA({ a, onClose }) {
  return (
    <div role="status" style={{ position: 'absolute', top: 74, right: 28, width: 400, zIndex: 90, background: T.surface, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.accent}`, borderRadius: `0 0 ${T.r.md}px ${T.r.md}px`, boxShadow: T.sh.lg || T.sh.md, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}><RowA a={{ ...a, unread: false }} last /></div>
        <div style={{ padding: '8px 8px 0 0' }}><AlX onClick={onClose} /></div>
      </div>
      <div style={{ height: 2, background: T.border }}><div style={{ width: '62%', height: '100%', background: T.accent }} /></div>
    </div>
  );
}

// ---------- Direction B · Ticker ----------
function LiveCardB({ a }) {
  return (
    <div style={{ background: T.ink, borderRadius: T.r.md, padding: '14px 16px', display: 'grid', gridTemplateColumns: '40px minmax(0,1fr)', gap: 12, cursor: 'pointer' }}>
      <Headshot team={alTeam(a.who.team)} mlbId={a.who.mlbId} size={40} ratio={1.2} />
      <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}><span style={alEyebrow(alRustOnDark)}>{a.kind}</span><span style={{ ...alMono, fontSize: 11, color: '#b0b0b8', marginLeft: 'auto' }}>{a.time}</span></div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', textWrap: 'pretty' }}>{a.who.short} {a.title}</div>
        <div style={{ fontSize: 12.5, color: '#c4c4cc' }}>{a.sub}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}><AlGame g={a.game} live onDark /><AlLink a={a} onDark style={{ marginLeft: 'auto' }} /></div>
      </div>
    </div>
  );
}
function TrayB({ items, onClose }) {
  const now = items.filter((a) => a.live), earlier = items.filter((a) => !a.live);
  return (
    <React.Fragment>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(21,22,26,0.32)', zIndex: 85 }} />
      <aside style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 440, zIndex: 86, background: T.bg, borderLeft: `1px solid ${T.border}`, boxShadow: '-12px 0 32px -16px rgba(20,16,12,.25)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 62, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px 0 20px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Alerts</span>
          <span style={{ marginLeft: 'auto' }}><AlX onClick={onClose} /></span>
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 20px 20px', display: 'grid', gap: 10, alignContent: 'start' }}>
          <span style={alEyebrow(T.textMuted)}>Live now · {now.length}</span>
          {now.map((a) => <LiveCardB key={a.id} a={a} />)}
          <span style={{ ...alEyebrow(T.textMuted), marginTop: 10 }}>Earlier tonight</span>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.md }}>
            {earlier.map((a, i) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '50px minmax(0,1fr) auto', gap: 10, alignItems: 'baseline', padding: '11px 14px', borderTop: i ? `1px solid ${T.border}` : 'none', cursor: 'pointer' }}>
                <span style={{ ...alMono, fontSize: 11.5, color: T.textMuted }}>{a.time}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}><b style={{ fontWeight: 800 }}>{a.who.short}</b> {a.title}</span>
                  <span style={{ display: 'block', fontSize: 12, color: T.textMuted, marginTop: 2 }}>{a.kind} · {a.game.away} {a.game.score[0]} – {a.game.score[1]} {a.game.home}</span>
                </span>
                <AlLink a={a} />
              </div>
            ))}
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
}
function ToastB({ a, onClose }) {
  return (
    <div role="status" style={{ position: 'absolute', top: 63, left: 0, right: 0, zIndex: 90, background: T.ink, boxShadow: '0 10px 24px -14px rgba(0,0,0,.5)' }}>
      <div style={{ minHeight: 56, padding: '0 16px 0 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={alEyebrow(alRustOnDark)}>{a.kind}</span>
        <Headshot team={alTeam(a.who.team)} mlbId={a.who.mlbId} size={26} ratio={1.2} />
        <span style={{ fontSize: 15.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{a.who.short} {a.title}</span>
        <span style={{ fontSize: 13, color: '#c4c4cc', whiteSpace: 'nowrap' }}>{a.sub}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}><AlGame g={a.game} live onDark /><AlLink a={a} onDark /></span>
        <AlX onClick={onClose} onDark />
      </div>
      <div style={{ height: 2, background: '#2a2b30' }}><div style={{ width: '62%', height: '100%', background: alRustOnDark }} /></div>
    </div>
  );
}

// ---------- Direction C · Scorebook ----------
function CardC({ a }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${a.live ? T.borderStrong : T.border}`, borderRadius: T.r.md, padding: '14px 16px', display: 'grid', gridTemplateColumns: '44px minmax(0,1fr)', gap: 14, cursor: 'pointer' }}>
      <Headshot team={alTeam(a.who.team)} mlbId={a.who.mlbId} size={44} ratio={1.2} />
      <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {a.unread && <span style={{ width: 7, height: 7, borderRadius: 99, background: T.accent }} />}
          <span style={alEyebrow(T.accent)}>{a.kind}</span>
          <span style={{ ...alMono, fontSize: 11, color: T.textMuted, marginLeft: 'auto' }}>{a.time}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, textWrap: 'pretty' }}><b style={{ fontWeight: 800 }}>{a.who.short}</b> {a.title} <span style={{ color: T.textMuted, fontWeight: 500 }}>· {a.sub}</span></div>
        <AlProg p={a.prog} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><AlGame g={a.game} live={a.live} /><AlLink a={a} style={{ marginLeft: 'auto' }} /></div>
      </div>
    </div>
  );
}
function TrayC({ items }) {
  const now = items.filter((a) => a.live), earlier = items.filter((a) => !a.live);
  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 520, zIndex: 80, background: T.bg, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.accent}`, borderRadius: `0 0 ${T.r.md}px ${T.r.md}px`, boxShadow: T.sh.lg || T.sh.md, maxHeight: 620, overflowY: 'auto' }}>
      <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Live stories</span>
        <span style={{ ...alMono, fontSize: 12, color: T.textMuted, marginLeft: 8 }}>{now.length}</span>
      </div>
      <div style={{ padding: '6px 16px 14px', display: 'grid', gap: 10 }}>{now.map((a) => <CardC key={a.id} a={a} />)}</div>
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '10px 16px 4px', ...alEyebrow(T.textMuted) }}>Earlier tonight</div>
      <div style={{ padding: '0 16px 12px' }}>
        {earlier.map((a, i) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '9px 0', borderTop: i ? `1px solid ${T.border}` : 'none', cursor: 'pointer' }}>
            <span style={{ ...alMono, fontSize: 11.5, color: T.textMuted, width: 44, flexShrink: 0 }}>{a.time}</span>
            <span style={{ fontSize: 13.5, minWidth: 0, flex: 1 }}><b style={{ fontWeight: 800 }}>{a.who.short}</b> {a.title}</span>
            <AlLink a={a} />
          </div>
        ))}
      </div>
    </div>
  );
}
function ToastC({ a, onClose, life, leaving, onHover }) {
  return (
    <div role="status" onMouseEnter={() => onHover && onHover(true)} onMouseLeave={() => onHover && onHover(false)}
      style={{ position: 'absolute', right: 24, bottom: 24, width: 380, zIndex: 90, background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: T.r.lg, boxShadow: '0 18px 40px -18px rgba(20,16,12,.35)', overflow: 'hidden',
        opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(10px)' : 'none', transition: 'opacity .45s ease, transform .45s ease', animation: 'alIn .35s cubic-bezier(.22,.7,.3,1)' }}>
      <style>{'@keyframes alIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'}</style>
      <div style={{ padding: '14px 10px 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={alEyebrow(T.accent)}>{a.kind}</span>
        <span style={{ ...alMono, fontSize: 11.5, fontWeight: 700, color: T.accent }}>● {a.game.half}</span>
        <span style={{ marginLeft: 'auto' }}><AlX onClick={onClose} /></span>
      </div>
      <div style={{ padding: '6px 18px 16px', display: 'grid', gridTemplateColumns: '52px minmax(0,1fr)', gap: 14 }}>
        <Headshot team={alTeam(a.who.team)} mlbId={a.who.mlbId} size={52} ratio={1.2} />
        <div style={{ minWidth: 0, display: 'grid', gap: 9 }}>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, textWrap: 'pretty' }}>{a.who.short} {a.title}</div>
          <AlProg p={a.prog} big />
          <div style={{ fontSize: 12.5, color: T.textMuted }}>{a.sub} · <AlGame g={a.game} /></div>
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: `1px solid ${T.border}` }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ flex: 1, textAlign: 'center', padding: '11px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accent, textDecoration: 'none' }}>{alAction(a)}</a>
        <button onClick={onClose} style={{ flex: 1, padding: '11px 0', fontSize: 13, fontWeight: 600, color: T.text, background: T.surface, border: 'none', borderLeft: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: T.sans }}>Later</button>
      </div>
      {life !== undefined && <div style={{ height: 3, background: T.border }}><div style={{ width: `${Math.max(0, life) * 100}%`, height: '100%', background: T.accent, transition: 'width .1s linear' }} /></div>}
    </div>
  );
}

// ARRIVAL FLOW (Oct 3, user's model, direction C): an alert ARRIVES as the pop-up. Left alone it
// counts down (~8s; hover pauses), fades, and lands in the tray; only THEN does the bell count go up
// (one pulse). ✕ / Later land it immediately. The tray NEVER opens on its own, only on a click.
const AL_LIFE_MS = 8000;
function AlertsFlow({ dir = 'C' }) {
  const all = window.ALERTS;
  const pop = all.find((a) => a.big && a.live);
  const [run, setRun] = React.useState(0);
  const [phase, setPhase] = React.useState('before'); // before | toast | leaving | landed
  const [life, setLife] = React.useState(1);
  const [hover, setHover] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => { setPhase('before'); setLife(1); setOpen(false); const t = setTimeout(() => setPhase('toast'), 1200); return () => clearTimeout(t); }, [run]);
  React.useEffect(() => {
    if (phase !== 'toast' || hover) return;
    const id = setInterval(() => setLife((l) => l - 100 / AL_LIFE_MS), 100);
    return () => clearInterval(id);
  }, [phase, hover]);
  React.useEffect(() => { if (phase === 'toast' && life <= 0) setPhase('leaving'); }, [life, phase]);
  React.useEffect(() => { if (phase === 'leaving') { const t = setTimeout(() => setPhase('landed'), 450); return () => clearTimeout(t); } }, [phase]);
  const landed = phase === 'landed';
  const items = landed ? all : all.filter((a) => a !== pop);
  const unread = items.filter((a) => a.unread).length, live = items.filter((a) => a.live).length;
  const bell = (
    <div style={{ position: 'relative' }}>
      <AlBell key={landed ? 'l' : 'b'} dir={dir} unread={open ? 0 : unread} live={live} open={open} pulse={landed} onClick={() => setOpen(!open)} />
      {open && dir === 'A' && <TrayA items={items} />}
      {open && dir === 'C' && <TrayC items={items} />}
    </div>
  );
  const Toast = { A: ToastA, B: ToastB, C: ToastC }[dir];
  const status = { before: 'Waiting for the next alert…', toast: hover ? 'Paused while you hover' : 'Pop-up showing: it fades on its own', leaving: 'Fading into the tray…', landed: 'Landed in the tray. The bell went up; the tray stays closed until you click it.' }[phase];
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: T.bg, overflow: 'hidden', fontFamily: T.sans, color: T.text }}>
      <window.BrandHeader active="games" alerts={bell} />
      <AlBackdrop />
      {open && dir === 'B' && <TrayB items={items} onClose={() => setOpen(false)} />}
      {(phase === 'toast' || phase === 'leaving') && pop && <Toast a={pop} life={life} leaving={phase === 'leaving'} onHover={setHover} onClose={() => setPhase('leaving')} />}
      <div style={{ position: 'absolute', left: 24, bottom: 24, display: 'flex', alignItems: 'center', gap: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: '6px 6px 6px 14px', fontSize: 13, color: T.textMuted, zIndex: 95 }}>
        <span>{status}</span>
        <button onClick={() => setRun(run + 1)} style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: T.text, background: T.bg, border: `1px solid ${T.borderStrong}`, borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>↻ Replay arrival</button>
      </div>
    </div>
  );
}
window.AlertsFlow = AlertsFlow;

// ---------- Stage ----------
function AlBackdrop() {
  const blk = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.md };
  return (
    <div style={{ padding: '0 28px' }}>
      <window.PageTitle title="Today's games" flush />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 18 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ ...blk, height: 200 }} />)}
      </div>
    </div>
  );
}
window.AlertsDirection = function AlertsDirection({ dir = 'A', view = 'toast' }) {
  const items = window.ALERTS;
  const [open, setOpen] = React.useState(view === 'tray');
  const [toast, setToast] = React.useState(view === 'toast');
  React.useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { setOpen(false); setToast(false); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  const unread = items.filter((a) => a.unread).length, live = items.filter((a) => a.live).length;
  const pop = items.find((a) => a.big && a.live);
  const bell = (
    <div style={{ position: 'relative' }}>
      <AlBell dir={dir} unread={open ? 0 : unread} live={live} open={open} onClick={() => { setOpen(!open); setToast(false); }} />
      {open && dir === 'A' && <TrayA items={items} />}
      {open && dir === 'C' && <TrayC items={items} />}
    </div>
  );
  const Toast = { A: ToastA, B: ToastB, C: ToastC }[dir];
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: T.bg, overflow: 'hidden', fontFamily: T.sans, color: T.text }}>
      <window.BrandHeader active="games" alerts={bell} />
      <AlBackdrop />
      {open && dir === 'B' && <TrayB items={items} onClose={() => setOpen(false)} />}
      {toast && pop && <Toast a={pop} onClose={() => setToast(false)} />}
    </div>
  );
};
