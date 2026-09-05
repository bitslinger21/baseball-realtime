window.SCOREBOOK_FIELD_SVG = `
  <path d="M95.12,44.88 A47.5,47.5 0 0 0 4.88,44.88" fill="none" stroke="#b8ae9b" stroke-width="2" opacity="0.4"/>
  <circle cx="50" cy="59.75" r="5" fill="none" stroke="#b8ae9b" stroke-width="2" stroke-dasharray="2.4 2" opacity="0.75"/>
  <path d="M55.66,32.02 L76.16,52.52 A8,8 0 0 0 76.16,63.84 L55.66,84.34 A8,8 0 0 0 44.34,84.34 L23.84,63.84 A8,8 0 0 0 23.84,52.52 L44.34,32.02 A8,8 0 0 0 55.66,32.02" fill="none" stroke="#b8ae9b" stroke-width="2"/>
  <path d="M76.16,63.84 L95.12,44.88" fill="none" stroke="#b8ae9b" stroke-width="2"/>
  <path d="M23.84,63.84 L4.88,44.88" fill="none" stroke="#b8ae9b" stroke-width="2"/>
  <circle cx="81.82" cy="58.18" r="2.5" fill="#b8ae9b"/>
  <circle cx="50" cy="26.36" r="2.5" fill="#b8ae9b"/>
  <circle cx="18.18" cy="58.18" r="2.5" fill="#b8ae9b"/>
  <circle cx="50" cy="90" r="2.5" fill="#b8ae9b"/>
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
  // advances: [{base, label}] — per-stop advancement entries beyond the batter's own PA result.
  // Each entry: base = 1-4, label = "#jerseyNo" for a hit or event code (BK, SB, WP, etc.).
  const advances = Array.isArray(cd.advances) ? cd.advances : [];

  // True diamond corners indexed by base number (0=home origin, 1=1B, 2=2B, 3=3B, 4=home scored).
  const H = [50, 90], F = [81.82, 58.18], S = [50, 26.36], T = [18.18, 58.18];
  const CORNERS = [H, F, S, T, H]; // CORNERS[base] → [x, y]
  const ink = 'var(--ink)';
  const muted = 'var(--textMuted)';

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
    return '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/>';
  };
  const segLight = function (ax, ay, bx, by) {
    return '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' + muted + '" stroke-width="4" stroke-linecap="round"/>';
  };
  const circleMark = function (x, y, color) {
    return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="' + color + '"/>';
  };
  // Label at the midpoint of each incoming segment, offset perpendicularly into foul territory.
  // Base 1: midpoint(H→F) + 135° (SE);  Base 2: midpoint(F→S) + 45° (NE);
  // Base 3: midpoint(S→T) + 315° (NW);  Home: midpoint(T→H) + 225° (SW).
  const advLabel = function (base, label, color) {
    if (!label) return '';
    var lx, ly, anchor;
    if (base === 1) { lx = 76; ly = 80; anchor = 'start'; }
    else if (base === 2) { lx = 72; ly = 36; anchor = 'start'; }
    else if (base === 3) { lx = 32; ly = 32; anchor = 'end'; }
    else { lx = 28; ly = 80; anchor = 'end'; }
    return '<text x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '" dominant-baseline="central" font-family="\'JetBrains Mono\',monospace" font-size="9" font-weight="600" fill="' + color + '">' + label + '</text>';
  };

  let lightPaths = '';
  let overlayPaths = '';
  let fillEl = '';
  let codeEl = '';

  if (!live && code) {
    const reachFirst = ['Single','Walk','IntentionalWalk','HitByPitch','HBP','Error','FieldersChoice','SacBunt'].includes(result);
    const isDouble = result === 'Double';
    const isTriple = result === 'Triple';
    const isHR = result === 'HomeRun';

    // reachedOnPA: base reached from the batter's own plate appearance.
    const reachedOnPA = isHR ? 4 : isTriple ? 3 : isDouble ? 2 : reachFirst ? 1 : 0;

    // Green fill when runner scored (own HR or via runner advancement).
    const didScore = isHR || advances.some(function(a) { return a.base >= 4; });
    if (didScore) {
      fillEl = '<polygon points="' + H[0]+','+H[1]+' '+F[0]+','+F[1]+' '+S[0]+','+S[1]+' '+T[0]+','+T[1] + '" fill="var(--color-positive-soft)"/>';
    }

    // Light advancement lines: one entry per base stop, with circle + label at terminus.
    var prevBase = reachedOnPA;
    for (var ai = 0; ai < advances.length; ai++) {
      var adv = advances[ai];
      var toBase = Math.min(adv.base, 4);
      // Draw segments through intermediate base corners.
      for (var b = prevBase + 1; b <= toBase; b++) {
        var from = CORNERS[b - 1], to = CORNERS[b];
        lightPaths += segLight(from[0], from[1], to[0], to[1]);
      }
      // Terminus circle + label at the advance destination.
      var tc = CORNERS[toBase];
      lightPaths += circleMark(tc[0], tc[1], muted);
      lightPaths += advLabel(toBase, adv.label, muted);
      prevBase = toBase;
    }

    // Bold baselines: straight lines only, 90° corners at each base center.
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
    }
    // Termination circle at the batter's own reached base.
    if (reachedOnPA > 0) {
      var rc = CORNERS[reachedOnPA];
      overlayPaths += circleMark(rc[0], rc[1], ink);
    }

    // Code position — midpoint of the segment the batter's path ends on, offset into foul territory.
    // Mirrors advLabel positions so result code and advancement labels never share a corner.
    var cx = 50, cy = 63, anchor = 'middle'; // default: center (outs/HR)
    if (isDouble) {
      cx = 72; cy = 36; anchor = 'start'; // NE: midpoint(F→S) + 45°
    } else if (isTriple) {
      cx = 32; cy = 32; anchor = 'end';   // NW
    } else if (reachFirst) {
      cx = 76; cy = 80; anchor = 'start'; // SE: midpoint(H→F) + 135°
    }

    // Backwards K for called strikeout
    if (result === 'Strikeout' && isLooking) {
      codeEl = '<g transform="translate(' + (cx * 2) + ',0) scale(-1,1)"><text x="' + cx + '" y="' + cy + '" text-anchor="' + anchor + '" font-family="\'JetBrains Mono\',monospace" font-size="14" font-weight="700" fill="' + ink + '">K</text></g>';
    } else {
      codeEl = '<text x="' + cx + '" y="' + cy + '" text-anchor="' + anchor + '" font-family="\'JetBrains Mono\',monospace" font-size="14" font-weight="700" fill="' + ink + '">' + code + '</text>';
    }
  }

  var svg = '<svg class="cwfield" viewBox="0 0 100 100" style="overflow:visible">' + window.SCOREBOOK_FIELD_SVG + fillEl + lightPaths + overlayPaths + codeEl + '</svg>';

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
window.buildScorebookGrid = function (grid, { lineup = [], pitchers = [], numInnings = 9, gameId = null, teamAbbr = '', logoUrl = null, teamName = '', opponent = null, gameDate = null, venue = null } = {}) {
  const INN = Math.max(9, numInnings), SLOTS = 9, SUBROWS = 3;
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
  grid.style.gridTemplateRows = `30px 30px repeat(${SLOTS * SUBROWS},32px) 32px repeat(4,32px)`;

  // Team name header — full-width dark band at the top
  const teamHdr = document.createElement('div');
  teamHdr.style.cssText = `grid-column:1 / span ${TOTAL_COLS};grid-row:1;background:#15161a;color:#fff;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;letter-spacing:0.08em;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid var(--ink)`;
  if (logoUrl) {
    var logoWrap = document.createElement('div');
    logoWrap.style.cssText = 'width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;flex-shrink:0';
    var logoImg = document.createElement('img');
    logoImg.src = logoUrl;
    logoImg.style.cssText = 'width:20px;height:20px;object-fit:contain';
    logoImg.onerror = function() { logoWrap.style.display = 'none'; };
    logoWrap.appendChild(logoImg);
    teamHdr.appendChild(logoWrap);
  }
  var teamNameSpan = document.createElement('span');
  teamNameSpan.textContent = teamName || (teamAbbr ? teamAbbr.toUpperCase() : 'BATTING');
  teamHdr.appendChild(teamNameSpan);
  grid.appendChild(teamHdr);

  const hcell = (text, col, row, extra) => { const h = document.createElement('div'); h.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--ink);padding:4px 10px;background:var(--borderStrong);${extra || ''}`; h.textContent = text; grid.appendChild(h); };
  const info = (col, row, extra, text) => { const d = document.createElement('div'); d.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--ink);${extra || ''}`; if (text != null) d.textContent = text; grid.appendChild(d); return d; };
  const shadeFor = (sub) => (sub === 0 ? 'var(--starterBg)' : 'var(--subBg)');

  hcell('#', 1, 2, 'background:#1A9393;color:#fff');
  ['No.', 'Name', 'Avg', 'Pos'].forEach((l, i) => hcell(l, i + 2, 2, 'background:#1A9393;color:#fff'));
  for (let i = 1; i <= INN; i++) hcell(i, INN_COL_START + i - 1, 2, 'background:#1A9393;color:#fff');
  STAT_LABELS.forEach((l, i) => hcell(l, STAT_COL_START + i, 2, 'background:#1A9393;color:#fff;font-size:11px;padding:4px 2px'));

  for (let slot = 0; slot < SLOTS; slot++) {
    const startRow = 3 + slot * SUBROWS;
    const entry = lineup[slot] || {};
    const orderCell = document.createElement('div');
    orderCell.style.cssText = `grid-column:1;grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:#fff;background:#1A9393`;
    orderCell.textContent = entry.order != null ? entry.order : slot + 1;
    grid.appendChild(orderCell);
    for (let sub = 0; sub < SUBROWS; sub++) {
      const row = startRow + sub;
      const s = sub === 0 ? entry : (entry.subs && entry.subs[sub - 1]);
      const majorBorder = sub === SUBROWS - 1 ? 'border-bottom:1px solid var(--ink);' : '';
      info(2, row, `background:${shadeFor(sub)};font-size:15px;font-weight:700;${majorBorder}`, s ? s.no : '');
      const nameCell = info(3, row, `background:${shadeFor(sub)};justify-content:flex-start;padding-left:${sub === 0 ? 6 : 28}px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;${majorBorder}`, null);
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
      info(4, row, `background:${shadeFor(sub)};${majorBorder}`, sub === 0 ? entry.avg : '');
      info(5, row, `background:${shadeFor(sub)};${majorBorder}`, s ? s.pos : '');
    }
    for (let col = 0; col < INN; col++) {
      const inn = col + 1;
      // Support both old single-object and new array-of-PAs formats (batting around).
      const rawCell = entry.cellsByInn && entry.cellsByInn[inn];
      const cells = Array.isArray(rawCell) ? rawCell : (rawCell != null ? [rawCell] : []);
      const hasHalfEnd = cells.some(cd => !!(cd && cd.halfEnd));
      const hasLive = cells.some(cd => !!(cd && cd.live));
      const c = document.createElement('div');
      if (cells.length > 1) {
        // Batting around: two PAs in the same inning — render each scaled to half width.
        c.style.cssText = `grid-column:${INN_COL_START + col};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;flex-direction:row;position:relative;overflow:hidden;background:#fcfaf6${hasHalfEnd ? ';z-index:1' : ''}`;
        if (hasLive) { c.style.outline = '2px dashed var(--accent)'; c.style.outlineOffset = '-2px'; }
        cells.slice(0, 2).forEach((cd, idx) => {
          const sub = document.createElement('div');
          sub.style.cssText = `flex:1;height:100%;position:relative;overflow:hidden${idx > 0 ? ';border-left:1px solid var(--borderStrong)' : ''}`;
          const inner = document.createElement('div');
          // Scale 0.5: a 120×120 block at 50% renders as ~60×60, fitting the ~55px sub-cell.
          inner.style.cssText = 'position:absolute;top:0;left:0;width:120px;height:120px;transform:scale(0.5);transform-origin:top left';
          inner.innerHTML = window._cwCellHTML(cd);
          sub.appendChild(inner);
          c.appendChild(sub);
        });
      } else {
        const singleCell = cells[0] || null;
        const isHalfEnd = !!(singleCell && singleCell.halfEnd);
        c.style.cssText = `grid-column:${INN_COL_START + col};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;flex-direction:column;padding:2px;position:relative;overflow:visible;background:#fcfaf6${isHalfEnd ? ';z-index:1' : ''}`;
        if (hasLive) { c.style.outline = '2px dashed var(--accent)'; c.style.outlineOffset = '-2px'; }
        // Tag every cell with its atBatIndex so the RunnerTracePanel highlight effect can
        // find movement cells (driver PAs) by [data-ab-idx].
        if (singleCell && singleCell.atBatIndex != null) {
          c.setAttribute('data-ab-idx', String(singleCell.atBatIndex));
        }
        const cellInner = document.createElement('div');
        cellInner.style.cssText = `width:100%;height:100%;${singleCell ? '' : 'opacity:0.3'}`;
        cellInner.innerHTML = window._cwCellHTML(singleCell);
        c.appendChild(cellInner);
        // Make ONLY the drawn base-path notation (the field diagram) clickable
        // to open the runner trace — never the whole cell, which also holds the
        // unrelated count/out marker column.
        const BASE_REACH_RESULTS = new Set(['Single','Walk','IntentionalWalk','HitByPitch','HBP','Error','FieldersChoice','SacBunt','Double','Triple','HomeRun']);
        if (singleCell && singleCell.atBatIndex != null && BASE_REACH_RESULTS.has(singleCell.result || '')) {
          const field = cellInner.querySelector('.cwfield');
          if (field) {
            field.setAttribute('data-runner-ab', String(singleCell.atBatIndex));
            field.style.cursor = 'pointer';
          }
        }
      }
      grid.appendChild(c);
    }
    const stats = entry.stats || {};
    ['ab', 'r', 'h', 'rbi'].forEach((k, i) => {
      const t = document.createElement('div');
      t.style.cssText = `grid-column:${STAT_COL_START + i};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;background:#fcfaf6;position:relative`;
      for (let d = 1; d < SUBROWS; d++) {
        const div = document.createElement('div');
        div.style.cssText = `position:absolute;left:0;right:0;top:${(d / SUBROWS * 100).toFixed(4)}%;height:1px;background:var(--border);pointer-events:none`;
        t.appendChild(div);
      }
      const val = document.createElement('div');
      val.innerHTML = window.tallyMarksHTML(stats[k] || 0);
      t.appendChild(val);
      grid.appendChild(t);
    });
  }

  // Pitching section: colspan-3 label + ERA/HND headers, per-inning R/H/K/BB sub-header,
  // then up to 4 pitcher rows with real tick-mark tallies.
  const extraRow = 3 + SLOTS * SUBROWS;
  hcell('Pitching', '1 / span 3', extraRow, 'background:#1A9393;color:#fff;justify-content:flex-start;padding-left:10px');
  hcell('ERA', 4, extraRow, 'background:#1A9393;color:#fff;font-size:11px;padding:4px 2px');
  hcell('HND', 5, extraRow, 'background:#1A9393;color:#fff;font-size:11px;padding:4px 2px');
  for (let i = 1; i <= INN; i++) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `grid-column:${INN_COL_START + i - 1};grid-row:${extraRow};display:flex;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink)`;
    ['R', 'H', 'K', 'BB'].forEach((l) => {
      const t = document.createElement('div');
      t.style.cssText = 'flex:1;background:#1A9393;color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;font-family:\'JetBrains Mono\',monospace';
      t.textContent = l;
      wrap.appendChild(t);
    });
    grid.appendChild(wrap);
  }
  const pitchStart = extraRow + 1;
  for (let r = 0; r < 4; r++) {
    const row = pitchStart + r;
    const p = pitchers[r] || {};
    const numCell = document.createElement('div'); numCell.style.cssText = `grid-column:1;grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:#fff;background:#1A9393`; numCell.textContent = r + 1; grid.appendChild(numCell);
    const pitcherShade = r === 0 ? 'var(--starterBg)' : 'var(--subBg)';
    info(2, row, `background:${pitcherShade};border-bottom:1px solid var(--ink);font-size:15px;font-weight:700`, p.no);
    info(3, row, `background:${pitcherShade};border-bottom:1px solid var(--ink);justify-content:flex-start;padding-left:6px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px`, p.name);
    info(4, row, `background:${pitcherShade};border-bottom:1px solid var(--ink)`, p.era);
    info(5, row, `background:${pitcherShade};border-bottom:1px solid var(--ink)`, p.hnd);
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
  posDiamond.style.cssText = `grid-column:${STAT_COL_START} / span ${STAT_LABELS.length};grid-row:${pitchStart} / span 4;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center`;
  posDiamond.innerHTML = `<svg viewBox="0 0 100 100" style="height:85%;width:auto;aspect-ratio:1;overflow:visible;font-family:'JetBrains Mono',monospace;font-weight:700">
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
