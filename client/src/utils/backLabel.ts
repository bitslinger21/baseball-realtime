const NAV_ROUTES = new Set(["/", "/teams", "/leaders", "/standings", "/settings"]);

// The contextual return renders only when the previous screen was a specific
// instance (a game/team/player) — never when it was a nav destination, since
// a nav item already names that place (PROMPT_header_nav_horizontal.md §3).
// fromLabel wins when set — callers navigating from a specific context (e.g. a
// game page) should pass fromLabel: "Astros @ Cubs" so the return reflects the
// actual origin instead of the generic per-route-type label.
export function getReturnLabel(from: string | undefined, fromLabel?: string): string | null {
  if (fromLabel) return fromLabel;
  if (!from || NAV_ROUTES.has(from)) return null;
  if (from.startsWith("/game/")) return "Game";
  if (from.startsWith("/player/")) return "Player";
  if (from.startsWith("/team/") && from.endsWith("/schedule")) return "Schedule";
  if (from.startsWith("/team/")) return "Team";
  return null;
}
