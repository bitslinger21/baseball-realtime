import './Headshot.css';
import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';

interface HeadshotProps {
  mlbId: number | null;
  initials: string;
  teamColor: string;
  size: number;
  ratio?: number;
  actionPhoto?: boolean;
}

type PhotoState = 'action' | 'headshot' | 'initials';

function actionUrl(mlbId: number, size: number, ratio: number): string {
  const w = Math.round(size * 2);
  const h = Math.round(w * ratio);
  // c_fill,g_auto crops to the exact frame ratio server-side — no letterboxing in the browser
  // No d_ fallback — 404s cleanly when no action photo exists
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_${w},h_${h},c_fill,g_auto,q_auto:best/v1/people/${mlbId}/action/hero/current`;
}

function headshotUrl(mlbId: number, size: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_${Math.round(size * 2)},q_auto:best/v1/people/${mlbId}/headshot/67/current`;
}

export function Headshot({ mlbId, initials, teamColor, size, ratio = 1.40, actionPhoto = false }: HeadshotProps): ReactElement {
  const [photo, setPhoto] = useState<PhotoState>(actionPhoto ? 'action' : 'headshot');
  const boxH = Math.round(size * ratio);

  useEffect(() => { setPhoto(actionPhoto ? 'action' : 'headshot'); }, [mlbId, actionPhoto]);

  const hasId = mlbId != null && mlbId > 0;
  const src = !hasId || photo === 'initials'
    ? null
    : photo === 'action'
      ? actionUrl(mlbId!, size, ratio)
      : headshotUrl(mlbId!, size);

  function handleError() {
    setPhoto(prev => prev === 'action' ? 'headshot' : 'initials');
  }

  return (
    <div className="hs" style={{ width: size, height: boxH }}>
      <div className="hs__stripe" style={{ background: teamColor }} />
      {src != null ? (
        <img
          key={src}
          src={src}
          alt={initials}
          onError={handleError}
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
