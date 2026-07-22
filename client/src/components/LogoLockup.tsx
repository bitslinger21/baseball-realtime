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
        viewBox="0 0 44 44"
        aria-hidden="true"
      >
        <polygon
          points="22,41 41,22 22,3 3,22"
          fill="none"
          stroke="#b8421e"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <polygon
          points="22,41 26.24,36.76 22,32.52 17.76,36.76"
          fill="none"
          stroke="#b8421e"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <span className="app-logo-text">{suffix}</span>
    </>
  );
}
