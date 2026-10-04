import type { ReactElement } from "react";
import "./BroadcastLine.css";

// "TV  TBS · truTV" — the English TV networks carrying a game
// (PROMPT_games_broadcasts.md). The API has already picked and ordered them
// (no radio, no MLB.TV, nationals first). Nothing to show → renders nothing:
// no label, no "TBD", no placeholder.
export function BroadcastLine({
  names,
  lines,
  align = "start",
}: {
  names: readonly string[] | null | undefined;
  /** Clamp the network list to this many lines (the full list is in the tooltip). */
  lines?: number;
  align?: "start" | "end";
}): ReactElement | null {
  if (names == null || names.length === 0) return null;
  const text = names.join(" · ");
  return (
    <div className={`bcast${align === "end" ? " bcast--end" : ""}`} title={text}>
      <span className="bcast__label">TV</span>
      <span
        className={`bcast__names${lines != null ? " bcast__names--clamp" : ""}`}
        style={lines != null ? { WebkitLineClamp: lines } : undefined}
      >
        {text}
      </span>
    </div>
  );
}
