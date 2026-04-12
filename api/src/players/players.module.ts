import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { MlbModule } from '../providers/mlb/mlb.module';

@Module({
  imports: [MlbModule],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule { }