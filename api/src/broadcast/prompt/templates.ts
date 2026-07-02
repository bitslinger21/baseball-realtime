import type { BroadcastContext } from '../types/broadcast-context.types';

export const PROMPT_VERSION = 'v1.0.0';

export function buildUserMessage(context: BroadcastContext): string {
  const { event, gameState, recentPlays, sessionMemory } = context;

  const runnersOn: string[] = [];
  if (gameState.bases.on1) runnersOn.push('first');
  if (gameState.bases.on2) runnersOn.push('second');
  if (gameState.bases.on3) runnersOn.push('third');
  const runners = runnersOn.length > 0 ? runnersOn.join(', ') : 'Bases empty';

  const inningOrdinal = ordinal(gameState.inning);
  const half = gameState.half === 'top' ? 'Top' : 'Bottom';

  const lastSaid =
    sessionMemory.recentNarrations.length > 0
      ? sessionMemory.recentNarrations[sessionMemory.recentNarrations.length - 1].text
      : 'Nothing yet';

  return [
    `Game: ${gameState.awayAbbr} vs. ${gameState.homeAbbr} — ${half} of the ${inningOrdinal}`,
    `Score: ${gameState.awayAbbr} ${gameState.awayScore}, ${gameState.homeAbbr} ${gameState.homeScore}`,
    `Outs: ${gameState.outs}`,
    `Runners: ${runners}`,
    `Count: ${gameState.balls}-${gameState.strikes}`,
    `At bat: ${gameState.batterName ?? 'Unknown'}`,
    `Pitching: ${gameState.pitcherName ?? 'Unknown'}`,
    `Event: ${event.description}`,
    `Recent plays: ${recentPlays.length > 0 ? recentPlays.join(', ') : 'None'}`,
    `Previously said: ${lastSaid}`,
  ].join('\n');
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
