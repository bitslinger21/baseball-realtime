// src/alerts/alerts.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from '../persistence/entities/alert.entity';

@Controller('alerts')
export class AlertsController {
  constructor(@InjectRepository(Alert) private readonly repo: Repository<Alert>) {}

  @Get()
  list(@Query('gameId') gameId?: string) {
    const where = gameId ? { gameId } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }
}
