import { Controller, Get, Param } from '@nestjs/common';
import { BoxScoreService } from './boxscore.service';
import { BoxScoreDto } from './dtos/boxscore.dto';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('boxscore')
@Controller('boxscore')
export class BoxScoreController {
  public constructor(private readonly svc: BoxScoreService) { }

  @Get(':providerGameId')
  @ApiOkResponse({ type: BoxScoreDto })

  public async get(@Param('providerGameId') providerGameId: string): Promise<BoxScoreDto> {
    return this.svc.getBoxScore(providerGameId);
  }
}
