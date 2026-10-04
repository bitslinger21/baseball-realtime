import type { ReactElement } from "react";
import { TEAMS } from "../../utils/teams";
import { TeamDot } from "../primitives/TeamDot";
import type { AlertProg, AlertWire } from "./alertTypes";

// Shared pieces of the bell, tray and pop-up — direction C of
// holistic/alerts.jsx (AlGame, AlX, AlBellGlyph, AlProg), ported verbatim.

export function AlertGame({ a, live }: { a: AlertWire; live?: boolean }): ReactElement {
  const away = TEAMS[a.away];
  const home = TEAMS[a.home];
  return (
    <span className="al-game">
      {away != null && <TeamDot team={away} size={14} />}
      <span className="al-game__score num">
        {a.away} {a.score[0]} – {a.score[1]} {a.home}
      </span>
      {home != null && <TeamDot team={home} size={14} />}
      <span className={`al-game__half num${live ? " al-game__half--live" : ""}`}>
        {live ? "● " : ""}
        {a.half}
      </span>
    </span>
  );
}

export function AlertX({ onClick }: { onClick: () => void }): ReactElement {
  return (
    <button type="button" className="al-x" onClick={onClick} aria-label="Dismiss">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function BellGlyph(): ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M9 2.2a4.6 4.6 0 0 0-4.6 4.6v2.7L3 12.4h12l-1.4-2.9V6.8A4.6 4.6 0 0 0 9 2.2z" />
      <path d="M7.2 14.6a1.9 1.9 0 0 0 3.6 0" />
    </svg>
  );
}

// The progress picture: nine innings, the cycle's four slots, or a count.
export function AlertProgress({ p, big }: { p: AlertProg | null; big?: boolean }): ReactElement | null {
  if (p == null) return null;
  if (p.type === "innings") {
    return (
      <div className="al-prog al-prog--innings">
        <div className="al-prog__squares">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={`al-prog__sq${big ? " al-prog__sq--big" : ""}${i < p.done ? " al-prog__sq--done" : ""}`} />
          ))}
        </div>
        <span className="al-prog__togo num">{Math.max(0, 9 - p.done)} to go</span>
      </div>
    );
  }
  if (p.type === "cycle") {
    return (
      <div className="al-prog al-prog--cycle">
        {["1B", "2B", "3B", "HR"].map((k) => (
          <span key={k} className={`al-prog__slot num${big ? " al-prog__slot--big" : ""}${p.have.includes(k) ? " al-prog__slot--has" : ""}`}>
            {k}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="al-prog al-prog--count">
      <span className="al-prog__from num">{p.from}</span>
      <span className="al-prog__arrow">→</span>
      <span className="al-prog__to num">{p.to}</span>
      <span className="al-prog__unit">{p.unit}</span>
    </div>
  );
}
