// api/src/stats/stats.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { GameDto } from 'src/games/dtos/games.dto';
import type { AlertType } from 'src/persistence/entities/alert.entity';
import { Game } from 'src/persistence/entities/game.entity';
import { MlbApiService } from 'src/providers/mlb/mlb.service';

// Shape used by poller/stats to enrich Game rows
interface GameScheduleMeta {
  gameDate: string;
  homeAbbr: string;
  awayAbbr: string;
  status: Game['status'];       // e.g. 'live' | 'scheduled' | 'final'
  startTimeUtc: string | null;  // ISO string or null
}

export type StatsSnapshot = {
  totalPlays: number;
  totalAlerts: number;
  playsPerGame: Record<string, number>;
  alertsPerGame: Record<string, number>;
  alertsByType: Record<AlertType, number>;
};

@Injectable()
export class StatsService {
  private readonly log: Logger = new Logger(StatsService.name);

  private totalPlays = 0;
  private totalAlerts = 0;

  private readonly playsPerGame: Map<string, number> = new Map();
  private readonly alertsPerGame: Map<string, number> = new Map();
  private readonly alertsByType: Map<AlertType, number> = new Map();

  constructor(
    @InjectRepository(Game)
    private readonly gamesRepo: Repository<Game>,
    private readonly mlb: MlbApiService,
  ) { }

  recordPlay(gameId: string): void {
    this.totalPlays += 1;

    const current: number = this.playsPerGame.get(gameId) ?? 0;
    this.playsPerGame.set(gameId, current + 1);
  }

  recordAlert(gameId: string, type: AlertType): void {
    this.totalAlerts += 1;

    const perGame: number = this.alertsPerGame.get(gameId) ?? 0;
    this.alertsPerGame.set(gameId, perGame + 1);

    const perType: number = this.alertsByType.get(type) ?? 0;
    this.alertsByType.set(type, perType + 1);
  }

  getSnapshot(): StatsSnapshot {
    const playsPerGame: Record<string, number> = {};
    for (const [gameId, count] of this.playsPerGame.entries()) {
      playsPerGame[gameId] = count;
    }

    const alertsPerGame: Record<string, number> = {};
    for (const [gameId, count] of this.alertsPerGame.entries()) {
      alertsPerGame[gameId] = count;
    }

    const alertsByType: Record<AlertType, number> = {} as Record<
      AlertType,
      number
    >;
    for (const [type, count] of this.alertsByType.entries()) {
      alertsByType[type] = count;
    }

    return {
      totalPlays: this.totalPlays,
      totalAlerts: this.totalAlerts,
      playsPerGame,
      alertsPerGame,
      alertsByType,
    };
  }

  async getGameSchedule(gameId: string): Promise<GameScheduleMeta | null> {
    // 1) Try DB first
    const row: Game | null = await this.gamesRepo.findOne({
      where: { providerGameId: gameId },
    });

    if (row != null) {
      return {
        gameDate: row.gameDate,
        homeAbbr: row.homeAbbr,
        awayAbbr: row.awayAbbr,
        status: row.status,
        startTimeUtc: row.startTimeUtc?.toISOString().slice(0, 10) ?? null,
      };
    }

    // 2) Fallback: hit MLB schedule for *today* and match by providerGameId
    const todayYmd: string = new Date().toISOString().slice(0, 10);

    try {
      const schedule: readonly GameDto[] =
        (await this.mlb.getScheduleByDate(todayYmd)) ?? [];

      const match: GameDto | undefined = schedule.find(
        (g: GameDto) => g.providerGameId === gameId,
      );

      if (match == null) {
        return null;
      }

      const status: Game['status'] =
        (match.status as Game['status']) ?? 'scheduled';

      return {
        gameDate: match.gameDate ?? todayYmd,
        homeAbbr: match.homeAbbr ?? 'HOM',
        awayAbbr: match.awayAbbr ?? 'AWY',
        status,
        startTimeUtc: match.startTimeUtc?.toISOString().slice(0, 10) ?? null,
      };
    } catch (err) {
      this.log.warn(
        `getGameSchedule: failed for ${gameId}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}