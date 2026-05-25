import React from 'react';
import { Pill } from '../../components/primitives/Pill';
import './GameCardFinal.css';

interface TeamInfo {
  name: string;
  abbr: string;
  logoUrl: string | null;
  primaryColor: string;
  score: number | null;
}

interface GameCardFinalProps {
  away: TeamInfo;
  home: TeamInfo;
  venue: string | null;
  onEnter: () => void;
}

export function GameCardFinal({ away, home, venue, onEnter }: GameCardFinalProps) {
  const awayScore = away.score ?? 0;
  const homeScore = home.score ?? 0;
  const awayWon = awayScore > homeScore;

  const rows = [
    { team: away, score: awayScore, won: awayWon },
    { team: home, score: homeScore, won: !awayWon },
  ];

  return (
    <div className="gcf" onClick={onEnter} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEnter(); }}
    >
      <div className="gcf__header">
        <Pill tone="soft">FINAL</Pill>
        {venue && <span className="gcf__venue">{venue}</span>}
      </div>

      <div className="gcf__scores">
        {rows.map(({ team, score, won }, i) => (
          <div
            key={i}
            className={`gcf__score-row${won ? '' : ' gcf__score-row--loser'}`}
            style={{ borderLeft: `3px solid ${team.primaryColor}` }}
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.abbr} className="gcf__logo" loading="lazy" />
            ) : (
              <span className="gcf__logo-dot" style={{ background: team.primaryColor }}>{team.abbr.charAt(0)}</span>
            )}
            <span className="gcf__team-name">
              {team.name}
              {won && <span className="gcf__win-badge">W</span>}
            </span>
            <span className="gcf__score num">{score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
