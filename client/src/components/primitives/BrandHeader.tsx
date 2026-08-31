import type { ReactElement } from "react";
import { useState } from "react";
import { LogoLockup } from "../LogoLockup";
import { NavDrawer, type NavDrawerActive } from "./NavDrawer";
import { SearchField } from "./SearchField";
import "./BrandHeader.css";

interface BrandHeaderProps {
  active?: NavDrawerActive;
  backLabel?: string;
  onBack?: () => void;
  /** Content column width to align with — 1240 (the app standard) unless the
   * page declares its own exception (the game view's 1600 column). */
  maxWidth?: number;
}

// Global header — line 1 of the common header pattern, identical on every route.
// Wordmark left (not clickable — no home button, by decision); contextual return
// + hamburger right. The hamburger opens the nav drawer, owned here so every page
// gets it with a single mount instead of managing drawer state itself.
// The hairline border sits on this OUTER element so it spans the full viewport;
// only the inner content aligns to the page's content column.
export function BrandHeader({ active, backLabel, onBack, maxWidth = 1240 }: BrandHeaderProps): ReactElement {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      <header className="brand-header">
        <div className="brand-header__inner" style={{ maxWidth }}>
          <span className="brand-header__wordmark" aria-label="Scorebook">
            <LogoLockup variant="allcaps" />
          </span>
          <div className="brand-header__right">
            {backLabel && onBack && (
              <button type="button" className="brand-header__back" onClick={onBack}>
                <span className="brand-header__back-arrow">←</span>
                {backLabel}
              </button>
            )}
            <SearchField onNavigate={() => setNavOpen(false)} />
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
