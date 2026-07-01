import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PollerModule } from './poller/poller.module';
import { PersistenceModule } from './persistence/persistence.module';
import { AlertsModule } from './alerts/alerts.module';
import { GamesModule } from './games/games.module';
import { TeamsMetaModule } from './teams/teams-meta.module';
import { BoxScoreModule } from './boxscore/boxscore.module';
import { PlayersModule } from './players/players.module';
import { StandingsModule } from './standings/standings.module';
import { LeadersModule } from './leaders/leaders.module';
import { HealthModule } from './health/health.module';
import { BroadcastModule } from './broadcast/broadcast.module';

const isSpecGen = process.env.SPEC_GEN === '1';

// Modules that define controllers / DTOs for the HTTP API
const apiModules = [
  GamesModule,
  AlertsModule,
  PersistenceModule,
  TeamsMetaModule,
  BoxScoreModule,
  PlayersModule,
  StandingsModule,
  LeadersModule,
  HealthModule,
];

// Modules that cause “side effects” you might want to skip in spec-gen
const runtimeOnlyModules = [InfrastructureModule, PollerModule, RealtimeModule, BroadcastModule];

@Module({
  imports: [...apiModules, ...(isSpecGen ? [] : runtimeOnlyModules)],
})
export class AppModule { }
