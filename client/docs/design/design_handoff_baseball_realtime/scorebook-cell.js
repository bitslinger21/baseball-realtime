window.SCOREBOOK_FIELD_SVG = `
  <path d="M95.12,44.88 A47.5,47.5 0 0 0 4.88,44.88" fill="none" stroke="var(--ink)" stroke-width="1.1" opacity="0.4"/>
  <circle cx="50" cy="59.75" r="5" fill="none" stroke="var(--ink)" stroke-width="1.1" stroke-dasharray="2.4 2" opacity="0.75"/>
  <path d="M55.66,32.02 L74.04,50.40 A8,8 0 0 0 76.58,63.42 L55.66,84.34 A8,8 0 0 0 44.34,84.34 L23.42,63.42 A8,8 0 0 0 25.96,50.40 L44.34,32.02 A8,8 0 0 0 55.66,32.02" fill="none" stroke="var(--ink)" stroke-width="1.5"/>
  <path d="M76.58,63.42 L95.12,44.88" fill="none" stroke="var(--ink)" stroke-width="1.5"/>
  <path d="M23.42,63.42 L4.88,44.88" fill="none" stroke="var(--ink)" stroke-width="1.5"/>
  <circle cx="79.7" cy="56.06" r="2.5" fill="var(--ink)"/>
  <circle cx="50" cy="26.36" r="2.5" fill="var(--ink)"/>
  <circle cx="20.3" cy="56.06" r="2.5" fill="var(--ink)"/>
  <circle cx="50" cy="90" r="2.5" fill="var(--ink)"/>
`;

// Full scorebook cell: field (shifted left) + right-side marker column
// (3-cell box, 2-cell box, plain "1 2 3" out numbers).
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
.cwmarkers{display:flex;flex-direction:column;align-items:flex-end;gap:6px;height:auto;justify-content:center}
.cwbox{display:flex;flex-direction:column;border:1.3px solid var(--ink);border-radius:1px;width:10px;box-sizing:border-box}
.cwbox span{width:10px;height:10px;flex:none;border-bottom:1px solid var(--ink);box-sizing:border-box;display:block}
.cwbox span:last-child{border-bottom:none}
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

// Which base a result code sends the batter to (for the drawn base-path line). Any way of
// reaching a base (hit, walk, HBP) gets a path + foul-line label; HR and outs/K stay a plain
// centered text code (HR is disambiguated by the line score / RBI, not a drawn path).
window.scorebookBaseFromCode = function (code) {
  if (code === '1B' || code === 'BB' || code === 'IBB' || code === 'HBP') return 1;
  if (code === '2B') return 2;
  if (code === '3B') return 3;
  return null;
};

