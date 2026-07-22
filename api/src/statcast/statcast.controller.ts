import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { StatcastService } from './statcast.service';
import { StatcastSummaryDto } from './dtos/statcast-summary.dto';

@Controller('statcast')
export class StatcastController {
  constructor(private readonly svc: StatcastService) {}

  // GET /statcast/:mlbId?season=2026
  // Returns cached summary; triggers background ingest if not yet available.
  @Get(':mlbId')
  async getSummary(
    @Param('mlbId', ParseIntPipe) mlbId: number,
    @Query('season', new DefaultValuePipe(0), ParseIntPipe) season: number,
  ): Promise<StatcastSummaryDto> {
    const s = season || new Date().getFullYear();
    return this.svc.getOrTriggerIngest(mlbId, s);
  }

  // POST /statcast/ingest  { mlbId, season }
  // Admin/dev trigger: force re-ingest for a specific player+season.
  @Post('ingest')
  async triggerIngest(
    @Body() body: { mlbId: number; season: number },
  ): Promise<{ queued: boolean }> {
    await this.svc.enqueueIngest(body.mlbId, body.season);
    return { queued: true };
  }
}
