import './PlayerThumb.css';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

interface PlayerThumbProps {
  mlbId: number | null;
  className: string;
}

// Small rounded MLB headshot with a graceful fallback to an empty tinted box
// on load failure or a missing id — used anywhere a compact player photo is
// needed (pitcher matchup blocks, injury rows), not the full player-page
// portrait crop (see Headshot.tsx for that).
export function PlayerThumb({ mlbId, className }: PlayerThumbProps): ReactElement {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [mlbId]);

  if (mlbId == null || failed) {
    return <div className={`${className} player-thumb--empty`} />;
  }
  return (
    <img
      className={className}
      src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_60,q_auto:best/v1/people/${mlbId}/headshot/67/current`}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
