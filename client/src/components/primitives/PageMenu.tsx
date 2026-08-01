import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./PageMenu.css";

interface PageMenuProps {
  backLabel?: string;
  onBack?: () => void;
  showBack?: boolean;
}

export function PageMenu({ backLabel, onBack, showBack = true }: PageMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="page-menu" ref={ref}>
      <button
        type="button"
        className={`page-menu__trigger${open ? " page-menu__trigger--open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Navigation menu"
        aria-expanded={open}
      >
        ☰
      </button>
      {open && (
        <nav className="page-menu__dropdown" aria-label="Main navigation">
          {showBack && backLabel && onBack && (
            <>
              <button
                type="button"
                className="page-menu__back"
                onClick={() => {
                  onBack();
                  setOpen(false);
                }}
              >
                <span className="page-menu__back-arrow">←</span>
                {backLabel}
              </button>
              <div className="page-menu__divider" />
            </>
          )}
          <NavLink
            to="/"
            state={{ from: location.pathname }}
            className={({ isActive }) =>
              `page-menu__item${isActive ? " page-menu__item--active" : ""}`
            }
            onClick={() => setOpen(false)}
          >
            <span className="page-menu__item-icon">📅</span>
            Today's games
          </NavLink>
          <NavLink
            to="/standings"
            state={{ from: location.pathname }}
            className={({ isActive }) =>
              `page-menu__item${isActive ? " page-menu__item--active" : ""}`
            }
            onClick={() => setOpen(false)}
          >
            <span className="page-menu__item-icon">📊</span>
            Standings
          </NavLink>
          <NavLink
            to="/leaders"
            state={{ from: location.pathname }}
            className={({ isActive }) =>
              `page-menu__item${isActive ? " page-menu__item--active" : ""}`
            }
            onClick={() => setOpen(false)}
          >
            <span className="page-menu__item-icon">🏆</span>
            Leaders
          </NavLink>
        </nav>
      )}
    </div>
  );
}
