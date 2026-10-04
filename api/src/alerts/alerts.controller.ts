import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from '../persistence/entities/alert.entity';
import { AlertFeedService } from './alert-feed.service';
import { AlertFeedItemDto } from './dtos/alert-feed.dto';

export interface AlertWireDto {
  id: string | number;
  gameId: string;
  type: string;
  at: string | null;
  note: string | null;
  payload: unknown;
}

@Controller()
export class AlertsController {
  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepo: Repository<Alert>,
    private readonly feed: AlertFeedService,
  ) {}

  // The header bell + tray (PROMPT_alerts.md): tonight's league-wide
  // alerts, newest first. Polled by the client every 30s.
  @Get('alerts/feed')
  @ApiOkResponse({ type: AlertFeedItemDto, isArray: true })
  async listFeed(): Promise<AlertFeedItemDto[]> {
    return this.feed.list();
  }

  @Get('games/:providerGameId/alerts')
  @ApiQuery({ name: 'limit', required: false })
  async listAlertsForGame(
    @Param('providerGameId') providerGameId: string,
    @Query('limit') limitRaw?: string,
  ): Promise<AlertWireDto[]> {
    const limitNum: number = Number(limitRaw);
    const limit: number =
      Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 200) : 50;

    const rows: Alert[] = await this.alertsRepo.find({
      where: { gameId: providerGameId },
      order: { id: 'DESC' }, // newest first; swap to createdAt if you prefer
      take: limit,
    });

    return rows.map((row: Alert): AlertWireDto => {
      const payload = row.payload as
        | {
            at?: string;
            note?: string;
          }
        | undefined;

      return {
        id: row.id as string | number,
        gameId: row.gameId,
        type: row.type as unknown as string,
        at: payload?.at ?? null,
        note: payload?.note ?? null,
        payload: row.payload,
      };
    });
  }
}
