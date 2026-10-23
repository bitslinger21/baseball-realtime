import { useEffect, useRef, useState, type ReactElement } from "react";
import "./Bases.css";

interface BasesProps {
  /** [on1, on2, on3] — first, second, third */
  on: [boolean, boolean, boolean];
  size?: number;
  fill?: string;
  empty?: string;
  strokeWidth?: number;
  /** [first, second, third] — runner display names. Absent = not interactive at all. */
  runners?: readonly (string | null)[];
}

const BASE_LABELS = ["1st", "2nd", "3rd"];

export function Bases({ on, size = 34, fill = "var(--color-text)", empty = "var(--color-border-strong)", strokeWidth = 2, runners }: BasesProps): ReactElement {
  const [on1, on2, on3] = on;
  const s = size / 4.6;
  // Who's on: mouse hover or keyboard focus shows the card; a tap (touch/pen)
  // or Enter/Space pins it until tapped again, a tap elsewhere, or Esc
  // (PROMPT_runner_names_touch.md).
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent): void => {
      if (rootRef.current != null && !rootRef.current.contains(e.target as Node)) setPinned(false);
    };
    const esc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") { setPinned(false); setHovered(false); }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [pinned]);

  const base = (filled: boolean): ReactElement => (
    <div style={{
      width: s,
      height: s,
      background: filled ? fill : "transparent",
      border: `${strokeWidth}px solid ${filled ? fill : empty}`,
      transform: "rotate(45deg)",
    }} />
  );

  // Occupied bases only, in 1st → 2nd → 3rd order — the card answers "who's on",
  // not a three-row table with blanks.
  const occupied: { label: string; name: string }[] = runners != null
    ? [on1, on2, on3]
      .map((isOn, i) => (isOn && runners[i] ? { label: BASE_LABELS[i]!, name: runners[i]! } : null))
      .filter((r): r is { label: string; name: string } => r != null)
    : [];
  // Only when someone named is on — empty bases stay inert (no focus stop, no cursor).
  const interactive = occupied.length > 0;
  const open = interactive && (hovered || pinned);
  // The whole diamond is one target, padded to at least 44 × 44px for touch.
  const pad = Math.max(6, (44 - size) / 2);

  return (
    <div
      ref={rootRef}
      className={`bases${interactive ? " bases--interactive" : ""}`}
      style={{ width: size, height: size }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Runners: ${occupied.map((o) => `${o.label} ${o.name}`).join(", ")}` : undefined}
      aria-expanded={interactive ? open : undefined}
      onPointerEnter={interactive ? (e) => { if (e.pointerType === "mouse") setHovered(true); } : undefined}
      onPointerLeave={interactive ? (e) => { if (e.pointerType === "mouse") setHovered(false); } : undefined}
      // A tap is never a hover: touch/pen toggles on pointerup.
      onPointerUp={interactive ? (e) => { if (e.pointerType !== "mouse") setPinned((p) => !p); } : undefined}
      // Keyboard focus only — not the focus a mouse click leaves behind.
      onFocus={interactive ? (e) => { if (e.currentTarget.matches(":focus-visible")) setHovered(true); } : undefined}
      onBlur={interactive ? () => { setHovered(false); setPinned(false); } : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned((p) => !p); }
        else if (e.key === "Escape") { setPinned(false); setHovered(false); }
      } : undefined}
    >
      {/* Second base — top center */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }}>{base(on2)}</div>
      {/* First base — mid right */}
      <div style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)" }}>{base(on1)}</div>
      {/* Third base — mid left */}
      <div style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)" }}>{base(on3)}</div>

      {interactive && (
        <>
          {/* Padded past the diamond — the three base squares have gaps between them;
              without the pad the pointer falls through the middle and the card flickers. */}
          <div className="bases__hit-area" style={{ inset: -pad }} />
          {open && (
            <div className="bases__hover-card" role="tooltip">
              {occupied.map((o) => (
                <div key={o.label} className="bases__hover-row">
                  <span className="bases__hover-label">{o.label}</span>
                  <span className="bases__hover-name">{o.name}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
