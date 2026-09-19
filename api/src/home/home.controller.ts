import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HotEventsService } from './hot-events.service';
import { HotEventsResponseDto } from './dtos/hot-event.dto';

@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(private readonly hotEvents: HotEventsService) {}

  @Get('hot')
  @ApiOperation({
    summary:
      "What's Hot Right Now — a ranked, significance-filtered list of noteworthy MLB " +
      'events (live-game situations for now; never padded to a target count).',
  })
  @ApiOkResponse({ type: HotEventsResponseDto })
  getHot(): HotEventsResponseDto {
    return { events: this.hotEvents.getHot() };
  }
}
