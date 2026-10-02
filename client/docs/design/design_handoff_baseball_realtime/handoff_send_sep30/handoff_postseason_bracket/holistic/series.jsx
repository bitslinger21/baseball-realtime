/* global React, T, TEAMS, TeamDot */
// ============================================================
// SERIES DRAWER (Sep 29, 2026, first pass) — opened from any started bracket card on Home.
// Slides from the right like the Lineups panel; dim backdrop; ✕ / Esc / backdrop close.
// One row per game, in order: final (score · W/L/SV · one notable line · Recap) → live
// (state + Open game) → next (date/time · probables) → "if necessary" (date only).
// Recap = the club's per-game recap video. `recap: null` on a final = not posted yet.
// ============================================================

const G = (n, day, at, x) => ({ n, day, at, ...x });
const F = (a, as, b, bs, w, l, sv, note, recap, extra) => ({ final: { a, as, b, bs, extra }, w, l, sv, note, recap });

window.SERIES = {
  'BOS-TOR': { round: 'AL Wild Card', bo: 3, status: 'Red Sox won 2–0', games: [
    G(1, 'Tue 09/29', 'BOS', F('BOS', 3, 'TOR', 1, 'Crochet', 'Gausman', 'Chapman', 'Crochet 7 IP, 11 K', '2:48')),
    G(2, 'Wed 09/30', 'BOS', F('BOS', 6, 'TOR', 4, 'Bello', 'Berríos', null, 'Duran 3-for-4, 2 RBI', '3:05'))] },
  'SEA-HOU': { round: 'AL Wild Card', bo: 3, status: 'Astros won 2–1', games: [
    G(1, 'Tue 09/29', 'SEA', F('SEA', 2, 'HOU', 1, 'Gilbert', 'Brown', 'Muñoz', 'Raleigh go-ahead HR in the 8th', '2:57')),
    G(2, 'Wed 09/30', 'SEA', F('HOU', 5, 'SEA', 3, 'Valdez', 'Castillo', 'Hader', 'Alvarez 2-for-3, HR', '3:11')),
    G(3, 'Thu 10/01', 'SEA', F('HOU', 4, 'SEA', 2, 'Blanco', 'Kirby', 'Hader', 'Peña 3 hits, 2 RBI', '3:20'))] },
  'NYY-BOS': { round: 'ALDS', bo: 5, status: 'Yankees lead 2–1', games: [
    G(1, 'Sat 10/03', 'NYY', F('NYY', 5, 'BOS', 2, 'Cole', 'Crochet', 'Williams', 'Judge 2-for-4, HR, 3 RBI', '3:14')),
    G(2, 'Sun 10/04', 'NYY', F('BOS', 4, 'NYY', 3, 'Chapman', 'Weaver', null, 'Devers go-ahead HR in the 10th', '3:32', 10)),
    G(3, 'Tue 10/06', 'BOS', F('NYY', 6, 'BOS', 1, 'Rodón', 'Bello', null, 'Stanton 2 HR, 4 RBI', null)),
    G(4, 'Wed 10/07 7:08', 'BOS', { next: 'Gil vs Houck' }),
    G(5, 'Fri 10/09', 'NYY', { ifNec: true })] },
  'CLE-HOU': { round: 'ALDS', bo: 5, status: 'Astros lead 2–0', games: [
    G(1, 'Sat 10/03', 'CLE', F('HOU', 4, 'CLE', 2, 'Valdez', 'Bibee', 'Hader', 'Alvarez HR, 2 RBI', '3:02')),
    G(2, 'Sun 10/04', 'CLE', F('HOU', 3, 'CLE', 0, 'Brown', 'Williams', 'Hader', 'Brown 7 IP, 10 K', '2:51')),
    G(3, 'Wed 10/07', 'HOU', { live: { inn: '▼6', a: 'HOU', as: 3, b: 'CLE', bs: 1, note: '1 out · runner on 1st' } }),
    G(4, 'Thu 10/08', 'HOU', { ifNec: true }),
    G(5, 'Sat 10/10', 'CLE', { ifNec: true })] },
  'LAD-NYM': { round: 'NLDS', bo: 5, status: 'Series tied 1–1', games: [
    G(1, 'Sat 10/03', 'LAD', F('LAD', 6, 'NYM', 3, 'Glasnow', 'Manaea', null, 'Ohtani 3-for-5, HR', '3:09')),
    G(2, 'Sun 10/04', 'LAD', F('NYM', 5, 'LAD', 2, 'Peterson', 'Snell', 'Díaz', 'Lindor HR, 3 RBI', '2:59')),
    G(3, 'Wed 10/07 8:08', 'NYM', { next: 'Yamamoto vs Senga' }),
    G(4, 'Thu 10/08', 'NYM', {}),
    G(5, 'Sat 10/10', 'LAD', { ifNec: true })] },
  'MIL-PHI': { round: 'NLDS', bo: 5, status: 'Phillies won 3–1', games: [
    G(1, 'Sat 10/03', 'MIL', F('PHI', 7, 'MIL', 2, 'Wheeler', 'Peralta', null, 'Harper 2 HR', '3:18')),
    G(2, 'Sun 10/04', 'MIL', F('MIL', 4, 'PHI', 3, 'Myers', 'Nola', 'Megill', 'Chourio walk-off single', '3:04')),
    G(3, 'Tue 10/06', 'PHI', F('PHI', 5, 'MIL', 1, 'Sánchez', 'Priester', null, 'Schwarber HR, 3 RBI', '2:55')),
    G(4, 'Wed 10/07', 'PHI', F('PHI', 4, 'MIL', 3, 'Suárez', 'Misiorowski', 'Durán', 'Turner go-ahead double in the 8th', null))] },
  'SDP-NYM': { round: 'NL Wild Card', bo: 3, status: 'Mets won 2–1', games: [
    G(1, 'Tue 09/29', 'SDP', F('SDP', 4, 'NYM', 0, 'Cease', 'Senga', null, 'Cease 7 IP, 0 R', '2:44')),
    G(2, 'Wed 09/30', 'SDP', F('NYM', 6, 'SDP', 5, 'Holmes', 'Suárez', 'Díaz', 'Alonso go-ahead HR in the 9th', '3:22')),
    G(3, 'Thu 10/01', 'SDP', F('NYM', 3, 'SDP', 1, 'Manaea', 'King', 'Díaz', 'Soto 2-for-3, HR', '3:01'))] },
  'PHI-ARI': { round: 'NL Wild Card', bo: 3, status: 'Phillies won 2–0', games: [
    G(1, 'Tue 09/29', 'PHI', F('PHI', 5, 'ARI', 2, 'Wheeler', 'Gallen', 'Durán', 'Harper HR, 3 RBI', '2:58')),
    G(2, 'Wed 09/30', 'PHI', F('PHI', 3, 'ARI', 2, 'Nola', 'Kelly', 'Durán', 'Bohm walk-off single', '3:07'))] },
};

