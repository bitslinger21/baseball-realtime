import type { ReactNode } from "react";
import "./AppHeader.css";

interface AppHeaderProps {
  left?: ReactNode;
  right?: ReactNode;
}

export function AppHeader({ left, right }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__left">{left}</div>
      <div className="app-header__right">{right}</div>
    </header>
  );
}
