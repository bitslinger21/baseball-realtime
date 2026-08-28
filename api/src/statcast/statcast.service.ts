import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  StatcastBatterSummary,
  PitchTypeSummaryRow,
  CountTendencyRow,
} from '../persistence/entities/statcast-batter-summary.entity';
import { BatterMetricsDto, StatcastSummaryDto } from './dtos/statcast-summary.dto';

// ── Constants ────────────────────────────────────────────────────────────────

const SAVANT_CSV_URL = (mlbId: number, season: number) =>
  `https://baseballsavant.mlb.com/statcast_search/csv?all=true&type=details` +
  `&player_type=batter&game_type=R&hfSea=${season}%7C&batters_lookup%5B%5D=${mlbId}`;

const SPARSE_THRESHOLD = 100;
const ZONE_MIN_AB = 5; // minimum ABs for a zone SLG to be reported
// 2026 ABS: plate_z moves from front-of-plate to mid-plate reference.
// Pitches in 2025 and earlier were measured ~1 inch (≈0.083 ft) earlier in the
// ball's path, so we shift them forward to match 2026 coordinates.
const ABS_TRANSFORM_YEAR = 2026;
const ABS_PLATE_Z_CORRECTION_FT = 0.083;
const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

const WHIFF_DESCRIPTIONS = new Set([
  'swinging_strike',
  'swinging_strike_blocked',
  'missed_bunt',
]);
const SWING_DESCRIPTIONS = new Set([
  'swinging_strike',
  'swinging_strike_blocked',
  'foul',
  'foul_tip',
  'hit_into_play',
  'hit_into_play_score',
  'hit_into_play_no_out',
  'foul_bunt',
  'missed_bunt',
  'bunt_foul_tip',
]);
const SLG_BASES: Record<string, number> = {
  single: 1,
  double: 2,
  triple: 3,
  home_run: 4,
};
const AB_EVENTS = new Set([
  'single',
  'double',
  'triple',
  'home_run',
  'field_out',
  'strikeout',
  'double_play',
  'grounded_into_double_play',
  'force_out',
  'field_error',
  'fielders_choice',
  'fielders_choice_out',
  'strikeout_double_play',
  'triple_play',
]);

const DISCIPLINE_MIN_PITCHES = 100;
const CONTACT_MIN_BATTED = 25;
const LEAGUE_MIN_BATTERS = 30; // minimum ingested batters before league averages are reported

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  result.push(cell.trim());
  return result;
}

type SavantRow = Record<string, string>;

