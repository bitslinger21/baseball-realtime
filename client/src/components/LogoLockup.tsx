import type { ReactElement } from "react";

export type LogoVariant = "sentence" | "allcaps";

interface LogoLockupProps {
  variant?: LogoVariant;
}

export function LogoLockup({ variant = "allcaps" }: LogoLockupProps): ReactElement {
  const prefix = variant === "allcaps" ? "SC" : "Sc";
  const suffix = variant === "allcaps" ? "REBOOK" : "rebook";

  return (
    <>
      <span className="app-logo-text">{prefix}</span>
      <svg
        className="app-logo-diamond"
        viewBox="0 0 16 16"
        aria-hidden="true"
        overflow="visible"
      >
        <polygon
          points="8,1.5 14.5,8 8,14.5 1.5,8"
          fill="#efeae0"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <rect
          x="6.25" y="10.25" width="3.5" height="3.5"
          fill="#efeae0"
          stroke="currentColor"
          strokeWidth="1.2"
          transform="rotate(45 8 12)"
        />
      </svg>
      <span className="app-logo-text">{suffix}</span>
    </>
  );
}
