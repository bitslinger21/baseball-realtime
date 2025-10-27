import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Alert } from 'src/persistence/entities/alert.entity';
import { Repository } from 'typeorm';

/** Minimal shape the poller sends today. Extend as your adapter gains fidelity. */
export type PlayUpdate = {
  gameId: string;
  ts: string;                        // ISO
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
  playResult?: 'Single'|'Double'|'Triple'|'HomeRun'|'Walk'|'Strikeout'|'Out'|'HBP'|'Error'|'Other';
  creditedHit?: 0|1;                 // 1 if a hit was recorded on this play
  pitcherOutsRecordedThisPlay?: 0|1|2|3;
};

type HitType = '1B'|'2B'|'3B'|'HR';

@Injectable()
export class AlertsService {
  private readonly log = new Logger(AlertsService.name);

  /** Cycle tracker: per game → per batter → set of hit types */
  private cycleHits = new Map<string, Map<string, Set<HitType>>>();

  /** No-hitter tracker (per game, per pitcher) */
  private pitcherHitsAllowed = new Map<string, Map<string, number>>();
  private pitcherOuts = new Map<string, Map<string, number>>();

  constructor(
    private readonly gw: RealtimeGateway,
  @InjectRepository(Alert) private readonly alertsRepo: Repository<Alert>,
) {}

  /** Call this for every play update */
  onPlay(gameId: string, u: PlayUpdate) {
    try {
      if (u.playResult && u.batterId) {
        this.trackCycle(gameId, u);
      }
      if (u.pitcherId) {
        this.trackNoHitter(gameId, u);
      }
    } catch (e) {
      this.log.warn(`alerts onPlay failed: ${(e as Error).message}`);
    }
  }

  // ---------------- Cycle detector ----------------

  private trackCycle(gameId: string, u: PlayUpdate) {
    const hitType = this.mapPlayToHitType(u.playResult);
    if (!hitType) return; // not a hit → ignore

    const byGame = this.ensureMap(this.cycleHits, gameId);
    const byBatter = this.ensureSet(byGame, u.batterId!);
    byBatter.add(hitType);

    // If batter has 3 of 4, emit “needs X”. If has all 4, emit “cycle achieved”.
    const have = byBatter;
    const missing = this.missingHitType(have);
    if (!missing) {
      // All four acquired → cycle achieved
      this.emitAlert(gameId, {
        type: 'cycle-achieved',
        batterId: u.batterId,
        batterName: u.batterName,
        note: `${u.batterName ?? 'Batter'} hit for the cycle!`,
        at: u.ts,
      });
    } else if (have.size === 3) {
      this.emitAlert(gameId, {
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
      case 'Single': return '1B';
      case 'Double': return '2B';
      case 'Triple': return '3B';
      case 'HomeRun': return 'HR';
      default: return null;
    }
  }

  private missingHitType(have: Set<HitType>): HitType | null {
    const all: HitType[] = ['1B','2B','3B','HR'];
    const miss = all.find(h => !have.has(h));
    return miss ?? null;
    // If null → have all four.
  }

  // ---------------- No-hitter detector ----------------
  // Simple rules:
  // - Track hits allowed and outs per pitcher.
  // - Emit "no-hitter watch" when IP >= 7.0 and hitsAllowed == 0.
  // - Emit "no-hitter broken" when the first hit against that pitcher occurs (optional).
  // Notes:
  // - This is pitcher-centric (single-pitcher no-hitter). You can add team-level combined later.

  private trackNoHitter(gameId: string, u: PlayUpdate) {
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

    // Watch threshold: 7.0 IP (i.e., 21 outs) and no hits allowed.
    if (totalOuts >= 21 && newHits === 0) {
      this.emitAlert(gameId, {
        type: 'no-hitter-watch',
        pitcherId,
        pitcherName: u.pitcherName,
        ipOuts: totalOuts,
        note: `${u.pitcherName ?? 'Pitcher'} has a no-hitter through ${this.formatIP(totalOuts)}.`,
        at: u.ts,
      });
    }

    // Optional: if first hit allowed, announce broken
    if (prevHits === 0 && newHits > 0 && totalOuts >= 3) {
      this.emitAlert(gameId, {
        type: 'no-hitter-broken',
        pitcherId,
        pitcherName: u.pitcherName,
        ipOuts: totalOuts,
        note: `No-hitter broken against ${u.pitcherName ?? 'pitcher'} in ${this.formatIP(totalOuts)}.`,
        at: u.ts,
      });
    }
  }

  private inferHit(u: PlayUpdate): 0|1 {
    const hit = this.mapPlayToHitType(u.playResult);
    return hit ? 1 : 0;
  }

  private inferOuts(u: PlayUpdate): 0|1|2|3 {
    // With real PBP, you'll have outs on play. For the stub, assume:
    if (u.playResult === 'Strikeout' || u.playResult === 'Out') return 1;
    return 0;
  }

  private formatIP(outs: number) {
    const ip = Math.floor(outs / 3);
    const rem = outs % 3;
    return `${ip}.${rem}`; // e.g., 7.0, 7.1, 7.2
  }

  // ---------------- Emit helper ----------------

  private async emitAlert(gameId: string, payload: any) {
    this.gw.publishGameUpdate(gameId, { alert: payload });
    await this.alertsRepo.save({ gameId, type: payload.type, payload });
  }

  // ---------------- Tiny helpers ----------------

  private ensureMap<K1 extends string, K2 extends string, V>(
    root: Map<K1, Map<K2, V>>,
    key: K1,
  ): Map<K2, V> {
    let m = root.get(key);
    if (!m) { m = new Map<K2, V>(); root.set(key, m); }
    return m;
  }

  private ensureSet<K1 extends string>(
    root: Map<K1, Set<HitType>>,
    key: K1,
  ): Set<HitType> {
    let s = root.get(key);
    if (!s) { s = new Set<HitType>(); root.set(key, s); }
    return s;
  }
}
