// src/games/games.module.ts
import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { MlbModule } from 'src/providers/mlb/mlb.module';
import { PersistenceModule } from 'src/persistence/persistence.module';

@Module({
  imports: [MlbModule, PersistenceModule],
  providers: [GamesService],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule {}
