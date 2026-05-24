import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Alert, type AlertType } from '../persistence/entities/alert.entity';
import { Repository } from 'typeorm';
import { StatsService } from '../stats/stats.service';

/** Minimal shape the poller sends today. Extend as your adapter gains fidelity. */
export type PlayUpdate = {
  gameId: string;
  ts: string; // ISO
  inning: number;
  half: 'Top' | 'Bottom';
  outs: number;
  count: { balls: number; strikes: number };
  bases: { on1?: boolean; on2?: boolean; on3?: boolean };
  // Optional richer context when you wire real feed:
  batterId?: string;
  batterName?: string;
  pitcherId?: string;
  pitcherName?: string;
  playResult?:
  | 'Single'
  | 'Double'
  | 'Triple'
  | 'HomeRun'
  | 'Walk'
  | 'Strikeout'
  | 'Out'
  | 'HBP'
  | 'Error'
  | 'Other';
  creditedHit?: 0 | 1; // 1 if a hit was recorded on this play
  pitcherOutsRecordedThisPlay?: 0 | 1 | 2 | 3;

  // Optional current score snapshot (from LiveUpdate)
  homeScore?: number;
  awayScore?: number;
};

export type GameAlert = {
  type: AlertType;
  note: string;
  at: string;
  // allow extra metadata (batterId, pitcherId, ipOuts, needs, etc.)
  [key: string]: unknown;
};

type HitType = '1B' | '2B' | '3B' | 'HR';

@Injectable()
export class AlertsService {
  private readonly log = new Logger(AlertsService.name);

  /** Cycle tracker: per game → per batter → set of hit types */
  private readonly cycleHits = new Map<string, Map<string, Set<HitType>>>();

  /** No-hitter tracker (per game, per pitcher) */
  private readonly pitcherHitsAllowed = new Map<string, Map<string, number>>();
  private readonly pitcherOuts = new Map<string, Map<string, number>>();

  /** Last known score per game, for score / lead / tie alerts */
  private readonly lastScores = new Map<
    string,
    { homeScore: number; awayScore: number }
  >();

  constructor(
    private readonly gw: RealtimeGateway,
    @InjectRepository(Alert)
    private readonly alertsRepo: Repository<Alert>,
    private readonly stats: StatsService,
  ) { }

