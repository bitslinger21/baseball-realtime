import type { ReactElement } from "react";
import "./LineupCompact.css";

export function LineupCompact(): ReactElement {
  return (
    <div className="lineup-compact">
      <div className="lineup-compact__header">
        <span className="lineup-compact__title">Lineup</span>
      </div>
      <div className="lineup-compact__placeholder">
        Lineup data coming soon
      </div>
    </div>
  );
}
