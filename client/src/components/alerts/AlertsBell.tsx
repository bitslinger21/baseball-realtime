import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { TEAMS } from "../../utils/teams";
import { Headshot } from "../primitives/Headshot";
import { AlertGame, AlertProgress, BellGlyph } from "./AlertParts";
import { alertAction, alertTime, type AlertWire } from "./alertTypes";
import { useAlerts } from "./alertsContext";

// The header bell (AlBell, direction C) + its tray (TrayC). The bell says how
// many stories are live ("3 live"), not an unread count; the tray opens only
// on a click, and Esc or an outside click closes it.
export function AlertsBell(): ReactElement | null {
  const ctx = useAlerts();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pulse = ctx?.pulse ?? 0;

  // One pulse per landing: a rust ring, two cycles of 0.9s.
  useEffect(() => {
    if (pulse === 0 || btnRef.current == null) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    btnRef.current.animate(
      [
        { boxShadow: "0 0 0 0 rgba(184,66,30,0)" },
        { boxShadow: "0 0 0 6px rgba(184,66,30,.22)", offset: 0.4 },
        { boxShadow: "0 0 0 0 rgba(184,66,30,0)" },
      ],
      { duration: 900, iterations: 2, easing: "ease" },
    );
  }, [pulse]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent): void => {
      if (wrapRef.current != null && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (ctx == null) return null;
  const { tray, liveCount, act } = ctx;
  const now = tray.filter((a) => a.live);
  const earlier = tray.filter((a) => !a.live);
  const go = (a: AlertWire): void => {
    setOpen(false);
    act(a);
  };

  return (
    <div className="al-bell-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`al-bell${open ? " al-bell--open" : ""}${liveCount > 0 ? " al-bell--live" : ""}`}
        aria-label={`Alerts, ${liveCount} live`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <BellGlyph />
        {liveCount > 0 && <span className="al-bell__count num">{liveCount} live</span>}
      </button>
      {open && (
        <div className="al-tray" role="dialog" aria-label="Alerts">
          <div className="al-tray__head">
            <span className="al-tray__title">Live stories</span>
            <span className="al-tray__n num">{now.length}</span>
          </div>
          <div className="al-tray__live">
            {now.length === 0 ? (
              <div className="al-tray__empty">Nothing in progress right now.</div>
            ) : (
              now.map((a) => <AlertCard key={a.id} a={a} onGo={go} />)
            )}
          </div>
          {earlier.length > 0 && (
            <>
              <div className="al-tray__earlier-head al-eyebrow">Earlier tonight</div>
              <div className="al-tray__earlier">
                {earlier.map((a) => (
                  <div key={a.id} className="al-row" role="link" tabIndex={0} onClick={() => go(a)} onKeyDown={onEnter(() => go(a))}>
                    <span className="al-row__time num">{alertTime(a.at)}</span>
                    <span className="al-row__text">
                      <b>{a.playerShort}</b> {a.title}
                    </span>
                    <span className="al-link">{alertAction(a)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// CardC: one live story with its progress picture.
function AlertCard({ a, onGo }: { a: AlertWire; onGo: (a: AlertWire) => void }): ReactElement {
  return (
    <div className={`al-card${a.live ? " al-card--live" : ""}`} role="link" tabIndex={0} onClick={() => onGo(a)} onKeyDown={onEnter(() => onGo(a))}>
      <Headshot mlbId={a.playerId} initials={a.playerShort.slice(0, 2)} teamColor={TEAMS[a.teamAbbr]?.primary ?? "#888"} size={44} ratio={1.2} />
      <div className="al-card__main">
        <div className="al-card__top">
          <span className="al-eyebrow al-eyebrow--accent">{a.kind}</span>
          <span className="al-card__time num">{alertTime(a.at)}</span>
        </div>
        <div className="al-card__text">
          <b>{a.playerShort}</b> {a.title} <span className="al-card__sub">· {a.sub}</span>
        </div>
        <AlertProgress p={a.prog} />
        <div className="al-card__foot">
          <AlertGame a={a} live={a.live} />
          <span className="al-link al-card__link">{alertAction(a)}</span>
        </div>
      </div>
    </div>
  );
}

function onEnter(fn: () => void): (e: KeyboardEvent) => void {
  return (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}
