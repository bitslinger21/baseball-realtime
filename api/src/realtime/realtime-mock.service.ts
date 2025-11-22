// api/src/realtime/realtime-mock.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

interface PlayUpdate {
  providerGameId: string;
  description: string;
  inning: number;
  half: 'top' | 'bottom';
  homeScore: number;
  awayScore: number;
  ts: string; // ISO timestamp
}

@Injectable()
export class RealtimeMockService implements OnModuleInit {
  private readonly logger: Logger = new Logger(RealtimeMockService.name);

  public constructor(private readonly gateway: RealtimeGateway) { }

  public onModuleInit(): void {
    // TODO: replace with a REAL providerGameId from your DB/UI
    const providerGameId: string = '776200';
    if (providerGameId.trim() === '') {
      this.logger.warn(
        'RealtimeMockService disabled: providerGameId not set. Edit realtime-mock.service.ts',
      );
      return;
    }

    let inning: number = 1;
    let half: 'top' | 'bottom' = 'top';
    let homeScore: number = 0;
    let awayScore: number = 0;

    this.logger.log(
      `Starting mock updates for providerGameId=${providerGameId}`,
    );

    setInterval(() => {
      // simple fake scoring
      if (Math.random() < 0.5) {
        awayScore += 1;
      } else {
        homeScore += 1;
      }

      const update: PlayUpdate = {
        providerGameId,
        description: `Mock event at ${new Date().toLocaleTimeString()}`,
        inning,
        half,
        homeScore,
        awayScore,
        ts: new Date().toISOString(),
      };

      this.gateway.publishGameUpdate(update.providerGameId, update);

      // advance inning/half a bit so it looks dynamic
      if (half === 'top') {
        half = 'bottom';
      } else {
        half = 'top';
        inning += 1;
      }
    }, 10_000); // every 10 seconds
  }
}