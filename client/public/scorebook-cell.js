window.SCOREBOOK_FIELD_SVG = `
  <path d="M95.12,44.88 A47.5,47.5 0 0 0 4.88,44.88" fill="none" stroke="#c8c8c8" stroke-width="1.1" opacity="0.4"/>
  <circle cx="50" cy="59.75" r="5" fill="none" stroke="#c8c8c8" stroke-width="1.1" stroke-dasharray="2.4 2" opacity="0.75"/>
  <path d="M55.66,32.02 L76.16,52.52 A8,8 0 0 0 76.16,63.84 L55.66,84.34 A8,8 0 0 0 44.34,84.34 L23.84,63.84 A8,8 0 0 0 23.84,52.52 L44.34,32.02 A8,8 0 0 0 55.66,32.02" fill="none" stroke="#c8c8c8" stroke-width="1.5"/>
  <path d="M76.16,63.84 L95.12,44.88" fill="none" stroke="#c8c8c8" stroke-width="1.5"/>
  <path d="M23.84,63.84 L4.88,44.88" fill="none" stroke="#c8c8c8" stroke-width="1.5"/>
  <circle cx="81.82" cy="58.18" r="2.5" fill="#c8c8c8"/>
  <circle cx="50" cy="26.36" r="2.5" fill="#c8c8c8"/>
  <circle cx="18.18" cy="58.18" r="2.5" fill="#c8c8c8"/>
  <circle cx="50" cy="90" r="2.5" fill="#c8c8c8"/>
`;

// Full scorebook cell: field (shifted left) + right-side marker column
// (3-cell box, 2-cell box). Used for empty/faded cells.
window.SCOREBOOK_CELL_HTML = `
  <div class="cwtop">
    <svg class="cwfield" viewBox="0 0 100 100" style="overflow:visible">${window.SCOREBOOK_FIELD_SVG}</svg>
    <div class="cwmarkers">
      <div class="cwbox cwbox3"><span></span><span></span><span></span></div>
      <div class="cwbox cwbox2"><span></span><span></span></div>
    </div>
  </div>
`;

window.SCOREBOOK_CELL_CSS = `
.cwtop{height:100%;display:flex;align-items:center;justify-content:flex-start;gap:4px;min-height:0;padding-right:6px}
.cwfield{height:88px;width:88px;flex-shrink:0}
.cwmarkers{display:flex;flex-direction:column;align-items:flex-end;gap:3px;height:auto;justify-content:flex-start;padding-top:6px}
.cwbox{display:flex;flex-direction:column;border:1.3px solid var(--border);border-radius:1px;width:10px;box-sizing:border-box}
.cwbox span{width:10px;height:10px;flex:none;border-bottom:1px solid var(--border);box-sizing:border-box;display:block}
.cwbox span:last-child{border-bottom:none}
.cwout{width:14px;height:14px;border-radius:50%;border:1.3px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;color:var(--ink);margin-top:4px}
`;

// Tick marks (standard scorebook tally): 4 verticals then a diagonal slash for the 5th, grouped in 5s.
window.tallyMarksHTML = function (n) {
  if (!n) return '';
  const xs = [3, 7, 11, 15];
  let groups = [];
  let rem = n;
  while (rem > 0) { const g = Math.min(5, rem); groups.push(g); rem -= g; }
  return `<div style="display:flex;gap:3px;align-items:center;flex-wrap:wrap">${groups.map((g) => {
    let lines = xs.slice(0, Math.min(g, 4)).map((x) => `<line x1="${x}" y1="1" x2="${x}" y2="13" stroke="var(--ink)" stroke-width="1.4"/>`).join('');
    if (g === 5) lines += '<line x1="2" y1="13" x2="16" y2="1" stroke="var(--ink)" stroke-width="1.4"/>';
    return `<svg width="20" height="14" style="flex-shrink:0">${lines}</svg>`;
  }).join('')}</div>`;
};

