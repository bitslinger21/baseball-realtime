import type { BroadcastEvent, BroadcastEventType, BroadcastGameState } from './broadcast-event.types';

export interface SessionMemorySnapshot {
  recentNarrations: { eventType: BroadcastEventType; text: string; ts: string }[];
  mentionedPlayerIds: string[];
  scoreLastStated: string | null;
  atBatNarrationCount: number;
}

export interface AnnouncerConfig {
  systemPrompt: string;
}

export interface BroadcastContext {
  event: BroadcastEvent;
  gameState: BroadcastGameState;
  recentPlays: string[];
  sessionMemory: SessionMemorySnapshot;
  announcer: AnnouncerConfig;
}
