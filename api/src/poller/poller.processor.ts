// api/src/poller/poller.processor.ts
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";

import { Game } from "../persistence/entities/game.entity";
import { PollerService, type LiveUpdate } from "./poller.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { AlertsService } from "../alerts/alerts.service";

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
  description?: string;
  batterName?: string;
  pitcherName?: string;
  ts: string;
};

@Processor("game-poller")
@Injectable()
export class PollerProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(PollerProcessor.name);

  public constructor(
    private readonly poller: PollerService,
    private readonly realtime: RealtimeGateway,
    private readonly alerts: AlertsService,
    @InjectRepository(Game) private readonly gamesRepo: Repository<Game>,
  ) {
    super();
  }

  public async process(job: Job<{ gameId: string }>): Promise<void> {
    const { gameId } = job.data;
    try {
      const u: LiveUpdate = await this.poller.fetchLatest(gameId);

      // Upsert by providerGameId (must be UNIQUE in DB)
      await this.gamesRepo.upsert(
        {
          providerGameId: gameId,
          gameDate: new Date().toISOString().slice(0, 10),
          homeAbbr: "HOM", // TODO: map real values from schedule
          awayAbbr: "AWY",
          status: "live",
          startTimeUtc: null,
          // snapshot: u.snapshot,
        },
        ["providerGameId"],
      );

      const ts: string = new Date().toISOString();

      // Keep alerts on the full LiveUpdate shape + ts
      this.alerts.onPlay(gameId, { ...u, ts });

      // Map LiveUpdate -> PlayUpdateWire for realtime clients
      const payload: PlayUpdateWire = {
        providerGameId: gameId,
        inning: u.inning,
        half: u.half === "Top" ? "top" : "bottom",
        outs: u.outs,
        balls: u.count.balls,
        strikes: u.count.strikes,
        bases: {
          on1: !!u.bases.on1,
          on2: !!u.bases.on2,
          on3: !!u.bases.on3,
        },
        homeScore: u.homeScore,
        awayScore: u.awayScore,
        description: u.description,
        batterName: u.batter?.name,
        pitcherName: u.pitcher?.name,
        ts,
      };

      this.realtime.publishGameUpdate(gameId, payload);

      await job.updateProgress(100);

    } catch (err) {
      this.logger.warn(
        `poll failed for game ${gameId}: ${(err as Error).message}`,
      );
      // Option 1: swallow = job is considered "complete" but no update sent
      return;
    }
  }
}
