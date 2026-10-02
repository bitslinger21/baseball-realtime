/* global React, T, TEAMS, TeamDot, Pill, Segmented, Card, Eyebrow, Page, PageTitle */
// ============================================================
// VIDEO CLIPS — options (Sep 26, 2026, not signed off)
// A clip needs only TWO facts: which play it belongs to (the at-bat id the feed already
// uses) and a URL to an mp4. Everything shown around the video (who, what, inning, runs,
// score) comes from the play itself, which the app already has. Duration is read from the
// file on load (loadedmetadata); the thumbnail is the file's own frame at 1s (#t=1 with
// preload="metadata"). If the clip feed supplies a title / duration / thumbnail, prefer them.
// src:null in this mock → the deliberate "video plays here" frame. Set a src to test a file.
// ============================================================

const halfLabel = (inn) => (inn.startsWith('TOP') ? '▲' : '▼') + inn.split(' ')[1];
const fmtDur = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : null);

// Newest first, matching the at-bat list. `pa: true` = the play is in the at-bat list
// (Watch button there); the others are earlier innings, reachable from the Highlights row.
const GAME_CLIPS = [
  { id: 'suzuki',  pa: true, inning: 'BOT 9', team: TEAMS.CHC, batter: 'Seiya Suzuki', code: '1B', desc: 'Single to right puts the tying run on', dur: '0:22', src: null },
  { id: 'paredes', pa: true, inning: 'TOP 8', team: TEAMS.HOU, batter: 'Isaac Paredes', code: 'HR', desc: 'Grand slam to left · 425 ft', scored: { runs: 4, score: 'HOU 8 – 5 CHC' }, dur: '0:42', src: null },
  { id: 'pca',     inning: 'TOP 7', team: TEAMS.CHC, batter: 'Pete Crow-Armstrong', code: 'F8', desc: 'Diving catch in center robs Tucker', dur: '0:27', src: null },
  { id: 'busch',   inning: 'BOT 6', team: TEAMS.CHC, batter: 'Michael Busch', code: 'HR', desc: 'Three-run homer to right · 402 ft', scored: { runs: 3, score: 'CHC 5 – 3 HOU' }, dur: '0:35', src: null },
  { id: 'alvarez', inning: 'TOP 4', team: TEAMS.HOU, batter: 'Yordan Alvarez', code: 'HR', desc: 'Solo homer to center · 438 ft', scored: { runs: 1, score: 'HOU 2 – 2 CHC' }, dur: '0:38', src: null },
  { id: 'happ',    inning: 'BOT 3', team: TEAMS.CHC, batter: 'Ian Happ', code: '2B', desc: 'Two-run double into the right-field corner', scored: { runs: 2, score: 'CHC 2 – 1 HOU' }, dur: '0:31', src: null },
];
const GAME_CLIPS_BY_PA = Object.fromEntries(GAME_CLIPS.filter((c) => c.pa).map((c) => [c.id, c]));
const GAME_CLIPS_LIVE = { half: '▼9', away: TEAMS.HOU, home: TEAMS.CHC, score: [8, 5], note: '2 outs · Bregman batting, 1-1' };

function PlayGlyph({ size = 10, color = '#fff' }) {
  return (
    <svg width={size * 0.9} height={size} viewBox="0 0 9 10" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M0 0L9 5L0 10Z" fill={color} />
    </svg>
  );
}

function ClipScoreChip({ scored }) {
  if (!scored || scored.runs == null) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 9px', borderRadius: T.r.pill, background: T.positiveSoft, border: `1px solid ${T.positive}33`, whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.positive }}>{scored.runs === 1 ? '1 run scores' : `${scored.runs} runs score`}</span>
      <span style={{ width: 1, height: 11, background: `${T.positive}40` }} />
      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{window.fmtScore(scored.score)}</span>
    </span>
  );
}

