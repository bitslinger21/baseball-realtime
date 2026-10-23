// Scorecard mode — frozen edges + inning window (Oct 18, 2026 · review mock, NOT signed off).
// Left (names), right (totals) and top (inning numbers) are frozen; only the inning window moves.
// The window shows as many 112px innings as fit and steps one inning per ‹ › press.
const SF = { INN_W: 112, ROW_H: 96, HEAD_H: 30, LEFT_MIN: 232, STAT_W: 38, PIT_ROW_H: 40 };
const SF_INK = '#15161a', SF_HEAD = 'rgb(151,173,201)', SF_ROW = 'rgb(206,217,233)', SF_SUB = 'rgb(231,236,243)';

const SF_SPRAY = {
  F7: { angle: -30, dist: 300, traj: 'fly_ball' }, F8: { angle: 0, dist: 330, traj: 'fly_ball' }, F9: { angle: 30, dist: 310, traj: 'fly_ball' },
  '6-3': { angle: -15, dist: 120, traj: 'ground_ball' }, '4-3': { angle: 15, dist: 120, traj: 'ground_ball' }, '5-3': { angle: -32, dist: 100, traj: 'ground_ball' },
  '6-4': { angle: -14, dist: 125, traj: 'ground_ball' }, P5: { angle: -34, dist: 90, traj: 'popup' }, P4: { angle: 14, dist: 140, traj: 'popup' },
  L6: { angle: -12, dist: 150, traj: 'line_drive' }, '1B': { angle: -8, dist: 200, traj: 'line_drive' }, '2B': { angle: 22, dist: 330, traj: 'line_drive' },
  HR: { angle: -20, dist: 400, traj: 'fly_ball' },
};
const SF_SEQ = ['6-3', '1B', 'K', 'F8', 'BB', '4-3', '2B', 'K', 'F9', '1B', '6-4', 'P5', 'HR', 'K', 'L6', 'F7', '1B', '5-3', 'K', 'BB', 'F8', '6-3', '2B', 'K', '4-3', '1B', 'F9', 'K', 'HR', '6-3', 'P4', '1B', 'K', 'F8', '1B', '6-3'];
const SF_ONBASE = { '1B': 1, '2B': 2, BB: 1, HR: 4 };
const SF_LINEUP = [
  ['27', 'Jose Altuve', '2B'], ['2', 'Alex Bregman', '3B'], ['44', 'Yordan Alvarez', 'LF'], ['3', 'Jeremy Peña', 'SS'],
  ['21', 'Yainer Diaz', 'C'], ['12', 'Christian Walker', '1B'], ['6', 'Jake Meyers', 'CF'], ['24', 'Mauricio Dubón', 'RF'], ['11', 'Victor Caratini', 'DH'],
];
const SF_PITCHERS = [['59', 'Framber Valdez', 'LH', '3.21'], ['55', 'Ryan Pressly', 'RH', '2.84']];
const SF_LIVE_INN = 7;
// Oct 19: Print includes BOTH teams' cards. Mock reuses HOU's at-bat grid for CHC (names differ); the app
// builds each team's grid from its own PAs. SF_BAT = the team at the plate (only it gets the rust batter row + live cell).
const SF_BAT = 'HOU';
const SF_LINEUP_CHC = [
  ['2', 'Nico Hoerner', '2B'], ['4', 'Kyle Tucker', 'RF'], ['24', 'Seiya Suzuki', 'DH'], ['7', 'Dansby Swanson', 'SS'],
  ['25', 'Michael Busch', '1B'], ['8', 'Ian Happ', 'LF'], ['16', 'Pete Crow-Armstrong', 'CF'], ['13', 'Matt Shaw', '3B'], ['9', 'Miguel Amaya', 'C'],
];
const SF_PITCHERS_CHC = [['28', 'Shota Imanaga', 'LH', '3.04'], ['36', 'Daniel Palencia', 'RH', '3.40']];

