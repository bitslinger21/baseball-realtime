import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { SeasonPulseService } from './season-pulse.service';
import { SeasonPulseDto } from './dtos/season-pulse.dto';

@Controller('season-pulse')
export class SeasonPulseController {
  constructor(
    private readonly svc: SeasonPulseService,
    @InjectQueue('season-pulse') private readonly queue: Queue,
  ) {}

  @Get(':teamId')
  async getSeasonPulse(
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<SeasonPulseDto | Record<string, never>> {
    const dto = await this.svc.getSeasonPulse(teamId);
    return dto ?? {};
  }

  // Manual/dev trigger for the nightly computation — mirrors Statcast's
  // ingest-trigger endpoint. Not wired into the OpenAPI spec (this module
  // is runtime-only, same as StatcastModule).
  @Post('compute-now')
  @HttpCode(HttpStatus.ACCEPTED)
  async computeNow(): Promise<{ queued: boolean }> {
    await this.queue.add(
      'compute-all',
      { kind: 'compute-all' },
      { jobId: `season-pulse-manual-${Date.now()}`, removeOnComplete: true },
    );
    return { queued: true };
  }
}
