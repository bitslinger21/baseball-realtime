const LABEL_MAP: Record<string, string> = {
  "/": "Today's games",
  "/leaders": "Leaders",
  "/standings": "Standings",
};

// fromLabel wins when set — callers navigating from a specific context (e.g. a game page)
// should pass fromLabel: "Astros @ Cubs" so the back item reflects the actual origin.
export function getBackLabel(from: string | undefined, fromLabel?: string): string {
  if (fromLabel) return fromLabel;
  if (!from) return "Today's games";
  if (from.startsWith("/game/")) return "Game";
  if (from.startsWith("/player/")) return "Player";
  return LABEL_MAP[from] ?? "Today's games";
}
