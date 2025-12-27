import { Module } from '@nestjs/common';
import { BoxScoreController } from './boxscore.controller';
import { BoxScoreService } from './boxscore.service';
import { MlbApiService } from '../providers/mlb/mlb.service';

@Module({
  controllers: [BoxScoreController],
  providers: [BoxScoreService, MlbApiService],
})
export class BoxScoreModule { }