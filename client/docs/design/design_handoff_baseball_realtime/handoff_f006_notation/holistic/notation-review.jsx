// F-006 review — full scorekeeping notation. Review-only page component (NOT for port);
// the port target is the ScorebookCell `spray` prop (shared.jsx) + the scorecard box below.
const nv = {
  frame: { width: 1240, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '26px 30px 30px', boxSizing: 'border-box', fontFamily: "'DM Sans',sans-serif", color: T.ink },
  cap: { fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: T.accent, textTransform: 'uppercase' },
  h: { fontSize: 24, fontWeight: 700, margin: '6px 0 6px', letterSpacing: '-0.01em' },
  p: { fontSize: 14, lineHeight: 1.5, color: T.textMuted, margin: '0 0 18px', maxWidth: 820, textWrap: 'pretty' },
  lab: { fontSize: 12, fontWeight: 600, color: T.textMuted, textAlign: 'center', lineHeight: 1.3 },
  rowLab: { fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center' },
};

const SB = { home: [50, 85.76], 1: [79.7, 56.06], 2: [50, 26.36], 3: [20.3, 56.06] };
// F-006: reached-base codes sit in the open foul ground below the 1B line (clear of the arc, the
// spray lines and the marker column), not at the foul-pole corner.
const SB_LABEL = { 1: [84, 77], 2: [84, 77], 3: [84, 77] };
const SB_RMAX = (th) => 26.01 * Math.cos(th) + Math.sqrt(676.5 * Math.cos(th) ** 2 - 676.5 + 2256.25);

// Scorecard-grid box (112 × 96, same field art as scorebook-cell.js) with F-006 notation.
function ScoreBox({ code, sub, reachedOnPA = 0, finalBase, outAt = null, spray, scored }) {
  const pt = (b) => (b === 0 || b === 4 ? SB.home : SB[b]);
  const segs = (a, b) => { let d = ''; for (let i = a; i < b; i++) { const p = pt(i), q = pt(i + 1); d += `M${p[0]} ${p[1]} L${q[0]} ${q[1]} `; } return d; };
  const fin = outAt != null ? outAt : finalBase != null ? finalBase : reachedOnPA;
  const didScore = scored || fin >= 4;
  const sp = spray ? window.sprayPathFor(spray, SB.home, SB_RMAX, 0.75) : null;
  const centered = !(reachedOnPA >= 1 && reachedOnPA <= 3);
  const lp = centered ? [50, 60] : SB_LABEL[reachedOnPA];
  const halo = { stroke: T.surface, strokeWidth: 3, paintOrder: 'stroke' };
  let art = window.SCOREBOOK_FIELD_SVG;
  return (
    <div style={{ width: 112, height: 96, boxSizing: 'border-box', border: `1px solid ${T.ink}`, background: T.surface, padding: 2, position: 'relative', overflow: 'hidden' }}>
      <div className="cwtop">
        <svg className="cwfield" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
          {didScore && <polygon points={`${SB.home} ${SB[1]} ${SB[2]} ${SB[3]}`} fill={T.positiveSoft} />}
          <g dangerouslySetInnerHTML={{ __html: art }} />
          {sp && <g><path d={sp.d} fill="none" stroke={T.textMuted} strokeWidth={sp.ground ? 1.9 : 1.3} strokeLinecap="round" strokeDasharray={sp.ground ? '0.1 3.2' : undefined} /><circle cx={sp.end[0]} cy={sp.end[1]} r="2" fill={T.textMuted} /></g>}
          {fin > reachedOnPA && <path d={segs(reachedOnPA, fin)} stroke={T.textMuted} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
          {reachedOnPA > 0 && <path d={segs(0, reachedOnPA)} stroke={T.ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
          {outAt != null && <g stroke={T.ink} strokeWidth="2" strokeLinecap="round"><line x1={SB[outAt][0] - 4.5} y1={SB[outAt][1] - 4.5} x2={SB[outAt][0] + 4.5} y2={SB[outAt][1] + 4.5} /><line x1={SB[outAt][0] - 4.5} y1={SB[outAt][1] + 4.5} x2={SB[outAt][0] + 4.5} y2={SB[outAt][1] - 4.5} /></g>}
          {code && <text x={lp[0]} y={lp[1]} textAnchor="middle" dominantBaseline="central" fontFamily={T.mono} fontSize={String(code).length >= 3 ? 10 : 11} fontWeight="700" fill={T.ink} style={halo}>{code}</text>}
          {sub && <text x={lp[0]} y={lp[1] + 11} textAnchor="middle" dominantBaseline="central" fontFamily={T.mono} fontSize="8.5" fontWeight="500" fill={T.textMuted} style={halo}>{sub}</text>}
        </svg>
        <div className="cwmarkers"><div className="cwbox cwbox3"><span></span><span></span><span></span></div><div className="cwbox cwbox2"><span></span><span></span></div></div>
      </div>
    </div>
  );
}

const K_HIT = [
  { t: 'Ground ball', s: { angle: -20, dist: 170, traj: 'ground_ball' }, code: '1B', r: 1 },
  { t: 'Line drive', s: { angle: -12, dist: 235, traj: 'line_drive' }, code: '1B', r: 1 },
  { t: 'Fly ball', s: { angle: 18, dist: 365, traj: 'fly_ball' }, code: '2B', r: 2 },
  { t: 'Popup', s: { angle: 30, dist: 190, traj: 'popup' }, code: '1B', r: 1, note: 'blooper' },
  { t: 'Bunt', s: { angle: -30, dist: 45, traj: 'bunt_grounder' }, code: '1B', r: 1 },
];
const K_OUT = [
  { s: { angle: -14, dist: 125, traj: 'ground_ball' }, code: '6-3' },
  { s: { angle: 12, dist: 150, traj: 'line_drive' }, code: 'L4' },
  { s: { angle: 0, dist: 340, traj: 'fly_ball' }, code: 'F8' },
  { s: { angle: -34, dist: 90, traj: 'popup' }, code: 'P5' },
  { s: { angle: 3, dist: 38, traj: 'bunt_grounder' }, code: '1-3' },
];
const SS_GB = { angle: -15, dist: 130, traj: 'ground_ball' };
const NOT_HIT = [
  { t: 'Single', d: 'credited hit', code: '1B', r: 1, s: { angle: -2, dist: 165, traj: 'ground_ball' } },
  { t: "Fielder's choice", d: 'safe, no hit · runner forced', code: 'FC', sub: '6-4', r: 1, s: SS_GB },
  { t: 'Reached on error', d: 'fielding error, SS', code: 'E6', r: 1, s: SS_GB },
  { t: 'Throwing error', d: 'SS throws it away', code: 'E6T', r: 1, s: SS_GB },
  { t: 'The forced runner', d: 'singled earlier this inning · × at 2nd', code: '1B', r: 1, out: 2, s: { angle: 24, dist: 210, traj: 'line_drive' } },
  { t: 'Sac bunt', d: 'batter out, runner moves', code: 'SH', r: 0, s: { angle: 26, dist: 34, traj: 'bunt_grounder' } },
];

function Pair({ e }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <ScoreBox code={e.code} sub={e.sub} reachedOnPA={e.r || 0} outAt={e.out} spray={e.s} />
      <ScorebookCell inn={e.inn || '3rd'} code={e.code} kind={e.r ? 'hit' : 'out'} reachedOnPA={e.r || 0} outAt={e.out} spray={e.s} width={50} />
    </div>
  );
}

function KeyFrame() {
  return (
    <div style={nv.frame} data-screen-label="01 Spray key">
      <div style={nv.cap}>01 · Spray line key</div>
      <h2 style={nv.h}>Every ball in play draws where it went, and how</h2>
      <p style={nv.p}>A faint line from home to where the ball landed, under the base paths. Ground balls are dotted, liners a straight thin line, flies an arc, popups a higher arc. A bunt needs no extra mark: its line stops inside the infield. The hit type is MLB's own call, and the spot comes from its hit location. Top: scorecard box. Below: batter-card cell.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, minmax(0,1fr))', columnGap: 16, rowGap: 22 }}>
        <span></span>
        {K_HIT.map((e) => <div key={e.t} style={{ ...nv.lab, color: T.ink, fontSize: 13 }}>{e.t}</div>)}
        <span style={nv.rowLab}>Hits</span>
        {K_HIT.map((e) => <Pair key={e.t} e={e} />)}
        <span style={nv.rowLab}>Outs</span>
        {K_OUT.map((e, i) => <Pair key={i} e={e} />)}
      </div>
    </div>
  );
}

function NotHitFrame() {
  return (
    <div style={nv.frame} data-screen-label="02 Reached, not a hit">
      <div style={nv.cap}>02 · Reached, but not a hit</div>
      <h2 style={nv.h}>Same solid path as a hit. The code says the difference.</h2>
      <p style={nv.p}>A fielder's choice or an error puts the batter on base, so the path is drawn the same as a single. <b style={{ color: T.ink }}>FC</b>, <b style={{ color: T.ink }}>E6</b> and <b style={{ color: T.ink }}>E6T</b> (throwing) carry the difference. The forced runner's own cell gets only the × where he was put out; the batter's cell tells the story. The scorecard box has room for the fielders (<b style={{ color: T.ink }}>6-4</b>) under FC; the smaller cells don't.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', columnGap: 16 }}>
        {NOT_HIT.map((e) => (
          <div key={e.t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 13, fontWeight: 700 }}>{e.t}</div><div style={{ ...nv.lab, fontWeight: 500, marginTop: 2, minHeight: 32 }}>{e.d}</div></div>
            <Pair e={e} />
          </div>
        ))}
      </div>
    </div>
  );
}

