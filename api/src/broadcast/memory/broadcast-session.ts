import type { BroadcastEventType } from '../types/broadcast-event.types';

export interface BroadcastSession {
  gameId: string;
  startedAt: string;
  sequence: number;
  recentNarrations: { eventType: BroadcastEventType; text: string; ts: string }[];
  mentionedPlayerIds: Set<string>;
  scoreLastStated: string | null;
  atBatNarrationCount: number;
}
