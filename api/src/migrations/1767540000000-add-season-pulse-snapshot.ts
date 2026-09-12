import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeasonPulseSnapshot1767540000000 implements MigrationInterface {
  name = 'AddSeasonPulseSnapshot1767540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`season_pulse_snapshot\` (
        \`id\`               INT NOT NULL AUTO_INCREMENT,
        \`teamId\`           INT NOT NULL,
        \`computedAt\`       DATETIME NOT NULL,
        \`overallRank\`      INT NOT NULL,
        \`overallPrevRank\`  INT NOT NULL,
        \`runDiff\`          FLOAT NOT NULL,
        \`weeklyRanks\`      JSON NOT NULL,
        \`offenseRank\`      INT NOT NULL,
        \`offensePrevRank\`  INT NOT NULL,
        \`offenseStat\`      FLOAT NOT NULL,
        \`startingRank\`     INT NULL,
        \`startingPrevRank\` INT NULL,
        \`startingStat\`     FLOAT NULL,
        \`bullpenRank\`      INT NULL,
        \`bullpenPrevRank\`  INT NULL,
        \`bullpenStat\`      FLOAT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_sps_teamId\` (\`teamId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`season_pulse_snapshot\``);
  }
}