function parseSavantCsv(text: string): SavantRow[] {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: SavantRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const row: SavantRow = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

// ── Zone helpers ──────────────────────────────────────────────────────────────

// Returns zone index 0–8 or null if out of zone.
// Index layout matches StrikeZone's CSS grid (top-to-bottom = high-to-low):
//   0 1 2  ← high
//   3 4 5  ← mid
//   6 7 8  ← low
function assignZone(
  plateX: number,
  plateZ: number,
  szTop: number,
  szBot: number,
): number | null {
  if (!isFinite(plateX) || !isFinite(plateZ) || szTop <= szBot) return null;
  if (plateX < -0.83 || plateX > 0.83) return null;
  const zNorm = (plateZ - szBot) / (szTop - szBot);
  if (zNorm < 0 || zNorm > 1) return null;
  const row = zNorm > 0.67 ? 0 : zNorm > 0.33 ? 1 : 2; // 0=high, 2=low
  const col = plateX < -0.28 ? 0 : plateX > 0.28 ? 2 : 1;
  return row * 3 + col;
}

// ── Discipline + contact metrics ─────────────────────────────────────────────

type BatterDisciplineRaw = {
  pitchesSeen: number;
  chasePct: number | null;
  whiffPct: number | null;
  contactPct: number | null;
  swingPct: number | null;
};

type BatterContactRaw = {
  battedBalls: number;
  exitVeloAvg: number | null;
  exitVeloMax: number | null;
  hardHitPct: number | null;
  barrelPct: number | null;
  launchAngleAvg: number | null;
};

function computeBatterDiscipline(rows: SavantRow[]): BatterDisciplineRaw {
  let pitchesSeen = 0;
  let swings = 0;
  let whiffs = 0;
  let outZonePitches = 0;
  let outZoneSwings = 0;

  for (const r of rows) {
    const desc = r['description'] ?? '';
    const zone = parseInt(r['zone'] ?? '0', 10);
    if (!zone) continue; // skip rows without zone info

    pitchesSeen++;
    const isSwing = SWING_DESCRIPTIONS.has(desc);
    const isWhiff = WHIFF_DESCRIPTIONS.has(desc);
    const isOutZone = zone >= 11; // 11-14 = out of zone in Savant encoding

    if (isSwing) swings++;
    if (isWhiff) whiffs++;
    if (isOutZone) {
      outZonePitches++;
      if (isSwing) outZoneSwings++;
    }
  }

  if (pitchesSeen < DISCIPLINE_MIN_PITCHES) {
    return { pitchesSeen, chasePct: null, whiffPct: null, contactPct: null, swingPct: null };
  }

  const whiffPct = swings >= 5 ? round1(whiffs / swings * 100) : null;
  return {
    pitchesSeen,
    chasePct: outZonePitches >= 5 ? round1(outZoneSwings / outZonePitches * 100) : null,
    whiffPct,
    contactPct: whiffPct != null ? round1(100 - whiffPct) : null,
    swingPct: round1(swings / pitchesSeen * 100),
  };
}

function computeBatterContact(rows: SavantRow[]): BatterContactRaw {
  let battedBalls = 0;
  let veloSum = 0;
  let veloMax = -Infinity;
  let hardHits = 0;
  let barrels = 0;
  let angleSum = 0;
  let angleN = 0;

  for (const r of rows) {
    const speed = parseFloat(r['launch_speed'] ?? '');
    if (!isFinite(speed) || speed <= 0) continue; // non-batted-ball pitch

    battedBalls++;
    veloSum += speed;
    if (speed > veloMax) veloMax = speed;
    if (speed >= 95) hardHits++;
    if (r['launch_speed_angle'] === '6') barrels++; // 6 = Barrel in Savant classification

    const angle = parseFloat(r['launch_angle'] ?? '');
    if (isFinite(angle)) { angleSum += angle; angleN++; }
  }

  if (battedBalls < CONTACT_MIN_BATTED) {
    return { battedBalls, exitVeloAvg: null, exitVeloMax: null, hardHitPct: null, barrelPct: null, launchAngleAvg: null };
  }

  return {
    battedBalls,
    exitVeloAvg: round1(veloSum / battedBalls),
    exitVeloMax: round1(veloMax),
    hardHitPct: round1(hardHits / battedBalls * 100),
    barrelPct: round1(barrels / battedBalls * 100),
    launchAngleAvg: angleN > 0 ? round1(angleSum / angleN) : null,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function computePitchMix(rows: SavantRow[]): PitchTypeSummaryRow[] {
  const map = new Map<
    string,
    {
      name: string;
      count: number;
      veloSum: number;
      veloN: number;
      spinSum: number;
      spinN: number;
      swings: number;
      whiffs: number;
    }
  >();

  for (const r of rows) {
    const code = r['pitch_type'];
    if (!code || code === 'null' || code === '') continue;
    const name = r['pitch_name'] || code;
    const desc = r['description'] ?? '';
    const velo = parseFloat(r['release_speed'] ?? '');
    const spin = parseFloat(r['release_spin_rate'] ?? '');

    if (!map.has(code)) {
      map.set(code, {
        name,
        count: 0,
        veloSum: 0,
        veloN: 0,
        spinSum: 0,
        spinN: 0,
        swings: 0,
        whiffs: 0,
      });
    }
    const entry = map.get(code)!;
    entry.count++;
    if (isFinite(velo)) { entry.veloSum += velo; entry.veloN++; }
    if (isFinite(spin)) { entry.spinSum += spin; entry.spinN++; }
    if (SWING_DESCRIPTIONS.has(desc)) entry.swings++;
    if (WHIFF_DESCRIPTIONS.has(desc)) entry.whiffs++;
  }

  const total = rows.filter(r => r['pitch_type'] && r['pitch_type'] !== 'null').length;
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([code, d]): PitchTypeSummaryRow => ({
      code,
      name: d.name,
      pct: total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0,
      avgVelo: d.veloN > 0 ? Math.round((d.veloSum / d.veloN) * 10) / 10 : null,
      avgSpin: d.spinN > 0 ? Math.round(d.spinSum / d.spinN) : null,
      whiffPct:
        d.swings >= 5
          ? Math.round((d.whiffs / d.swings) * 1000) / 10
          : null,
      count: d.count,
    }));
}

function computeZoneSlg(rows: SavantRow[]): (number | null)[] {
  type ZoneBucket = { bases: number; ab: number };
  const zones: ZoneBucket[] = Array.from({ length: 9 }, () => ({
    bases: 0,
    ab: 0,
  }));

  for (const r of rows) {
    const events = r['events']?.trim();
    if (!events || events === 'null') continue;
    if (!AB_EVENTS.has(events)) continue;

    const px = parseFloat(r['plate_x'] ?? '');
    const pz = parseFloat(r['plate_z'] ?? '');
    const szTop = parseFloat(r['sz_top'] ?? '');
    const szBot = parseFloat(r['sz_bot'] ?? '');
    const year = parseInt(r['game_year'] ?? '0');

    // Normalize to 2026 mid-plate reference
    const pzNorm = year >= ABS_TRANSFORM_YEAR ? pz : pz + ABS_PLATE_Z_CORRECTION_FT;

    const zoneIdx = assignZone(px, pzNorm, szTop, szBot);
    if (zoneIdx === null) continue;

    zones[zoneIdx].ab++;
    zones[zoneIdx].bases += SLG_BASES[events] ?? 0;
  }

  return zones.map(z =>
    z.ab >= ZONE_MIN_AB
      ? Math.round((z.bases / z.ab) * 1000) / 1000
      : null,
  );
}

function computeZonePitchMix(rows: SavantRow[], inZone: boolean): PitchTypeSummaryRow[] {
  const filtered = rows.filter(r => {
    const px = parseFloat(r['plate_x'] ?? '');
    const pz = parseFloat(r['plate_z'] ?? '');
    const szTop = parseFloat(r['sz_top'] ?? '');
    const szBot = parseFloat(r['sz_bot'] ?? '');
    const year = parseInt(r['game_year'] ?? '0');
    const pzNorm = year >= ABS_TRANSFORM_YEAR ? pz : pz + ABS_PLATE_Z_CORRECTION_FT;
    const zone = assignZone(px, pzNorm, szTop, szBot);
    return inZone ? zone !== null : zone === null;
  });
  return computePitchMix(filtered);
}

function computeCountTendencies(rows: SavantRow[]): CountTendencyRow[] {
  // Map key: `${balls}-${strikes}`
  const countMap = new Map<string, Map<string, number>>();

  for (const r of rows) {
    const code = r['pitch_type'];
    if (!code || code === 'null' || code === '') continue;
    const balls = r['balls'] ?? '';
    const strikes = r['strikes'] ?? '';
    if (balls === '' || strikes === '') continue;

    const key = `${balls}-${strikes}`;
    if (!countMap.has(key)) countMap.set(key, new Map());
    const pm = countMap.get(key)!;
    pm.set(code, (pm.get(code) ?? 0) + 1);
  }

  const results: CountTendencyRow[] = [];
  for (const [key, pitchMap] of countMap.entries()) {
    const [b, s] = key.split('-').map(Number);
    const total = [...pitchMap.values()].reduce((a, c) => a + c, 0);
    if (total < 10) continue;

    const pitches = [...pitchMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([code, cnt]) => ({
        code,
        pct: Math.round((cnt / total) * 1000) / 10,
      }));

    results.push({ balls: b, strikes: s, pitches });
  }

  // Sort: 0-0, 0-1, 0-2, 1-0, 1-1, … canonical count order
  results.sort((a, b) => a.balls - b.balls || a.strikes - b.strikes);
  return results;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class StatcastService {
  private readonly log = new Logger(StatcastService.name);

  constructor(
    @InjectRepository(StatcastBatterSummary)
    private readonly repo: Repository<StatcastBatterSummary>,
    @InjectQueue('statcast-ingest')
    private readonly queue: Queue,
  ) {}

  async getOrTriggerIngest(
    mlbId: number,
    season: number,
  ): Promise<StatcastSummaryDto> {
    const row = await this.repo.findOne({ where: { mlbId, season } });

    if (!row) {
      await this.enqueueIngest(mlbId, season);
      return this.emptyDto(mlbId, season, true);
    }

    // Re-ingest if stale or if row predates discipline-metrics computation (pitchesSeen still 0).
    const metricsStale = row.pitchCount > 0 && !row.pitchesSeen;
    if (Date.now() - row.fetchedAt.getTime() > STALE_MS || metricsStale) {
      void this.enqueueIngest(mlbId, season);
    }

    const leagueCtx = await this.getLeagueContext(season);
    // Signal the client to re-poll when metrics are actively being computed for the first time
    return this.rowToDto(row, leagueCtx, metricsStale);
  }

  async enqueueIngest(mlbId: number, season: number): Promise<void> {
    await this.queue.add(
      'ingest-batter',
      { mlbId, season },
      {
        jobId: `statcast-${mlbId}-${season}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.log.log(`Enqueued ingest for mlbId=${mlbId} season=${season}`);
  }

  async getAllKnownSummaries(): Promise<{ mlbId: number; season: number }[]> {
    return this.repo.find({ select: ['mlbId', 'season'] });
  }

  async ingestPlayer(mlbId: number, season: number): Promise<void> {
    this.log.log(`Ingesting Savant data for mlbId=${mlbId} season=${season}`);
    const csv = await this.fetchSavantCsv(mlbId, season);

    if (!csv.startsWith('pitch_type,') && !csv.startsWith('"pitch_type",')) {
      throw new Error(
        `Unexpected Savant response for mlbId=${mlbId}: ${csv.substring(0, 120)}`,
      );
    }

    const rows = parseSavantCsv(csv);
    const valid = rows.filter(
      r => r['pitch_type'] && r['pitch_type'] !== 'null' && r['pitch_type'] !== '',
    );

    this.log.log(
      `Parsed ${valid.length} pitches for mlbId=${mlbId} season=${season}`,
    );

    const pitchMix = computePitchMix(valid);
    const zoneSlg = computeZoneSlg(valid);
    const countTendencies = computeCountTendencies(valid);
    const inZonePitchMix = computeZonePitchMix(valid, true);
    const outZonePitchMix = computeZonePitchMix(valid, false);
    const discipline = computeBatterDiscipline(valid);
    const contact = computeBatterContact(valid);

    await this.repo.upsert(
      {
        mlbId,
        season,
        fetchedAt: new Date(),
        pitchCount: valid.length,
        pitchMix,
        zoneSlg,
        countTendencies,
        inZonePitchMix,
        outZonePitchMix,
        pitchesSeen: discipline.pitchesSeen,
        chasePct: discipline.chasePct,
        whiffPct: discipline.whiffPct,
        contactPct: discipline.contactPct,
        swingPct: discipline.swingPct,
        battedBalls: contact.battedBalls,
        exitVeloAvg: contact.exitVeloAvg,
        exitVeloMax: contact.exitVeloMax,
        hardHitPct: contact.hardHitPct,
        barrelPct: contact.barrelPct,
        launchAngleAvg: contact.launchAngleAvg,
      },
      { conflictPaths: ['mlbId', 'season'] },
    );

    this.log.log(
      `Saved statcast summary for mlbId=${mlbId} season=${season} (${valid.length} pitches)`,
    );
  }

  private async fetchSavantCsv(mlbId: number, season: number): Promise<string> {
    const url = SAVANT_CSV_URL(mlbId, season);
    this.log.log(`Fetching ${url}`);
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'baseball-realtime/dev (personal use)' },
    });
    if (!resp.ok) {
      throw new Error(`Savant fetch failed: HTTP ${resp.status} for mlbId=${mlbId}`);
    }
    return resp.text();
  }

  /** Fetch all stored batter summaries for a season and compute league averages + percentile ranks. */
  private async getLeagueContext(season: number): Promise<LeagueContext> {
    const allRows = await this.repo.find({
      where: { season },
      select: [
        'mlbId', 'pitchesSeen', 'battedBalls',
        'chasePct', 'whiffPct', 'contactPct', 'swingPct',
        'exitVeloAvg', 'hardHitPct', 'barrelPct', 'launchAngleAvg',
      ],
    });

    const disciplinePeers = allRows.filter(r => (r.pitchesSeen ?? 0) >= DISCIPLINE_MIN_PITCHES);
    const contactPeers    = allRows.filter(r => (r.battedBalls  ?? 0) >= CONTACT_MIN_BATTED);

    const lgAvg = (vals: (number | null)[], minN = LEAGUE_MIN_BATTERS): number | null => {
      const valid = vals.filter((v): v is number => v != null);
      if (valid.length < minN) return null;
      return round1(valid.reduce((a, b) => a + b, 0) / valid.length);
    };

    // For percentiles: higher rank = better player. Invert for lower-is-better metrics.
    const pctRank = (
      sortedAsc: number[],
      value: number | null,
      higherIsBetter: boolean,
    ): number | null => {
      if (value == null || sortedAsc.length < LEAGUE_MIN_BATTERS) return null;
      const below = sortedAsc.filter(v => v < value).length;
      const raw = Math.round((below / sortedAsc.length) * 100);
      return higherIsBetter ? raw : 100 - raw;
    };

    const sorted = <K extends keyof StatcastBatterSummary>(
      peers: StatcastBatterSummary[],
      key: K,
    ) =>
      peers
        .map(r => r[key] as number | null)
        .filter((v): v is number => v != null)
        .sort((a, b) => a - b);

    return {
      lgChasePct:       lgAvg(disciplinePeers.map(r => r.chasePct)),
      lgWhiffPct:       lgAvg(disciplinePeers.map(r => r.whiffPct)),
      lgContactPct:     lgAvg(disciplinePeers.map(r => r.contactPct)),
      lgSwingPct:       lgAvg(disciplinePeers.map(r => r.swingPct)),
      lgExitVeloAvg:    lgAvg(contactPeers.map(r => r.exitVeloAvg)),
      lgHardHitPct:     lgAvg(contactPeers.map(r => r.hardHitPct)),
      lgBarrelPct:      lgAvg(contactPeers.map(r => r.barrelPct)),
      lgLaunchAngleAvg: lgAvg(contactPeers.map(r => r.launchAngleAvg)),
      sortedChasePct:    sorted(disciplinePeers, 'chasePct'),
      sortedWhiffPct:    sorted(disciplinePeers, 'whiffPct'),
      sortedContactPct:  sorted(disciplinePeers, 'contactPct'),
      sortedSwingPct:    sorted(disciplinePeers, 'swingPct'),
      sortedExitVeloAvg: sorted(contactPeers, 'exitVeloAvg'),
      sortedHardHitPct:  sorted(contactPeers, 'hardHitPct'),
      sortedBarrelPct:   sorted(contactPeers, 'barrelPct'),
      sortedLaunchAngle: sorted(contactPeers, 'launchAngleAvg'),
      pctRank,
    };
  }

  private rowToDto(row: StatcastBatterSummary, league?: LeagueContext, pendingIngest?: boolean): StatcastSummaryDto {
    let batterMetrics: BatterMetricsDto | null = null;
    if (league) {
      const p = league.pctRank;
      batterMetrics = {
        pitchesSeen: row.pitchesSeen ?? 0,
        battedBalls:  row.battedBalls  ?? 0,
        chasePct:     row.chasePct,
        whiffPct:     row.whiffPct,
        contactPct:   row.contactPct,
        swingPct:     row.swingPct,
        exitVeloAvg:  row.exitVeloAvg,
        exitVeloMax:  row.exitVeloMax,
        hardHitPct:   row.hardHitPct,
        barrelPct:    row.barrelPct,
        launchAngleAvg: row.launchAngleAvg,
        lgChasePct:       league.lgChasePct,
        lgWhiffPct:       league.lgWhiffPct,
        lgContactPct:     league.lgContactPct,
        lgSwingPct:       league.lgSwingPct,
        lgExitVeloAvg:    league.lgExitVeloAvg,
        lgHardHitPct:     league.lgHardHitPct,
        lgBarrelPct:      league.lgBarrelPct,
        lgLaunchAngleAvg: league.lgLaunchAngleAvg,
        pctChasePct:    p(league.sortedChasePct,    row.chasePct,     false),
        pctWhiffPct:    p(league.sortedWhiffPct,    row.whiffPct,     false),
        pctContactPct:  p(league.sortedContactPct,  row.contactPct,   true),
        pctSwingPct:    p(league.sortedSwingPct,    row.swingPct,     true),
        pctExitVeloAvg: p(league.sortedExitVeloAvg, row.exitVeloAvg,  true),
        pctHardHitPct:  p(league.sortedHardHitPct,  row.hardHitPct,   true),
        pctBarrelPct:   p(league.sortedBarrelPct,   row.barrelPct,    true),
        pctLaunchAngleAvg: p(league.sortedLaunchAngle, row.launchAngleAvg, true),
      };
    }

    return {
      mlbId: row.mlbId,
      season: row.season,
      fetchedAt: row.fetchedAt.toISOString(),
      pitchCount: row.pitchCount,
      sparse: row.pitchCount < SPARSE_THRESHOLD,
      pendingIngest: pendingIngest || undefined,
      pitchMix: row.pitchMix ?? [],
      zoneSlg: row.zoneSlg ?? Array(9).fill(null),
      countTendencies: row.countTendencies ?? [],
      inZonePitchMix: row.inZonePitchMix ?? [],
      outZonePitchMix: row.outZonePitchMix ?? [],
      batterMetrics,
    };
  }

  private emptyDto(
    mlbId: number,
    season: number,
    pendingIngest: boolean,
  ): StatcastSummaryDto {
    return {
      mlbId,
      season,
      fetchedAt: new Date().toISOString(),
      pitchCount: 0,
      sparse: true,
      pendingIngest,
      pitchMix: [],
      zoneSlg: Array(9).fill(null),
      countTendencies: [],
      inZonePitchMix: [],
      outZonePitchMix: [],
      batterMetrics: null,
    };
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeagueContext {
  lgChasePct:       number | null;
  lgWhiffPct:       number | null;
  lgContactPct:     number | null;
  lgSwingPct:       number | null;
  lgExitVeloAvg:    number | null;
  lgHardHitPct:     number | null;
  lgBarrelPct:      number | null;
  lgLaunchAngleAvg: number | null;
  sortedChasePct:    number[];
  sortedWhiffPct:    number[];
  sortedContactPct:  number[];
  sortedSwingPct:    number[];
  sortedExitVeloAvg: number[];
  sortedHardHitPct:  number[];
  sortedBarrelPct:   number[];
  sortedLaunchAngle: number[];
  pctRank: (sortedAsc: number[], value: number | null, higherIsBetter: boolean) => number | null;
}
