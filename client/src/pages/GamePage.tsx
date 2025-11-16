import type { ReactElement } from "react";
import { useParams } from "react-router-dom";

export function GamePage(): ReactElement {
  const { providerGameId } = useParams();
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Game {providerGameId}</h1>
      <p>Coming soon: Live / Completed / Pending views.</p>
    </div>
  );
}
