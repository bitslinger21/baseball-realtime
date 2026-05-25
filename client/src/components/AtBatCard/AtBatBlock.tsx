import React from "react";
import {
  getBatterAnchorIdFromKey,
  getInningAnchorIdFromKey,
} from "../../realtime/playIds";
import { useBatterInfo } from "../../hooks/useBatterInfo";
import type { AtBatState } from "./atBatTypes";
import { AtBatCard } from "./AtBatCard";
import "./AtBatBlock.css";

interface AtBatBlockProps {
  atBat: AtBatState;
  isActive: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function AtBatBlock({
  atBat,
  isActive,
  isExpanded,
  onToggle,
}: AtBatBlockProps): React.ReactElement {
  const { batterInfo, isLoading: isBatterInfoLoading } = useBatterInfo(
    atBat.batterId,
  );

  const blockClass = [
    "atbat-block",
    isActive ? "is-active" : isExpanded ? "is-expanded" : "is-collapsed",
  ].join(" ");

  return (
    <li className={blockClass}>
      {/* Header — always visible */}
      <div
        id={getBatterAnchorIdFromKey(atBat.firstPitchRenderKey)}
        className="atbat-header"
        onClick={isActive ? undefined : onToggle}
        role={isActive ? undefined : "button"}
        tabIndex={isActive ? undefined : 0}
        onKeyDown={
          isActive
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") onToggle?.();
              }
        }
      >
        {atBat.isFirstInInning && (
          <div
            id={getInningAnchorIdFromKey(atBat.firstPitchRenderKey)}
            className="atbat-inning-label"
          >
            {atBat.half === "top" ? "▲" : "▼"}
            {atBat.inning}
          </div>
        )}

        <span className="atbat-batter-name">{atBat.batterName}</span>

        {atBat.result != null && (
          <span className="atbat-result-chip">{atBat.result}</span>
        )}

        {atBat.finalCount != null && (
          <span className="atbat-final-count">{atBat.finalCount}</span>
        )}

        {!isActive && (
          <span className="atbat-toggle-indicator" aria-hidden="true">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
      </div>

      {/* Card body — expanded only */}
      {(isActive || isExpanded) && (
        <AtBatCard
          atBat={atBat}
          batterInfo={batterInfo}
          isBatterInfoLoading={isBatterInfoLoading}
        />
      )}
    </li>
  );
}
