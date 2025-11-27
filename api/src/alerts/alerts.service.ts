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

  creditedHit?: 0 | 1;                 // 1 if a hit was recorded on this play
  pitcherOutsRecordedThisPlay?: 0 | 1 | 2 | 3;

  // Optional current score snapshot (from LiveUpdate)
  homeScore?: number;
  awayScore?: number;
};

export type GameAlert = {
  type: string;         // "cycle-watch" | "cycle-achieved" | "no-hitter-watch" | ...
  note: string;
  at: string;

  // optional identifiers
  batterId?: string;
  batterName?: string;
  pitcherId?: string;
  pitcherName?: string;
  team?: 'home' | 'away';
  needs?: string;
  ipOuts?: number;
};

type HitType = '1B' | '2B' | '3B' | 'HR';

@Injectable()
export class AlertsService {
  private readonly log = new Logger(AlertsService.name);

  /** Cycle tracker: per game → per batter → set of hit types */
  private cycleHits = new Map<string, Map<string, Set<HitType>>>();

  /** No-hitter tracker (per game, per pitcher) */
  private pitcherHitsAllowed = new Map<string, Map<string, number>>();
  private pitcherOuts = new Map<string, Map<string, number>>();

  /** Last known score per game, for score / lead / tie alerts */
  private lastScores = new Map<string, { homeScore: number; awayScore: number }>();

  /** Team-level hits allowed (for combined no-hitter) */
  private teamHitsAllowed = new Map<string, { home: number; away: number }>();

  constructor(
    private readonly gw: RealtimeGateway,
    @InjectRepository(Alert) private readonly alertsRepo: Repository<Alert>,
  ) { }

  /** Call this for every play update */
  onPlay(gameId: string, u: PlayUpdate) {
    try {
      if (u.playResult && u.batterId) {
        this.trackCycle(gameId, u);
      }
      if (u.pitcherId) {
        this.trackNoHitter(gameId, u);
      }
      if (typeof u.homeScore === 'number' && typeof u.awayScore === 'number') {
        this.trackScoreChange(gameId, u);
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
    const all: HitType[] = ['1B', '2B', '3B', 'HR'];
    const miss = all.find(h => !have.has(h));
    return miss ?? null;
    // If null → have all four.
  }

  // ---------------- No-hitter detector (pitcher + combined team) ----------------

  private trackNoHitter(gameId: string, u: PlayUpdate) {
    const hitsByPitcher = this.ensureMap(this.pitcherHitsAllowed, gameId);
    const outsByPitcher = this.ensureMap(this.pitcherOuts, gameId);

    // ---- Identify pitching team ----
    // Top inning → Home is pitching
    // Bottom inning → Away is pitching
    const pitchingTeam: 'home' | 'away' = u.half === 'Top' ? 'home' : 'away';

    // ---- Ensure team hit counters exist ----
    let teamState = this.teamHitsAllowed.get(gameId);
    if (!teamState) {
      teamState = { home: 0, away: 0 };
      this.teamHitsAllowed.set(gameId, teamState);
    }

    // ---- Pitcher-level tracking ----
    const pitcherId = u.pitcherId!;
    const prevHits = hitsByPitcher.get(pitcherId) ?? 0;
    const inferredHit = u.creditedHit ?? this.inferHit(u);
    const newHits = prevHits + inferredHit;
    hitsByPitcher.set(pitcherId, newHits);

    const prevOuts = outsByPitcher.get(pitcherId) ?? 0;
    const addOuts = u.pitcherOutsRecordedThisPlay ?? this.inferOuts(u);
    const totalOuts = prevOuts + addOuts;
    outsByPitcher.set(pitcherId, totalOuts);

    // ---- TEAM-level hit assignment ----
    if (inferredHit) {
      teamState[pitchingTeam] += 1;
    }

    // ---- TEAM: combined no-hitter watch ----
    const teamHits = teamState[pitchingTeam];
    const teamOuts = Array.from(outsByPitcher.values()).reduce(
      (a, b) => a + b,
      0,
    );

    // Watch threshold: 7.0 IP (21 outs) and no hits allowed
    if (teamOuts >= 21 && teamHits === 0) {
      this.emitAlert(gameId, {
        type: 'team-no-hitter-watch',
        team: pitchingTeam,
        note: `${pitchingTeam === 'home' ? 'Home' : 'Away'} team has a combined no-hitter through ${this.formatIP(teamOuts)}.`,
        at: u.ts,
      });
    }

    // ---- TEAM: no-hitter broken ----
    if (teamHits === 1 && inferredHit) {
      this.emitAlert(gameId, {
        type: 'team-no-hitter-broken',
        team: pitchingTeam,
        note: `Combined no-hitter broken for the ${pitchingTeam === 'home' ? 'home' : 'away'} team.`,
        at: u.ts,
      });
    }

    // ---- Pitcher-level watch ----
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

    // ---- Pitcher-level broken ----
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

  // ---- helpers used by no-hitter logic ----

  private inferHit(u: PlayUpdate): 0 | 1 {
    const hit = this.mapPlayToHitType(u.playResult);
    return hit ? 1 : 0;
  }

  private inferOuts(u: PlayUpdate): 0 | 1 | 2 | 3 {
    // With real PBP, you'll have outs on play. For the stub, assume:
    if (u.playResult === 'Strikeout' || u.playResult === 'Out') return 1;
    return 0;
  }

  private formatIP(outs: number): string {
    const ip = Math.floor(outs / 3);
    const rem = outs % 3;
    return `${ip}.${rem}`; // e.g., 7.0, 7.1, 7.2
  }

  // ---------------- Score / lead / tie detector ----------------

  private trackScoreChange(gameId: string, u: PlayUpdate) {
    const home = u.homeScore ?? 0;
    const away = u.awayScore ?? 0;

    const previous = this.lastScores.get(gameId);
    this.lastScores.set(gameId, { homeScore: home, awayScore: away });

    // First time seeing this game → nothing to compare yet.
    if (!previous) {
      return;
    }

    // No actual score change
    if (previous.homeScore === home && previous.awayScore === away) {
      return;
    }

    const alerts: GameAlert[] = [];

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

    // Emit alerts using existing pipeline (publishGameUpdate + Alert entity)
    for (const payload of alerts) {
      void this.emitAlert(gameId, payload);
    }
  }

  // ---------------- Emit helper ----------------

  private async emitAlert(gameId: string, payload: GameAlert): Promise<void> {
    // still fully typed over the wire
    this.gw.publishGameUpdate(gameId, { alert: payload });

    // but relax typing for persistence until Alert.type is expanded
    await this.alertsRepo.save({
      gameId,
      type: payload.type as any,
      payload: payload as any,
    } as any);
  }

  // ---------------- Query helpers (for API / debugging) ----------------

  public async listRecentByGame(
    gameId: string,
    limit: number = 50,
  ): Promise<Alert[]> {
    const safeLimit: number = Math.min(Math.max(limit, 1), 200);

    return this.alertsRepo.find({
      where: { gameId },
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
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