const sdMono = { fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' };

function SeriesScoreLine({ a, as, b, bs, win = true, tag }) {
  const side = (ab, sc, w) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <TeamDot team={TEAMS[ab]} size={16} />
      <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: w ? 700 : 500, color: w ? T.text : T.textMuted }}>{ab}</span>
      <span style={{ ...sdMono, fontSize: 15, fontWeight: w ? 700 : 500, color: w ? T.text : T.textMuted }}>{sc}</span>
    </span>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {side(a, as, win)}{side(b, bs, false)}
      {tag && <span style={{ ...sdMono, fontSize: 11, color: T.textMuted }}>{tag}</span>}
    </div>
  );
}

function RecapButton({ dur, open, onClick }) {
  const [hov, setHov] = React.useState(false);
  if (!dur) return <span style={{ fontFamily: T.sans, fontSize: 11.5, color: T.textMuted }}>Recap not posted yet</span>;
  const on = hov || open;
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 9px', borderRadius: T.r.sm, border: `1px solid ${on ? T.ink : T.border}`, background: on ? T.ink : T.surface, color: on ? '#fff' : T.text, cursor: 'pointer', fontFamily: T.sans, fontSize: 12, fontWeight: 700 }}>
      <svg width="8" height="9" viewBox="0 0 9 10" aria-hidden="true"><path d="M0 0 L9 5 L0 10 Z" fill="currentColor" /></svg>
      Recap<span style={{ ...sdMono, fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{dur}</span>
    </button>
  );
}

function SeriesGame({ g, bo, playing, onPlay }) {
  const head = (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: T.text }}>Game {g.n}</span>
      <span style={{ ...sdMono, fontSize: 11.5, color: T.textMuted }}>{g.day} · @ {g.at}</span>
    </div>
  );
  const box = { padding: '12px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 6 };
  if (g.final) {
    const f = g.final;
    return (
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          {head}<RecapButton dur={g.recap} open={playing} onClick={onPlay} />
        </div>
        <SeriesScoreLine a={f.a} as={f.as} b={f.b} bs={f.bs} tag={f.extra ? `F/${f.extra}` : null} />
        <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span><b style={{ color: T.text }}>W</b> {g.w}</span><span><b style={{ color: T.text }}>L</b> {g.l}</span>{g.sv && <span><b style={{ color: T.text }}>SV</b> {g.sv}</span>}
        </div>
        <div style={{ fontFamily: T.sans, fontSize: 12.5, color: T.text }}>{g.note}</div>
        {g.recap && (
          <div style={{ display: 'grid', gridTemplateRows: playing ? '1fr' : '0fr', marginTop: -6, transition: 'grid-template-rows .28s cubic-bezier(0.22,0.61,0.36,1)' }}><div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div style={{ marginTop: 10, aspectRatio: '16 / 9', borderRadius: T.r.sm, background: T.ink, display: 'grid', placeItems: 'center', color: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <svg width="22" height="24" viewBox="0 0 9 10" aria-hidden="true"><path d="M0 0 L9 5 L0 10 Z" fill="#fff" /></svg>
              <span style={{ fontFamily: T.sans, fontSize: 12, color: '#c4c4cc' }}>Game {g.n} recap · <span style={sdMono}>{g.recap}</span></span>
            </div>
          </div>
          </div></div>
        )}
      </div>
    );
  }
  if (g.live) {
    const L = g.live;
    return (
      <div style={{ ...box, background: T.accentSoft }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          {head}
          <a href="#" onClick={(e) => e.preventDefault()} style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700 }}>Open game →</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
          <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: T.accent }}>LIVE</span>
          <span style={{ ...sdMono, fontSize: 12, fontWeight: 600, color: T.text }}>{L.inn}</span>
        </div>
        <SeriesScoreLine a={L.a} as={L.as} b={L.b} bs={L.bs} />
        <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted }}>{L.note}</div>
      </div>
    );
  }
  return (
    <div style={box}>
      {head}
      <div style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted }}>{g.ifNec ? 'If necessary' : g.next ? g.next : 'Probables not announced'}</div>
    </div>
  );
}

