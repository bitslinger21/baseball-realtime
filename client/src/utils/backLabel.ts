const LABEL_MAP: Record<string, string> = {
  "/": "Games",
  "/teams": "Teams",
  "/leaders": "Leaders",
  "/standings": "Standings",
};

// fromLabel wins when set — callers navigating from a specific context (e.g. a game page)
// should pass fromLabel: "Astros @ Cubs" so the back item reflects the actual origin.
export function getBackLabel(from: string | undefined, fromLabel?: string): string {
  if (fromLabel) return fromLabel;
  if (!from) return "Games";
  if (from.startsWith("/game/")) return "Game";
  if (from.startsWith("/player/")) return "Player";
  if (from.startsWith("/team/") && from.endsWith("/schedule")) return "Schedule";
  if (from.startsWith("/team/")) return "Team";
  return LABEL_MAP[from] ?? "Games";
}
