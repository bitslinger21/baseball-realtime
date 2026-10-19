import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { IQDiamond } from "../../components/primitives/IQDiamond";
import "./ScorecardFullCard.css";

// Full card — the scorecard popped out over the page with the whole sheet
// scaled to fit: every inning and row, no slide, no scroll
// (PROMPT_scorecard_frozen.md §5–§6).
//
// The in-page card stays where it is as the placeholder (so the page doesn't
// reflow and its scrolling viewport never remounts, §7); this renders a second
// copy of the sheet into a portal on <body>, which also keeps `position: fixed`
// clear of any transformed ancestor.

// Cell scale floor: below it the whole sheet scales instead (§5 stage 2).
const MIN_CELL_SCALE = 0.66;
// Print cells are the builder's print size, 112 × 96, times the cell scale.
const PRINT_INN_W = 112;
const PRINT_SLOT_H = 96;
// US Letter landscape with a zero @page margin (which drops the browser's own
// header and footer), the sheet 1/8in from each edge: 10.75 × 8.25in =
// 1032 × 792 CSS px, laid out at 790 tall so rounding can't spill a blank page (§6 rev 6).
const PAGE_W = 1032;
const PAGE_H = 790;
const OPEN_MS = 340;
const CLOSE_MS = 300;
const FADE_MS = 180;
const EASE_OUT = "cubic-bezier(.22,.7,.3,1)";
const EASE_IN_OUT = "cubic-bezier(.4,0,.2,1)";

const PRINT_CSS = `
@page { size: letter landscape; margin: 0; }
@media print {
  html, body { height: auto !important; overflow: hidden !important; }
  body > *:not(.print-root) { display: none !important; }
  .print-root, .print-root * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .print-root .noprint, .print-root .cwclipmark { display: none !important; }
}`;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function intersectsViewport(r: DOMRect): boolean {
  return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
}

// The transform that maps the card's own rect onto `to` (transform-origin 0 0).
function rectTransform(from: DOMRect, to: DOMRect): string {
  return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
}

// One sheet fitted into a box, in two stages (§5): cells scale to fit with a
// 0.66 floor while the frozen columns keep their width; below the floor the
// whole built sheet scales with one transform, so the totals never pin over
// the last inning. The builder's fixed parts (name columns, totals, header and
// pitching rows) don't change with the cell scale, so they're read off the
// built sheet. Used for the full card and for each printed page.
function FittedSheet({ room, innings, render, onSettled }: {
  room: { w: number; h: number };
  innings: number;
  render: (cellScale: number) => ReactNode;
  onSettled?: () => void;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [cellScale, setCellScale] = useState(0.8);
  const [k, setK] = useState(1);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const settledRef = useRef(false);

  useEffect(() => { settledRef.current = false; }, [room.w, room.h, innings]);

  useEffect(() => {
    const grid = ref.current?.querySelector<HTMLElement>("[data-inn-w]");
    if (grid == null || !(room.w > 0) || !(room.h > 0)) return;
    const gw = grid.offsetWidth;
    const gh = grid.offsetHeight;
    const n = Number(grid.dataset.innings) || innings;
    const fixedW = gw - n * Number(grid.dataset.innW);
    const fixedH = gh - 9 * Math.round(PRINT_SLOT_H * cellScale);
    const want = Math.max(MIN_CELL_SCALE, Math.min(1, (room.w - fixedW) / (n * PRINT_INN_W), (room.h - fixedH) / (9 * PRINT_SLOT_H)));
    if (Math.abs(want - cellScale) > 0.004) { setCellScale(want); return; }
    const nextK = Math.min(1, room.w / gw, room.h / gh);
    if (Math.abs(nextK - k) > 0.001) { setK(nextK); return; }
    if (box == null || box.w !== gw || box.h !== gh) { setBox({ w: gw, h: gh }); return; }
    if (!settledRef.current) { settledRef.current = true; onSettled?.(); }
  }, [room.w, room.h, innings, cellScale, k, box, onSettled]);

  return (
    // A box the size of the scaled sheet, so centring and layout see the scaled size.
    <div ref={ref} className="sfc__fit" style={box != null ? { width: box.w * k, height: box.h * k } : undefined}>
      <div className="sfc__scale" style={{ transform: k < 1 ? `scale(${k})` : undefined }}>
        {render(cellScale)}
      </div>
    </div>
  );
}

// One printed page's sheet (§6 rev 6): built at print size (cellScale 1), then
// the whole sheet scaled uniformly to fill the page area and centred — never
// one axis stretched.
function PrintSheet({ render, onSettled }: { render: () => ReactNode; onSettled: () => void }): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ w: number; h: number; k: number } | null>(null);

  useEffect(() => {
    const grid = ref.current?.querySelector<HTMLElement>("[data-inn-w]");
    if (grid == null) return;
    const w = grid.offsetWidth;
    const h = grid.offsetHeight;
    const k = Math.min(PAGE_W / w, PAGE_H / h);
    if (fit == null || fit.w !== w || fit.h !== h || Math.abs(fit.k - k) > 0.0005) { setFit({ w, h, k }); return; }
    onSettled();
  }, [fit, onSettled]);

  return (
    <div ref={ref} className="sfc__fit" style={fit != null ? { width: fit.w * fit.k, height: fit.h * fit.k } : undefined}>
      <div className="sfc__scale" style={{ transform: fit != null ? `scale(${fit.k})` : undefined }}>
        {render()}
      </div>
    </div>
  );
}

