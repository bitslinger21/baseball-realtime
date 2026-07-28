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
