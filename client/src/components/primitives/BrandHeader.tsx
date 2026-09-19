import type { ReactElement } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { LogoLockup } from "../LogoLockup";
import { NavDrawer, type NavDrawerActive } from "./NavDrawer";
import { SearchField } from "./SearchField";
import "./BrandHeader.css";

interface BrandHeaderProps {
  active?: NavDrawerActive;
  /** Content column width to align with — 1240 (the app standard) unless the
   * page declares its own exception (the game view's 1600 column). */
  maxWidth?: number;
}

// The five nav destinations, inline in the bar at desktop width. Settings is
// a utility (a gear icon, below), not a nav item — NavDrawer keeps its own
// six-item list (these five plus Settings) for the narrow-viewport hatch.
const NAV_ITEMS: { key: NavDrawerActive; to: string; label: string }[] = [
  { key: "home", to: "/", label: "Home" },
  { key: "games", to: "/games", label: "Games" },
  { key: "teams", to: "/teams", label: "Teams" },
  { key: "standings", to: "/standings", label: "Standings" },
  { key: "leaders", to: "/leaders", label: "Leaders" },
];

// Global header — line 1 of the common header pattern, identical on every route.
// Wordmark left (not clickable — no home button, by decision); horizontal nav +
// utilities (search, settings) right at desktop width. Below a breakpoint the
// nav and utilities give way to a hamburger opening NavDrawer — a plain CSS
// swap, not a per-page prop, so no route ever shows both.
// The hairline border sits on this OUTER element so it spans the full viewport;
// only the inner content aligns to the page's content column, and the active
// nav item's underline is drawn to land ON that hairline (margin-bottom:-1px).
export function BrandHeader({ active, maxWidth = 1240 }: BrandHeaderProps): ReactElement {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      <header className="brand-header">
        <div className="brand-header__inner" style={{ maxWidth }}>
          <span className="brand-header__wordmark" aria-label="Scorebook">
            <LogoLockup variant="allcaps" />
          </span>
          <div className="brand-header__right">
            <nav className="brand-header__nav" aria-label="Primary">
              {NAV_ITEMS.map((item) => {
                const isActive = item.key === active;
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    className={`brand-header__nav-item${isActive ? " brand-header__nav-item--active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="brand-header__utilities">
              <SearchField onNavigate={() => setNavOpen(false)} />
              <Link to="/settings" className="brand-header__settings" aria-label="Settings">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="9" r="2.5" />
                    <path d="M9 1.5v2M9 14.5v2M16.5 9h-2M3.5 9h-2M14.36 3.64l-1.41 1.41M5.05 12.95l-1.41 1.41M14.36 14.36l-1.41-1.41M5.05 5.05L3.64 3.64" />
                  </g>
                </svg>
              </Link>
            </div>
            <button
              type="button"
              className="brand-header__menu"
              aria-label="Navigation menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <svg width="21" height="16" viewBox="0 0 21 16" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                  <path d="M1.5 2h18" />
                  <path d="M1.5 8h18" />
                  <path d="M1.5 14h18" />
                </g>
              </svg>
            </button>
          </div>
        </div>
      </header>
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} active={active} />
    </>
  );
}
