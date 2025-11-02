// src/poller/poller.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { Game } from '../persistence/entities/game.entity';
import { PollerService, type LiveUpdate } from './poller.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AlertsService } from '../alerts/alerts.service';

@Processor('game-poller')
@Injectable()
export class PollerProcessor extends WorkerHost {
  private readonly logger = new Logger(PollerProcessor.name);

  constructor(
    private readonly poller: PollerService,
    private readonly realtime: RealtimeGateway,
    private readonly alerts: AlertsService,
    @InjectRepository(Game) private readonly gamesRepo: Repository<Game>,
  ) {
    super();
  }

  async process(job: Job<{ gameId: string }>): Promise<void> {
    const { gameId } = job.data;
    try {
      const u: LiveUpdate = await this.poller.fetchLatest(gameId);

      // Upsert by providerGameId (must be UNIQUE in DB)
      await this.gamesRepo.upsert(
        {
          providerGameId: gameId,             
          gameDate: new Date().toISOString().slice(0, 10),
          homeAbbr: 'HOM',                     // TODO: map real values from schedule
          awayAbbr: 'AWY',
          status: 'live',
          startTimeUtc: null,
          // If your schema has this column:
          // snapshot: u.snapshot,
        },
        ['providerGameId'],
      );

      // alerts → broadcast
      this.alerts.onPlay(gameId, { ...u, ts: new Date().toISOString() });
      this.realtime.publishGameUpdate(gameId, { ...u, ts: new Date().toISOString() });

      await job.updateProgress(100);
    } catch (err) {
      this.logger.error(`poll failed for game ${gameId}`, err as Error);
      throw err;
    }
  }
}
