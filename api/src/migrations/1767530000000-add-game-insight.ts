import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameInsight1767530000000 implements MigrationInterface {
  name = 'AddGameInsight1767530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`game_insight\` (
        \`id\`              INT NOT NULL AUTO_INCREMENT,
        \`providerGameId\`  VARCHAR(64) NOT NULL,
        \`atBatIndex\`      INT NOT NULL,
        \`createdAt\`       DATETIME NOT NULL,
        \`candidates\`      JSON NOT NULL,
        \`suggested\`       JSON NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_gi_providerGameId\` (\`providerGameId\`),
        UNIQUE INDEX \`IDX_gi_providerGameId_atBatIndex\` (\`providerGameId\`, \`atBatIndex\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`game_insight\``);
  }
}
