import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import "./App.css";

export default function App(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();

  const showGlobalBack =
    location.pathname !== "/";

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect((): (() => void) => {
    const onDocumentClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);

    return (): void => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const closeMenu = (): void => {
    setIsMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-left" ref={menuRef}>
          <button
            type="button"
            className="app-menu-button"
            aria-label="Open navigation menu"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={(): void => setIsMenuOpen((prev: boolean): boolean => !prev)}
          >
            <span className="app-menu-button__bar" />
            <span className="app-menu-button__bar" />
            <span className="app-menu-button__bar" />
          </button>

          {isMenuOpen && (
            <nav className="app-menu" aria-label="Main navigation">
              <NavLink
                to="/"
                className={({ isActive }): string =>
                  `app-menu__item ${isActive ? "app-menu__item--active" : ""}`
                }
                onClick={closeMenu}
              >
                Daily Games
              </NavLink>

              <NavLink
                to="/standings"
                className={({ isActive }): string =>
                  `app-menu__item ${isActive ? "app-menu__item--active" : ""}`
                }
                onClick={closeMenu}
              >
                Standings
              </NavLink>

              <NavLink
                to="/settings"
                className={({ isActive }): string =>
                  `app-menu__item ${isActive ? "app-menu__item--active" : ""}`
                }
                onClick={closeMenu}
              >
                Settings
              </NavLink>
            </nav>
          )}
        </div>

        <div className="app-topbar-title">Baseball Realtime</div>

        <div className="app-topbar-right">
          {showGlobalBack && (
            <button
              type="button"
              className="app-back-button"
              onClick={(): void => {
                navigate(-1);
              }}
            >
              ← Back
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        <AppRoutes />
      </main>
    </div>
  );
}