export type ScorecardSide = "away" | "home";

interface ScorecardFullCardProps {
  /** The in-page card: where the full card grows from and shrinks back to. */
  placeholder: () => HTMLElement | null;
  /** Called the moment the close starts; the in-page card renders under the closing snapshot. */
  onClosed: () => void;
  /** The team showing; it prints first. */
  side: ScorecardSide;
  inningsFor: (side: ScorecardSide) => number;
  /** The team toggle, kept in the full card header. */
  controls: ReactNode;
  /** A team's sheet, built at the given cell scale. */
  renderSheet: (side: ScorecardSide, cellScale: number) => ReactNode;
  /** A team's printed sheet: print size, no live highlights. */
  renderPrintSheet: (side: ScorecardSide) => ReactNode;
  /** Runner trace panel / clip player, when open. */
  overlay?: ReactNode;
  /** Clip ▶ and runner taps on the sheet. */
  onSheetClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function ScorecardFullCard({ placeholder, onClosed, side, inningsFor, controls, renderSheet, renderPrintSheet, overlay, onSheetClick }: ScorecardFullCardProps): ReactElement {
  const cardRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [printing, setPrinting] = useState(false);
  const [avail, setAvail] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const printSides: ScorecardSide[] = [side, side === "away" ? "home" : "away"];
  const settledPagesRef = useRef(new Set<ScorecardSide>());
  const printedRef = useRef(false);

  // Lock page scroll while open, so the page can't move behind the backdrop
  // (and the close target with it).
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, []);