const TODAY = [
  { inn: '1st', code: '1B', kind: 'hit', r: 1, s: { angle: -24, dist: 240, traj: 'line_drive' } },
  { inn: '3rd', code: 'FC', kind: 'hit', r: 1, s: SS_GB },
  { inn: '5th', code: 'F8', kind: 'out', r: 0, s: { angle: 4, dist: 355, traj: 'fly_ball' } },
  { inn: '7th', code: 'E6T', kind: 'hit', r: 1, fin: 4, s: SS_GB },
  { inn: '8th', code: 'SH', kind: 'out', r: 0, s: { angle: 26, dist: 34, traj: 'bunt_grounder' } },
];
const CARD_ROWS = [
  { name: 'Altuve', cells: [{ code: '1B', r: 1, out: 2, s: { angle: 16, dist: 180, traj: 'ground_ball' } }, { code: 'P4', s: { angle: 14, dist: 140, traj: 'popup' } }, null] },
  { name: 'Peña', cells: [{ code: 'FC', sub: '4-6', r: 1, s: { angle: 10, dist: 135, traj: 'ground_ball' } }, null, { code: '2B', r: 2, fin: 4, s: { angle: -30, dist: 330, traj: 'line_drive' } }] },
  { name: 'Alvarez', cells: [{ code: 'F9', s: { angle: 30, dist: 320, traj: 'fly_ball' } }, null, { code: 'E5', r: 1, s: { angle: -35, dist: 95, traj: 'ground_ball' } }] },
];