// The at-bat list's Watch button. Neutral at rest so it never competes with the green
// "runs score" chip on the same line; ink on hover / while that clip is playing.
function WatchButton({ clip, onClick, active }) {
  const [hov, setHov] = React.useState(false);
  const on = hov || active;
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} title={`Watch · ${clip.batter}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 11px', borderRadius: T.r.pill,
      border: `1px solid ${on ? T.ink : T.borderStrong}`, background: on ? T.ink : T.surface, color: on ? '#fff' : T.text,
      fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      <PlayGlyph size={9} color={on ? '#fff' : T.ink} />
      {active ? 'Playing' : 'Watch'}
      {clip.dur && <span style={{ fontFamily: T.mono, fontWeight: 600, color: on ? '#c4c4cc' : T.textMuted, fontVariantNumeric: 'tabular-nums' }}>{clip.dur}</span>}
    </button>
  );
}

// Thumbnail: the file's own frame when there is one; otherwise an ink tile carrying the
// scorebook result code + a faint team logo — so a clip without art still says what it is.
function ClipThumb({ clip, size = 'md', active }) {
  const [dur, setDur] = React.useState(clip.dur || null);
  const big = size === 'md';
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: T.ink, borderRadius: T.r.sm, overflow: 'hidden', outline: active ? `2px solid ${T.ink}` : 'none', outlineOffset: 2 }}>
      {clip.src ? (
        <video src={clip.src + '#t=1'} preload="metadata" muted playsInline onLoadedMetadata={(e) => setDur(fmtDur(e.target.duration) || dur)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <React.Fragment>
          <img src={window.teamLogoUrl(clip.team)} alt="" style={{ position: 'absolute', right: '-8%', top: '50%', transform: 'translateY(-50%)', height: '95%', opacity: 0.16 }} />
          <span style={{ position: 'absolute', left: big ? 12 : 8, bottom: big ? 8 : 5, fontFamily: T.mono, fontSize: big ? 30 : 17, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{clip.code}</span>
        </React.Fragment>
      )}
      <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: big ? 38 : 26, height: big ? 38 : 26, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.25)', display: 'grid', placeItems: 'center' }}>
        <span style={{ marginLeft: 2 }}><PlayGlyph size={big ? 12 : 8} /></span>
      </span>
      {dur && <span style={{ position: 'absolute', right: 6, bottom: 6, fontFamily: T.mono, fontSize: big ? 11 : 10, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '1px 6px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>{dur}</span>}
      {active && <span style={{ position: 'absolute', left: 6, top: 6, fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, color: T.ink, background: '#fff', padding: '2px 7px', borderRadius: T.r.pill }}>Now playing</span>}
    </div>
  );
}

// The player itself: a plain <video> with native controls. No file → a deliberate frame,
// and a file that fails to load says so (a real state, not a mock artefact).
function ClipVideo({ clip }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [clip.id]);
  if (clip.src && !failed) {
    return <video key={clip.id} src={clip.src} controls autoPlay playsInline preload="metadata" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }} />;
  }
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 160, display: 'grid', placeItems: 'center', background: T.ink }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.8)', display: 'grid', placeItems: 'center' }}>
          <span style={{ marginLeft: 4 }}><PlayGlyph size={20} /></span>
        </span>
        <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: '#e4e4e7' }}>{failed ? 'This clip could not be played' : 'Video plays here'}</span>
        <span style={{ fontFamily: T.mono, fontSize: 12, color: '#b0b0b8' }}>{failed ? 'The game feed is unaffected' : `mp4${clip.dur ? ` · ${clip.dur}` : ''}`}</span>
      </div>
    </div>
  );
}

// Who / what / when, from the play. `compact` = one line with ellipsis (option 3's bar).
function ClipHeading({ clip, size = 16, compact }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: compact ? 'nowrap' : 'wrap', minWidth: 0 }}>
      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.textMuted, flexShrink: 0 }}>{halfLabel(clip.inning)}</span>
      <TeamDot team={clip.team} size={20} />
      <span style={{ fontSize: size, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{clip.batter}</span>
      <span style={{ fontSize: size - 2, fontWeight: 500, color: T.textMuted, minWidth: 0, whiteSpace: 'nowrap', ...(compact ? { overflow: 'hidden', textOverflow: 'ellipsis' } : {}) }}>· {clip.desc}</span>
      {!compact && <ClipScoreChip scored={clip.scored} />}
    </div>
  );
}

function ClipList({ clips, activeId, onPick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {clips.map((c) => {
        const on = c.id === activeId;
        return (
          <button key={c.id} onClick={() => onPick(c.id)} style={{
            display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 12, alignItems: 'center', textAlign: 'left',
            padding: '10px 14px', border: 'none', borderBottom: `1px solid ${T.border}`, borderLeft: `3px solid ${on ? T.ink : 'transparent'}`,
            background: on ? T.surfaceAlt : 'transparent', cursor: 'pointer', fontFamily: T.sans, color: T.text,
          }}>
            <ClipThumb clip={c} size="sm" />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 700, color: T.textMuted }}>{halfLabel(c.inning)} · {c.code}{on ? ' · now playing' : ''}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.batter}</span>
              <span style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function useEsc(onClose) {
  React.useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
}

const clipCloseBtn = { width: 30, height: 30, borderRadius: T.r.sm, border: `1px solid ${T.border}`, background: T.surface, color: T.textMuted, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 };
const clipKeyframes = `@keyframes clipFade { from { opacity: 0 } to { opacity: 1 } } @keyframes clipTrayIn { from { transform: translateX(100%) } to { transform: translateX(0) } } @keyframes clipRise { from { opacity: 0; transform: translate(-50%, 12px) } to { opacity: 1; transform: translate(-50%, 0) } }`;

// OPTION 1 — on top of the page. The game is covered, so the panel carries a thin live
// strip (score, half, outs, who's up) that keeps updating while you watch.
function ClipOverlay({ clips, id, onPick, onClose, live, listTitle = 'More from this game' }) {
  useEsc(onClose);
  const clip = clips.find((c) => c.id === id) || clips[0];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
      <style>{clipKeyframes}</style>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(21,22,26,0.74)', animation: 'clipFade .2s ease' }} />
      <div style={{ position: 'absolute', top: 96, left: '50%', transform: 'translateX(-50%)', width: 'min(1240px, calc(100% - 64px))', background: T.surface, borderRadius: T.r.lg, overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.55)', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', animation: 'clipRise .22s ease' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {live && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', background: T.ink, color: '#fff', minWidth: 0 }}>
              <window.LivePill />
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: '#c4c4cc' }}>{live.half}</span>
              <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{live.away.abbr} {live.score[0]} {live.home.abbr} {live.score[1]}</span>
              <span style={{ fontSize: 13, color: '#c4c4cc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {live.note}</span>
            </div>
          )}
          <div style={{ aspectRatio: '16 / 9', background: '#000' }}><ClipVideo clip={clip} /></div>
          <div style={{ padding: '14px 18px 16px' }}><ClipHeading clip={clip} size={17} /></div>
        </div>
        <div style={{ position: 'relative', borderLeft: `1px solid ${T.border}` }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, flexShrink: 0 }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <Eyebrow>{listTitle}</Eyebrow>
                <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted }}>{clips.length}</span>
              </span>
              <button onClick={onClose} aria-label="Close" style={clipCloseBtn}>✕</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}><ClipList clips={clips} activeId={clip.id} onPick={onPick} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// OPTION 2 — a panel from the right, same gesture as the Lineups panel. No dimming: the
// strike zone, batter card and score stay visible and live beside the video.
function ClipTray({ clips, id, onPick, onClose }) {
  useEsc(onClose);
  const clip = clips.find((c) => c.id === id) || clips[0];
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 50, width: 560, background: T.surface, borderLeft: `1px solid ${T.borderStrong}`, boxShadow: '-18px 0 48px -16px rgba(20,16,12,0.28)', display: 'flex', flexDirection: 'column', animation: 'clipTrayIn .24s cubic-bezier(0.22,0.61,0.36,1)' }}>
      <style>{clipKeyframes}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700 }}>Highlights</span>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMuted }}>{clips.length} clips</span>
        </span>
        <button onClick={onClose} aria-label="Close" style={clipCloseBtn}>✕</button>
      </div>
      <div style={{ aspectRatio: '16 / 9', background: '#000', flexShrink: 0 }}><ClipVideo clip={clip} /></div>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}><ClipHeading clip={clip} size={16} /></div>
      <div style={{ padding: '8px 16px', background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}><Eyebrow>More from this game</Eyebrow></div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}><ClipList clips={clips} activeId={clip.id} onPick={onPick} /></div>
    </div>
  );
}

// OPTION 3 — inside the at-bat list's box, the way the scorecard slides in. The box's own
// header (current batter + controls) and the timeline stay put; ← At-bats returns.
function ClipInPlace({ clips, id, onPick, onClose }) {
  useEsc(onClose);
  const i = Math.max(0, clips.findIndex((c) => c.id === id));
  const clip = clips[i];
  const n = clips.length;
  const nav = { width: 28, height: 28, borderRadius: T.r.pill, border: `1px solid ${T.border}`, background: T.surface, color: T.text, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14, padding: 0 };
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: T.surface, animation: 'clipFade .18s ease' }}>
      <style>{clipKeyframes}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, minWidth: 0 }}>
        <button onClick={onClose} style={{ ...nav, width: 'auto', padding: '0 12px', fontFamily: T.sans, fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>← At-bats</button>
        <div style={{ flex: 1, minWidth: 0 }}><ClipHeading clip={clip} size={14} compact /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => i < n - 1 && onPick(clips[i + 1].id)} disabled={i >= n - 1} title="Earlier clip" style={{ ...nav, opacity: i >= n - 1 ? 0.35 : 1 }}>‹</button>
          <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 700, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{n - i} of {n}</span>
          <button onClick={() => i > 0 && onPick(clips[i - 1].id)} disabled={i <= 0} title="Later clip" style={{ ...nav, opacity: i <= 0 ? 0.35 : 1 }}>›</button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, background: '#000' }}><ClipVideo clip={clip} /></div>
    </div>
  );
}

function ClipCard({ clip, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: T.sans, color: T.text, minWidth: 0 }}>
      <ClipThumb clip={clip} active={active} />
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 700, color: T.textMuted }}>{halfLabel(clip.inning)} · {clip.code}</span>
        <TeamDot team={clip.team} size={16} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, marginTop: -3 }}>{clip.batter}</span>
      <span style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.35, marginTop: -5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{clip.desc}</span>
    </button>
  );
}

// The game page's Highlights row — every clipped play in this game, including innings that
// have scrolled out of the at-bat list. Newest first, like the list.
// `through` = the inning label the clips run to (Scout mode: only innings the marker has
// reached — no walk-off clip while you are reviewing the 3rd). Empty → one quiet line, same height.
function GameHighlightsRow({ clips, activeId, onPlay, through }) {
  const ref = React.useRef(null);
  const [can, setCan] = React.useState({ l: false, r: false });
  const [hov, setHov] = React.useState(false);
  const measure = () => { const el = ref.current; if (el) setCan({ l: el.scrollLeft > 2, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 }); };
  React.useEffect(() => { measure(); window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }, []);
  const by = (d) => ref.current && ref.current.scrollBy({ left: d, behavior: 'smooth' });
  return (
    <Card padless>
      <div style={{ padding: '10px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Eyebrow>Highlights · this game</Eyebrow>
        <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted }}>{clips.length} clip{clips.length === 1 ? '' : 's'}{through ? ` · through ${through}` : ''} · latest first</span>
      </div>
      {clips.length === 0 && (
        <div style={{ padding: '16px 18px 18px', fontSize: 13.5, color: T.textMuted }}>No clips yet{through ? ` — nothing through ${through} has one` : ''}. They appear here as the marker passes each play.</div>
      )}
      <div style={{ position: 'relative' }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        <div ref={ref} onScroll={measure} style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 232, gap: 16, overflowX: 'auto', padding: '16px 18px 18px', scrollbarWidth: 'none' }}>
          {clips.map((c) => <ClipCard key={c.id} clip={c} active={c.id === activeId} onClick={() => onPlay(c.id)} />)}
        </div>
        {can.l && <window.EdgeButton side="left" show={hov} onClick={() => by(-500)} label="Earlier clips" />}
        {can.r && <window.EdgeButton side="right" show={hov} onClick={() => by(500)} label="More clips" />}
      </div>
    </Card>
  );
}

// ---------- Highlights page (all of today's games, grouped by game) ----------
const HL_GAMES = [
  { id: 'houchc', away: TEAMS.HOU, home: TEAMS.CHC, score: [8, 5], live: GAME_CLIPS_LIVE, clips: GAME_CLIPS },
  { id: 'atlphi', away: TEAMS.ATL, home: TEAMS.PHI, score: [3, 4], live: { half: '▲7', away: TEAMS.ATL, home: TEAMS.PHI, score: [3, 4], note: '1 out · runner on 2nd' }, clips: [
    { id: 'acuna', inning: 'TOP 7', team: TEAMS.ATL, batter: 'Ronald Acuña Jr.', code: '1B', desc: 'RBI single, then steals second', scored: { runs: 1, score: 'ATL 3 – 4 PHI' }, dur: '0:33', src: null },
    { id: 'schwarber', inning: 'BOT 5', team: TEAMS.PHI, batter: 'Kyle Schwarber', code: 'HR', desc: 'Two-run homer to right · 441 ft', scored: { runs: 2, score: 'PHI 4 – 2 ATL' }, dur: '0:36', src: null },
  ] },
  { id: 'nyybos', away: TEAMS.NYY, home: TEAMS.BOS, score: [6, 3], clips: [
    { id: 'final-k', inning: 'BOT 9', team: TEAMS.NYY, batter: 'Luke Weaver', code: 'K', desc: 'Game-ending strikeout', dur: '0:24', src: null },
    { id: 'duran', inning: 'BOT 4', team: TEAMS.BOS, batter: 'Jarren Duran', code: '3B', desc: 'Two-run triple to the gap in right-center', scored: { runs: 2, score: 'BOS 2 – 3 NYY' }, dur: '0:34', src: null },
    { id: 'judge', inning: 'TOP 1', team: TEAMS.NYY, batter: 'Aaron Judge', code: 'HR', desc: 'Three-run homer to left · 412 ft', scored: { runs: 3, score: 'NYY 3 – 0 BOS' }, dur: '0:40', src: null },
  ] },
  { id: 'ladsfg', away: TEAMS.LAD, home: TEAMS.SFG, score: [4, 2], clips: [
    { id: 'betts', inning: 'TOP 6', team: TEAMS.LAD, batter: 'Mookie Betts', code: '2B', desc: 'Two-run double down the left-field line', scored: { runs: 2, score: 'LAD 4 – 2 SFG' }, dur: '0:29', src: null },
    { id: 'ohtani', inning: 'TOP 1', team: TEAMS.LAD, batter: 'Shohei Ohtani', code: 'HR', desc: 'Leadoff homer to right · 419 ft', scored: { runs: 1, score: 'LAD 1 – 0 SFG' }, dur: '0:37', src: null },
  ] },
];

function HighlightsPage({ initial = null }) {
  const [open, setOpen] = React.useState(initial); // { game, id }
  const col = { maxWidth: 1240, margin: '0 auto', width: '100%', padding: '0 28px', boxSizing: 'border-box' };
  const btn = { height: 30, padding: '0 12px', borderRadius: T.r.pill, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontFamily: T.sans, fontSize: 12, fontWeight: 700, cursor: 'pointer' };
  const total = HL_GAMES.reduce((a, g) => a + g.clips.length, 0);
  const game = open && HL_GAMES.find((g) => g.id === open.game);
  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100%' }}>
      <Page width={1240}>
        <window.BrandHeader active="games" colStyle={col} />
        <div style={col}>
          <PageTitle flush title="Highlights"
            subtitle={<React.Fragment>Sun May 24 · <span style={{ fontFamily: T.mono }}>{HL_GAMES.length}</span> games · <span style={{ fontFamily: T.mono }}>{total}</span> clips</React.Fragment>}
            subtitleRight={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button style={btn}>‹ Prev</button>
                <span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 700, padding: '0 6px' }}>Sun May 24</span>
                <button style={btn}>Next ›</button>
                <button style={btn}>Today</button>
              </div>
            } />
        </div>
        <div style={{ ...col, paddingTop: 16, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Content-level switch, left-anchored: Highlights is a second view of Games, not a new nav item. */}
          <div><Segmented items={['Scores', 'Highlights']} active={1} /></div>
          {HL_GAMES.map((g) => (
            <Card padless key={g.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
                <TeamDot team={g.away} size={22} />
                <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: g.score[0] > g.score[1] ? T.text : T.textMuted }}>{g.away.abbr} {g.score[0]}</span>
                <TeamDot team={g.home} size={22} />
                <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: g.score[1] > g.score[0] ? T.text : T.textMuted }}>{g.home.abbr} {g.score[1]}</span>
                <span style={{ marginLeft: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {g.live ? <React.Fragment><window.LivePill /><span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 700, color: T.textMuted }}>{g.live.half}</span></React.Fragment> : <Pill tone="soft">Final</Pill>}
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textMuted, marginLeft: 'auto' }}>{g.clips.length} clips</span>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 13, fontWeight: 700 }}>Open game →</a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 18, padding: '16px 18px 18px' }}>
                {g.clips.map((c) => <ClipCard key={c.id} clip={c} active={open && open.id === c.id} onClick={() => setOpen({ game: g.id, id: c.id })} />)}
              </div>
            </Card>
          ))}
        </div>
      </Page>
      {game && <ClipOverlay clips={game.clips} id={open.id} live={game.live} onPick={(id) => setOpen({ game: game.id, id })} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ---------- Home · Following: a ▶ tab on followed players with clips today ----------
// Keyed by the follow's name (the Following list's own key). Only today's clips.
const FOLLOW_CLIPS = {
  'Aaron Judge': { live: { half: '▲8', away: TEAMS.NYY, home: TEAMS.TOR, score: [7, 2], note: '1 out · Judge on deck' }, clips: [
    { id: 'judge3', inning: 'TOP 7', team: TEAMS.NYY, batter: 'Aaron Judge', code: 'HR', desc: 'Third homer of the night · 431 ft', scored: { runs: 2, score: 'NYY 7 – 2 TOR' }, dur: '0:41', src: null },
    { id: 'judge2', inning: 'TOP 5', team: TEAMS.NYY, batter: 'Aaron Judge', code: 'HR', desc: 'Solo homer to center · 418 ft', scored: { runs: 1, score: 'NYY 4 – 2 TOR' }, dur: '0:36', src: null },
    { id: 'judge1', inning: 'TOP 1', team: TEAMS.NYY, batter: 'Aaron Judge', code: 'HR', desc: 'Two-run homer to left · 409 ft', scored: { runs: 2, score: 'NYY 2 – 0 TOR' }, dur: '0:39', src: null },
  ] },
  'Jeremy Pe\u00f1a': { live: { half: '▼7', away: TEAMS.ATL, home: TEAMS.HOU, score: [0, 3], note: '1 out · runner on 2nd' }, clips: [
    { id: 'pena2b', inning: 'BOT 5', team: TEAMS.HOU, batter: 'Jeremy Pe\u00f1a', code: '2B', desc: 'RBI double off the wall in left', scored: { runs: 1, score: 'HOU 3 – 0 ATL' }, dur: '0:28', src: null },
  ] },
  'Hunter Brown': { live: { half: '▼7', away: TEAMS.ATL, home: TEAMS.HOU, score: [0, 3], note: '1 out · runner on 2nd' }, clips: [
    { id: 'brown9k', inning: 'TOP 6', team: TEAMS.HOU, batter: 'Hunter Brown', code: 'K', desc: 'Ninth strikeout, ends the 6th', dur: '0:21', src: null },
  ] },
  // Followed TEAMS get the same layers — their game's clips, including players you do not
  // follow. Peña's double and Brown's 9th K appear here AND on their own cards (allowed).
  'Houston Astros': { live: { half: '▼7', away: TEAMS.ATL, home: TEAMS.HOU, score: [0, 3], note: '1 out · runner on 2nd' }, clips: [
    { id: 'brown9k', inning: 'TOP 6', team: TEAMS.HOU, batter: 'Hunter Brown', code: 'K', desc: 'Ninth strikeout, ends the 6th', dur: '0:21', src: null },
    { id: 'pena2b', inning: 'BOT 5', team: TEAMS.HOU, batter: 'Jeremy Pe\u00f1a', code: '2B', desc: 'RBI double off the wall in left', scored: { runs: 1, score: 'HOU 3 – 0 ATL' }, dur: '0:28', src: null },
    { id: 'alvarezhr', inning: 'BOT 1', team: TEAMS.HOU, batter: 'Yordan Alvarez', code: 'HR', desc: 'Two-run homer to right · 412 ft', scored: { runs: 2, score: 'HOU 2 – 0 ATL' }, dur: '0:37', src: null },
  ] },
  'Chicago Cubs': { clips: [
    { id: 'cubswin', inning: 'BOT 8', team: TEAMS.CHC, batter: 'Seiya Suzuki', code: '2B', desc: 'Go-ahead two-run double', scored: { runs: 2, score: 'CHC 5 – 3 PIT' }, dur: '0:31', src: null },
  ] },
  'Kyle Tucker': { clips: [
    { id: 'tuckerhr', inning: 'TOP 3', team: TEAMS.LAD, batter: 'Kyle Tucker', code: 'HR', desc: 'Two-run homer to right · 404 ft', scored: { runs: 2, score: 'LAD 2 – 0 COL' }, dur: '0:35', src: null },
  ] },
};
// Game order everywhere (card layers AND the player's list): inning 1 → end.
const clipKey = x => parseInt(x.inning.split(' ')[1], 10) * 2 + (x.inning.startsWith('BOT') ? 1 : 0);
Object.values(FOLLOW_CLIPS).forEach(v => v.clips.sort((p, q) => clipKey(p) - clipKey(q)));

// Labelled faces for the rich Following cards: TODAY / SEASON / NEXT GAME, two lines each.
// An off day says so (Sep 26, user's call): TODAY · "No game today", with the next game on
// the second line so the layer still answers "when do I see him next".
const FOLLOW_FACES = {
  'Houston Astros': [
    { label: 'TODAY', lines: ['▼7th · leading Atlanta 3–0', '1 out · runner on 2nd'] },
    { label: 'SEASON', lines: ['86–67 · 2nd AL West', '2.0 GB · won 4 straight'] },
    { label: 'NEXT GAME', lines: ['Sat vs SEA · 7:05', 'Valdez vs Kirby'] }],
  'Hunter Brown': [
    { label: 'TODAY', lines: ['6.0 IP · 0 H · 9 K', 'vs ATL · 87 pitches · still in'] },
    { label: 'SEASON', lines: ['14–7 · 2.61 ERA · 218 K', '1.02 WHIP · 31 starts'] }],
  'Jeremy Pe\u00f1a': [
    { label: 'TODAY', lines: ['2-for-4 · 2B · RBI', 'vs ATL · ▼7th · HOU 3–0'] },
    { label: 'SEASON', lines: ['.327 · 14 HR · 61 RBI', '.372 OBP · .498 SLG · 22 SB'] }],
  'Aaron Judge': [
    { label: 'TODAY', lines: ['3-for-4 · 3 HR · 5 RBI', '@ TOR · ▲8th · NYY 7–2'] },
    { label: 'SEASON', lines: ['.329 · 47 HR · 118 RBI', '.452 OBP · .688 SLG'] }],
  'Chicago Cubs': [
    { label: 'TODAY', lines: ['Final · beat Pittsburgh 5–3', 'W: Imanaga (12–6)'] },
    { label: 'SEASON', lines: ['79–74 · 3rd NL Central', '3.0 GB of the last wild card'] }],
  'Kyle Tucker': [
    { label: 'TODAY', lines: ['Final · 1-for-4 · HR · 2 RBI', '@ COL · LAD won 6–2'] },
    { label: 'SEASON', lines: ['.311 · 31 HR · 96 RBI', '.398 OBP · .561 SLG'] }],
  'Baltimore Orioles': [
    { label: 'TODAY', lines: ['Tonight vs Cleveland · 7:05', 'Rogers vs Bibee'] },
    { label: 'SEASON', lines: ['81–72 · 4th AL East', '5.0 GB of the last wild card'] }],
  'Shohei Ohtani': [
    { label: 'TODAY', lines: ['No game today', 'Next: Sat vs SFG · 4:05'] },
    { label: 'SEASON', lines: ['.301 · 48 HR · 104 RBI', '.390 OBP · .622 SLG · 52 SB'] }],
};

const FOLLOW_CLIP_LISTS = Object.fromEntries(Object.entries(FOLLOW_CLIPS).map(([k, v]) => [k, v.clips]));

function HomeClipsDemo({ initial = null }) {
  const [open, setOpen] = React.useState(initial); // { who, id }
  const entry = open && FOLLOW_CLIPS[open.who];
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <window.HomeScreen showControls={false} followClips={FOLLOW_CLIP_LISTS} followFaces={FOLLOW_FACES} onFollowClip={(who, id) => setOpen({ who, id: id || FOLLOW_CLIPS[who].clips[0].id })} />
      {entry && <ClipOverlay clips={entry.clips} id={open.id} live={entry.live} listTitle={`${open.who} · today`}
        onPick={(id) => setOpen({ who: open.who, id })} onClose={() => setOpen(null)} />}
    </div>
  );
}

// Scorecard demo: the paper scorecard with ▶ marks; tapping one plays the clip in the box.
function ClipsScorecardDemo() {
  const [clip, setClip] = React.useState(null);
  return (
    <div style={{ padding: 20, background: T.bg }}>
      <window.PitchByPitchV2 clips={GAME_CLIPS_BY_PA} onClip={setClip} activeClip={clip} initialScorecard="paredes"
        inPlace={clip ? <ClipInPlace clips={GAME_CLIPS} id={clip} onPick={setClip} onClose={() => setClip(null)} /> : null} />
    </div>
  );
}

Object.assign(window, { GAME_CLIPS, GAME_CLIPS_BY_PA, GAME_CLIPS_LIVE, WatchButton, ClipThumb, ClipVideo, ClipOverlay, ClipTray, ClipInPlace, GameHighlightsRow, HighlightsPage, ClipsScorecardDemo, HomeClipsDemo, FOLLOW_CLIPS });
