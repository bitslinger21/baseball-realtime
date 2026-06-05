import React from 'react';
import { LivePill } from '../../components/primitives/Pill';
import './GameCardLive.css';

interface TeamInfo {
  name: string;
  abbr: string;
  logoUrl: string | null;
  primaryColor: string;
  score: number | null;
}

interface GameCardLiveProps {
  away: TeamInfo;
  home: TeamInfo;
  gameState: string;
  isTopInning: boolean | null;
  inning: number | null;
  onEnter: () => void;
}

export function GameCardLive({ away, home, gameState, isTopInning, inning, onEnter }: GameCardLiveProps) {
  const rows = [
    { team: away, isBatting: isTopInning === true },
    { team: home, isBatting: isTopInning === false },
  ];

  return (
    <div className="gcl" onClick={onEnter} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEnter(); }}
    >
      <div className="gcl__header">
        <LivePill />
        {inning != null ? (
          <span className="gcl__inning">
            <span className="gcl__inning-caret">{isTopInning === false ? "▼" : "▲"}</span>
            <span className="gcl__inning-num">{inning}</span>
            {" "}
            <span className="gcl__inning-half">{isTopInning === false ? "Bottom" : "Top"}</span>
          </span>
        ) : (
          <span className="gcl__state">{gameState}</span>
        )}
      </div>

      <div className="gcl__scores">
        {rows.map(({ team, isBatting }, i) => (
          <div
            key={i}
            className={`gcl__score-row${isBatting ? ' gcl__score-row--batting' : ''}`}
            style={{ borderLeft: `3px solid ${team.primaryColor}` }}
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.abbr} className="gcl__logo" loading="lazy" />
            ) : (
              <span className="gcl__logo-dot" style={{ background: team.primaryColor }}>{team.abbr.charAt(0)}</span>
            )}
            <span className="gcl__team-name">
              {team.name}
              {isBatting && <span className="gcl__at-bat-badge">● AT BAT</span>}
            </span>
            <span className="gcl__score num">{team.score ?? '—'}</span>
          </div>
        ))}
      </div>

      <div className="gcl__cta">
        <span className="gcl__enter-label">Enter game →</span>
      </div>
    </div>
  );
}
