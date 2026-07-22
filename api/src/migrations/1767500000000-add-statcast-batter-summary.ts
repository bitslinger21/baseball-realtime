import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatcastBatterSummary1767500000000 implements MigrationInterface {
  name = 'AddStatcastBatterSummary1767500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`statcast_batter_summary\` (
        \`id\`              INT NOT NULL AUTO_INCREMENT,
        \`mlbId\`           INT NOT NULL,
        \`season\`          INT NOT NULL,
        \`fetchedAt\`       DATETIME NOT NULL,
        \`pitchCount\`      INT NOT NULL DEFAULT 0,
        \`pitchMix\`        JSON,
        \`zoneSlg\`         JSON,
        \`countTendencies\` JSON,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_sbs_mlbId\` (\`mlbId\`),
        UNIQUE INDEX \`IDX_sbs_mlbId_season\` (\`mlbId\`, \`season\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`statcast_batter_summary\``);
  }
}
