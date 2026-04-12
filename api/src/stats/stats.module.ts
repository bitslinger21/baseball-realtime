import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../persistence/entities/game.entity';
import { MlbModule } from '../providers/mlb/mlb.module';

@Module({
  imports: [TypeOrmModule.forFeature([Game]), MlbModule],
  providers: [StatsService],
  exports: [StatsService]
})
export class StatsModule { }
