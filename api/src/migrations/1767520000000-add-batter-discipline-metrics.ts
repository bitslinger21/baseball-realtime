import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatterDisciplineMetrics1767520000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`statcast_batter_summary\`
       ADD COLUMN \`pitchesSeen\`    INT NOT NULL DEFAULT 0,
       ADD COLUMN \`battedBalls\`    INT NOT NULL DEFAULT 0,
       ADD COLUMN \`chasePct\`       FLOAT NULL,
       ADD COLUMN \`whiffPct\`       FLOAT NULL,
       ADD COLUMN \`contactPct\`     FLOAT NULL,
       ADD COLUMN \`swingPct\`       FLOAT NULL,
       ADD COLUMN \`exitVeloAvg\`    FLOAT NULL,
       ADD COLUMN \`exitVeloMax\`    FLOAT NULL,
       ADD COLUMN \`hardHitPct\`     FLOAT NULL,
       ADD COLUMN \`barrelPct\`      FLOAT NULL,
       ADD COLUMN \`launchAngleAvg\` FLOAT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`statcast_batter_summary\`
       DROP COLUMN \`pitchesSeen\`,
       DROP COLUMN \`battedBalls\`,
       DROP COLUMN \`chasePct\`,
       DROP COLUMN \`whiffPct\`,
       DROP COLUMN \`contactPct\`,
       DROP COLUMN \`swingPct\`,
       DROP COLUMN \`exitVeloAvg\`,
       DROP COLUMN \`exitVeloMax\`,
       DROP COLUMN \`hardHitPct\`,
       DROP COLUMN \`barrelPct\`,
       DROP COLUMN \`launchAngleAvg\``,
    );
  }
}
