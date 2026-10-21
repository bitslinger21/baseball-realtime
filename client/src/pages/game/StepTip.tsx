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
