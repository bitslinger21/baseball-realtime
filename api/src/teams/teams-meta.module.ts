import { Module } from '@nestjs/common';
import { TeamsMetaService } from './teams-meta.service';

@Module({
  providers: [TeamsMetaService],
  exports: [TeamsMetaService],
})
export class TeamsMetaModule { }
