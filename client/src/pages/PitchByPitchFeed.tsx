import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import type { PlayUpdate } from "../realtime/types";
import "./PitchByPitchFeed.css";
import {
  buildPitchFeedModel,
  type PitchFeedAtBatGroup,
  type PitchFeedEventRow,
  type PitchFeedInningGroup,
} from "../realtime/pitchFeedModel";

function rowClassName(row: PitchFeedEventRow, isLatestRow: boolean, isResultRow: boolean): string {
  return [
    "feed-pitch",
    isLatestRow ? "latest-play" : "",
    isResultRow ? "play-result" : "",
    row.isScoringEvent && isResultRow ? "scoring-event" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreDeltaLabel(
  row: PitchFeedEventRow,
  atBat?: PitchFeedAtBatGroup,
): string {
  const rowAway = row.awayScoreDelta;
  const rowHome = row.homeScoreDelta;
  const rowTotal = rowAway + rowHome;

  if (rowTotal > 0) {
    const sideLabel =
      rowAway > 0 && rowHome > 0
        ? "both teams"
        : rowAway > 0
          ? "away"
          : "home";

    const runsLabel = rowTotal === 1 ? "1 run scored" : `${rowTotal} runs scored`;
    return `${runsLabel} • ${sideLabel} • now ${row.awayScore}-${row.homeScore}`;
  }

  return "";
}

function renderPitchRow(
  row: PitchFeedEventRow,
  options: {
    isLatestRow: boolean;
    isResultRow: boolean;
    atBat?: PitchFeedAtBatGroup;
  },
): ReactElement {
  const deltaLabel = options.isResultRow ? scoreDeltaLabel(row, options.atBat) : "";
  return (
    <li
      key={row.key}
      id={row.playAnchorId}
      className={rowClassName(row, options.isLatestRow, options.isResultRow)}
    >
      <span className="feed-pitch-text">{row.description}</span>

      <span className="feed-pitch-meta">
        {deltaLabel !== "" && <span className="feed-score-delta">{deltaLabel}</span>}
        <span className="feed-pitch-count">{row.countLabel}</span>
      </span>
    </li>
  );
}

function renderAtBat(
  atBat: PitchFeedAtBatGroup,
  latestEventKey: string | null,
  expanded: boolean,
  onToggle: () => void,
): ReactElement {
  const canCollapse = atBat.result != null;

  if (canCollapse && !expanded) {
    const runsText =
      atBat.runsScored > 0
        ? `${atBat.runsScored === 1 ? "1 run scored" : `${atBat.runsScored} runs scored`} • now ${atBat.result!.awayScore}-${atBat.result!.homeScore}`
        : "";
    return (
      <li
        key={atBat.key}
        className={`feed-atbat feed-atbat--collapsed${atBat.runsScored > 0 ? " feed-atbat--scoring" : ""}`}
      >
        <button
          type="button"
          className="feed-atbat-summary"
          onClick={onToggle}
          aria-label={`Expand at-bat for ${atBat.batterName}`}
        >
          <span className="feed-batter-name">{atBat.batterName}</span>
          <span className="feed-atbat-result-chip">{atBat.result!.description}</span>
          {runsText !== "" && (
            <span className="feed-score-delta">{runsText}</span>
          )}
          <span className="feed-collapse-indicator" aria-hidden="true">▶</span>
        </button>
      </li>
    );
  }

  const resultIdx =
    atBat.result == null ? -1 : atBat.events.findIndex((e) => e.key === atBat.result!.key);
  const nonResultEvents = resultIdx >= 0 ? atBat.events.slice(0, resultIdx) : atBat.events;

  return (
    <li key={atBat.key} className={`feed-atbat ${atBat.isCurrent ? "is-current" : ""}`}>
      <div id={atBat.batterAnchorId} className="feed-batter">
        <span className="feed-batter-name">{atBat.batterName}</span>
        <span className="feed-batter-vs">vs {atBat.pitcherName}</span>
        {canCollapse && (
          <button
            type="button"
            className="feed-collapse-toggle"
            onClick={onToggle}
            aria-label="Collapse at-bat"
          >
            ▼
          </button>
        )}
      </div>

      <ul className="feed-atbat-events">
        {nonResultEvents.map((row) =>
          renderPitchRow(row, {
            isLatestRow: latestEventKey === row.key,
            isResultRow: false,
            atBat,
          }),
        )}

        {atBat.result != null &&
          renderPitchRow(atBat.result, {
            isLatestRow: latestEventKey === atBat.result.key,
            isResultRow: true,
            atBat,
          })}
      </ul>
    </li>
  );
}

function renderInning(
  inning: PitchFeedInningGroup,
  latestEventKey: string | null,
  isExpanded: (atBat: PitchFeedAtBatGroup) => boolean,
  onToggle: (key: string) => void,
): ReactElement {
  return (
    <li key={inning.key} className="feed-inning-group">
      <div id={inning.inningAnchorId} className="feed-inning inning-marker">
        {inning.label}
      </div>

      <ul className="feed-atbat-list">
        {inning.atBats.map((atBat) =>
          renderAtBat(atBat, latestEventKey, isExpanded(atBat), () => onToggle(atBat.key)),
        )}
      </ul>
    </li>
  );
}

export function PitchByPitchFeed(props: {
  updates: readonly PlayUpdate[];
}): ReactElement {
  const { updates } = props;

  const model = useMemo(() => buildPitchFeedModel(updates), [updates]);

  const [userExpanded, setUserExpanded] = useState<ReadonlySet<string>>(() => new Set());

  const isExpanded = (atBat: PitchFeedAtBatGroup): boolean =>
    atBat.isCurrent || userExpanded.has(atBat.key);

  const toggle = (key: string): void => {
    setUserExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const latestEventKey =
    updates.length > 0 ? model.atBats[model.atBats.length - 1]?.result?.key ?? null : null;

  return (
    <ul className="live-feed-list">
      {model.innings.map((inning) => renderInning(inning, latestEventKey, isExpanded, toggle))}
    </ul>
  );
}
