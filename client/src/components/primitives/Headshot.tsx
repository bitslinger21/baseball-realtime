import './Headshot.css';
import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';

interface HeadshotProps {
  mlbId: number | null;
  initials: string;
  teamColor: string;
  size: number;
  ratio?: number;
}

export function Headshot({ mlbId, initials, teamColor, size, ratio = 1.28 }: HeadshotProps): ReactElement {
  const [failed, setFailed] = useState(false);
  const boxH = Math.round(size * ratio);

  useEffect(() => { setFailed(false); }, [mlbId]);

  const url = mlbId != null && mlbId > 0
    ? `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_${Math.round(size * 2)},q_auto:best/v1/people/${mlbId}/headshot/67/current`
    : null;

  return (
    <div className="hs" style={{ width: size, height: boxH }}>
      <div className="hs__stripe" style={{ background: teamColor }} />
      {url != null && !failed ? (
        <img
          src={url}
          alt={initials}
          onError={() => setFailed(true)}
          className="hs__img"
        />
      ) : (
        <div className="hs__initials" style={{ fontSize: size * 0.34 }}>
          {initials}
        </div>
      )}
    </div>
  );
}
