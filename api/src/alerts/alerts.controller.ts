import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { AlertFeedService } from './alert-feed.service';
import { AlertFeedItemDto } from './dtos/alert-feed.dto';

@Controller()
export class AlertsController {
  constructor(private readonly feed: AlertFeedService) {}

  // The header bell + tray (PROMPT_alerts.md): tonight's league-wide
  // alerts, newest first. Polled by the client every 30s.
  @Get('alerts/feed')
  @ApiOkResponse({ type: AlertFeedItemDto, isArray: true })
  async listFeed(): Promise<AlertFeedItemDto[]> {
    return this.feed.list();
  }
}