function ContextFrame() {
  const th = { fontFamily: T.mono, fontSize: 12, fontWeight: 700, background: 'rgb(151,173,201)', color: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${T.ink}`, borderBottom: `1px solid ${T.ink}`, height: 28 };
  return (
    <div style={nv.frame} data-screen-label="03 In context">
      <div style={nv.cap}>03 · In context</div>
      <h2 style={nv.h}>Scorecard and batter card get the line. The feed badge doesn't.</h2>
      <p style={nv.p}>The feed badge is about 36px with the code already inside the diamond, so it keeps only the base paths and code. It still says FC, E6T and SH, just without the spray line.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', columnGap: 48, alignItems: 'start' }}>
        <div>
          <div style={{ ...nv.rowLab, marginBottom: 10 }}>Scorecard grid · excerpt</div>
          <div style={{ display: 'inline-grid', gridTemplateColumns: '120px repeat(3,112px)', border: `1.3px solid ${T.ink}`, background: T.surface }}>
            <div style={{ ...th, justifyContent: 'flex-start', paddingLeft: 10 }}>Name</div>
            {[1, 2, 3].map((i) => <div key={i} style={th}>{i}</div>)}
            {CARD_ROWS.map((row) => (
              <React.Fragment key={row.name}>
                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 10, fontWeight: 600, fontSize: 14, background: 'rgb(206,217,233)', borderRight: `1px solid ${T.ink}`, borderBottom: `1px solid ${T.ink}` }}>{row.name}</div>
                {row.cells.map((c, i) => c ? <ScoreBox key={i} code={c.code} sub={c.sub} reachedOnPA={c.r || 0} finalBase={c.fin} outAt={c.out} spray={c.s} /> : <div key={i} style={{ width: 112, height: 96, boxSizing: 'border-box', border: `1px solid ${T.ink}`, opacity: 0.3, background: T.surface }}></div>)}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div style={{ ...nv.rowLab, marginBottom: 10 }}>Batter card · At-bats</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {TODAY.map((c, i) => <ScorebookCell key={i} inn={c.inn} code={c.code} kind={c.kind} reachedOnPA={c.r} finalBase={c.fin} spray={c.s} width={50} />)}
              <ScorebookCell inn="9th" live state="active" width={50} />
            </div>
          </div>
          <div>
            <div style={{ ...nv.rowLab, marginBottom: 10 }}>Pitch-by-pitch feed badge · no spray</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {TODAY.map((c, i) => <ScorebookCell key={i} code={c.code} kind={c.kind} reachedOnPA={c.r} finalBase={c.fin} spray={c.s} codeIn width={44} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CELL_SET = [
  ...TODAY.map((c) => ({ ...c })),
  { inn: '2nd', code: '2B', kind: 'hit', r: 2, s: { angle: 18, dist: 365, traj: 'fly_ball' } },
  { inn: '4th', code: 'HR', kind: 'hit', r: 4, s: { angle: -22, dist: 410, traj: 'fly_ball' } },
  { inn: '6th', code: '6-3', kind: 'out', r: 0, s: { angle: -14, dist: 125, traj: 'ground_ball' } },
  { inn: '6th', code: 'K', kind: 'out', r: 0 },
  { inn: '9th', code: 'BB', kind: 'walk', r: 1 },
];
const FIELD_OPTS = [
  { f: 'diamond', t: 'Today', d: 'Diamond only. The whole field is squeezed into it, so the 365 ft double and the HR stop at the infield edge.' },
  { f: 'full', t: 'Option 1 · Draw the outfield', d: 'Faint foul lines and wall; the diamond shrinks about a quarter. Outfield balls land in the outfield. Every cell carries the lines, including K and BB.' },
  { f: 'overflow', t: 'Option 2 · Run past the diamond · CHOSEN', d: 'Diamond unchanged; outfield lines continue into the cell’s margin, end just under the inning label (now on a cream backing) and are clipped at the border. The default everywhere.' },
];
function CellRow({ field, scale = 1 }) {
  const row = (
    <div style={{ display: 'flex', gap: 6 }}>
      {CELL_SET.map((c, i) => <ScorebookCell key={i} inn={c.inn} code={c.code} kind={c.kind} reachedOnPA={c.r} finalBase={c.fin} spray={c.s} width={50} field={field} />)}
    </div>
  );
  if (scale === 1) return row;
  return <div style={{ width: (CELL_SET.length * 56 - 6) * scale, height: 74 * scale }}><div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>{row}</div></div>;
}
function FieldOptionsFrame() {
  return (
    <div style={nv.frame} data-screen-label="05 Batter-card cell options">
      <div style={nv.cap}>05 · Batter-card cell · two options</div>
      <h2 style={nv.h}>Giving the spray line an outfield to land in · option 2 chosen</h2>
      <p style={nv.p}>The same ten at-bats in each version, at actual size (top) and enlarged (below). The set includes a strikeout and a walk, because whatever the cell draws, it draws on every at-bat.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {FIELD_OPTS.map((o) => (
          <div key={o.f} style={{ display: 'grid', gridTemplateColumns: '230px minmax(0,1fr)', columnGap: 32, alignItems: 'start' }}>
            <div><div style={{ fontSize: 15, fontWeight: 700 }}>{o.t}</div><div style={{ fontSize: 13, lineHeight: 1.45, color: T.textMuted, marginTop: 4, textWrap: 'pretty' }}>{o.d}</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <CellRow field={o.f} />
              <CellRow field={o.f} scale={1.65} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataFrame() {
  const li = { fontSize: 14, lineHeight: 1.5, color: T.ink, margin: '0 0 8px', textWrap: 'pretty' };
  const m = { fontFamily: T.mono, fontSize: 13 };
  return (
    <div style={nv.frame} data-screen-label="04 Data">
      <div style={nv.cap}>04 · What the server sends</div>
      <h2 style={nv.h}>All of it is already in MLB's feed</h2>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <li style={li}><b>Spray</b>, on the final pitch of any ball in play: <span style={m}>spray: {'{'} angle, dist, traj {'}'}</span>. Angle from <span style={m}>hitData.coordinates</span> (home ≈ 125.42, 198.27; <span style={m}>atan2(x − 125.42, 198.27 − y)</span>, −45° = 3B line). Distance = <span style={m}>hitData.totalDistance</span>. Trajectory = <span style={m}>hitData.trajectory</span> verbatim, including the three bunt values the current <span style={m}>hitKind</span> drops.</li>
        <li style={li}><b>Fielder's choice / forceout:</b> the batter's code is <span style={m}>FC</span> (today it's the fielders, e.g. <span style={m}>6-4</span>); send the fielders separately as <span style={m}>scorebookSub</span> for the scorecard box.</li>
        <li style={li}><b>Errors:</b> read the error credit, not <span style={m}>hitData.location</span> (that's who fielded it, not who erred): <span style={m}>f_fielding_error</span> → <span style={m}>E6</span>, <span style={m}>f_throwing_error</span> → <span style={m}>E6T</span>. Same rule for error labels on later advances.</li>
        <li style={li}><b>Bunts:</b> no new code. Bunt single = <span style={m}>1B</span>, sac bunt = <span style={m}>SH</span>, bunt out = its fielding code. The short line says "bunt".</li>
        <li style={li}><b>No spray</b> when the ball wasn't put in play (K, BB, HBP, CI), when MLB has no coordinates, or in the feed badge.</li>
      </ul>
    </div>
  );
}

function NotationReview() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex', flexDirection: 'column', gap: 40 }}>
      <style>{window.SCOREBOOK_CELL_CSS}</style>
      <KeyFrame />
      <NotHitFrame />
      <ContextFrame />
      <DataFrame />
      <FieldOptionsFrame />
    </div>
  );
}
window.NotationReview = NotationReview;