// Builds the full HTML for one filled inning cell.
// cellData: { code, balls, strikes, result, isLooking, live, outNum, halfEnd }
// - code: display string (e.g. "1B", "K", "6-3")
// - balls/strikes: final count (0-3 / 0-2)
// - result: play result enum string (e.g. "Single", "HomeRun", "Strikeout")
// - isLooking: true for called strikeout (renders backwards K)
// - live: true for the current in-progress at-bat (shows outline, no code/paths)
// - outNum: 1/2/3 — which out of the half-inning this AB recorded; shown as a circle below count boxes
// - halfEnd: true for the 3rd-out AB — draws a / diagonal overlay across the cell
window._cwCellHTML = function (cellData) {
  const cd = cellData || {};
  const code = cd.code || '';
  const balls = cd.balls || 0;
  const strikes = cd.strikes || 0;
  const result = cd.result || '';
  const isLooking = !!cd.isLooking;
  const live = !!cd.live;
  const outNum = cd.outNum != null ? cd.outNum : null;
  const halfEnd = !!cd.halfEnd;

  // True diamond corners: F and T are at the intersection of their respective baselines,
  // giving a 90° angle at second and perpendicular home→1B / 1B→2B lines.
  const H = [50, 90], F = [81.82, 58.18], S = [50, 26.36], T = [18.18, 58.18];
  const ink = 'var(--ink)';

  // Tangent points where each baseline meets the r=8 base circle (same geometry as the diamond outline).
  const Fh = [76.16, 63.84]; // first, home-side
  const Fs = [76.16, 52.52]; // first, second-side
  const Sf = [55.66, 32.02]; // second, first-side
  const St = [44.34, 32.02]; // second, third-side
  const Ts = [23.84, 52.52]; // third, second-side
  const Th = [23.84, 63.84]; // third, home-side
  const Ht = [44.34, 84.34]; // home, third-side
  const Hf = [55.66, 84.34]; // home, first-side

  const seg = function (ax, ay, bx, by) {
    return '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' + ink + '" stroke-width="2" stroke-linecap="round"/>';
  };
  // Arc around a base: sweep=0 (CCW in SVG) selects the base center for first/third,
  // and matches the background diamond's convention for second/home.
  const arcBase = function (x1, y1, x2, y2) {
    return '<path d="M' + x1 + ',' + y1 + ' A8,8 0 0 0 ' + x2 + ',' + y2 + '" fill="none" stroke="' + ink + '" stroke-width="2" stroke-linecap="round"/>';
  };

  let overlayPaths = '';
  let fillEl = '';
  let codeEl = '';

  if (!live && code) {
    const reachFirst = ['Single','Walk','IntentionalWalk','HitByPitch','Error','FieldersChoice','SacBunt'].includes(result);
    const isDouble = result === 'Double';
    const isTriple = result === 'Triple';
    const isHR = result === 'HomeRun';

    // Baselines: straight lines only, 90° corners at each base center.
    if (reachFirst || isDouble || isTriple || isHR) {
      overlayPaths += seg(H[0],H[1],F[0],F[1]);
    }
    if (isDouble || isTriple || isHR) {
      overlayPaths += seg(F[0],F[1],S[0],S[1]);
    }
    if (isTriple || isHR) {
      overlayPaths += seg(S[0],S[1],T[0],T[1]);
    }
    if (isHR) {
      overlayPaths += seg(T[0],T[1],H[0],H[1]);
      fillEl = '<polygon points="' + H[0]+','+H[1]+' '+F[0]+','+F[1]+' '+S[0]+','+S[1]+' '+T[0]+','+T[1] + '" fill="' + ink + '" opacity="0.15"/>';
    }

    // Code position by result type — kept clear of all overlay baselines.
    // reachFirst: inside diamond above H-F diagonal (y=140-x); double/triple: above F-S / S-T diagonals.
    var cx = 50, cy = 63, anchor = 'middle'; // default: center (outs)
    if (isHR) {
      cx = 9; cy = 15; anchor = 'start';
    } else if (isDouble) {
      cx = 72; cy = 34; // above first→second baseline
    } else if (isTriple) {
      cx = 28; cy = 34; // above second→third baseline
    } else if (reachFirst) {
      cx = 68; cy = 54; // inside diamond, clear of home→first diagonal
    }

    // Backwards K for called strikeout
    if (result === 'Strikeout' && isLooking) {
      // Mirror the K around its x position: translate(2*cx,0) scale(-1,1)
      codeEl = '<g transform="translate(' + (cx * 2) + ',0) scale(-1,1)"><text x="' + cx + '" y="' + cy + '" text-anchor="' + anchor + '" font-family="\'JetBrains Mono\',monospace" font-size="14" font-weight="700" fill="' + ink + '">K</text></g>';
    } else {
      codeEl = '<text x="' + cx + '" y="' + cy + '" text-anchor="' + anchor + '" font-family="\'JetBrains Mono\',monospace" font-size="14" font-weight="700" fill="' + ink + '">' + code + '</text>';
    }
  }

  var svg = '<svg class="cwfield" viewBox="0 0 100 100" style="overflow:visible">' + window.SCOREBOOK_FIELD_SVG + fillEl + overlayPaths + codeEl + '</svg>';

  // Count box spans: a filled center dot for each recorded ball/strike.
  var dot = 'background:radial-gradient(circle 3px at center,var(--borderStrong) 100%,transparent 100%)';
  var bSpans = [0,1,2].map(function(i){ return '<span' + (i < balls ? ' style="' + dot + '"' : '') + '></span>'; }).join('');
  var sSpans = [0,1].map(function(i){ return '<span' + (i < strikes ? ' style="' + dot + '"' : '') + '></span>'; }).join('');

  var outEl = outNum != null ? '<div class="cwout">' + outNum + '</div>' : '';

  // Half-inning end: 45° line through the bottom-right corner of the cell (112×96px grid cell),
  // extending ~25% of the cell (28px) past the corner in both directions. viewBox matches
  // INN_W×(SUBROWS*ROW_H) = 112×96 so coordinates are 1:1 with pixels.
  var halfEndSvg = halfEnd
    ? '<svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 112 96"><line x1="84" y1="124" x2="140" y2="68" stroke="' + ink + '" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>'
    : '';

  return '<div class="cwtop">' + svg + '<div class="cwmarkers"><div class="cwbox cwbox3">' + bSpans + '</div><div class="cwbox cwbox2">' + sSpans + '</div>' + outEl + '</div></div>' + halfEndSvg;
};

