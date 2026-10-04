import type { ReactElement } from "react";
import { TEAMS } from "../../utils/teams";
import { Headshot } from "../primitives/Headshot";
import { AlertGame, AlertProgress, AlertX } from "./AlertParts";
import { alertAction, type AlertWire } from "./alertTypes";

// The pop-up (ToastC): bottom-right, 380px, the story as a picture, a 3px
// rust countdown along the bottom. Hover pauses; ✕ and Later land it.
export function AlertToast({
  a,
  life,
  leaving,
  onHover,
  onClose,
  onAct,
}: {
  a: AlertWire;
  life: number;
  leaving: boolean;
  onHover: (on: boolean) => void;
  onClose: () => void;
  onAct: () => void;
}): ReactElement {
  return (
    <div
      role="status"
      className={`al-toast${leaving ? " al-toast--leaving" : ""}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="al-toast__head">
        <span className="al-eyebrow al-eyebrow--accent">{a.kind}</span>
        <span className="al-toast__half num">● {a.half}</span>
        <span className="al-toast__x">
          <AlertX onClick={onClose} />
        </span>
      </div>
      <div className="al-toast__body">
        <Headshot mlbId={a.playerId} initials={a.playerShort.slice(0, 2)} teamColor={TEAMS[a.teamAbbr]?.primary ?? "#888"} size={52} ratio={1.2} />
        <div className="al-toast__main">
          <div className="al-toast__title">
            {a.playerShort} {a.title}
          </div>
          <AlertProgress p={a.prog} big />
          <div className="al-toast__sub">
            {a.sub} · <AlertGame a={a} />
          </div>
        </div>
      </div>
      <div className="al-toast__actions">
        <button type="button" className="al-toast__go" onClick={onAct}>
          {alertAction(a)}
        </button>
        <button type="button" className="al-toast__later" onClick={onClose}>
          Later
        </button>
      </div>
      <div className="al-toast__life">
        <div className="al-toast__life-fill" style={{ width: `${Math.max(0, life) * 100}%` }} />
      </div>
    </div>
  );
}