// Walk the lineup through innings 1–6 and one out of the 7th; the next batter is live.
function sfBuild() {
  const cells = SF_LINEUP.map(() => ({}));
  let slot = 0, k = 0;
  for (let inn = 1; inn <= SF_LIVE_INN; inn++) {
    let outs = 0;
    while (outs < 3) {
      if (inn === SF_LIVE_INN && outs === 1) { cells[slot][inn] = { live: true }; return cells; }
      const code = SF_SEQ[k++ % SF_SEQ.length];
      cells[slot][inn] = { code, r: SF_ONBASE[code] || 0, spray: SF_SPRAY[code] };
      if (!SF_ONBASE[code]) outs++;
      slot = (slot + 1) % 9;
    }
  }
  return cells;
}
const SF_CELLS = sfBuild();
const SF_LIVE_SLOT = SF_CELLS.findIndex((r) => r[SF_LIVE_INN] && r[SF_LIVE_INN].live);
// Oct 19: a pinch hitter is batting in the live slot, so the rust row is HIS sub-row, not the starter's.
// liveRow = which sub-row (0 = starter, 1 / 2 = subs) holds the player at the plate.
const SF_SUBS = { [SF_LIVE_SLOT]: [['15', 'Chas McCormick', 'PH']] };
const SF_LIVE_ROW = 1;
const SF_TEAMS = { HOU: { lineup: SF_LINEUP, pitchers: SF_PITCHERS, subs: SF_SUBS }, CHC: { lineup: SF_LINEUP_CHC, pitchers: SF_PITCHERS_CHC, subs: {} } };
const sfStats = (row) => Object.values(row).reduce((a, c) => {
  if (!c.code) return a;
  const ab = c.code === 'BB' ? 0 : 1, h = ['1B', '2B', 'HR'].includes(c.code) ? 1 : 0, hr = c.code === 'HR' ? 1 : 0;
  return { ab: a.ab + ab, r: a.r + hr, h: a.h + h, rbi: a.rbi + hr };
}, { ab: 0, r: 0, h: 0, rbi: 0 });
const SF_PTALLY = (pi, inn) => {
  if (inn >= SF_LIVE_INN || (pi === 0 && inn > 5) || (pi === 1 && inn <= 5)) return null;
  const s = (inn * 7 + pi * 3) % 5;
  return { r: s === 4 ? 1 : 0, h: s % 3, k: (s + 1) % 3, bb: s === 2 ? 1 : 0 };
};

