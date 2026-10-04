import type { ReactElement } from "react";
import AppRoutes from "./AppRoutes";
import { AlertsProvider } from "./components/alerts/AlertsProvider";
import "./App.css";

export default function App(): ReactElement {
  return (
    <AlertsProvider>
      <div className="app-shell">
        <main className="app-main">
          <AppRoutes />
        </main>
      </div>
    </AlertsProvider>
  );
}
