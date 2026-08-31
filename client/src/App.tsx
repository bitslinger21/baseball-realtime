import type { ReactElement } from "react";
import AppRoutes from "./AppRoutes";
import "./App.css";

export default function App(): ReactElement {
  return (
    <div className="app-shell">
      <main className="app-main">
        <AppRoutes />
      </main>
    </div>
  );
}
