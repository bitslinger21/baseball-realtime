import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import "./App.css";

// Pages inject their return button here instead of using the generic global Back.
interface TopbarReturnCtx { set: (node: ReactNode) => void; node: ReactNode }
export const TopbarReturnContext = createContext<TopbarReturnCtx>({ set: () => {}, node: null });
export function useTopbarReturn() { return useContext(TopbarReturnContext); }

export default function App(): ReactElement {
  const [returnNode, setReturnNode] = useState<ReactNode>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = (): void => setIsMenuOpen(false);

  return (
    <TopbarReturnContext.Provider value={{ set: setReturnNode, node: returnNode }}>
      <div className="app-shell" onMouseDown={(e) => {
        if (!menuRef.current?.contains(e.target as Node)) setIsMenuOpen(false);
      }}>
        <header className="app-topbar">
          <div className="app-topbar-left" ref={menuRef}>
            <button
              type="button"
              className="app-menu-button"
              aria-label="Open navigation menu"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={(): void => setIsMenuOpen((prev) => !prev)}
            >
              <span className="app-menu-button__bar" />
              <span className="app-menu-button__bar" />
              <span className="app-menu-button__bar" />
            </button>

            {isMenuOpen && (
              <nav className="app-menu" aria-label="Main navigation">
                <NavLink to="/" className={({ isActive }) => `app-menu__item${isActive ? " app-menu__item--active" : ""}`} onClick={closeMenu}>Daily Games</NavLink>
                <NavLink to="/standings" className={({ isActive }) => `app-menu__item${isActive ? " app-menu__item--active" : ""}`} onClick={closeMenu}>Standings</NavLink>
                <NavLink to="/leaders" className={({ isActive }) => `app-menu__item${isActive ? " app-menu__item--active" : ""}`} onClick={closeMenu}>Leaders</NavLink>
                <NavLink to="/settings" className={({ isActive }) => `app-menu__item${isActive ? " app-menu__item--active" : ""}`} onClick={closeMenu}>Settings</NavLink>
              </nav>
            )}
          </div>

          <div className="app-topbar-title">Baseball Realtime</div>

          <div className="app-topbar-right">
            {returnNode}
          </div>
        </header>

        <main className="app-main">
          <AppRoutes />
        </main>
      </div>
    </TopbarReturnContext.Provider>
  );
}
