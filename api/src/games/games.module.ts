// src/games/games.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../persistence/entities/game.entity';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { MlbModule } from 'src/providers/mlb/mlb.module';

@Module({
  imports: [MlbModule, TypeOrmModule.forFeature([Game])],
  providers: [GamesService],
  controllers: [GamesController],
  exports: [GamesService],
})
export class GamesModule {}