  // Open: grow out of the in-page card (FLIP).
  useLayoutEffect(() => {
    const card = cardRef.current;
    const from = placeholder()?.getBoundingClientRect();
    if (card == null || reducedMotion()) return;
    // Measure the card at rest: an animation already running (dev StrictMode
    // runs this effect twice) would make it measure its own start transform.
    card.getAnimations().forEach((a) => a.cancel());
    backdropRef.current?.getAnimations().forEach((a) => a.cancel());
    backdropRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: "linear" });
    if (from == null || !intersectsViewport(from)) {
      card.animate([{ opacity: 0, transform: "scale(.97)", transformOrigin: "50% 50%" }, { opacity: 1, transform: "none", transformOrigin: "50% 50%" }], { duration: FADE_MS, easing: EASE_OUT });
      return;
    }
    card.animate([{ transform: rectTransform(card.getBoundingClientRect(), from) }, { transform: "none" }], { duration: OPEN_MS, easing: EASE_OUT });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close — a cross-fade (§5a rev 5). A static snapshot of the full card and
  // its backdrop takes over in fixed layers, the real in-page card renders at
  // once (scroll lock released; the slot hasn't moved), the snapshot lands on
  // the slot and fades while the in-page card fades in, so the contents
  // dissolve from whole sheet into inning window during the landing.
  const close = useCallback((): void => {
    if (closingRef.current) return;
    closingRef.current = true;
    const card = cardRef.current;
    const slotEl = placeholder();
    if (card == null || reducedMotion()) { onClosed(); return; }
    const from = card.getBoundingClientRect();
    const to = slotEl?.getBoundingClientRect();

    const layer = document.createElement("div");
    layer.className = "sfc-closing";
    const backdrop = document.createElement("div");
    backdrop.className = "sfc-backdrop";
    const snap = card.cloneNode(true) as HTMLElement;
    snap.style.cssText = `inset:auto;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;`;
    layer.append(backdrop, snap);
    document.body.appendChild(layer);
    onClosed();

    let anim: Animation;
    if (to != null && intersectsViewport(to)) {
      const target = rectTransform(from, to);
      anim = snap.animate([
        { transform: "none", opacity: 1, offset: 0, easing: EASE_IN_OUT },
        { transform: target, opacity: 1, offset: 0.6, easing: "linear" },
        { transform: target, opacity: 0, offset: 1 },
      ], { duration: CLOSE_MS, fill: "forwards" });
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, easing: "linear", fill: "forwards" });
      slotEl?.animate([{ opacity: 0 }, { opacity: 1 }], { delay: CLOSE_MS * 0.45, duration: CLOSE_MS * 0.55, easing: "ease-out", fill: "backwards" });
    } else {
      // The slot is off-screen: fade from the centre instead of shrinking toward it.
      anim = snap.animate([
        { opacity: 1, transform: "none", transformOrigin: "50% 50%" },
        { opacity: 0, transform: "scale(.97)", transformOrigin: "50% 50%" },
      ], { duration: FADE_MS, easing: EASE_IN_OUT, fill: "forwards" });
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: "linear", fill: "forwards" });
      slotEl?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: "ease-out", fill: "backwards" });
    }
    anim.onfinish = () => layer.remove();
    anim.oncancel = () => layer.remove();
  }, [onClosed, placeholder]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === "Escape" && !printing) close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, printing]);

  // The room for the sheet: the body's inner box. Re-measured on resize.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (body == null) return;
    const measure = (): void => {
      const cs = getComputedStyle(body);
      const w = body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setAvail((prev) => (Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5 ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  // Print (§6, rev 5): both teams' cards, one Letter landscape page each, the
  // team showing first. The print CSS is present only while printing; print
  // once both pages have settled their fit, two frames later.
  const onPageSettled = useCallback((s: ScorecardSide): void => {
    settledPagesRef.current.add(s);
    if (printedRef.current || settledPagesRef.current.size < 2) return;
    printedRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }, []);
  const settleAway = useCallback(() => onPageSettled("away"), [onPageSettled]);
  const settleHome = useCallback(() => onPageSettled("home"), [onPageSettled]);

  useEffect(() => {
    if (!printing) return;
    const style = document.createElement("style");
    style.id = "__scorecard_print";
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    const done = (): void => {
      printedRef.current = false;
      settledPagesRef.current.clear();
      setPrinting(false);
    };
    window.addEventListener("afterprint", done);
    return () => {
      window.removeEventListener("afterprint", done);
      style.remove();
    };
  }, [printing]);

  const title = (innings: number): ReactNode => (
    <>
      <span className="pbpv2__title pbpv2__title--scorebook">
        <IQDiamond size={15} color="var(--color-ink)" />
        SCOREBOOK
      </span>
      <span className="sfc__label">
        All {innings} innings<span className="noprint"> · full card</span>
      </span>
    </>
  );

  return createPortal(
    <div className={`sfc-root${printing ? " print-root sfc-root--printing" : ""}`}>
      <div ref={backdropRef} className="sfc-backdrop noprint" onClick={() => close()} />
      <div ref={cardRef} className="sfc" role="dialog" aria-modal="true" aria-label="Full scorecard">
        <div className="sfc__head">
          {title(inningsFor(side))}
          <span className="sfc__spacer" />
          <span className="sfc__controls noprint">
            {controls}
            <button
              type="button"
              className="pbpv2__flip-btn pbpv2__flip-btn--text sfc__btn"
              onClick={() => setPrinting(true)}
              disabled={printing}
              title="Print both teams' cards (US Letter, landscape, one page each)"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6V1.5h8V6M4 12H2.5A1 1 0 0 1 1.5 11V7a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H12M4 9.5h8V14.5H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              Print
            </button>
            <button type="button" className="pbpv2__flip-btn pbpv2__flip-btn--text sfc__btn sfc__btn--exit" onClick={() => close()}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 1.5V6H1.5M10 1.5V6h4.5M6 14.5V10H1.5M10 14.5V10h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Exit full card
            </button>
          </span>
        </div>
        <div ref={bodyRef} className="sfc__body" onClick={onSheetClick}>
          <FittedSheet room={avail} innings={inningsFor(side)} render={(s) => renderSheet(side, s)} />
          {overlay}
        </div>
      </div>
      {/* The printed pages: both teams, the team showing first — only the sheet
          (its own team band names whose card it is), no header, no highlights. */}
      {printing && (
        <div className="sfc-pages">
          {printSides.map((s) => (
            <div key={s} className="sfc-page">
              <PrintSheet render={() => renderPrintSheet(s)} onSettled={s === "away" ? settleAway : settleHome} />
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