// The single canonical scorebook grid builder — shared by the print reference (Scorebook Page.html)
// and the in-app scorecard flip (game-v2.jsx), so both always render the SAME designed layout.
// `container` is the grid element itself (caller sets no styles beyond mounting it).
// lineup: 9 entries { order, no, name, avg, pos, cellsByInn: {1..9: {code,balls,strikes,result,isLooking,live}|undefined}, stats:{ab,r,h,rbi} }
// pitchers: up to 4 entries { no, name, era, hnd, cellsByInn: {1..9: {r,h,k,bb}} }
window.buildScorebookGrid = function (grid, { lineup = [], pitchers = [], gameId = null, teamAbbr = '', logoUrl = null, teamName = '', opponent = null, gameDate = null, venue = null } = {}) {
  const INN = 9, SLOTS = 9, SUBROWS = 3;
  const STAT_LABELS = ['AB', 'R', 'H', 'RBI'];
  const LEFT_W = [36, 36, 190, 34, 26];
  const TOTAL_COLS = LEFT_W.length + INN + STAT_LABELS.length;
  const INN_COL_START = 6;
  const STAT_COL_START = INN_COL_START + INN;
  const STAT_W = 210 / STAT_LABELS.length;
  grid.innerHTML = '';
  grid.style.display = 'inline-grid';
  grid.style.border = '1.3px solid var(--ink)';
  grid.style.background = 'var(--surface)';
  grid.style.fontFamily = "'DM Sans',sans-serif";
  grid.style.gridTemplateColumns = LEFT_W.map((w) => w + 'px').join(' ') + ` repeat(${INN},112px)` + ` repeat(${STAT_LABELS.length},${STAT_W}px)`;
  // Row 1: SCOREBOOK header; Row 2: team name header; Row 3: column headers; Rows 4+: batting slots + pitching
  grid.style.gridTemplateRows = `44px 30px 30px repeat(${SLOTS * SUBROWS},32px) 32px repeat(4,32px)`;

  // SCOREBOOK header — logo-wordmark left, game metadata right
  var sbMetaParts = [];
  if (gameDate) sbMetaParts.push(gameDate.toUpperCase());
  if (opponent) sbMetaParts.push('vs ' + opponent);
  if (venue) sbMetaParts.push(venue);
  var sbMetaLine = sbMetaParts.join(' · ');
  var scorebookHdr = document.createElement('div');
  scorebookHdr.style.cssText = 'grid-column:1 / span ' + TOTAL_COLS + ';grid-row:1;background:var(--bg);display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid var(--border)';
  scorebookHdr.innerHTML = '<div style="font-family:\'JetBrains Mono\',monospace;font-weight:800;font-size:14px;letter-spacing:0.12em;color:var(--ink);display:flex;align-items:center">'
    + 'SC<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" style="display:inline-block;vertical-align:middle;margin:0 1px 1px"><polygon points="6,0 12,6 6,12 0,6" fill="none" stroke="#b8421e" stroke-width="1.5"/></svg>REBOOK'
    + '</div>'
    + '<div style="font-family:\'DM Sans\',sans-serif;font-size:11px;color:var(--textMuted);text-align:right;line-height:1.4">' + sbMetaLine + '</div>';
  grid.appendChild(scorebookHdr);

  const hcell = (text, col, row, extra) => { const h = document.createElement('div'); h.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--ink);padding:4px 10px;background:var(--borderStrong);${extra || ''}`; h.textContent = text; grid.appendChild(h); };
  const info = (col, row, extra, text) => { const d = document.createElement('div'); d.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--ink);${extra || ''}`; if (text != null) d.textContent = text; grid.appendChild(d); return d; };
  const shadeFor = (sub) => (sub === 0 ? '#ddd7c8' : '#f4f1ea');

  // Team name header — full-width dark band at the top
  const teamHdr = document.createElement('div');
  teamHdr.style.cssText = `grid-column:1 / span ${TOTAL_COLS};grid-row:2;background:var(--ink);color:var(--surface);font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;letter-spacing:0.08em;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid var(--ink)`;
  if (logoUrl) {
    var logoImg = document.createElement('img');
    logoImg.src = logoUrl;
    logoImg.style.cssText = 'width:22px;height:22px;object-fit:contain;flex-shrink:0';
    logoImg.onerror = function() { logoImg.style.display = 'none'; };
    teamHdr.appendChild(logoImg);
  }
  var teamNameSpan = document.createElement('span');
  teamNameSpan.textContent = teamName || (teamAbbr ? teamAbbr.toUpperCase() : 'BATTING');
  teamHdr.appendChild(teamNameSpan);
  grid.appendChild(teamHdr);

  ['#', 'No.', 'Name', 'Avg', 'Pos'].forEach((l, i) => hcell(l, i + 1, 3));
  for (let i = 1; i <= INN; i++) hcell(i, INN_COL_START + i - 1, 3);
  STAT_LABELS.forEach((l, i) => hcell(l, STAT_COL_START + i, 3, 'font-size:11px;padding:4px 2px'));

  for (let slot = 0; slot < SLOTS; slot++) {
    const startRow = 4 + slot * SUBROWS;
    const entry = lineup[slot] || {};
    const orderCell = document.createElement('div');
    orderCell.style.cssText = `grid-column:1;grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--ink)`;
    orderCell.textContent = entry.order != null ? entry.order : slot + 1;
    grid.appendChild(orderCell);
    for (let sub = 0; sub < SUBROWS; sub++) {
      const row = startRow + sub;
      const s = sub === 0 ? entry : (entry.subs && entry.subs[sub - 1]);
      info(2, row, `background:${shadeFor(sub)};font-size:15px;font-weight:700`, s ? s.no : '');
      const nameCell = info(3, row, `background:${shadeFor(sub)};justify-content:flex-start;padding-left:${sub === 0 ? 6 : 28}px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px`, null);
      if (s) {
        const pid = s.playerId;
        if (pid != null) {
          const a = document.createElement('a');
          a.setAttribute('data-player-link', String(pid));
          a.href = '#';
          a.textContent = s.name || '';
          a.style.cssText = 'color:inherit;text-decoration:underline;text-decoration-style:dotted;cursor:pointer';
          nameCell.appendChild(a);
        } else {
          nameCell.textContent = s.name || '';
        }
      }
      info(4, row, `background:${shadeFor(sub)}`, sub === 0 ? entry.avg : '');
      info(5, row, `background:${shadeFor(sub)}`, s ? s.pos : '');
    }
    for (let col = 0; col < INN; col++) {
      const inn = col + 1;
      const c = document.createElement('div');
      const cellData = entry.cellsByInn && entry.cellsByInn[inn];
      const cellOverflow = cellData && cellData.halfEnd ? 'visible' : 'hidden';
      c.style.cssText = `grid-column:${INN_COL_START + col};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;flex-direction:column;padding:2px;position:relative;overflow:${cellOverflow}`;
      c.style.opacity = cellData ? '1' : '0.3';
      if (cellData && cellData.live) { c.style.outline = '2px dashed var(--accent)'; c.style.outlineOffset = '-2px'; }
      c.innerHTML = window._cwCellHTML(cellData);
      grid.appendChild(c);
    }
    const stats = entry.stats || {};
    ['ab', 'r', 'h', 'rbi'].forEach((k, i) => {
      const t = document.createElement('div');
      t.style.cssText = `grid-column:${STAT_COL_START + i};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--border);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center`;
      t.innerHTML = window.tallyMarksHTML(stats[k] || 0);
      grid.appendChild(t);
    });
  }

  // Pitching section: colspan-3 label + ERA/HND headers, per-inning R/H/K/BB sub-header,
  // then up to 4 pitcher rows with real tick-mark tallies.
  const extraRow = 4 + SLOTS * SUBROWS;
  hcell('Pitching', '1 / span 3', extraRow, 'justify-content:flex-start;padding-left:10px');
  hcell('ERA', 4, extraRow, 'font-size:11px;padding:4px 2px');
  hcell('HND', 5, extraRow, 'font-size:11px;padding:4px 2px');
  for (let i = 1; i <= INN; i++) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `grid-column:${INN_COL_START + i - 1};grid-row:${extraRow};display:flex;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink)`;
    ['R', 'H', 'K', 'BB'].forEach((l) => {
      const t = document.createElement('div');
      t.style.cssText = 'flex:1;background:var(--borderStrong);color:var(--ink);font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;font-family:\'JetBrains Mono\',monospace';
      t.textContent = l;
      wrap.appendChild(t);
    });
    grid.appendChild(wrap);
  }
  const pitchStart = extraRow + 1;
  for (let r = 0; r < 4; r++) {
    const row = pitchStart + r;
    const rowShade = r === 0 ? '#ddd7c8' : '#f4f1ea';
    const p = pitchers[r] || {};
    const numCell = document.createElement('div'); numCell.style.cssText = `grid-column:1;grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--ink)`; numCell.textContent = r + 1; grid.appendChild(numCell);
    info(2, row, `background:${rowShade};border-bottom:1px solid var(--ink);font-size:15px;font-weight:700`, p.no);
    info(3, row, `background:${rowShade};border-bottom:1px solid var(--ink);justify-content:flex-start;padding-left:6px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px`, p.name);
    info(4, row, `background:${rowShade};border-bottom:1px solid var(--ink)`, p.era);
    info(5, row, `background:${rowShade};border-bottom:1px solid var(--ink)`, p.hnd);
    for (let i = 1; i <= INN; i++) {
      const wrap = document.createElement('div');
      wrap.style.cssText = `grid-column:${INN_COL_START + i - 1};grid-row:${row};display:flex;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink)`;
      const t = (p.cellsByInn && p.cellsByInn[i]) || {};
      ['r', 'h', 'k', 'bb'].forEach((k, ci) => {
        const cell = document.createElement('div');
        cell.style.cssText = `flex:1;display:flex;align-items:center;justify-content:center;background:var(--surface);${ci < 3 ? 'border-right:1px solid var(--border)' : ''}`;
        cell.innerHTML = window.tallyMarksHTML(t[k] || 0);
        wrap.appendChild(cell);
      });
      grid.appendChild(wrap);
    }
  }

  // Position-number reference diamond filling the leftover stat-column space beside the pitcher rows.
  const posDiamond = document.createElement('div');
  posDiamond.style.cssText = `grid-column:${STAT_COL_START + 1} / span ${STAT_LABELS.length - 1};grid-row:${pitchStart} / span 4;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center`;
  posDiamond.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;overflow:visible;font-family:'JetBrains Mono',monospace;font-weight:700">
    <g transform="translate(0,-6)">
    <polygon points="50,94 84,60 50,26 16,60" fill="none" stroke="var(--ink)" stroke-width="1.3"/>
    <path d="M84,60 L98.19,45.81" fill="none" stroke="var(--ink)" stroke-width="1.3"/>
    <path d="M16,60 L1.81,45.81" fill="none" stroke="var(--ink)" stroke-width="1.3"/>
    <path d="M98.19,45.81 A50.73,50.73 0 0 0 1.81,45.81" fill="none" stroke="var(--ink)" stroke-width="1" opacity="0.45"/>
    <text x="50" y="66" text-anchor="middle" font-size="15">1</text>
    <text x="50" y="107" text-anchor="middle" font-size="15">2</text>
    <text x="93" y="66" text-anchor="middle" font-size="15">3</text>
    <text x="69" y="38" text-anchor="middle" font-size="15">4</text>
    <text x="7" y="66" text-anchor="middle" font-size="15">5</text>
    <text x="31" y="38" text-anchor="middle" font-size="15">6</text>
    <text x="4" y="16" text-anchor="middle" font-size="15">7</text>
    <text x="50" y="2" text-anchor="middle" font-size="15">8</text>
    <text x="96" y="16" text-anchor="middle" font-size="15">9</text>
    </g>
  </svg>`;
  grid.appendChild(posDiamond);
};
