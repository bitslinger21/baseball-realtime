import type { BroadcastEventType } from './broadcast-event.types';

export interface BroadcastOutput {
  gameId: string;
  sequence: number;
  eventType: BroadcastEventType;
  narration: string;
  generatedAt: string;
  promptVersion: string;
  providerName: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}