window.SeriesDrawer = function SeriesDrawer({ id, hi, lo, onClose }) {
  const d = window.SERIES[id];
  const [play, setPlay] = React.useState(null);
  React.useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const big = (t) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 64 }}>
      <TeamDot team={TEAMS[t.abbr]} size={30} />
      <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.text }}>{t.abbr}</span>
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <style>{'@keyframes sdIn{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes sdFade{from{opacity:0}to{opacity:1}}'}</style>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,16,12,0.28)', animation: 'sdFade .2s ease' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '100%', background: T.surface, borderLeft: `1px solid ${T.borderStrong}`, boxShadow: '-18px 0 48px -16px rgba(20,16,12,0.28)', display: 'flex', flexDirection: 'column', animation: 'sdIn .24s cubic-bezier(0.22,0.61,0.36,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.text }}>{d.round}</span>
            <span style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted }}>Best of {d.bo}</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: T.r.sm, border: `1px solid ${T.border}`, background: T.surface, color: T.textMuted, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '18px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {big(hi)}
              <span style={{ ...sdMono, fontSize: 30, fontWeight: 700, color: T.text }}>{hi.w}<span style={{ color: T.textMuted, fontWeight: 400, margin: '0 8px' }}>–</span>{lo.w}</span>
              {big(lo)}
            </div>
            <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 600, color: T.text }}>{d.status}</span>
          </div>
          {d.games.map((g) => <SeriesGame key={g.n} g={g} bo={d.bo} playing={play === g.n} onPlay={() => setPlay(play === g.n ? null : g.n)} />)}
        </div>
      </div>
    </div>
  );
};
