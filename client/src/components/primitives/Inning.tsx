import type { ReactElement } from "react";
import "./Inning.css";

interface InningProps {
  half: "top" | "bottom";
  num: number;
  size?: number;
  color?: string;
}

export function Inning({ half, num, size = 16, color }: InningProps): ReactElement {
  return (
    <span className="inning" style={{ fontSize: size, color: color ?? undefined }}>
      <span className="inning__arrow">{half === "top" ? "▲" : "▼"}</span>
      <span className="inning__num num">{num}</span>
    </span>
  );
}
