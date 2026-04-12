import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { MlbModule } from '../providers/mlb/mlb.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { TeamsMetaModule } from '../teams/teams-meta.module';

@Module({
  imports: [MlbModule, PersistenceModule, TeamsMetaModule],
  providers: [GamesService],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule { }
