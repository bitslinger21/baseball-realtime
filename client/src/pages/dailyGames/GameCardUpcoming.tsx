import { Pill } from '../../components/primitives/Pill';
import { BroadcastLine } from '../../components/primitives/BroadcastLine';
import './GameCardUpcoming.css';

interface TeamInfo {
  name: string;
  abbr: string;
  logoUrl: string | null;
  primaryColor: string;
}

interface GameCardUpcomingProps {
  away: TeamInfo;
  home: TeamInfo;
  startTime: string;
  venue: string | null;
  /** English TV networks, already picked + ordered by the API. */
  tvBroadcasts?: readonly string[];
  onEnter: () => void;
}

export function GameCardUpcoming({ away, home, startTime, venue, tvBroadcasts, onEnter }: GameCardUpcomingProps) {
  const rows = [away, home];

  return (
    <div className="gcu" onClick={onEnter} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEnter(); }}
    >
      <div className="gcu__header">
        <Pill tone="info">UPCOMING</Pill>
        {/* Time, then the TV line under it, right-aligned and clamped to 2 lines. */}
        <div className="gcu__when">
          <span className="gcu__time num">{startTime}</span>
          <BroadcastLine names={tvBroadcasts} lines={2} align="end" />
        </div>
      </div>

      <div className="gcu__teams">
        {rows.map((team, i) => (
          <div
            key={i}
            className="gcu__team-row"
            style={{ borderLeft: `4px solid ${team.primaryColor}` }}
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.abbr} className="gcu__logo" loading="lazy" />
            ) : (
              <span className="gcu__logo-dot" style={{ background: team.primaryColor }}>{team.abbr.charAt(0)}</span>
            )}
            <span className="gcu__team-name">{team.name}</span>
          </div>
        ))}
      </div>

      <div className="gcu__footer">
        {venue && <span className="gcu__venue">{venue}</span>}
        <span className="gcu__enter">Enter game →</span>
      </div>
    </div>
  );
}
