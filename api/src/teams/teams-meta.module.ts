import { Module } from '@nestjs/common';
import { TeamsMetaService } from './teams-meta.service';
import { TeamsRosterService } from './teams-roster.service';
import { TeamsRecentFormService } from './teams-recent-form.service';
import { TeamsBullpenService } from './teams-bullpen.service';
import { TeamsTransactionsService } from './teams-transactions.service';
import { TeamsController } from './teams.controller';
import { BoxScoreModule } from '../boxscore/boxscore.module';
import { MlbModule } from '../providers/mlb/mlb.module';

@Module({
  imports: [BoxScoreModule, MlbModule],
  controllers: [TeamsController],
  providers: [
    TeamsMetaService,
    TeamsRosterService,
    TeamsRecentFormService,
    TeamsBullpenService,
    TeamsTransactionsService,
  ],
  exports: [TeamsMetaService],
})
export class TeamsMetaModule {}
