import { Injectable, Logger } from '@nestjs/common';
import { broadcastConfig } from '../broadcast.config';
import type { BroadcastEvent } from '../types/broadcast-event.types';
import type { BroadcastContext, SessionMemorySnapshot } from '../types/broadcast-context.types';

const MAX_RECENT_PLAYS = 3;

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor() {}

  build(event: BroadcastEvent, sessionSnapshot: SessionMemorySnapshot): BroadcastContext {
    const recentPlays = sessionSnapshot.recentNarrations
      .slice(-MAX_RECENT_PLAYS)
      .map((n) => n.text);

    return {
      event,
      gameState: event.gameState,
      recentPlays,
      sessionMemory: sessionSnapshot,
      announcer: { systemPrompt: broadcastConfig.announcer.systemPrompt },
    };
  }
}
