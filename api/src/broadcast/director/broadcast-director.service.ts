import { Injectable, Logger } from '@nestjs/common';
import { broadcastConfig } from '../broadcast.config';
import { MemoryManagerService } from '../memory/memory-manager.service';
import { ContextBuilderService } from '../context/context-builder.service';
import { PromptBuilderService } from '../prompt/prompt-builder.service';
import { NarratorService } from '../narrator/narrator.service';
import { OutputRouterService } from '../router/output-router.service';
import type { BroadcastEvent } from '../types/broadcast-event.types';
import { BroadcastEventType } from '../types/broadcast-event.types';
import type { LiveUpdate } from '../../poller/poller.service';
import type { PlayUpdateWire } from '../../poller/poller.processor';

const NARRATED_TYPES = new Set<string>(broadcastConfig.narration.narratedEventTypes);

@Injectable()
export class BroadcastDirectorService {
  private readonly logger = new Logger(BroadcastDirectorService.name);

  constructor(
    private readonly memory: MemoryManagerService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly narrator: NarratorService,
    private readonly router: OutputRouterService,
  ) {}

  async onPlay(gameId: string, update: LiveUpdate, payload: PlayUpdateWire): Promise<void> {
    try {
      const event = this.deriveBroadcastEvent(gameId, update, payload);
      if (event === null) {
        this.logger.debug(`[broadcast] skip gameId=${gameId} reason=event_type_undetermined`);
        return;
      }

      if (!this.shouldNarrate(event)) {
        this.logger.debug(
          `[broadcast] skip gameId=${gameId} playKey=${event.playKey} reason=event_type_not_in_narrated_set`,
        );
        return;
      }

      const snapshot = this.memory.getSessionSnapshot(gameId);
      const context = this.contextBuilder.build(event, snapshot);
      const prompt = this.promptBuilder.build(context);
      const sequence = this.memory.nextSequence(gameId);

      const output = await this.narrator.narrate({ context, prompt, gameId, sequence });

      this.router.deliver(output);
      this.memory.recordNarration(gameId, output);

      this.logger.log(
        `[broadcast] narrated gameId=${gameId} seq=${sequence} eventType=${event.eventType}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[broadcast] onPlay failed gameId=${gameId} error=${msg}`);
    }
  }

  private shouldNarrate(event: BroadcastEvent): boolean {
    return NARRATED_TYPES.has(event.eventType);
  }

  private deriveBroadcastEvent(
    gameId: string,
    update: LiveUpdate,
    _payload: PlayUpdateWire,
  ): BroadcastEvent | null {
    const eventType = this.resolveEventType(update);
    if (eventType === null) return null;

    return {
      gameId,
      playKey: update.playKey ?? `${gameId}-${Date.now()}`,
      eventType,
      description: update.description ?? update.playResult ?? '',
      atBatResult: update.playResult ?? null,
      isAtBatComplete: update.isFinalPitchOfAtBat === true,
      gameState: {
        inning: update.inning,
        half: update.half === 'Top' ? 'top' : 'bottom',
        outs: update.outs,
        bases: {
          on1: update.bases.on1 === true,
          on2: update.bases.on2 === true,
          on3: update.bases.on3 === true,
        },
        balls: update.count.balls,
        strikes: update.count.strikes,
        homeScore: update.homeScore ?? 0,
        awayScore: update.awayScore ?? 0,
        homeAbbr: update.homeAbbr ?? '',
        awayAbbr: update.awayAbbr ?? '',
        pitcherName: update.pitcherName ?? update.pitcher?.name ?? null,
        pitcherId: update.pitcher?.id != null ? Number(update.pitcher.id) : null,
        batterName: update.batterName ?? update.batter?.name ?? null,
        batterId: update.batter?.id != null ? Number(update.batter.id) : null,
      },
    };
  }

  private resolveEventType(update: LiveUpdate): BroadcastEventType | null {
    if (update.isFinalPitchOfAtBat === true) {
      const scored =
        update.playResult === 'HomeRun' ||
        (update.linescore != null &&
          (update.linescore.home.runs > 0 || update.linescore.away.runs > 0));
      return scored ? BroadcastEventType.SCORING_PLAY : BroadcastEventType.AT_BAT_COMPLETE;
    }

    return null;
  }
}