const sfCell = { boxSizing: 'border-box', borderRight: `1px solid ${SF_INK}`, borderBottom: `1px solid ${SF_INK}` };
const sfHead = { ...sfCell, height: SF.HEAD_H, background: SF_HEAD, fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: SF_INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' };
const sfNum = { fontFamily: T.mono, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: SF_INK };

const SfCtx = React.createContext({ s: 1, iw: 112, rh: 96 });
const SF_SIZES = [{ k: 'S', s: 0.66 }, { k: 'M', s: 0.8 }, { k: 'L', s: 1 }];
const SF_DEFAULT_SIZE = 1; // M — Oct 18: default cell reduced from 112×96 to ~90×77

function SfInningCol({ inn }) {
  const { s, iw, rh, team = SF_BAT, plain: pl, empty } = React.useContext(SfCtx);
  const plain = pl || empty;
  const boost = Math.min(1.3, 1 / s);
  return (
    <div style={{ width: iw, flexShrink: 0 }}>
      <div style={{ ...sfHead, position: 'sticky', top: 0, zIndex: 2, background: !plain && inn === SF_LIVE_INN ? T.accent : SF_HEAD, color: !plain && inn === SF_LIVE_INN ? '#fff' : SF_INK }}>{inn}</div>
      {SF_CELLS.map((row, i) => {
        const c = empty ? null : row[inn];
        return (
          <div key={i} style={{ ...sfCell, width: iw, height: rh, background: T.surface, position: 'relative', overflow: 'hidden' }}>
            {c && c.code && <div style={{ position: 'absolute', left: -1, top: -1, width: 112, height: 96, transform: `scale(${s})`, transformOrigin: '0 0' }}><ScoreBox code={c.code} reachedOnPA={c.r} spray={c.spray} textBoost={boost} /></div>}
            {c && c.live && !plain && team === SF_BAT && <div style={{ position: 'absolute', inset: 2, border: `2px dashed ${T.accent}` }}></div>}
          </div>
        );
      })}
      <div style={{ ...sfHead }}>{inn}</div>
      {SF_PITCHERS.map((p, pi) => {
        const t = empty ? null : SF_PTALLY(pi, inn);
        return (
          <div key={pi} style={{ ...sfCell, height: SF.PIT_ROW_H, background: T.surface, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', alignItems: 'center', textAlign: 'center' }}>
            {['r', 'h', 'k', 'bb'].map((x) => <span key={x} style={{ ...sfNum, fontSize: 12, color: t ? SF_INK : T.textFaint }}>{t ? t[x] : ''}</span>)}
          </div>
        );
      })}
    </div>
  );
}

function SfLeft({ width }) {
  const { rh, team = SF_BAT, plain: pl, empty } = React.useContext(SfCtx);
  const plain = pl || empty;
  const TM = SF_TEAMS[team], batting = team === SF_BAT;
  // Oct 22: a team's card = its batters + the OPPOSING pitchers they faced (the defense). Header corner = logo + nickname.
  const opp = team === 'HOU' ? 'CHC' : 'HOU';
  const hdLabel = (abbr, verb) => <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>{TEAMS[abbr] && <TeamDot team={TEAMS[abbr]} size={18} />}<span>{`${verb} · ${(TEAMS[abbr] || {}).short || abbr}`}</span></span>;
  const nameCell = (bg, h) => ({ ...sfCell, height: h, background: bg, display: 'grid', gridTemplateColumns: '30px minmax(0,1fr) 34px', alignItems: 'center' });
  return (
    <div style={{ width, flexShrink: 0, position: 'sticky', left: 0, zIndex: 3, boxShadow: '4px 0 6px -4px rgba(21,22,26,0.35)' }}>
      <div style={{ ...sfHead, position: 'sticky', top: 0, zIndex: 2, justifyContent: 'flex-start', paddingLeft: 10, fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>{hdLabel(team, 'Batting')}</div>
      {TM.lineup.map((starter, i) => {
        const rows = empty ? [starter] : [starter, ...(TM.subs[i] || [])];
        return (
        <div key={i} style={{ height: rh, display: 'grid', gridTemplateRows: '1fr 1fr 1fr' }}>
          {[0, 1, 2].map((k) => {
            const p = rows[k];
            const live = !plain && batting && i === SF_LIVE_SLOT && k === SF_LIVE_ROW;
            const subbedOut = p && k < rows.length - 1;
            const ink = live ? '#fff' : subbedOut ? T.textMuted : SF_INK;
            return (
              <div key={k} style={nameCell(live ? T.accent : k === 0 ? SF_ROW : SF_SUB)}>
                <span style={{ ...sfNum, fontSize: 12, fontWeight: 700, textAlign: 'center', color: ink }}>{p && k === 0 ? i + 1 : ''}</span>
                <span style={{ fontSize: 14, fontWeight: live ? 700 : 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p ? p[1] : ''}</span>
                <span style={{ ...sfNum, fontSize: 12, textAlign: 'center', color: ink }}>{p ? p[2] : ''}</span>
              </div>
            );
          })}
        </div>
        );
      })}
      <div style={{ ...sfHead, justifyContent: 'flex-start', paddingLeft: 10, fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>{hdLabel(opp, 'Pitching')}</div>
      {SF_TEAMS[opp].pitchers.map(([no, name, hnd, era], i) => (empty && i > 0) ? <div key={i} style={{ ...sfCell, height: SF.PIT_ROW_H, background: SF_ROW }}></div> : (
        <div key={i} style={{ ...sfCell, height: SF.PIT_ROW_H, background: SF_ROW, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 34px 46px', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: SF_INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <span style={{ ...sfNum, fontSize: 12, textAlign: 'center' }}>{hnd}</span>
          <span style={{ ...sfNum, fontSize: 12, textAlign: 'center' }}>{era}</span>
        </div>
      ))}
    </div>
  );
}

function SfRight() {
  const { rh, empty } = React.useContext(SfCtx);
  const w = SF.STAT_W * 4;
  const tot = SF_PITCHERS.map((_, pi) => Array.from({ length: 9 }, (_, i) => SF_PTALLY(pi, i + 1)).filter(Boolean).reduce((a, t) => ({ r: a.r + t.r, h: a.h + t.h, k: a.k + t.k, bb: a.bb + t.bb }), { r: 0, h: 0, k: 0, bb: 0 }));
  const row = (vals, h, bg) => (
    <div style={{ height: h, display: 'grid', gridTemplateColumns: `repeat(4, ${SF.STAT_W}px)`, background: bg }}>
      {vals.map((v, j) => <div key={j} style={{ ...sfCell, borderRight: j === 3 ? 'none' : `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...sfNum, fontWeight: 600 }}>{v}</div>)}
    </div>
  );
  return (
    <div style={{ width: w, flexShrink: 0, position: 'sticky', right: 0, zIndex: 3, boxShadow: '-4px 0 6px -4px rgba(21,22,26,0.35)', borderLeft: `1.3px solid ${SF_INK}` }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 2, display: 'grid', gridTemplateColumns: `repeat(4, ${SF.STAT_W}px)` }}>
        {['AB', 'R', 'H', 'RBI'].map((l, j) => <div key={l} style={{ ...sfHead, borderRight: j === 3 ? 'none' : sfHead.borderRight, fontSize: 11 }}>{l}</div>)}
      </div>
      {SF_CELLS.map((r, i) => { const s = sfStats(r); return <React.Fragment key={i}>{row(empty ? ['', '', '', ''] : [s.ab, s.r, s.h, s.rbi], rh, T.surface)}</React.Fragment>; })}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(4, ${SF.STAT_W}px)` }}>
        {['R', 'H', 'K', 'BB'].map((l, j) => <div key={l} style={{ ...sfHead, borderRight: j === 3 ? 'none' : sfHead.borderRight, fontSize: 11 }}>{l}</div>)}
      </div>
      {tot.map((t, i) => <React.Fragment key={i}>{row(empty ? ['', '', '', ''] : [t.r, t.h, t.k, t.bb], SF.PIT_ROW_H, T.surface)}</React.Fragment>)}
    </div>
  );
}

function FrozenScorecard({ width, height, onBack, reviewSizes = true, phase = null, controls = null, controlBtn = null, subRow = null, empty = false }) {
  // empty (Oct 21): before the first pitch — blank sheet, no live highlights, opens on inning 1 with the away team.
  // phase (game-view embed, Oct 21 as-built): "open" = body rises from below on mount (0.35s); "closing" = header gone
  // (the feed header has already swapped back), card ground transparent, body drops away revealing the feed.
  const bodyRef = React.useRef(null);
  const [hov, setHov] = React.useState(false);
  const [size, setSize] = React.useState(SF_DEFAULT_SIZE);
  // Oct 19: "Full card" pops the scorecard out over the page and scales the WHOLE sheet to fit
  // (all innings + every row, no slide, no vertical scroll). Esc / the button / the backdrop restore.
  const [max, setMax] = React.useState(false);
  const [fitS, setFitS] = React.useState(0.8);
  const [printing, setPrinting] = React.useState(false);
  const [team, setTeam] = React.useState('HOU');
  const [fitK, setFitK] = React.useState(1); // whole-sheet shrink, only when cells would go below 0.66
  const narrow = !max && width < 640; // half-width slot: icon-only Full card, short inning label
  const sc = max ? fitS : SF_SIZES[size].s, iw = Math.round(112 * sc), rh = Math.round(96 * sc);
  const rightW = SF.STAT_W * 4 + 1;
  const [winW, setWinW] = React.useState(500);
  const [off, setOff] = React.useState(0);       // px the inning track is slid left — continuous, no snapping
  const [anim, setAnim] = React.useState(false); // transition only for chevron clicks / size changes, never mid-swipe
  const trackW = 9 * iw, maxOff = Math.max(0, trackW - winW);
  const clamp = (v, m = maxOff) => Math.max(0, Math.min(m, v));
  const live = React.useRef({}); live.current = { maxOff, iw, winW };
  // Window = all the width between the frozen columns (partial innings are fine now that it slides freely).
  React.useLayoutEffect(() => {
    const el = bodyRef.current; if (!el) return;
    const fit = () => {
      if (printing) {
        // Print (Oct 19 rev): no header, no browser header/footer (@page margin 0), 1/8in margin.
        // Sheet laid out at print size (112×96 cells) and scaled UNIFORMLY to the largest size that fits
        // 10.75 × 8.25in (1032 × 792px) — aspect ratio kept, centred.
        const W = el.clientWidth, H = el.clientHeight;
        const ws = SF.LEFT_MIN + 1008 + rightW + 2, hs = 144 + 864;
        setFitS(1); setFitK(Math.min(W / ws, H / hs)); setWinW(1008); setOff(0); setAnim(false);
        return;
      }
      if (max) {
        // sheet = frozen cols + 9 innings × 112s wide; header 30 + 9 slots × 96s + pitching head 30 + 2 × 40 tall
        // Cells scale down to 0.66 (text stays readable via textBoost). Below that, the frozen columns
        // don't shrink, so instead scale the WHOLE sheet (names + totals too) with a transform —
        // every inning always shows; nothing scrolls or pins over an inning.
        const W = el.clientWidth, H = el.clientHeight;
        const s = Math.max(0.66, Math.min(1, (W - SF.LEFT_MIN - rightW - 2) / 1008, (H - 144) / 864));
        const ws = SF.LEFT_MIN + 9 * Math.round(112 * s) + rightW + 2, hs = 144 + 9 * Math.round(96 * s);
        const k = Math.min(1, W / ws, H / hs);
        setFitS((p) => (Math.abs(p - s) > 0.004 ? s : p));
        setFitK((p) => (Math.abs(p - k) > 0.004 ? k : p));
        setWinW(9 * Math.round(112 * s)); setOff(0); setAnim(false);
        return;
      }
      const w = Math.min(9 * iw, el.clientWidth - SF.LEFT_MIN - rightW);
      setWinW(w);
      const m = Math.max(0, 9 * iw - w);
      setAnim(false);
      setOff(empty ? 0 : Math.max(0, Math.min(m, (SF_LIVE_INN + 1) * iw - w))); // live inning second from the right
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [iw, max, printing, width]); // width: the game-view slot widens over 1.2s — keep refitting (live inning stays 2nd from right)
  // Print = the full card on one US Letter page, landscape. While printing, the card is laid out at the
  // printable area (11 × 8.5 in − 0.4 in margins = 979 × 739 CSS px) so the same fit logic sizes it.
  const print = () => {
    setPrinting(true);
    const done = () => { setPrinting(false); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };
  React.useEffect(() => {
    if (!max) return;
    // Lock page scroll while the full card is open, so its slot can't move under the backdrop.
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden';
    const unlock = () => { html.style.overflow = prev; };
    const k = (e) => { if (e.key === 'Escape') closeMax(); };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); unlock(); };
  }, [max]);
  // Two-finger trackpad swipe / Shift+wheel / one-finger touch drag move the track 1:1 with the gesture.
  // Native non-passive listeners so a horizontal gesture can preventDefault (no browser back/forward).
  React.useEffect(() => {
    const el = bodyRef.current; if (!el) return;
    let tx = null;
    const move = (dx) => { setAnim(false); setOff((o) => Math.max(0, Math.min(live.current.maxOff, o + dx))); };
    const onWheel = (e) => {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
      e.preventDefault(); move(dx);
    };
    const onTS = (e) => { if (e.touches.length === 1) tx = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }; };
    const onTM = (e) => {
      if (!tx) return;
      const x = e.touches[0].clientX, y = e.touches[0].clientY;
      if (!tx.axis) { if (Math.abs(x - tx.x) + Math.abs(y - tx.y) < 6) return; tx.axis = Math.abs(x - tx.x) > Math.abs(y - tx.y) ? 'x' : 'y'; }
      if (tx.axis !== 'x') return;
      e.preventDefault(); move(tx.x - x); tx.x = x;
    };
    const onTE = () => { tx = null; };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTS, { passive: true });
    el.addEventListener('touchmove', onTM, { passive: false });
    el.addEventListener('touchend', onTE);
    return () => { el.removeEventListener('wheel', onWheel); el.removeEventListener('touchstart', onTS); el.removeEventListener('touchmove', onTM); el.removeEventListener('touchend', onTE); };
  }, [max, printing]); // the body remounts on full-card / print — re-bind to the live node
  const leftW = max ? SF.LEFT_MIN : bodyRef.current ? Math.max(SF.LEFT_MIN, bodyRef.current.clientWidth - rightW - winW) : SF.LEFT_MIN;
  const all = maxOff === 0;
  const first = Math.floor(off / iw + 0.25) + 1, last = Math.min(9, Math.ceil((off + winW) / iw - 0.25));
  // Chevrons: glide to the next inning boundary (the one fallback that does step by an inning).
  const step = (d) => { setAnim(true); setOff((o) => clamp(d > 0 ? (Math.floor(o / iw + 0.01) + 1) * iw : (Math.ceil(o / iw - 0.01) - 1) * iw)); };
  const chev = (dir, on) => (
    <button type="button" aria-label={dir < 0 ? 'Earlier innings' : 'Later innings'} disabled={!on} onClick={() => step(dir)}
      style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', padding: 0, background: 'none', border: 'none', borderRadius: T.r.sm, cursor: on ? 'pointer' : 'default', color: on ? T.textMuted : T.border }}>
      <svg width="8" height="12" viewBox="0 0 9 14" fill="none"><polyline points={dir < 0 ? '8,1 2,7 8,13' : '1,1 7,7 1,13'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
  // Show / hide animation (Oct 19): the card GROWS out of its slot in the page to the full-card frame,
  // and shrinks back into the slot on close (FLIP: measure both rects, animate a transform between them).
  // Backdrop fades with it. Reduced-motion users get the instant swap.
  const cardRef = React.useRef(null), phRef = React.useRef(null), dimRef = React.useRef(null);
  const fromRect = React.useRef(null), closingRef = React.useRef(false);
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flipFrom = (a, b) => `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`;
  const openMax = () => { if (cardRef.current) fromRect.current = cardRef.current.getBoundingClientRect(); setMax(true); };
  // Close (Oct 19 rev): the in-page card renders IMMEDIATELY in its slot (invisible), and a static
  // snapshot of the full card shrinks onto it while cross-fading — so the content change (whole sheet →
  // inning window) happens inside the motion, not as a swap after it.
  const fadeInRef = React.useRef(false);
  const closeMax = () => {
    const el = cardRef.current, ph = phRef.current;
    if (closingRef.current) return;
    if (!el || !ph || reduced()) { setMax(false); return; }
    const pr = ph.getBoundingClientRect(), r = el.getBoundingClientRect();
    const onScreen = pr.bottom > 0 && pr.top < innerHeight && pr.right > 0 && pr.left < innerWidth;
    closingRef.current = true;
    const ghost = el.cloneNode(true);
    Object.assign(ghost.style, { position: 'fixed', inset: 'auto', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '1002', pointerEvents: 'none', transformOrigin: onScreen ? '0 0' : '50% 50%' });
    const dim = document.createElement('div');
    Object.assign(dim.style, { position: 'fixed', inset: '0', zIndex: '1000', background: 'rgba(21,22,26,0.45)', pointerEvents: 'none' });
    document.body.append(dim, ghost);
    const dur = onScreen ? 300 : 180;
    const g = ghost.animate(onScreen
      ? [{ transform: 'none', opacity: 1 }, { transform: flipFrom(pr, r), opacity: 1, offset: 0.55 }, { transform: flipFrom(pr, r), opacity: 0 }]
      : [{ transform: 'none', opacity: 1 }, { transform: 'scale(.97)', opacity: 0 }],
      { duration: dur, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    // the real shrink happens in the first ~55%; the last stretch is a cross-fade onto the in-page card
    if (onScreen) g.effect.updateTiming({ easing: 'linear' }), g.effect.setKeyframes([
      { transform: 'none', opacity: 1, easing: 'cubic-bezier(.4,0,.2,1)' },
      { transform: flipFrom(pr, r), opacity: 1, offset: 0.6, easing: 'linear' },
      { transform: flipFrom(pr, r), opacity: 0 },
    ]);
    dim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in', fill: 'forwards' });
    g.onfinish = () => { ghost.remove(); dim.remove(); closingRef.current = false; };
    fadeInRef.current = onScreen ? { delay: Math.round(dur * 0.45), dur: Math.round(dur * 0.55) } : { delay: 0, dur: 180 };
    setMax(false);
  };
  React.useLayoutEffect(() => {
    if (max || !fadeInRef.current || !cardRef.current) return;
    const { delay, dur } = fadeInRef.current; fadeInRef.current = false;
    cardRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay, easing: 'ease-out', fill: 'backwards' });
  }, [max]);
  React.useLayoutEffect(() => {
    if (!max || printing) return;
    const el = cardRef.current, r = fromRect.current; fromRect.current = null;
    if (!el || !r || reduced()) return;
    el.style.transformOrigin = '0 0';
    el.animate([{ transform: flipFrom(r, el.getBoundingClientRect()) }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.22,.7,.3,1)' });
  }, [max]);
  const maxIcon = max
    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="5,1 5,5 1,5" /><polyline points="9,13 9,9 13,9" /><polyline points="13,5 9,5 9,1" /><polyline points="1,9 5,9 5,13" /></svg>
    : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,5 1,1 5,1" /><polyline points="13,9 13,13 9,13" /><polyline points="9,1 13,1 13,5" /><polyline points="5,13 1,13 1,9" /></svg>;
  const mkCard = (tm, primary) => (
    <div key={tm} ref={primary ? cardRef : undefined} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className={max ? 'sf-print' : undefined}
      style={{ ...(max && printing ? { position: 'fixed', left: 0, top: 0, width: 1032, height: 790, zIndex: 1001 } : max ? { position: 'fixed', inset: 20, zIndex: 1001, boxShadow: '0 24px 60px rgba(21,22,26,0.35)' } : { width, height, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }), background: printing ? '#fff' : phase === 'closing' ? 'transparent' : T.surface, border: printing ? 'none' : phase === 'closing' ? '1px solid transparent' : `1px solid ${T.border}`, borderRadius: printing ? 0 : T.r.lg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!printing && phase !== 'closing' && controls && !max && (
        // Game-view embed (Oct 21): TWO PARTS. Left = the common play controls (same component + styles as the
        // pitch-by-pitch header). Right = scorecard-only: team toggle · Full card · ← Back. Second row = the
        // SCOREBOOK lockup + inning window, with the compact timeline beside it.
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.border}` }}>
          {/* 2×2 grid (Oct 21): col 1 = auto (only as wide as the lockup), col 2 = the rest.
              Row 1: ◆ SCOREBOOK ‹ Innings › | the control group, right-justified in col 2.
              Row 2: (empty)                  | the timeline, filling col 2 exactly — so it is bounded
              to the controls' horizontal space. No borders. */}
          <div style={{ padding: '12px 16px 6px', display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', columnGap: 16, rowGap: 4, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', alignSelf: 'start', minHeight: 32 }}>
              <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: SF_INK }}>◆ SCOREBOOK</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {!all && chev(-1, off > 0.5)}
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{all ? 'All 9 innings' : `Innings ${first}–${last} of 9`}</span>
                {!all && chev(1, off < maxOff - 0.5)}
              </span>
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minWidth: 0 }}>
              {controls}
              <span style={{ width: 1, height: 22, background: T.border }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Segmented items={['HOU', 'CHC']} active={team === 'HOU' ? 0 : 1} size="sm" onClick={(i) => setTeam(['HOU', 'CHC'][i])} />
                <button type="button" onClick={openMax} aria-label="Show full card" title="Show the whole card" style={{ ...controlBtn }}>{maxIcon}Full card</button>
                <button type="button" onClick={onBack} style={{ ...controlBtn }}>← Back</button>
              </div>
            </div>
            <span />
            <div style={{ minWidth: 0 }}>{subRow}</div>
          </div>
        </div>
      )}
      {!printing && phase !== 'closing' && !(controls && !max) && <div style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 0 16px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: SF_INK, whiteSpace: 'nowrap' }}>◆ SCOREBOOK</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!all && chev(-1, off > 0.5)}
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{all ? (max ? 'All 9 innings · full card' : 'All 9 innings') : (narrow ? `${first}–${last} of 9` : `Innings ${first}–${last} of 9`)}</span>
          {!all && chev(1, off < maxOff - 0.5)}
        </span>
        <span style={{ flex: 1 }}></span>
        {!max && reviewSizes && <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted }}>Size (review only)</span>}
        {!max && reviewSizes && <Segmented items={SF_SIZES.map((z) => z.k)} active={size} size="sm" onClick={(i) => setSize(i)} />}
        {printing && <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, color: T.ink }}>{(TEAMS[tm] || {}).short || tm} batting</span>}
        <span className="sf-noprint"><Segmented items={['HOU', 'CHC']} active={team === 'HOU' ? 0 : 1} size="sm" onClick={(i) => setTeam(['HOU', 'CHC'][i])} /></span>
        {max && <button type="button" className="sf-noprint" onClick={print} title="Print both teams' cards (US Letter, landscape, one page each)"
          style={{ display: 'flex', alignItems: 'center', gap: 6, font: "600 13px 'DM Sans',sans-serif", color: T.ink, background: 'none', border: `1px solid ${T.border}`, borderRadius: T.r.sm, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M3.5 5V1.5h7V5" /><rect x="1" y="5" width="12" height="5.5" rx="1" /><path d="M3.5 8.5h7v4h-7z" fill={T.surface} /></svg>Print
        </button>}
        <button type="button" className="sf-noprint" onClick={() => (max ? closeMax() : openMax())} aria-label={max ? 'Exit full card' : 'Show full card'} title={max ? 'Exit full card (Esc)' : 'Show the whole card'}
          style={{ display: 'flex', alignItems: 'center', gap: 6, font: "600 13px 'DM Sans',sans-serif", color: T.ink, background: max ? T.surfaceAlt : 'none', border: `1px solid ${T.border}`, borderRadius: T.r.sm, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {maxIcon}{narrow ? null : max ? 'Exit full card' : 'Full card'}
        </button>
        {!max && <button type="button" onClick={onBack} style={{ font: "600 13px 'DM Sans',sans-serif", color: T.ink, background: 'none', border: `1px solid ${T.border}`, borderRadius: T.r.sm, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>← Back</button>}
      </div>}
      <div className={phase && !max ? (phase === 'closing' ? 'sc-out' : 'sc-in') : undefined} style={{ flex: 1, minHeight: 0, position: 'relative', ...(phase && !max ? { background: T.surface, marginTop: phase === 'closing' ? (controls ? 104 : 48) : 0, animation: phase === 'closing' ? 'sf-drop .35s cubic-bezier(.4,0,.2,1) forwards' : 'sf-rise .35s cubic-bezier(.4,0,.2,1) both' } : {}) }}>
        <div ref={primary ? bodyRef : undefined} style={{ position: 'absolute', inset: 0, ...(printing ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}), overflowY: max ? 'hidden' : 'auto', overflowX: 'hidden', overscrollBehaviorX: 'contain' }}>
          <SfCtx.Provider value={{ s: sc, iw, rh, team: tm, plain: printing, empty }}>
          <div style={max ? { width: (SF.LEFT_MIN + 9 * iw + rightW + 2) * fitK, height: (144 + 9 * rh) * fitK, margin: '0 auto' } : undefined}>
          <div style={max && fitK < 1 ? { transform: `scale(${fitK})`, transformOrigin: '0 0', width: SF.LEFT_MIN + 9 * iw + rightW + 2 } : undefined}>
          <div style={{ display: 'flex', ...(max ? { width: SF.LEFT_MIN + 9 * iw + rightW + 2, boxSizing: 'border-box', borderLeft: `1px solid ${SF_INK}`, borderRight: `1px solid ${SF_INK}`, borderBottom: `1px solid ${SF_INK}` } : { minWidth: '100%' }), borderTop: `1.3px solid ${SF_INK}` }}>
            <SfLeft width={leftW} />
            {/* All nine innings stay mounted; the window is a clip over a sliding track. overflow-x:clip
                (not hidden) so it doesn't become a scroll container and the sticky inning header still works. */}
            <div style={{ width: winW, flexShrink: 0, overflowX: 'clip' }}>
              <div style={{ display: 'flex', width: trackW, transform: `translateX(${-off}px)`, transition: anim ? 'transform 320ms cubic-bezier(.22,.7,.3,1)' : 'none', willChange: 'transform' }}>
                {Array.from({ length: 9 }, (_, i) => <SfInningCol key={i + 1} inn={i + 1} />)}
              </div>
            </div>
            {!max && <span style={{ flex: 1 }}></span>}
            <SfRight />
          </div>
          </div>
          </div>
          </SfCtx.Provider>
        </div>
      </div>
    </div>
  );
  const card = mkCard(team, true);
  if (!max) return card;
  // Print path: the card is portalled to <body> and the app root is display:none for print, so the page
  // has exactly one child to print (no hidden-but-tall page behind it, no repeated fixed element).
  // The print rules exist ONLY while printing, so a plain Cmd+P elsewhere is unaffected.
  if (printing) return (
    <React.Fragment>
      <div style={{ width, height, border: `1px dashed ${T.borderStrong}`, borderRadius: T.r.lg, boxSizing: 'border-box' }}></div>
      {ReactDOM.createPortal(
        <React.Fragment>
          <style>{`@page{size:letter landscape;margin:0}@media print{html,body{height:auto!important;overflow:hidden!important;margin:0!important;background:#fff!important}body>*:not(.sf-print-root){display:none!important}.sf-print-root .sf-print{position:static!important;box-shadow:none!important;border:none!important;animation:none!important;break-inside:avoid;margin:0.125in!important}.sf-print-root .sf-noprint{display:none!important}.sf-print-root .sf-print+.sf-print{break-before:page}.sf-print-root,.sf-print-root *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}${window.SCOREBOOK_CELL_CSS}`}</style>
          {mkCard(team, true)}
          {mkCard(team === 'HOU' ? 'CHC' : 'HOU', false)}
        </React.Fragment>,
        window.__sfPrintRoot || (window.__sfPrintRoot = Object.assign(document.body.appendChild(document.createElement('div')), { className: 'sf-print-root' }))
      )}
    </React.Fragment>
  );
  // Placeholder keeps the page from jumping while the card is popped out (and is the close target).
  return (
    <React.Fragment>
      <div ref={phRef} style={{ width, height, border: `1px dashed ${T.borderStrong}`, borderRadius: T.r.lg, boxSizing: 'border-box' }}></div>
      <div ref={dimRef} onClick={closeMax} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(21,22,26,0.45)', animation: 'sf-fade 180ms ease-out' }}></div>
      {card}
    </React.Fragment>
  );
}

function FrozenReview() {
  const cap = { fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: T.accent, textTransform: 'uppercase' };
  const p = { fontSize: 14, lineHeight: 1.5, color: T.textMuted, margin: '4px 0 14px', maxWidth: 760, textWrap: 'pretty' };
  const frames = [
    { w: 900, h: 640, t: 'Laptop · 1440 window', d: 'The scorecard card at about 900 × 640. At the new default size (M, about 90 × 77) about five and a half innings show; the window opens with the live 7th second from the right, so the next inning is in view. Size S / M / L in the header is a review-only control — the app ships M, with no size control (L = the old 112 × 96).' },
    { w: 680, h: 640, t: 'Narrow · 1180 window', d: 'About three innings show at M. Same frozen edges and free slide.' },
  ];
  return (
    <div style={{ padding: '32px 40px 60px', display: 'flex', flexDirection: 'column', gap: 36, fontFamily: "'DM Sans',sans-serif", color: T.ink }}>
      <style>{`${window.SCOREBOOK_CELL_CSS}.sf-edge button{pointer-events:auto}@keyframes sf-pop{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}@keyframes sf-fade{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{ maxWidth: 900 }}>
        <div style={cap}>Scorecard mode · fit the window</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 4px' }}>Frozen edges + an inning window</h2>
        <p style={p}>Names stay pinned left, totals pinned right, inning numbers pinned on top. Only the innings between them move, and using all the width between the frozen columns. Scroll down for the lineup and pitching; swipe left/right with two fingers (or Shift + scroll, or one finger on touch) and the innings slide freely with your fingers, no snapping. The small ‹ › beside the inning label glide to the next inning (the mouse fallback). The live inning's number is rust. <b style={{ color: T.ink }}>Full card</b> (header) pops the scorecard out over the page and scales the whole sheet to fit the window: every inning and every row at once. It grows out of its place in the page and shrinks back into it on close. Esc, the button or a click outside puts it back. In the full card, <b style={{ color: T.ink }}>Print</b> prints both teams' cards, one US Letter landscape page each (the team showing first): just the sheet, as large as fits with a 1/8 in margin, no header or browser date/URL/page numbers, and no live highlights.</p>
      </div>
      {frames.map((f) => (
        <div key={f.w} data-screen-label={f.t}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{f.t}</div>
          <p style={p}>{f.d}</p>
          <FrozenScorecard width={f.w} height={f.h} />
        </div>
      ))}
    </div>
  );
}
window.FrozenReview = FrozenReview;
window.FrozenScorecard = FrozenScorecard;
