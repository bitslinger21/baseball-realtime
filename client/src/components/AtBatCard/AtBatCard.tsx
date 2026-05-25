import React from "react";
import type { AtBatState, BatterInfo } from "./atBatTypes";
import { ZoneDiagram } from "./ZoneDiagram";
import { BatterInfoPanel } from "./BatterInfoPanel";
import { PitchLogTable } from "./PitchLogTable";
import "./AtBatCard.css";

interface AtBatCardProps {
  atBat: AtBatState;
  batterInfo: BatterInfo | null;
  isBatterInfoLoading: boolean;
}

export function AtBatCard({
  atBat,
  batterInfo,
  isBatterInfoLoading,
}: AtBatCardProps): React.ReactElement {
  return (
    <div className="atbat-card">
      <div className="atbat-card-top">
        <ZoneDiagram
          pitches={atBat.pitches}
          strikeZoneTop={atBat.strikeZoneTop}
          strikeZoneBottom={atBat.strikeZoneBottom}
        />
        <BatterInfoPanel
          atBat={atBat}
          batterInfo={batterInfo}
          isLoading={isBatterInfoLoading}
        />
      </div>
      <PitchLogTable pitches={atBat.pitches} />
    </div>
  );
}
