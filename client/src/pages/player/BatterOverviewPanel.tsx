import { type ReactElement } from "react";
import type { BatterOverviewDto } from "./batterOverview";
import "./BatterOverviewPanel.css";

export type BatterOverviewHeadlineDto = {
  battingAverage: string;
  onBasePercentage: string;
  sluggingPercentage: string;
  onBasePlusSlugging: string;
  homeRuns: number;
  runsBattedIn: number;
};

export type BatterOverviewSecondaryDto = {
  games: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
};

export type BatterOverviewTodayDto = {
  label: string;
  statLine: string;
  isLive: boolean;
};

// export type BatterOverviewDto = {
//   playerId: string;
//   season: number;

export function BatterOverviewPanel(
  props: {
    overview: BatterOverviewDto;
  }): ReactElement {
  const { overview } = props;

  return (
    <div className="player-overview">
      <div className="player-overview-headline">
        <Stat label="Batting Average" value={overview.headline.battingAverage} />
        <Stat label="On-Base %" value={overview.headline.onBasePercentage} />
        <Stat label="Slugging %" value={overview.headline.sluggingPercentage} />
        <Stat label="OPS" value={overview.headline.onBasePlusSlugging} />
        <Stat label="Home Runs" value={String(overview.headline.homeRuns)} />
        <Stat label="Runs Batted In" value={String(overview.headline.runsBattedIn)} />
      </div>

      <div className="player-overview-secondary">
        <MiniStat label="Games" value={overview.secondary.games} />
        <MiniStat label="At-Bats" value={overview.secondary.atBats} />
        <MiniStat label="Runs" value={overview.secondary.runs} />
        <MiniStat label="Hits" value={overview.secondary.hits} />
        <MiniStat label="Doubles" value={overview.secondary.doubles} />
        <MiniStat label="Triples" value={overview.secondary.triples} />
        <MiniStat label="Walks" value={overview.secondary.walks} />
        <MiniStat label="Strikeouts" value={overview.secondary.strikeouts} />
        <MiniStat label="Stolen Bases" value={overview.secondary.stolenBases} />
      </div>

      <div className="player-overview-today">
        <h3 className="player-overview-section-title">Today</h3>
        {overview.today != null ? (
          <div className="player-overview-today-line">
            {overview.today.label !== "" ? `${overview.today.label}: ` : ""}
            {overview.today.statLine}
          </div>
        ) : (
          <div className="player-overview-today-line">No current game data.</div>
        )}
      </div>
    </div>
    // headline: BatterOverviewHeadlineDto;
    // secondary: BatterOverviewSecondaryDto;
    // today: BatterOverviewTodayDto | null;
  )
}

function Stat(props: { label: string; value: string }): ReactElement {
  return (
    <div className="player-overview-stat">
      <div className="player-overview-stat-value">{props.value}</div>
      <div className="player-overview-stat-label">{props.label}</div>
    </div>
  );
}

function MiniStat(props: { label: string; value: number }): ReactElement {
  return (
    <div className="player-overview-mini-stat">
      <span className="player-overview-mini-stat-value">{props.value}</span>
      <span className="player-overview-mini-stat-label">{props.label}</span>
    </div>
  );
}