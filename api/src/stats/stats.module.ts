import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../persistence/entities/alert.entity';
import { Game } from '../persistence/entities/game.entity';
import { MlbModule } from '../providers/mlb/mlb.module';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Alert]), MlbModule],
  providers: [StatsService],
  exports: [StatsService]
})
export class StatsModule { }
