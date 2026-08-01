import { useState } from 'react';
import type { ReactElement } from 'react';
import type { TeamInfo } from '../../utils/teams';

interface TeamDotProps {
  team: TeamInfo;
  size?: number;
  onDark?: boolean;
}

export function TeamDot({ team, size = 28, onDark = false }: TeamDotProps): ReactElement {
  const [failed, setFailed] = useState(false);
  const url = `https://www.mlbstatic.com/team-logos/${team.id}.svg`;

  if (!failed) {
    const img = (
      <img
        src={url}
        alt={team.abbr}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, display: 'block' }}
      />
    );
    if (!onDark) return img;
    return (
      <div style={{
        width: size * 1.22, height: size * 1.22, borderRadius: '50%',
        background: '#fff', display: 'grid', placeItems: 'center',
        flexShrink: 0, padding: size * 0.11,
      }}>{img}</div>
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: team.primary,
      color: '#fff',
      display: 'inline-grid',
      placeItems: 'center',
      fontFamily: 'var(--font-sans)',
      fontWeight: 800,
      fontSize: size * 0.36,
      letterSpacing: '0.02em',
      flexShrink: 0,
      boxShadow: `inset 0 0 0 2px ${team.secondary}40`,
    }}>
      {team.abbr.charAt(0)}
    </div>
  );
}
