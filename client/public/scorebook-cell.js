window.SCOREBOOK_FIELD_SVG = `
  <path d="M95.12,44.88 A47.5,47.5 0 0 0 4.88,44.88" fill="none" stroke="#b8ae9b" stroke-width="2" opacity="0.4"/>
  <circle cx="50" cy="59.75" r="5" fill="none" stroke="#b8ae9b" stroke-width="2" stroke-dasharray="2.4 2" opacity="0.75"/>
  <path d="M55.66,32.02 L76.16,52.52 A8,8 0 0 0 76.16,63.84 L55.66,84.34 A8,8 0 0 0 44.34,84.34 L23.84,63.84 A8,8 0 0 0 23.84,52.52 L44.34,32.02 A8,8 0 0 0 55.66,32.02" fill="none" stroke="#b8ae9b" stroke-width="2"/>
  <path d="M76.16,63.84 L95.12,44.88" fill="none" stroke="#b8ae9b" stroke-width="2"/>
  <path d="M23.84,63.84 L4.88,44.88" fill="none" stroke="#b8ae9b" stroke-width="2"/>
  <circle cx="81.82" cy="58.18" r="2.5" fill="#b8ae9b"/>
  <circle cx="50" cy="26.36" r="2.5" fill="#b8ae9b"/>
  <circle cx="18.18" cy="58.18" r="2.5" fill="#b8ae9b"/>
  <circle cx="50" cy="85.76" r="2.5" fill="#b8ae9b"/>
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

// F-006 spray line — the scorecard box's version of holistic/shared.jsx's
// sprayPathFor (same mapping; the box's own field geometry). spray =
// { angle (° from CF; −45 = 3B line, +45 = 1B line), dist (ft), traj (MLB
// hitData.trajectory) }. Home (50, 85.76); the outfield is the circle centred
// (50, 59.75) r 47.5, so rMax(θ) = 26.01·cos θ + √(676.5·cos² θ + 1579.75);
// 0–130 ft fills the first 75% of the way, 130–400 ft the rest.
window._cwSprayPath = function (spray) {
  if (!spray || spray.angle == null) return null;
  var home = [50, 85.76], brk = 0.75;
  var th = (Math.max(-47, Math.min(47, spray.angle)) * Math.PI) / 180;
  var dir = [Math.sin(th), -Math.cos(th)];
  var R = 26.01 * Math.cos(th) + Math.sqrt(676.5 * Math.cos(th) * Math.cos(th) + 1579.75);
  var ft = spray.dist || 0;
  var f = ft <= 130 ? (ft / 130) * brk : brk + (1 - brk) * Math.min(1, (ft - 130) / 270);
  var r = R * Math.max(0.12, Math.min(f, 1));
  var end = [home[0] + dir[0] * r, home[1] + dir[1] * r];
  var t = spray.traj || 'ground_ball';
  var ground = t === 'ground_ball' || t === 'bunt_grounder';
  var arc = t === 'fly_ball' || t === 'popup' || t === 'bunt_popup';
  var d = 'M ' + home[0] + ' ' + home[1] + ' L ' + end[0].toFixed(2) + ' ' + end[1].toFixed(2);
  if (arc) {
    var k = (t === 'fly_ball' ? 0.2 : 0.34) * r * (th > 0 ? -1 : 1);
    var mid = [(home[0] + end[0]) / 2, (home[1] + end[1]) / 2];
    var c = [mid[0] + Math.cos(th) * k, mid[1] + Math.sin(th) * k];
    d = 'M ' + home[0] + ' ' + home[1] + ' Q ' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) + ' ' + end[0].toFixed(2) + ' ' + end[1].toFixed(2);
  }
  return '<path d="' + d + '" fill="none" stroke="var(--textMuted)" stroke-width="' + (ground ? 1.9 : 1.3) + '" stroke-linecap="round"' +
    (ground ? ' stroke-dasharray="0.1 3.2"' : '') + '/>' +
    '<circle cx="' + end[0].toFixed(2) + '" cy="' + end[1].toFixed(2) + '" r="2" fill="var(--textMuted)"/>';
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
// textBoost: scales the svg text up when the field is drawn smaller than print (the game view's
// 0.8 cells), so codes and labels keep about their print size (PROMPT_scorecard_frozen.md §2).
window._cwCellHTML = function (cellData, textBoost) {
  const cd = cellData || {};
  const tb = textBoost || 1;
  const code = cd.code || '';
  const balls = cd.balls || 0;
  const strikes = cd.strikes || 0;
  const result = cd.result || '';
  const isLooking = !!cd.isLooking;
  const live = !!cd.live;
  const outNum = cd.outNum != null ? cd.outNum : null;
  const halfEnd = !!cd.halfEnd;
  // advances: [{base, label, isOut}] — per-stop advancement entries beyond the batter's own PA
  // result. Each entry: base = 1-4, label = "#jerseyNo" for a hit, or the error behind the move
  // ('E6' / 'E6T'); isOut = put out at that base (drawn as a × only, no label — F-006 B3).
  const advances = Array.isArray(cd.advances) ? cd.advances : [];
  // F-006: spray = where the ball went (drawn under the paths); sub = the fielders under an FC.
  const spray = cd.spray || null;
  const sub = cd.sub || '';

  // True diamond corners indexed by base number (0=home origin, 1=1B, 2=2B, 3=3B, 4=home scored).
  // Home moved from the square's sharp corner (90) to the rounded plate's own
  // point (85.76) — the old point sat below the plate and skewed every hit
  // line to 1st/3rd off the baseline (PROMPT_video_clips.md §4).
  const H = [50, 85.76], F = [81.82, 58.18], S = [50, 26.36], T = [18.18, 58.18];
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
    return '<text x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '" dominant-baseline="central" font-family="\'JetBrains Mono\',monospace" font-size="' + 9 * tb + '" font-weight="600" fill="' + color + '">' + label + '</text>';
  };

  let lightPaths = '';
  let overlayPaths = '';
  let fillEl = '';
  let codeEl = '';

  if (!live && code) {
    // A forceout arrives as Groundout with an FC code: the batter is safe at first (F-006 A2).
    const reachFirst = ['Single','Walk','IntentionalWalk','HitByPitch','HBP','Error','FieldersChoice','SacBunt','CatcherInterference'].includes(result) || code === 'FC';
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
      var tc = CORNERS[toBase];
      if (adv.isOut) {
        // Put out there (a forced runner, caught stealing): the × only (F-006 B3).
        lightPaths += '<g stroke="' + ink + '" stroke-width="2" stroke-linecap="round">' +
          '<line x1="' + (tc[0] - 4.5) + '" y1="' + (tc[1] - 4.5) + '" x2="' + (tc[0] + 4.5) + '" y2="' + (tc[1] + 4.5) + '"/>' +
          '<line x1="' + (tc[0] - 4.5) + '" y1="' + (tc[1] + 4.5) + '" x2="' + (tc[0] + 4.5) + '" y2="' + (tc[1] - 4.5) + '"/></g>';
        break;
      }
      // Terminus circle + label at the advance destination.
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

    // Code position (F-006): a reached-base code sits in the open foul ground below the 1B line
    // at (84, 77) — clear of the arc, the spray lines and the marker column (the old foul-pole
    // corners collided with all three). Outs and HR stay centred at (50, 60). 3+ characters
    // drop to 10px. A surface halo keeps any line passing under it readable.
    var reached = reachFirst || isDouble || isTriple;
    var cx = reached ? 84 : 50, cy = reached ? 77 : 60;
    var size = (String(code).length >= 3 ? 10 : 14) * tb;
    var halo = ' stroke="var(--surface)" stroke-width="3" paint-order="stroke"';
    var font = ' font-family="\'JetBrains Mono\',monospace" font-weight="700"';
    if (result === 'Strikeout' && isLooking) {
      // Backwards K for a called strikeout — mirrored about its own centre.
      codeEl = '<g transform="translate(' + (cx * 2) + ',0) scale(-1,1)"><text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central"' + font + ' font-size="' + size + '" fill="' + ink + '"' + halo + '>K</text></g>';
    } else {
      codeEl = '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central"' + font + ' font-size="' + size + '" fill="' + ink + '"' + halo + '>' + code + '</text>';
    }
    // The fielders under an FC ('6-4') — 11 units below the code, scorecard box only.
    if (sub) {
      codeEl += '<text x="' + cx + '" y="' + (cy + 11 * tb) + '" text-anchor="middle" dominant-baseline="central" font-family="\'JetBrains Mono\',monospace" font-size="' + 8.5 * tb + '" font-weight="500" fill="' + muted + '"' + halo + '>' + sub + '</text>';
    }
  }

  // The spray line sits under every path (F-006); a live cell has no result yet.
  var sprayEl = !live && spray ? (window._cwSprayPath(spray) || '') : '';
  var svg = '<svg class="cwfield" viewBox="0 0 100 100" style="overflow:visible">' + window.SCOREBOOK_FIELD_SVG + fillEl + sprayEl + lightPaths + overlayPaths + codeEl + '</svg>';

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

  // Clip mark (search "Clip mark") — bottom-left ink tab, PROMPT_video_clips.md §2b.
  // A 2px ring in the box's own ground keeps it off the grid lines. Tapping plays
  // the clip; a drag on the pan/zoom surface must never trigger it — the wrapper
  // in PitchByPitchV2 handles that distinction, this only needs the marker + id.
  var clipMark = (cd.hasClip && cd.atBatIndex != null)
    ? '<button type="button" class="cwclipmark" data-clip-pa="' + cd.atBatIndex + '" title="Watch clip" ' +
      'style="position:absolute;left:2px;bottom:2px;width:22px;height:14px;border-radius:3px;background:var(--ink);' +
      'border:none;box-shadow:0 0 0 2px var(--surface);display:flex;align-items:center;justify-content:center;' +
      'cursor:pointer;padding:0;z-index:2">' +
      '<svg width="7" height="8" viewBox="0 0 8 9" aria-hidden="true"><path d="M0 0L8 4.5L0 9Z" fill="#fff"/></svg>' +
      '</button>'
    : '';

  return '<div class="cwtop">' + svg + '<div class="cwmarkers"><div class="cwbox cwbox3">' + bSpans + '</div><div class="cwbox cwbox2">' + sSpans + '</div>' + outEl + '</div></div>' + halfEndSvg + clipMark;
};

// The single canonical scorebook grid builder — shared by the print reference (Scorebook Page.html)
// and the in-app scorecard flip (game-v2.jsx), so both always render the SAME designed layout.
// `container` is the grid element itself (caller sets no styles beyond mounting it).
// lineup: 9 entries { order, no, name, avg, pos, cellsByInn: {1..9: {code,balls,strikes,result,isLooking,live}|undefined}, stats:{ab,r,h,rbi} }
// pitchers: up to 4 entries { no, name, era, hnd, cellsByInn: {1..9: {r,h,k,bb}} }
// away/home: { name, logo } — when given, an extra grey matchup row (away @ home, date · venue)
// is added above the team band, matching the in-app scorecard header's SCOREBOOK lockup, which
// carries the brand so the sheet itself no longer needs to (Sep 23, 2026, rev 3).
//
// Game-view options (PROMPT_scorecard_frozen.md), all off by default so the print sheet is unchanged:
// - cellScale: inning cells at this fraction of print (0.8 → 90 × 77); svg text keeps its size.
// - frozen: the name columns stick left, the totals stick right and the column-header row sticks
//   to the top of the scrolling viewport the caller puts the grid in.
// - liveInning / liveSlot (0-8) / liveRow (0 = starter, 1-2 = subs): the live inning's header and
//   the row of the player at the plate in rust.
// Returns { innW, leftW, rightW, innings } (also on grid.dataset) for the caller's inning window.
window.buildScorebookGrid = function (grid, { lineup = [], pitchers = [], numInnings = 9, gameId = null, teamAbbr = '', logoUrl = null, teamName = '', opponent = null, nickname = null, oppNickname = null, oppLogoUrl = null, gameDate = null, venue = null, away = null, home = null, cellScale = 1, frozen = false, liveInning = null, liveSlot = null, liveRow = 0, plain = false } = {}) {
  // plain: a plain scoresheet (the in-app print) — no rust live inning, no rust batter row and
  // no dashed border on the live at-bat cell, whatever live* says.
  if (plain) { liveInning = null; liveSlot = null; }
  const liveRowIdx = liveRow;
  const INN = Math.max(9, numInnings), SLOTS = 9, SUBROWS = 3;
  const STAT_LABELS = ['AB', 'R', 'H', 'RBI'];
  const LEFT_W = [36, 36, 190, 34, 26];
  const TOTAL_COLS = LEFT_W.length + INN + STAT_LABELS.length;
  const INN_COL_START = 6;
  const STAT_COL_START = INN_COL_START + INN;
  const STAT_W = 210 / STAT_LABELS.length;
  const ROW_OFFSET = (away || home) ? 1 : 0;
  const S = cellScale > 0 ? cellScale : 1;
  const INN_W = Math.round(112 * S);
  // A batter slot's three sub-rows: 32/32/32 in print, 26/26/25 at 0.8.
  const SLOT_H = Math.round(96 * S);
  const SUB_H = [Math.ceil(SLOT_H / 3), Math.ceil(SLOT_H / 3)];
  SUB_H.push(SLOT_H - SUB_H[0] - SUB_H[1]);
  const TEXT_BOOST = Math.min(1.3, 1 / S);
  const LEFT_TOTAL = LEFT_W.reduce((a, w) => a + w, 0);
  const RIGHT_TOTAL = STAT_W * STAT_LABELS.length;
  grid.innerHTML = '';
  grid.style.display = 'inline-grid';
  grid.style.border = '1.3px solid var(--ink)';
  grid.style.background = 'var(--surface)';
  grid.style.fontFamily = "'DM Sans',sans-serif";
  grid.style.gridTemplateColumns = LEFT_W.map((w) => w + 'px').join(' ') + ` repeat(${INN},${INN_W}px)` + ` repeat(${STAT_LABELS.length},${STAT_W}px)`;
  // Row 1 (optional, print): grey matchup band. Row 2: column headers, the team in the left corner. Rows 3+: batting slots + pitching.
  grid.style.gridTemplateRows = `${ROW_OFFSET ? '44px ' : ''}30px repeat(${SLOTS},${SUB_H.map((h) => h + 'px').join(' ')}) 32px repeat(4,32px)`;
  grid.dataset.innW = String(INN_W);
  grid.dataset.leftW = String(LEFT_TOTAL);
  grid.dataset.rightW = String(RIGHT_TOTAL);
  grid.dataset.innings = String(INN);

  // Smaller field and marker column for a scaled cell (the shared SCOREBOOK_CELL_CSS is print size).
  const scaleClass = S === 1 ? '' : 'cw-scale-' + Math.round(S * 100);
  Array.from(grid.classList).filter((c) => c.indexOf('cw-scale-') === 0).forEach((c) => grid.classList.remove(c));
  if (scaleClass) grid.classList.add(scaleClass);
  if (scaleClass && !document.getElementById('__' + scaleClass)) {
    const f = Math.round(88 * S), box = Math.round(10 * S * 10) / 10, out = Math.round(14 * S);
    const st = document.createElement('style');
    st.id = '__' + scaleClass;
    st.textContent = `.${scaleClass} .cwfield{width:${f}px;height:${f}px}` +
      `.${scaleClass} .cwmarkers{gap:${Math.round(3 * S)}px;padding-top:${Math.round(6 * S)}px}` +
      `.${scaleClass} .cwbox,.${scaleClass} .cwbox span{width:${box}px}` +
      `.${scaleClass} .cwbox span{height:${box}px}` +
      `.${scaleClass} .cwout{width:${out}px;height:${out}px;margin-top:${Math.round(4 * S)}px}`;
    document.head.appendChild(st);
  }

  // Frozen edges (sticky inside the caller's scrolling viewport). Left offsets are the running
  // sum of the name columns; right offsets count back from the last total column. Sticky cells
  // must be opaque, and layer: inning cells 0–1, frozen body 2, header row 3, header corners 4.
  const leftOf = (col) => LEFT_W.slice(0, col - 1).reduce((a, w) => a + w, 0);
  const SHADOW_L = 'box-shadow:4px 0 6px -4px rgba(21,22,26,0.35);';
  const SHADOW_R = 'box-shadow:-4px 0 6px -4px rgba(21,22,26,0.35);';
  const stickL = (col, lastCol, z) => frozen ? `position:sticky;left:${leftOf(col)}px;z-index:${z || 2};${lastCol === LEFT_W.length ? SHADOW_L : ''}` : '';
  const stickR = (statIdx, z) => frozen ? `position:sticky;right:${(STAT_LABELS.length - 1 - statIdx) * STAT_W}px;z-index:${z || 2};${statIdx === 0 ? SHADOW_R : ''}` : '';
  const stickTop = (z) => frozen ? `position:sticky;top:0;z-index:${z || 3};` : '';
  // A band spanning every column: its content stays at the left edge while the innings slide.
  const stickContent = frozen ? 'position:sticky;left:12px;' : '';

  if (ROW_OFFSET) {
    const club = (t) => t ? `${t.logo ? `<img src="${t.logo}" width="20" height="20" style="object-fit:contain" onerror="this.style.display='none'"/>` : ''}${t.name}` : '';
    const matchupRow = document.createElement('div');
    matchupRow.style.cssText = `grid-column:1 / span ${TOTAL_COLS};grid-row:1;background:var(--surfaceAlt, #efeae0);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:flex-start;gap:16px;padding:0 12px`;
    matchupRow.innerHTML = `<span style="${stickContent}display:flex;align-items:center;gap:16px"><span style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:8px">${club(away)}<span style="font-weight:500;color:var(--textMuted)">@</span>${club(home)}</span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--textMuted)">${[gameDate, venue].filter(Boolean).join(' · ')}</span></span>${nickname ? `<span style="margin-left:auto;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:var(--ink)">${nickname} batting</span>` : ''}`;
    grid.appendChild(matchupRow);
  }

  const hcell = (text, col, row, extra) => { const h = document.createElement('div'); h.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--ink);padding:4px 10px;background:rgb(151,173,201);${extra || ''}`; h.textContent = text; grid.appendChild(h); };
  const info = (col, row, extra, text) => { const d = document.createElement('div'); d.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--ink);${extra || ''}`; if (text != null) d.textContent = text; grid.appendChild(d); return d; };
  const shadeFor = (sub) => (sub === 0 ? 'rgb(206,217,233)' : 'rgb(231,236,243)');

  const HEAD_ROW = 1 + ROW_OFFSET;
  // Header corners stick on both axes; inning numbers only to the top.
  const cornerL = (col) => frozen ? stickL(col, col, 4) + 'top:0;' : '';
  const cornerR = (i) => frozen ? stickR(i, 4) + 'top:0;' : '';
  const LIVE = 'background:var(--accent);color:#fff;';
  // The header corners name the teams (Oct 22): `[logo] Batting · Astros` over this card's
  // batters, `[logo] Pitching · Cubs` over the OPPOSING pitchers they faced. One string per
  // label — the cell is a flex row, and separate text items would drop the space.
  const teamLabel = (text, logo, col, row, extra) => {
    const h = document.createElement('div');
    h.style.cssText = `grid-column:${col};grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;gap:7px;justify-content:flex-start;padding:4px 10px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:var(--ink);background:rgb(151,173,201);white-space:nowrap;overflow:hidden;${extra || ''}`;
    if (logo) {
      const img = document.createElement('img');
      img.src = logo;
      img.alt = '';
      img.style.cssText = 'width:18px;height:18px;object-fit:contain;flex-shrink:0';
      img.onerror = function () { img.style.display = 'none'; };
      h.appendChild(img);
    }
    const t = document.createElement('span');
    t.textContent = text;
    h.appendChild(t);
    grid.appendChild(h);
  };
  const batNick = nickname || teamName || (teamAbbr ? teamAbbr.toUpperCase() : '');
  teamLabel(batNick ? `Batting · ${batNick}` : 'Batting', logoUrl, `1 / span ${LEFT_W.length}`, HEAD_ROW, frozen ? stickL(1, LEFT_W.length, 4) + 'top:0;' : '');
  for (let i = 1; i <= INN; i++) {
    hcell(i, INN_COL_START + i - 1, HEAD_ROW, stickTop(3) + (i === liveInning ? LIVE : ''));
    grid.lastChild.setAttribute('data-inn-head', String(i));
  }
  STAT_LABELS.forEach((l, i) => hcell(l, STAT_COL_START + i, HEAD_ROW, 'font-size:11px;padding:4px 2px;' + cornerR(i)));

  for (let slot = 0; slot < SLOTS; slot++) {
    const startRow = HEAD_ROW + 1 + slot * SUBROWS;
    const entry = lineup[slot] || {};
    // The current batter: his slot's order number and HIS sub-row in rust — the row of whoever is
    // actually at the plate (a pinch hitter's, not the replaced starter's). Rows above the slot's
    // last occupant are players who have been subbed out, in muted ink.
    const isLiveSlot = slot === liveSlot;
    const lastRow = Math.min(SUBROWS - 1, (entry.subs || []).length);
    const orderCell = document.createElement('div');
    orderCell.style.cssText = `grid-column:1;grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--ink);${frozen ? 'background:var(--surface);' : ''}${stickL(1, 1)}${isLiveSlot ? LIVE : ''}`;
    orderCell.textContent = entry.order != null ? entry.order : slot + 1;
    grid.appendChild(orderCell);
    for (let sub = 0; sub < SUBROWS; sub++) {
      const row = startRow + sub;
      const s = sub === 0 ? entry : (entry.subs && entry.subs[sub - 1]);
      const majorBorder = sub === SUBROWS - 1 ? 'border-bottom:1px solid var(--ink);' : '';
      const liveRow = isLiveSlot && sub === liveRowIdx ? LIVE + 'font-weight:700;' : s && sub < lastRow ? 'color:var(--textMuted);' : '';
      info(2, row, `background:${shadeFor(sub)};font-size:15px;font-weight:700;${majorBorder}${stickL(2, 2)}${liveRow}`, s ? s.no : '');
      const nameCell = info(3, row, `background:${shadeFor(sub)};justify-content:flex-start;padding-left:${sub === 0 ? 6 : 28}px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;${majorBorder}${stickL(3, 3)}${liveRow}`, null);
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
      info(4, row, `background:${shadeFor(sub)};${majorBorder}${stickL(4, 4)}${liveRow}`, sub === 0 ? entry.avg : '');
      info(5, row, `background:${shadeFor(sub)};${majorBorder}${stickL(5, 5)}${liveRow}`, s ? s.pos : '');
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
        c.style.cssText = `grid-column:${INN_COL_START + col};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;flex-direction:row;position:relative;overflow:hidden;background:#fcfaf6${hasHalfEnd ? ';z-index:1' : frozen ? ';z-index:0' : ''}`;
        if (hasLive && !plain) { c.style.outline = '2px dashed var(--accent)'; c.style.outlineOffset = '-2px'; }
        cells.slice(0, 2).forEach((cd, idx) => {
          const sub = document.createElement('div');
          sub.style.cssText = `flex:1;height:100%;position:relative;overflow:hidden${idx > 0 ? ';border-left:1px solid var(--borderStrong)' : ''}`;
          const inner = document.createElement('div');
          // Scale 0.5: a 120×120 block at 50% renders as ~60×60, fitting the ~55px sub-cell
          // (× cellScale on a smaller cell).
          inner.style.cssText = `position:absolute;top:0;left:0;width:120px;height:120px;transform:scale(${0.5 * S});transform-origin:top left`;
          inner.innerHTML = window._cwCellHTML(cd, TEXT_BOOST);
          sub.appendChild(inner);
          c.appendChild(sub);
        });
      } else {
        const singleCell = cells[0] || null;
        const isHalfEnd = !!(singleCell && singleCell.halfEnd);
        c.style.cssText = `grid-column:${INN_COL_START + col};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;flex-direction:column;padding:2px;position:relative;overflow:visible;background:#fcfaf6${isHalfEnd ? ';z-index:1' : frozen ? ';z-index:0' : ''}`;
        if (hasLive && !plain) { c.style.outline = '2px dashed var(--accent)'; c.style.outlineOffset = '-2px'; }
        // Tag every cell with its atBatIndex so the RunnerTracePanel highlight effect can
        // find movement cells (driver PAs) by [data-ab-idx].
        if (singleCell && singleCell.atBatIndex != null) {
          c.setAttribute('data-ab-idx', String(singleCell.atBatIndex));
        }
        const cellInner = document.createElement('div');
        cellInner.style.cssText = `width:100%;height:100%;${singleCell ? '' : 'opacity:0.3'}`;
        cellInner.innerHTML = window._cwCellHTML(singleCell, TEXT_BOOST);
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
      t.style.cssText = `grid-column:${STAT_COL_START + i};grid-row:${startRow} / span ${SUBROWS};border-right:1px solid var(--border);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:center;background:var(--surface);position:relative;${stickR(i)}`;
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
  const extraRow = HEAD_ROW + 1 + SLOTS * SUBROWS;
  teamLabel(oppNickname ? `Pitching · ${oppNickname}` : 'Pitching', oppLogoUrl, '1 / span 3', extraRow, stickL(1, 3));
  hcell('ERA', 4, extraRow, 'font-size:11px;padding:4px 2px;' + stickL(4, 4));
  hcell('HND', 5, extraRow, 'font-size:11px;padding:4px 2px;' + stickL(5, 5));
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
    const p = pitchers[r] || {};
    const numCell = document.createElement('div'); numCell.style.cssText = `grid-column:1;grid-row:${row};border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:800;color:var(--ink);${frozen ? 'background:var(--surface);' : ''}${stickL(1, 1)}`; numCell.textContent = r + 1; grid.appendChild(numCell);
    const pitcherShade = shadeFor(r === 0 ? 0 : 1);
    info(2, row, `background:${pitcherShade};border-bottom:1px solid var(--ink);font-size:15px;font-weight:700;${stickL(2, 2)}`, p.no);
    info(3, row, `background:${pitcherShade};border-bottom:1px solid var(--ink);justify-content:flex-start;padding-left:6px;font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;${stickL(3, 3)}`, p.name);
    info(4, row, `background:${pitcherShade};border-bottom:1px solid var(--ink);${stickL(4, 4)}`, p.era);
    info(5, row, `background:${pitcherShade};border-bottom:1px solid var(--ink);${stickL(5, 5)}`, p.hnd);
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
  posDiamond.style.cssText = `grid-column:${STAT_COL_START} / span ${STAT_LABELS.length};grid-row:${pitchStart} / span 4;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);display:flex;align-items:center;justify-content:center${frozen ? `;position:sticky;right:0;z-index:2;background:var(--surface);${SHADOW_R}` : ''}`;
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
  return { innW: INN_W, leftW: LEFT_TOTAL, rightW: RIGHT_TOTAL, innings: INN };
};
