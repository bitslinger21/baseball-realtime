import { Module } from '@nestjs/common';
import { TeamsMetaService } from './teams-meta.service';
import { TeamsRosterService } from './teams-roster.service';
import { TeamsController } from './teams.controller';

@Module({
  controllers: [TeamsController],
  providers: [TeamsMetaService, TeamsRosterService],
  exports: [TeamsMetaService],
})
export class TeamsMetaModule { }
