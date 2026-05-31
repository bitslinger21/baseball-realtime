import type { ReactElement } from "react";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import "./LineScoreBand.css";

interface ScoringPlay {
  inning: number;
  half: "top" | "bottom";
  description: string;
}

interface Leader {
  abbr: string;
  name: string;
  ab: number;
  h: number;
  rbi: number;
}

function deriveScoringPlays(updates: readonly PlayUpdate[]): ScoringPlay[] {
  const plays: ScoringPlay[] = [];
  for (let i = 1; i < updates.length; i++) {
    const prev = updates[i - 1];
    const cur = updates[i];
    if (
      cur.description != null &&
      (cur.homeScore !== prev.homeScore || cur.awayScore !== prev.awayScore)
    ) {
      plays.push({ inning: cur.inning, half: cur.half, description: cur.description });
    }
  }
  return plays;
}

function deriveLeaders(
  updates: readonly PlayUpdate[],
  awayAbbr: string,
  homeAbbr: string,
): { away: Leader | null; home: Leader | null } {
  const map = new Map<number, { name: string; ab: number; h: number; rbi: number; isHome: boolean }>();
  for (const u of updates) {
    if (u.batterId == null) continue;
    map.set(u.batterId, {
      name: u.batterName ?? "",
      ab: u.batterGameAB ?? 0,
      h: u.batterGameH ?? 0,
      rbi: u.batterGameRBI ?? 0,
      isHome: u.half === "bottom",
    });
  }

  let away: Leader | null = null;
  let home: Leader | null = null;
  for (const [, b] of map) {
    if (b.h === 0) continue;
    if (b.isHome) {
      if (home == null || b.h > home.h) home = { abbr: homeAbbr, name: b.name, ab: b.ab, h: b.h, rbi: b.rbi };
    } else {
      if (away == null || b.h > away.h) away = { abbr: awayAbbr, name: b.name, ab: b.ab, h: b.h, rbi: b.rbi };
    }
  }
  return { away, home };
}

function innLabel(half: "top" | "bottom", inning: number): string {
  return `${half === "top" ? "▲" : "▼"}${inning}`;
}

interface LineScoreBandProps {
  game: GameViewDto;
  latest: PlayUpdate | null;
  allUpdates: readonly PlayUpdate[];
}

