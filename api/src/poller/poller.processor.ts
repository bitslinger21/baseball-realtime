// src/poller/poller.processor.ts (excerpt)
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from '../persistence/entities/game.entity';
import { PollerService } from './poller.service';
import { WorkerHost } from '@nestjs/bullmq';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { AlertsService } from 'src/alerts/alerts.service';
import { Job } from 'bullmq';

export class PollerProcessor extends WorkerHost {
  constructor(
    private readonly poller: PollerService,
    private readonly realtime: RealtimeGateway,
    private readonly alerts: AlertsService,
    @InjectRepository(Game) private readonly gamesRepo: Repository<Game>,
  ) { super(); }

  async process(job: Job<{ gameId: string }>) {
    const { gameId } = job.data;
    const u = await this.poller.fetchLatest(gameId);

    // Upsert minimal identity + snapshot
    await this.gamesRepo.upsert(
      {
        id: gameId,
        gameDate: new Date().toISOString().slice(0,10),
        homeAbbr: 'HOM', // TODO: real values from provider
        awayAbbr: 'AWY',
        status: 'live',
        startTimeUtc: null,
        // meta: {
        //   inning: u.inning,
        //   half: u.half,
        //   outs: u.outs,
        //   count: u.count,
        //   bases: u.bases,
        // },
      },
      ['providerGameId'],
    );

    // alerts → broadcast
    this.alerts.onPlay(gameId, u);
    this.realtime.publishGameUpdate(gameId, u);
  }
}
