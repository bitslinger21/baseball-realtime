import { Injectable, Logger } from '@nestjs/common';
import type { BroadcastSession } from './broadcast-session';
import type { SessionMemorySnapshot } from '../types/broadcast-context.types';
import type { BroadcastOutput } from '../types/broadcast-output.types';

const MAX_RECENT_NARRATIONS = 5;

@Injectable()
export class MemoryManagerService {
  private readonly logger = new Logger(MemoryManagerService.name);
  private readonly sessions = new Map<string, BroadcastSession>();

  getOrCreateSession(gameId: string): BroadcastSession {
    let session = this.sessions.get(gameId);
    if (!session) {
      session = {
        gameId,
        startedAt: new Date().toISOString(),
        sequence: 0,
        recentNarrations: [],
        mentionedPlayerIds: new Set(),
        scoreLastStated: null,
        atBatNarrationCount: 0,
      };
      this.sessions.set(gameId, session);
      this.logger.debug(`[broadcast] session created gameId=${gameId}`);
    }
    return session;
  }

  getSessionSnapshot(gameId: string): SessionMemorySnapshot {
    const session = this.getOrCreateSession(gameId);
    return {
      recentNarrations: [...session.recentNarrations],
      mentionedPlayerIds: Array.from(session.mentionedPlayerIds),
      scoreLastStated: session.scoreLastStated,
      atBatNarrationCount: session.atBatNarrationCount,
    };
  }

  nextSequence(gameId: string): number {
    const session = this.getOrCreateSession(gameId);
    session.sequence += 1;
    return session.sequence;
  }

  recordNarration(gameId: string, output: BroadcastOutput): void {
    const session = this.getOrCreateSession(gameId);

    session.recentNarrations.push({
      eventType: output.eventType,
      text: output.narration,
      ts: output.generatedAt,
    });

    if (session.recentNarrations.length > MAX_RECENT_NARRATIONS) {
      session.recentNarrations.shift();
    }

    session.atBatNarrationCount += 1;

    // Detect score references like "3-2", "0-0", "10-4"
    if (/\b\d+-\d+\b/.test(output.narration)) {
      session.scoreLastStated = output.narration;
    }
  }

  closeSession(gameId: string): void {
    this.sessions.delete(gameId);
    this.logger.debug(`[broadcast] session closed gameId=${gameId}`);
  }
}
