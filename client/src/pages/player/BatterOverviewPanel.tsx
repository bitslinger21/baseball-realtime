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
    accent: string;
  }): ReactElement {
  const { overview, accent } = props;

  return (
    <div className="player-overview">
      <div className="player-overview-headline">
        <Stat label="Batting Average" value={overview.headline.battingAverage} accent={accent} />
        <Stat label="On-Base %" value={overview.headline.onBasePercentage} accent={accent} />
        <Stat label="Slugging %" value={overview.headline.sluggingPercentage} accent={accent} />
        <Stat label="OPS" value={overview.headline.onBasePlusSlugging} accent={accent} />
        <Stat label="Home Runs" value={String(overview.headline.homeRuns)} accent={accent} />
        <Stat label="Runs Batted In" value={String(overview.headline.runsBattedIn)} accent={accent} />
      </div>

      <div className="player-overview-secondary">
        <MiniStat label="Games" value={overview.secondary.games} accent={accent} />
        <MiniStat label="At-Bats" value={overview.secondary.atBats} accent={accent} />
        <MiniStat label="Runs" value={overview.secondary.runs} accent={accent} />
        <MiniStat label="Hits" value={overview.secondary.hits} accent={accent} />
        <MiniStat label="Doubles" value={overview.secondary.doubles} accent={accent} />
        <MiniStat label="Triples" value={overview.secondary.triples} accent={accent} />
        <MiniStat label="Walks" value={overview.secondary.walks} accent={accent} />
        <MiniStat label="Strikeouts" value={overview.secondary.strikeouts} accent={accent} />
        <MiniStat label="Stolen Bases" value={overview.secondary.stolenBases} accent={accent} />
      </div>

      <div className="player-overview-today">
        <h3 className="player-overview-section-title">
          {overview.today?.label ?? "Today"}
          {overview.today?.opponent != null && (
            <span className="player-overview-today-opponent"> vs {overview.today.opponent}</span>
          )}
          {overview.today?.isLive === true && (
            <span className="player-overview-live-badge">LIVE</span>
          )}
        </h3>
        {overview.today != null && overview.today.atBats != null ? (
          <div className="player-overview-today-stats">
            <TodayStat label="H/AB" value={`${overview.today.hits ?? 0}/${overview.today.atBats}`} accent={accent} />
            <TodayStat label="HR" value={String(overview.today.homeRuns ?? 0)} accent={accent} />
            <TodayStat label="RBI" value={String(overview.today.rbi ?? 0)} accent={accent} />
            <TodayStat label="BB" value={String(overview.today.walks ?? 0)} accent={accent} />
            <TodayStat label="K" value={String(overview.today.strikeouts ?? 0)} accent={accent} />
            {overview.today.avg != null && (
              <TodayStat label="AVG" value={overview.today.avg} accent={accent} />
            )}
          </div>
        ) : (
          <div className="player-overview-today-line">
            {overview.today?.statLine ?? "No current game data."}
          </div>
        )}
      </div>
    </div>
    // headline: BatterOverviewHeadlineDto;
    // secondary: BatterOverviewSecondaryDto;
    // today: BatterOverviewTodayDto | null;
  )
}

function Stat(props: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#ffffff",
        overflow: "hidden",
        minWidth: 0,
        maxWidth: "124px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: props.accent,
          color: "#ffffff",
          fontSize: "0.76rem",
          fontWeight: 800,
          lineHeight: 1,
          padding: "0.38rem 0.5rem",
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
      >
        {props.label}
      </div>

      <div
        style={{
          minHeight: "2.15rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.18rem 0.35rem 0.2rem",
          color: props.accent,
          fontWeight: 900,
          fontSize: "1.05rem",
          lineHeight: 1,
          textAlign: "center",
          background: "#ffffff",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

function TodayStat(props: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#ffffff",
        overflow: "hidden",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: props.accent,
          color: "#ffffff",
          fontSize: "0.72rem",
          fontWeight: 800,
          lineHeight: 1,
          padding: "0.3rem 0.45rem",
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
      >
        {props.label}
      </div>
      <div
        style={{
          minHeight: "1.8rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.12rem 0.3rem",
          color: props.accent,
          fontWeight: 900,
          fontSize: "0.95rem",
          lineHeight: 1,
          textAlign: "center",
          background: "#ffffff",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#ffffff",
        overflow: "hidden",
        minWidth: 0,
        maxWidth: "124px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: props.accent,
          color: "#ffffff",
          fontSize: "0.74rem",
          fontWeight: 800,
          lineHeight: 1,
          padding: "0.36rem 0.5rem",
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
      >
        {props.label}
      </div>

      <div
        style={{
          minHeight: "1.95rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.14rem 0.35rem 0.16rem",
          color: props.accent,
          fontWeight: 900,
          fontSize: "0.98rem",
          lineHeight: 1,
          textAlign: "center",
          background: "#ffffff",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}
