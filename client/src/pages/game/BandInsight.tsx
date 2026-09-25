import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { IqBlock } from "../../realtime/types";
import { IQDiamond } from "../../components/primitives/IQDiamond";
import "./BandInsight.css";

// Rust as TEXT on the dark bar measures 3.38:1 — under the 4.5 AA floor. This
// lightened value is for the `kind` eyebrow only; raw --color-accent stays on
// the diamond glyph. Same precedent as the retired ask panel it replaces.
const IQ_INK_ACCENT = "#e2703f";

interface BandInsightProps {
  iq: IqBlock | undefined;
}

// The bar's right side, insight-only (PROMPT_iq_global.md §2 rev 2) — the ASK
// moved to the header; this is the one surface left that pushes something
// about THIS moment. Read-only: no input, no suggested questions. Renders
// nothing when there's no candidate — the permanent ask in the header fills
// the "nothing to say yet" role now, so an empty right side is correct.
export function BandInsight({ iq }: BandInsightProps): ReactElement | null {
  const best = iq?.candidates?.[0];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (best == null) setOpen(false);
  }, [best]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (best == null) return null;

  return (
    <div ref={wrapRef} className="band-insight">
      <button type="button" className="band-insight__line" onClick={() => setOpen((o) => !o)}>
        <IQDiamond size={16} />
        <span className="band-insight__kind" style={{ color: IQ_INK_ACCENT }}>{best.kind}</span>
        <span className="band-insight__text">{best.text}</span>
      </button>
      {open && (
        <div className="band-insight__panel">
          <div className="band-insight__panel-head">
            <IQDiamond size={14} />
            <span className="band-insight__panel-kind" style={{ color: IQ_INK_ACCENT }}>{best.kind}</span>
          </div>
          <p className="band-insight__panel-text">{best.text}</p>
        </div>
      )}
    </div>
  );
}
