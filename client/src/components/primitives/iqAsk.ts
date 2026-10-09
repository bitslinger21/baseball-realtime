import type { ConversationTurn, IqAnswer } from "./BaseballIQButton";

// What page a Baseball IQ question is asked from — the server grounds the
// page's subject in live data before answering (POST /api/iq/ask). The game
// view keeps its own moment-aware POST /api/iq/query.
export type IqScope =
  | { kind: "league" }
  | { kind: "standings" }
  | { kind: "leaders" }
  | { kind: "player"; id: string } // mlbId
  | { kind: "team"; id: string }; // abbreviation, e.g. "NYY"

export async function askIQ(scope: IqScope, question: string, history: ConversationTurn[]): Promise<IqAnswer | null> {
  try {
    const res = await fetch("/api/iq/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, scope, conversationHistory: history }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; headline: string; unit?: string; sub: string };
    return data.ok ? { headline: data.headline, unit: data.unit, sub: data.sub } : null;
  } catch {
    return null;
  }
}
