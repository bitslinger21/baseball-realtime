import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import AppRoutes from "./AppRoutes";
import "./App.css";

// No-op context — kept for LeadersPage/PlayerPage imports until those pages migrate to PageMenu.
interface TopbarReturnCtx { set: (node: ReactNode) => void; node: ReactNode }
export const TopbarReturnContext = createContext<TopbarReturnCtx>({ set: () => { }, node: null });
export function useTopbarReturn() { return useContext(TopbarReturnContext); }

export default function App(): ReactElement {
  const [returnNode, setReturnNode] = useState<ReactNode>(null);

  return (
    <TopbarReturnContext.Provider value={{ set: setReturnNode, node: returnNode }}>
      <div className="app-shell">
        <main className="app-main">
          <AppRoutes />
        </main>
      </div>
    </TopbarReturnContext.Provider>
  );
}
