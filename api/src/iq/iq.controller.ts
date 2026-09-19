import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PollerService, type LiveUpdate } from '../poller/poller.service';
import { IqService } from './iq.service';
import { IqQueryRequestDto, IqQueryResponseDto } from './dtos/iq-query.dto';

@ApiTags('iq')
@Controller('iq')
export class IqController {
  private readonly log = new Logger(IqController.name);

  constructor(
    private readonly iq: IqService,
    private readonly poller: PollerService,
  ) {}

  @Post('query')
  @ApiOperation({
    summary:
      'Ask Baseball IQ a free-text question about a game, as of a specific moment.',
  })
  @ApiOkResponse({ type: IqQueryResponseDto })
  async query(@Body() body: IqQueryRequestDto): Promise<IqQueryResponseDto> {
    let history: LiveUpdate[] = [];
    try {
      history = await this.poller.fetchHistory(body.gameId);
    } catch (e: unknown) {
      this.log.warn(
        `fetchHistory failed for ${body.gameId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return this.iq.answerQuery({
      gameId: body.gameId,
      updateIndex: body.updateIndex,
      question: body.question,
      history,
      conversationHistory: body.conversationHistory,
    });
  }
}
