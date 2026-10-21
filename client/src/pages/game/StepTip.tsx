import { useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import "./StepTip.css";

// Hover text for the Scout step buttons (PROMPT_step_button_tips.md): a styled
// tip below the button after a short hover, not the native title (slow,
// unstyled, missing on some platforms). Shown on keyboard focus too; hidden at
// once on leave, blur and press, so it never covers the marker as it moves.
// Touch has no hover, so no tip — the button's aria-label carries the label.
const SHOW_AFTER_MS = 250;

export function StepTip({ label, children }: { label: string; children: ReactNode }): ReactElement {
  const [on, setOn] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const show = (): void => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOn(true), SHOW_AFTER_MS);
  };
  const hide = (): void => {
    window.clearTimeout(timer.current);
    setOn(false);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      className="step-tip"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onMouseDown={hide}
    >
      {children}
      {on && <span role="tooltip" className="step-tip__tip">{label}</span>}
    </span>
  );
}

// The "by at-bat" group's glyph: a baseball bat — knob, thin handle with grip
// lines, flared barrel with a rounded cap, wood tone, tilted -45°. (The image
// it replaces read as a pencil.) Ported as is from the design's BatGlyph.
export function BatGlyph(): ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <g transform="rotate(-45 12 12)">
        <path
          d="M3.2 11.2 L10 11.35 C13.5 11.4 15.5 9.6 19.6 9.6 A2.4 2.4 0 0 1 19.6 14.4 C15.5 14.4 13.5 12.6 10 12.65 L3.2 12.8 Z"
          fill="#c89a6a"
          stroke="#8a5f3a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <circle cx="2.6" cy="12" r="1.35" fill="#8a5f3a" />
        <path d="M4.6 11.25 V12.75 M5.8 11.25 V12.75" stroke="#8a5f3a" strokeWidth="0.6" />
      </g>
    </svg>
  );
}
