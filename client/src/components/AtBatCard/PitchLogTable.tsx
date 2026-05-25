import React from "react";
import { getPitchColor, getPitchColorMuted } from "../../utils/pitchColors";
import type { PitchEntry } from "./atBatTypes";
import "./PitchLogTable.css";

interface PitchLogTableProps {
  pitches: PitchEntry[];
}

export function PitchLogTable({ pitches }: PitchLogTableProps): React.ReactElement {
  return (
    <table className="pitch-log-table">
      <thead>
        <tr>
          <th>#</th>
          <th>TYPE</th>
          <th>RESULT</th>
          <th>MPH</th>
          <th>COUNT</th>
        </tr>
      </thead>
      <tbody>
        {pitches.map((p) => (
          <tr
            key={p.seq}
            style={{ backgroundColor: getPitchColorMuted(p.pitchTypeCode) }}
            className={p.isLastPitch ? "pitch-log-row--final" : undefined}
          >
            <td>{p.seq}</td>
            <td>
              <span
                className="pitch-type-dot"
                style={{ backgroundColor: getPitchColor(p.pitchTypeCode) }}
              />
              {p.pitchTypeName}
            </td>
            <td>
              {p.isLastPitch ? (
                <strong className="pitch-result-badge">{p.result}</strong>
              ) : (
                p.result
              )}
            </td>
            <td>{p.speedMph != null ? p.speedMph.toFixed(1) : "—"}</td>
            <td>{p.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
