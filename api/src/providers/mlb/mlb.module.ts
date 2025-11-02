import { Module } from '@nestjs/common';
import { MlbApiService } from './mlb.service';

@Module({
  providers: [MlbApiService],
  exports: [MlbApiService],
})
export class MlbModule {}
