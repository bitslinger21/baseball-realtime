import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./NavDrawer.css";

export type NavDrawerActive = "games" | "teams" | "standings" | "leaders" | "settings";

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  active?: NavDrawerActive;
}

const ITEMS: { key: NavDrawerActive; to: string; label: string; icon: string }[] = [
  { key: "games", to: "/", label: "Games", icon: "📅" },
  { key: "teams", to: "/teams", label: "Teams", icon: "⚾" },
  { key: "standings", to: "/standings", label: "Standings", icon: "📊" },
  { key: "leaders", to: "/leaders", label: "Leaders", icon: "🏆" },
  { key: "settings", to: "/settings", label: "Settings", icon: "⚙️" },
];

export function NavDrawer({ open, onClose, active }: NavDrawerProps): ReactElement | null {
  const [shown, setShown] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShown(true), 10);
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className={`nav-drawer__backdrop${shown ? " nav-drawer__backdrop--shown" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`nav-drawer${shown ? " nav-drawer--shown" : ""}`}
        role="dialog"
        aria-label="Main navigation"
      >
        <div className="nav-drawer__head">
          <span className="nav-drawer__eyebrow">Go to</span>
          <button
            type="button"
            className="nav-drawer__close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
        <nav className="nav-drawer__list">
          {ITEMS.map((it) => {
            const isActive = it.key === active;
            return (
              <NavLink
                key={it.key}
                to={it.to}
                state={{ from: location.pathname }}
                className={`nav-drawer__item${isActive ? " nav-drawer__item--active" : ""}`}
                onClick={onClose}
              >
                <span className="nav-drawer__item-rail" />
                <span className="nav-drawer__item-icon">{it.icon}</span>
                {it.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
}
