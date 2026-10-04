import { createContext, useContext } from "react";
import type { AlertWire } from "./alertTypes";

// What the bell reads from AlertsProvider.
export interface AlertsCtx {
  tray: AlertWire[]; // landed, newest first
  liveCount: number;
  pulse: number; // bumps on every landing
  act: (a: AlertWire) => void;
}

export const AlertsContext = createContext<AlertsCtx | null>(null);

export function useAlerts(): AlertsCtx | null {
  return useContext(AlertsContext);
}
