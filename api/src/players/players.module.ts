import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { PlayersSearchService } from './players-search.service';
import { MlbModule } from '../providers/mlb/mlb.module';

@Module({
  imports: [MlbModule],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersSearchService],
})
export class PlayersModule { }