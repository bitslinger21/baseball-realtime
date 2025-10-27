import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Alert])],
  exports: [TypeOrmModule],
})
export class PersistenceModule {}