import React from "react";
import type { AtBatState, BatterInfo } from "./atBatTypes";
import "./BatterInfoPanel.css";

const GENERIC_HEADSHOT_URL =
  "https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/generic/headshot/67/current";

function buildHeadshotUrl(mlbId: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${mlbId}/headshot/67/current`;
}

interface BatterInfoPanelProps {
  atBat: AtBatState;
  batterInfo: BatterInfo | null;
  isLoading: boolean;
}

export function BatterInfoPanel({
  atBat,
  batterInfo,
  isLoading,
}: BatterInfoPanelProps): React.ReactElement {
  return (
    <div className="batter-info-panel">
      <img
        src={buildHeadshotUrl(atBat.batterId)}
        onError={(e) => {
          e.currentTarget.src = GENERIC_HEADSHOT_URL;
        }}
        className="batter-headshot"
        alt={atBat.batterName}
      />

      <div className="batter-bio">
        <span className="batter-name">{atBat.batterName}</span>
      </div>

      <div className="batter-slash">
        {isLoading
          ? "—/—/—"
          : batterInfo != null
          ? `${batterInfo.avg}/${batterInfo.obp}/${batterInfo.slg}`
          : "—/—/—"}
      </div>

      <div className="batter-game-stats">
        {atBat.gameAB != null ? (
          <span>{atBat.gameH ?? 0}-for-{atBat.gameAB}</span>
        ) : (
          <span>—</span>
        )}
        {atBat.gameR != null && atBat.gameR > 0 && (
          <span>{atBat.gameR}R</span>
        )}
        {atBat.gameRBI != null && atBat.gameRBI > 0 && (
          <span>{atBat.gameRBI}RBI</span>
        )}
      </div>
    </div>
  );
}
