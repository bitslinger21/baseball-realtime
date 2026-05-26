import type { ReactElement } from "react";
import type { GameViewDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../../realtime/types";
import { Inning } from "../../components/primitives/Inning";
import { Bases } from "../../components/primitives/Bases";
import { Pips } from "../../components/primitives/Pips";
import "./ScoreboardStrip.css";

interface ScoreboardStripProps {
  game: GameViewDto;
  latest: PlayUpdate | null;
}

export function ScoreboardStrip({ game, latest }: ScoreboardStripProps): ReactElement {
  const awayScore = latest?.awayScore ?? (game.awayScore as number | null) ?? 0;
  const homeScore = latest?.homeScore ?? (game.homeScore as number | null) ?? 0;
  const isLive = latest != null;

  return (
    <div className="scoreboard-strip">
      <div className="scoreboard-strip__team">
        <div className="scoreboard-strip__mark">{game.awayAbbr}</div>
        <div>
          <div className="scoreboard-strip__side-label">Away</div>
          <div className="scoreboard-strip__score-row">
            <span className="scoreboard-strip__score num">{awayScore}</span>
            <span className="scoreboard-strip__team-name">{game.awayName}</span>
          </div>
        </div>
      </div>

      <div className="scoreboard-strip__center">
        {isLive && (
          <div className="scoreboard-strip__live">
            <span className="scoreboard-strip__live-dot" />
            <span className="scoreboard-strip__live-label">Live</span>
          </div>
        )}
        {latest != null ? (
          <>
            <Inning half={latest.half} num={latest.inning} size={18} color="#fff" />
            <Bases
              on={[latest.bases.on1, latest.bases.on2, latest.bases.on3]}
              size={34}
              fill="#fff"
              empty="#3f3f46"
            />
            <div className="scoreboard-strip__bso">
              {(
                [
                  { label: "B", count: latest.balls, total: 3 },
                  { label: "S", count: latest.strikes, total: 2 },
                  { label: "O", count: latest.outs, total: 2 },
                ] as const
              ).map(({ label, count, total }) => (
                <div key={label} className="scoreboard-strip__bso-item">
                  <span className="scoreboard-strip__bso-label">{label}</span>
                  <Pips count={count} total={total} size={7} gap={3} color="#fff" emptyColor="#3f3f46" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <span className="scoreboard-strip__vs">vs</span>
        )}
      </div>

      <div className="scoreboard-strip__team scoreboard-strip__team--home">
        <div className="scoreboard-strip__team-right">
          <div className="scoreboard-strip__side-label">Home</div>
          <div className="scoreboard-strip__score-row scoreboard-strip__score-row--right">
            <span className="scoreboard-strip__team-name">{game.homeName}</span>
            <span className="scoreboard-strip__score num">{homeScore}</span>
          </div>
        </div>
        <div className="scoreboard-strip__mark">{game.homeAbbr}</div>
      </div>
    </div>
  );
}
