import { Module } from '@nestjs/common';
import { StandingsController } from './standings.controller';
import { StandingsService } from './standings.service';
import { MlbModule } from '../providers/mlb/mlb.module';
import { TeamsMetaModule } from '../teams/teams-meta.module';

@Module({
  imports: [MlbModule, TeamsMetaModule],
  controllers: [StandingsController],
  providers: [StandingsService],
})
export class StandingsModule {}
