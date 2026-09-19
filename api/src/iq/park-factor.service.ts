import { Injectable, Logger } from '@nestjs/common';
import { MlbApiService, VenueFieldInfo } from '../providers/mlb/mlb.service';
import { ParkFactorResult } from './iq.types';

const G_FT_S2 = 32.174;
const MPH_TO_FTS = 1.46667;
// Real batted balls carry farther than vacuum projectile range because backspin
// generates lift that outweighs drag for a well-struck fly ball. This constant is
// an approximation from batted-ball physics literature (Nathan et al.), not fit to
// this app's own data. Treat carry-distance output as a rough estimate — no wind,
// temperature, altitude, or spray-angle modeling in this v1.
const CARRY_LIFT_FACTOR = 1.4;
// The vacuum-projectile formula peaks at a 45° launch angle, which real
// well-struck home runs rarely use (they cluster 20-35°) — fed a real exit
// velo at an angle nearer 45°, it can output a distance beyond anything that
// has ever actually happened in MLB. Statcast's verified longest home run is
// ~505 ft (Stanton, 2016); anything past this ceiling means the estimate
// itself is unreliable for this contact, not that a real, longer ball was hit.
const MAX_PLAUSIBLE_CARRY_FT = 550;

export interface BattedBallInput {
  exitVeloMph: number;
  launchAngleDeg: number;
}

@Injectable()
export class ParkFactorService {
  private readonly log = new Logger(ParkFactorService.name);

  constructor(private readonly mlb: MlbApiService) {}

  estimateCarryDistanceFt(ball: BattedBallInput): number {
    const v = ball.exitVeloMph * MPH_TO_FTS;
    const theta = (ball.launchAngleDeg * Math.PI) / 180;
    const vacuumRangeFt = (v * v * Math.sin(2 * theta)) / G_FT_S2;
    return Math.max(0, vacuumRangeFt * CARRY_LIFT_FACTOR);
  }

  private effectiveWallFt(info: VenueFieldInfo): number | null {
    const values = [
      info.leftLineFt,
      info.leftCenterFt,
      info.centerFt,
      info.rightCenterFt,
      info.rightLineFt,
    ].filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * "Would this batted ball clear the wall in N of 30 parks" — compares estimated
   * carry distance against each park's AVERAGE fence distance (line/gap/center),
   * since spray angle (pull vs. opposite field) isn't reliably available from the
   * current feed. This is deliberately a rough, single-number park factor, not a
   * true per-angle model.
   */
  async evaluateAgainstAllParks(
    ball: BattedBallInput,
  ): Promise<ParkFactorResult | null> {
    try {
      const distanceFt = this.estimateCarryDistanceFt(ball);
      if (distanceFt > MAX_PLAUSIBLE_CARRY_FT) {
        this.log.warn(
          `carry distance estimate ${Math.round(distanceFt)}ft exceeds plausible ceiling ` +
            `(exitVelo=${ball.exitVeloMph}mph, launchAngle=${ball.launchAngleDeg}deg) — treating as unreliable`,
        );
        return null;
      }

      const venueIds = await this.mlb.getAllTeamVenueIds();
      if (venueIds.size === 0) return null;

      const infos = await Promise.all(
        Array.from(new Set(venueIds.values())).map((id) =>
          this.mlb.getVenueFieldInfo(id),
        ),
      );

      let wouldClear = 0;
      let total = 0;

      for (const info of infos) {
        if (info == null) continue;
        const wall = this.effectiveWallFt(info);
        if (wall == null) continue;
        total += 1;
        if (distanceFt >= wall) wouldClear += 1;
      }

      if (total === 0) return null;

      return {
        wouldClearParks: wouldClear,
        totalParks: total,
        distanceFt: Math.round(distanceFt),
      };
    } catch (e: unknown) {
      this.log.warn(
        `park factor evaluation failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }
}
