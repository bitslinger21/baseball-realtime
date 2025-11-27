import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1764261017017 implements MigrationInterface {
    name = 'InitSchema1764261017017'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_1071855291c8dc01aa15f457b7\` ON \`alerts\``);
        await queryRunner.query(`DROP INDEX \`IDX_b5262085cf88e336618af2cc68\` ON \`alerts\``);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`startTimeUtc\``);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`startTimeUtc\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`snapshot\``);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`snapshot\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`alerts\` DROP COLUMN \`gameId\``);
        await queryRunner.query(`ALTER TABLE \`alerts\` ADD \`gameId\` varchar(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`alerts\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`alerts\` ADD \`type\` varchar(64) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`alerts\` CHANGE \`payload\` \`payload\` json NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`alerts\` CHANGE \`createdAt\` \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`alerts\` CHANGE \`createdAt\` \`createdAt\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`alerts\` CHANGE \`payload\` \`payload\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`alerts\` DROP COLUMN \`type\``);
        await queryRunner.query(`ALTER TABLE \`alerts\` ADD \`type\` varchar(40) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`alerts\` DROP COLUMN \`gameId\``);
        await queryRunner.query(`ALTER TABLE \`alerts\` ADD \`gameId\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`snapshot\``);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`snapshot\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`startTimeUtc\``);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`startTimeUtc\` timestamp NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_b5262085cf88e336618af2cc68\` ON \`alerts\` (\`type\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_1071855291c8dc01aa15f457b7\` ON \`alerts\` (\`gameId\`)`);
    }

}
