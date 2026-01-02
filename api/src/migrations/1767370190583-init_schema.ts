import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1767370190583 implements MigrationInterface {
    name = 'InitSchema1767370190583'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`homeScore\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`awayScore\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`awayScore\``);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`homeScore\``);
    }

}
