import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClip1767550000000 implements MigrationInterface {
  name = 'AddClip1767550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`clip\` (
        \`id\`            VARCHAR(191) NOT NULL,
        \`gameId\`        VARCHAR(64) NOT NULL,
        \`atBatIndex\`    INT NULL,
        \`inning\`        INT NULL,
        \`half\`          VARCHAR(8) NULL,
        \`title\`         VARCHAR(255) NOT NULL,
        \`description\`   TEXT NOT NULL,
        \`durationSec\`   INT NOT NULL,
        \`mp4Url\`        VARCHAR(512) NOT NULL,
        \`thumbnailUrl\`  VARCHAR(512) NULL,
        \`players\`       JSON NOT NULL,
        \`scoreAfter\`    JSON NULL,
        \`publishedAt\`   DATETIME NOT NULL,
        \`createdAt\`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_clip_gameId\` (\`gameId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`clip\``);
  }
}
