import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZonePitchMix1767510000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`statcast_batter_summary\`
       ADD COLUMN \`inZonePitchMix\`  JSON NULL,
       ADD COLUMN \`outZonePitchMix\` JSON NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`statcast_batter_summary\`
       DROP COLUMN \`inZonePitchMix\`,
       DROP COLUMN \`outZonePitchMix\``,
    );
  }
}
