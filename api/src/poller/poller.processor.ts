// api/src/poller/poller.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { Game } from '../persistence/entities/game.entity';
import { PollerService, type LiveUpdate } from './poller.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AlertsService } from '../alerts/alerts.service';

type PlayUpdateWire = {
  providerGameId: string;
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  balls: number;
  strikes: number;
  bases: {
    on1: boolean;
    on2: boolean;
    on3: boolean;
  };
  homeScore: number;
  awayScore: number;
  description: string;
  batterName?: string;
  pitcherName?: string;
  ts: string;
};

@Processor('game-poller')
@Injectable()
export class PollerProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(PollerProcessor.name);
  private readonly lastPlayKeyByGame = new Map<string, string>();

  public constructor(
    private readonly poller: PollerService,
    private readonly realtime: RealtimeGateway,
    private readonly alerts: AlertsService,
    @InjectRepository(Game) private readonly gamesRepo: Repository<Game>,
  ) {
    super();
  }

  // NEW: remember the last playKey per game so we don't emit duplicates
  public async process(job: Job<{ gameId: string }>): Promise<void> {
    const { gameId } = job.data;

    try {
      const u: LiveUpdate = await this.poller.fetchLatest(gameId);

      // --- 5.2b: de-duplicate identical plays ---
      if (u.playKey != null) {
        const lastKey: string | undefined = this.lastPlayKeyByGame.get(gameId);

        if (lastKey === u.playKey) {
          // Same play as last poll → skip emit
          await job.updateProgress(100);
          return;
        }

        this.lastPlayKeyByGame.set(gameId, u.playKey);
      }

      // Upsert by providerGameId (must be UNIQUE in DB)
      await this.gamesRepo.upsert(
        {
          providerGameId: gameId,
          gameDate: new Date().toISOString().slice(0, 10),
          homeAbbr: 'HOM', // TODO: map from schedule
          awayAbbr: 'AWY',
          status: 'live',
          startTimeUtc: null,
          // snapshot: u.snapshot, // optional if you add this column
        },
        ['providerGameId'],
      );

      const ts: string = new Date().toISOString();

      // Alerts get the full LiveUpdate + ts
      await this.alerts.onPlay(gameId, { ...u, ts });

      // Map LiveUpdate -> wire payload for clients
      const payload: PlayUpdateWire = {
        providerGameId: gameId,
        inning: u.inning,
        half: u.half === 'Top' ? 'top' : 'bottom',
        outs: u.outs,
        balls: u.count.balls,
        strikes: u.count.strikes,
        bases: {
          on1: u.bases.on1 === true,
          on2: u.bases.on2 === true,
          on3: u.bases.on3 === true,
        },
        homeScore: u.homeScore ?? 0,
        awayScore: u.awayScore ?? 0,
        description: u.description ?? (u.playResult ?? ''),
        batterName: u.batter?.name ?? u.batterName,
        pitcherName: u.pitcher?.name ?? u.pitcherName,
        ts,
      };

      this.realtime.publishGameUpdate(gameId, { play: payload });

      await job.updateProgress(100);
    } catch (err) {
      this.logger.warn(
        `poll failed for game ${gameId}: ${(err as Error).message}`,
      );
      // swallow error so BullMQ doesn't hammer retries forever
    }
  }
}