export function LineScoreBand({ game, latest, allUpdates }: LineScoreBandProps): ReactElement {
  const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const curInning = latest?.inning ?? null;

  const awayRhe = latest?.linescore?.away ?? null;
  const homeRhe = latest?.linescore?.home ?? null;
  const awayR = awayRhe?.runs ?? latest?.awayScore ?? 0;
  const homeR = homeRhe?.runs ?? latest?.homeScore ?? 0;
  const awayH = awayRhe?.hits ?? 0;
  const homeH = homeRhe?.hits ?? 0;
  const awayE = awayRhe?.errors ?? 0;
  const homeE = homeRhe?.errors ?? 0;

  const scoringPlays = deriveScoringPlays(allUpdates);
  const visibleScoring = scoringPlays.slice(-3);
  const hiddenCount = Math.max(0, scoringPlays.length - 3);

  const { away: awayLeader, home: homeLeader } = deriveLeaders(allUpdates, game.awayAbbr, game.homeAbbr);
  const leaders = [awayLeader, homeLeader].filter(Boolean) as Leader[];

  const isLive = latest != null;

  return (
    <div className="lsb">
      {/* Zone 1 — line score */}
      <div className="lsb__zone lsb__zone--first">
        <div className="lsb__header">
          <div className="lsb__team-col">
            {isLive ? (
              <>
                <span className="lsb__live-dot" />
                <span className="lsb__live-label">
                  {latest != null
                    ? `Live · ${latest.half === "top" ? "▲" : "▼"}${latest.inning}`
                    : "Live"}
                </span>
              </>
            ) : (
              <span className="lsb__live-label" style={{ color: "#71717a" }}>Final</span>
            )}
          </div>
          <div className="lsb__innings">
            {INNINGS.map((i) => (
              <div
                key={i}
                className={`lsb__inn-cell lsb__inn-cell--header${i === curInning ? " lsb__inn-cell--current-header" : ""}`}
              >
                {i}
              </div>
            ))}
          </div>
          <div className="lsb__rhe">
            {["R", "H", "E"].map((x) => (
              <div key={x} className="lsb__rhe-cell lsb__rhe-cell--header">{x}</div>
            ))}
          </div>
        </div>

        {/* Away row */}
        <ScoreRow
          abbr={game.awayAbbr}
          name={game.awayName}
          r={awayR}
          h={awayH}
          e={awayE}
          curInning={curInning}
          bold={awayR > homeR}
        />
        <div className="lsb__divider" />
        {/* Home row */}
        <ScoreRow
          abbr={game.homeAbbr}
          name={game.homeName}
          r={homeR}
          h={homeH}
          e={homeE}
          curInning={curInning}
          bold={homeR > awayR}
        />
      </div>

      {/* Zone 2 — scoring summary */}
      <div className="lsb__zone">
        <div className="lsb__eyebrow">Scoring summary</div>
        {visibleScoring.length === 0 && (
          <div className="lsb__scoring-desc" style={{ color: "#52525b", fontSize: 11 }}>
            No scoring plays yet
          </div>
        )}
        {visibleScoring.map((s, i) => (
          <div key={i} className="lsb__scoring-row">
            <span className="lsb__scoring-inn">{innLabel(s.half, s.inning)}</span>
            <span className="lsb__scoring-desc">{s.description}</span>
          </div>
        ))}
        {hiddenCount > 0 && (
          <button className="lsb__more-btn" type="button">
            +{hiddenCount} more scoring {hiddenCount === 1 ? "play" : "plays"} →
          </button>
        )}
      </div>

      {/* Zone 3 — game leaders */}
      <div className="lsb__zone">
        <div className="lsb__eyebrow">Game leaders</div>
        {leaders.length === 0 && (
          <div className="lsb__scoring-desc" style={{ color: "#52525b", fontSize: 11 }}>
            No hits yet
          </div>
        )}
        {leaders.map((l) => (
          <div key={l.abbr} className="lsb__leader">
            <div className="lsb__leader-mark" style={{ background: "#334155" }}>
              {l.abbr}
            </div>
            <div>
              <div className="lsb__leader-name">{l.name}</div>
              <div className="lsb__leader-line">
                {l.h}-for-{l.ab}
                {l.rbi > 0 ? ` · ${l.rbi} RBI` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ScoreRowProps {
  abbr: string;
  name: string;
  r: number;
  h: number;
  e: number;
  curInning: number | null;
  bold: boolean;
}

function ScoreRow({ abbr, name, r, h, e, curInning, bold }: ScoreRowProps): ReactElement {
  const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return (
    <div className="lsb__header">
      <div className="lsb__team-col">
        <div className="lsb__team-mark" style={{ background: "#334155" }}>{abbr}</div>
        <span className={`lsb__team-name${bold ? " lsb__team-name--bold" : ""}`}>{name}</span>
      </div>
      <div className="lsb__innings">
        {INNINGS.map((i) => (
          <div
            key={i}
            className={`lsb__inn-cell lsb__inn-cell--null${i === curInning ? " lsb__inn-cell--current-bg" : ""}`}
          >
            –
          </div>
        ))}
      </div>
      <div className="lsb__rhe">
        <div className="lsb__rhe-cell lsb__rhe-cell--accent">{r}</div>
        <div className="lsb__rhe-cell lsb__rhe-cell--dim">{h}</div>
        <div className="lsb__rhe-cell lsb__rhe-cell--dim">{e}</div>
      </div>
    </div>
  );
}