  /** Call this for every play update */
  async onPlay(gameId: string, u: PlayUpdate): Promise<void> {
    try {
      const tasks: Promise<void>[] = [];

      if (u.playResult && u.batterId) {
        tasks.push(this.trackCycle(gameId, u));
      }
      if (u.pitcherId) {
        tasks.push(this.trackNoHitter(gameId, u));
      }
      if (typeof u.homeScore === 'number' && typeof u.awayScore === 'number') {
        tasks.push(this.trackScoreChange(gameId, u));
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    } catch (e) {
      this.log.warn(`alerts onPlay failed: ${(e as Error).message}`);
    }
  }

  // ---------------- Cycle detector ----------------

  private async trackCycle(gameId: string, u: PlayUpdate): Promise<void> {
    const hitType = this.mapPlayToHitType(u.playResult);
    if (!hitType) {
      return; // not a hit → ignore
    }

    const byGame = this.ensureMap(this.cycleHits, gameId);
    const byBatter = this.ensureSet(byGame, u.batterId!);
    byBatter.add(hitType);

    const have = byBatter;
    const missing = this.missingHitType(have);

    if (!missing) {
      // All four acquired → cycle achieved
      await this.emitAlert(gameId, {
        type: 'cycle-achieved',
        batterId: u.batterId,
        batterName: u.batterName,
        note: `${u.batterName ?? 'Batter'} hit for the cycle!`,
        at: u.ts,
      });
    } else if (have.size === 3) {
      // Exactly 3 distinct hit types → watch
      await this.emitAlert(gameId, {
        type: 'cycle-watch',
        batterId: u.batterId,
        batterName: u.batterName,
        needs: missing,
        note: `${u.batterName ?? 'Batter'} needs a ${missing} for the cycle`,
        at: u.ts,
      });
    }
  }

  private mapPlayToHitType(result?: PlayUpdate['playResult']): HitType | null {
    switch (result) {
      case 'Single':
        return '1B';
      case 'Double':
        return '2B';
      case 'Triple':
        return '3B';
      case 'HomeRun':
        return 'HR';
      default:
        return null;
    }
  }

  private missingHitType(have: Set<HitType>): HitType | null {
    const all: HitType[] = ['1B', '2B', '3B', 'HR'];
    const miss = all.find((h) => !have.has(h));
    return miss ?? null; // null → have all four
  }

  // ---------------- No-hitter detector ----------------

  private async trackNoHitter(gameId: string, u: PlayUpdate): Promise<void> {
    const hitsByPitcher = this.ensureMap(this.pitcherHitsAllowed, gameId);
    const outsByPitcher = this.ensureMap(this.pitcherOuts, gameId);

    const pitcherId = u.pitcherId!;
    const prevHits = hitsByPitcher.get(pitcherId) ?? 0;
    const newHits = prevHits + (u.creditedHit ?? this.inferHit(u));
    hitsByPitcher.set(pitcherId, newHits);

    const prevOuts = outsByPitcher.get(pitcherId) ?? 0;
    const addOuts = u.pitcherOutsRecordedThisPlay ?? this.inferOuts(u);
    const totalOuts = prevOuts + addOuts;
    outsByPitcher.set(pitcherId, totalOuts);

    // Watch threshold: 7.0 IP (21 outs) and no hits allowed.
    if (totalOuts >= 21 && newHits === 0) {
      await this.emitAlert(gameId, {
        type: 'no-hitter-watch',
        pitcherId,
        pitcherName: u.pitcherName,
        ipOuts: totalOuts,
        note: `${u.pitcherName ?? 'Pitcher'
          } has a no-hitter through ${this.formatIP(totalOuts)}.`,
        at: u.ts,
      });
    }

    // First hit allowed after having 0 hits
    if (prevHits === 0 && newHits > 0 && totalOuts >= 3) {
      await this.emitAlert(gameId, {
        type: 'no-hitter-broken',
        pitcherId,
        pitcherName: u.pitcherName,
        ipOuts: totalOuts,
        note: `No-hitter broken against ${u.pitcherName ?? 'pitcher'
          } in ${this.formatIP(totalOuts)}.`,
        at: u.ts,
      });
    }
  }

  private inferHit(u: PlayUpdate): 0 | 1 {
    const hit = this.mapPlayToHitType(u.playResult);
    return hit ? 1 : 0;
  }

  private inferOuts(u: PlayUpdate): 0 | 1 | 2 | 3 {
    if (u.playResult === 'Strikeout' || u.playResult === 'Out') {
      return 1;
    }
    return 0;
  }

  private formatIP(outs: number): string {
    const ip = Math.floor(outs / 3);
    const rem = outs % 3;
    return `${ip}.${rem}`; // e.g., 7.0, 7.1, 7.2
  }

  // ---------------- Score / lead / tie detector ----------------

  private async trackScoreChange(gameId: string, u: PlayUpdate): Promise<void> {
    const home = u.homeScore ?? 0;
    const away = u.awayScore ?? 0;

    const previous = this.lastScores.get(gameId);
    this.lastScores.set(gameId, { homeScore: home, awayScore: away });

    // First time → nothing to compare.
    if (!previous) {
      return;
    }

    // No actual score change
    if (previous.homeScore === home && previous.awayScore === away) {
      return;
    }

    const alerts: any[] = [];

    // Basic score change alert
    alerts.push({
      type: 'score-change',
      note: `Score change: ${away}-${home} (was ${previous.awayScore}-${previous.homeScore})`,
      at: u.ts,
    });

    // Tie game
    if (home === away) {
      alerts.push({
        type: 'game-tied',
        note: `Game tied at ${home}-${away}`,
        at: u.ts,
      });
    } else {
      // Lead change
      const prevLeader: 'home' | 'away' | 'tie' =
        previous.homeScore === previous.awayScore
          ? 'tie'
          : previous.homeScore > previous.awayScore
            ? 'home'
            : 'away';

      const nowLeader: 'home' | 'away' = home > away ? 'home' : 'away';

      if (prevLeader !== nowLeader) {
        const leaderLabel = nowLeader === 'home' ? 'Home' : 'Away';
        alerts.push({
          type: 'lead-change',
          note: `${leaderLabel} team takes the lead ${away}-${home}`,
          at: u.ts,
        });
      }
    }

    for (const payload of alerts) {
      await this.emitAlert(gameId, payload);
    }
  }

  // ---------------- Emit helper ----------------

  private async emitAlert(gameId: string,
    payload: GameAlert): Promise<void> {
    this.gw.publishGameUpdate(gameId, { alert: payload });

    await this.alertsRepo.save({
      gameId,
      type: payload.type as AlertType,
      payload: payload as Record<string, unknown>,
    });

    this.stats.recordAlert(gameId, payload.type as AlertType);
  }

  // ---------------- Tiny helpers ----------------

  private ensureMap<K1 extends string, K2 extends string, V>(
    root: Map<K1, Map<K2, V>>,
    key: K1,
  ): Map<K2, V> {
    let m = root.get(key);
    if (!m) {
      m = new Map<K2, V>();
      root.set(key, m);
    }
    return m;
  }

  private ensureSet<K1 extends string>(
    root: Map<K1, Set<HitType>>,
    key: K1,
  ): Set<HitType> {
    let s = root.get(key);
    if (!s) {
      s = new Set<HitType>();
      root.set(key, s);
    }
    return s;
  }
}