// The single canonical scorebook grid builder — shared by the print reference (Scorebook Page.html)
// and the in-app scorecard flip (game-v2.jsx), so both always render the SAME designed layout.
// `container` is the grid element itself (caller sets no styles beyond mounting it).
// lineup: 9 entries { order, no, name, avg, pos, cellsByInn: {1..9: {code,live}|undefined}, stats:{ab,r,h,rbi} }
// pitchers: up to 4 entries { no, name, era, hnd, cellsByInn: {1..9: {r,h,k,bb}} }
// teamAbbr/teamName/logoUrl/opponent/gameDate/venue: identity + game meta shown in the two header bands.
// titleRow: 'wordmark' (default — standalone print sheet) | 'matchup' (in-app scorecard: row 1 is
// the grey matchup row — away logo+name @ home logo+name, date · venue; the frame above carries the
// brand). Sep 23, 2026.
window.buildScorebookGrid = function (grid, { lineup = [], pitchers = [], teamAbbr = '', teamName = '', logoUrl = '', opponent = '', gameDate = '', venue = '', titleRow = 'wordmark', away = null, home = null } = {}) {
  const INN = 9, SLOTS = 9, SUBROWS = 3;
  const STAT_LABELS = ['AB', 'R', 'H', 'RBI'];
  const LEFT_W = [36, 36, 190, 34, 26];
  const INN_COL_START = 6;
  const STAT_COL_START = INN_COL_START + INN;
  const STAT_W = 210 / STAT_LABELS.length; // same total width as the original 5-col AB/R/H/E/RBI layout
  const ROW_OFFSET = 2; // two new header bands (wordmark+meta, team name) pushed above the old row 1
  grid.innerHTML = '';
  grid.style.display = 'inline-grid';
  grid.style.border = '1.3px solid var(--ink)';
  grid.style.background = 'var(--surface)';
  grid.style.fontFamily = "'DM Sans',sans-serif";
  grid.style.gridTemplateColumns = LEFT_W.map((w) => w + 'px').join(' ') + ` repeat(${INN},112px)` + ` repeat(${STAT_LABELS.length},${STAT_W}px)`;
  grid.style.gridTemplateRows = `44px 30px 30px repeat(${SLOTS * SUBROWS},32px) 32px repeat(4,32px)`;

  const hcell = (text, col, row, extra) => { const h = document.createElement('div'); h.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--ink);padding:4px 10px;background:rgb(151,173,201);${extra || ''}`; h.textContent = text; grid.appendChild(h); };
  const info = (col, row, extra, text) => { const d = document.createElement('div'); d.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink);${extra || ''}`; if (text != null) d.textContent = text; grid.appendChild(d); return d; };
  const shadeFor = (sub) => (sub === 0 ? 'rgb(206,217,233)' : 'rgb(231,236,243)');

  // Row 1 — SCOREBOOK wordmark (left) + game meta (right): date · opponent · venue.
  const bandRow1 = document.createElement('div');
  bandRow1.style.cssText = `grid-column:1 / span ${5 + INN + STAT_LABELS.length};grid-row:1;background:${titleRow === 'matchup' ? 'var(--surfaceAlt, #efeae0)' : 'var(--bg)'};border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:${titleRow === 'matchup' ? 'flex-start' : 'space-between'};gap:16px;padding:0 12px`;
  const club = (t) => t ? `${t.logo ? `<img src="${t.logo}" width="20" height="20" style="object-fit:contain" onerror="this.style.display='none'"/>` : ''}${t.name}` : '';
  bandRow1.innerHTML = titleRow === 'matchup'
    ? `<span style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:8px">${club(away)}<span style="font-weight:500;color:var(--textMuted)">@</span>${club(home)}</span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--textMuted)">${[gameDate, venue].filter(Boolean).join(' \u00b7 ')}</span>`
    : `<span style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:14px;letter-spacing:0.12em;color:var(--ink);display:flex;align-items:center;gap:2px">SC<svg width="12" height="12" viewBox="0 0 44 44"><polygon points="22,41 41,22 22,3 3,22" fill="none" stroke="#b8421e" stroke-width="3"/></svg>REBOOK</span>
    <span style="font-family:'DM Sans',sans-serif;font-size:11px;color:var(--textMuted)">${[gameDate, opponent && ('vs ' + opponent), venue].filter(Boolean).join(' \u00b7 ')}</span>`;
  grid.appendChild(bandRow1);

  // Row 2 — team identity band: logo + full name (falls back to abbreviation/"Batting").
  const bandRow2 = document.createElement('div');
  bandRow2.style.cssText = `grid-column:1 / span ${5 + INN + STAT_LABELS.length};grid-row:2;background:var(--ink);display:flex;align-items:center;gap:8px;padding:0 12px`;
  bandRow2.innerHTML = `${logoUrl ? `<img src="${logoUrl}" width="22" height="22" style="object-fit:contain" onerror="this.style.display='none'"/>` : ''}<span style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:13px;letter-spacing:0.08em;color:var(--surface)">${teamName || (teamAbbr ? teamAbbr.toUpperCase() : 'BATTING')}</span>`;
  grid.appendChild(bandRow2);

  ['#', 'No.', 'Name', 'Avg', 'Pos'].forEach((l, i) => hcell(l, i + 1, ROW_OFFSET + 1));
  for (let i = 1; i <= INN; i++) hcell(i, INN_COL_START + i - 1, ROW_OFFSET + 1);
  STAT_LABELS.forEach((l, i) => hcell(l, STAT_COL_START + i, ROW_OFFSET + 1, 'font-size:11px;padding:4px 2px'));

  for (let slot = 0; slot < SLOTS; slot++) {
    const startRow = ROW_OFFSET + 2 + slot * SUBROWS;
    const entry = lineup[slot] || {};
    const orderCell = document.createElement('div');
    orderCell.style.cssText = `grid-column:1;grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--ink)`;
    orderCell.textContent = entry.order != null ? entry.order : slot + 1;
    grid.appendChild(orderCell);
    for (let sub = 0; sub < SUBROWS; sub++) {
      const row = startRow + sub;
      const s = sub === 0 ? entry : (entry.subs && entry.subs[sub - 1]);
      info(2, row, `background:${shadeFor(sub)}`, s ? s.no : '');
      const nameCell = info(3, row, `background:${shadeFor(sub)};justify-content:flex-start;padding-left:${sub === 0 ? 6 : 28}px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px`, s ? s.name : '');
      info(4, row, `background:${shadeFor(sub)}`, sub === 0 ? entry.avg : '');
      info(5, row, `background:${shadeFor(sub)}`, s ? s.pos : '');
    }
    for (let col = 0; col < INN; col++) {
      const inn = col + 1;
      const c = document.createElement('div');
      c.style.cssText = `grid-column:${INN_COL_START + col};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;flex-direction:column;padding:2px;position:relative;overflow:hidden`;
      const cellData = entry.cellsByInn && entry.cellsByInn[inn];
      c.style.opacity = cellData ? '1' : '0.3';
      if (cellData && cellData.live) { c.style.outline = '2px dashed var(--accent)'; c.style.outlineOffset = '-2px'; }
      c.innerHTML = window.SCOREBOOK_CELL_HTML;
      if (cellData && !cellData.live && cellData.code) {
        const base = window.scorebookBaseFromCode(cellData.code);
        if (base) {
          // Reached-base codes (1B/2B/3B/BB/HBP): draw the runner's base path (home -> reached
          // base) and set the result label ALONG that base's foul line — not centered over the
          // infield/mound. Everything is wrapped in a clipPath scoped to the field's own 0-100
          // viewBox so nothing can ever paint outside this cell, regardless of any ancestor
          // transform context (the flip/pan-zoom wrapper uses 3D transforms elsewhere on the
          // page, which in some engines defeats plain overflow:hidden clipping).
          const HOME = [50, 90];
          const BASE_PT = { 1: [79.7, 56.06], 2: [50, 26.36], 3: [20.3, 56.06] }[base];
          const FOUL_LABEL = { 1: [90, 36], 2: [50, 10], 3: [10, 36] }[base];
          const fieldSvg = c.querySelector('.cwfield');
          if (fieldSvg) {
            const clipId = 'cwclip' + (window.__cwClipN = (window.__cwClipN || 0) + 1);
            fieldSvg.innerHTML += `<clipPath id="${clipId}"><rect x="0" y="0" width="100" height="100"/></clipPath><g clip-path="url(#${clipId})"><circle cx="${HOME[0]}" cy="${HOME[1]}" r="2" fill="var(--ink)"/><line x1="${HOME[0]}" y1="${HOME[1]}" x2="${BASE_PT[0]}" y2="${BASE_PT[1]}" stroke="var(--ink)" stroke-width="2"/><text x="${FOUL_LABEL[0]}" y="${FOUL_LABEL[1]}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="11" font-weight="700" fill="var(--ink)">${cellData.code}</text></g>`;
          }
        } else {
          // HR, K, outs (6-3, F8, ...) — plain centered code, no path (matches the K reference).
          c.innerHTML += `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--ink)">${cellData.code}</div>`;
        }
      } else if (cellData && cellData.live) {
        c.innerHTML += `<div style="position:absolute;top:2px;left:2px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;color:var(--accent)">\u25cf</div>`;
      }
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
  const extraRow = ROW_OFFSET + 2 + SLOTS * SUBROWS;
  hcell('Pitching', '1 / span 3', extraRow, 'justify-content:flex-start;padding-left:10px');
  hcell('ERA', 4, extraRow, 'font-size:11px;padding:4px 2px');
  hcell('HND', 5, extraRow, 'font-size:11px;padding:4px 2px');
  for (let i = 1; i <= INN; i++) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `grid-column:${INN_COL_START + i - 1};grid-row:${extraRow};display:flex;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink)`;
    ['R', 'H', 'K', 'BB'].forEach((l) => {
      const t = document.createElement('div');
      t.style.cssText = 'flex:1;background:rgb(151,173,201);color:var(--ink);font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;font-family:\'JetBrains Mono\',monospace';
      t.textContent = l;
      wrap.appendChild(t);
    });
    grid.appendChild(wrap);
  }
  const pitchStart = extraRow + 1;
  for (let r = 0; r < 4; r++) {
    const row = pitchStart + r;
    const rowShade = r === 0 ? 'rgb(206,217,233)' : 'rgb(231,236,243)';
    const p = pitchers[r] || {};
    const numCell = document.createElement('div'); numCell.style.cssText = `grid-column:1;grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--ink)`; numCell.textContent = r + 1; grid.appendChild(numCell);
    info(2, row, `background:${rowShade};border-bottom:1px solid var(--ink)`, p.no);
    info(3, row, `background:${rowShade};border-bottom:1px solid var(--ink);justify-content:flex-start;padding-left:6px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:10px`, p.name);
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
