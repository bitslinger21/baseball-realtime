// src/app.module.ts
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PollerModule } from './poller/poller.module';
import { PersistenceModule } from './persistence/persistence.module';
import { AlertsModule } from './alerts/alerts.module';
import { GamesModule } from './games/games.module';
import { TeamsMetaModule } from './teams/teams-meta.module';

const isSpecGen = process.env.SPEC_GEN === '1';

// Modules that define controllers / DTOs for the HTTP API
const apiModules = [GamesModule, AlertsModule, PersistenceModule, TeamsMetaModule];

// Modules that cause “side effects” you might want to skip in spec-gen
const runtimeOnlyModules = [InfrastructureModule, PollerModule, RealtimeModule];

@Module({
  imports: [...apiModules, ...(isSpecGen ? [] : runtimeOnlyModules)],
})
export class AppModule { }
