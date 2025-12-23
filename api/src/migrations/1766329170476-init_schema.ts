import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1766329170476 implements MigrationInterface {
    name = 'InitSchema1766329170476'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_5bf65742f88ff4fdd73ef8a535\` ON \`games\``);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`homeName\``);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`homeName\` varchar(255) NOT NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_6b830fbece6bcd554d62f1cd5a\` ON \`games\``);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`awayName\``);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`awayName\` varchar(255) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_5bf65742f88ff4fdd73ef8a535\` ON \`games\` (\`homeName\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_6b830fbece6bcd554d62f1cd5a\` ON \`games\` (\`awayName\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_6b830fbece6bcd554d62f1cd5a\` ON \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_5bf65742f88ff4fdd73ef8a535\` ON \`games\``);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`awayName\``);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`awayName\` varchar(5) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_6b830fbece6bcd554d62f1cd5a\` ON \`games\` (\`awayName\`)`);
        await queryRunner.query(`ALTER TABLE \`games\` DROP COLUMN \`homeName\``);
        await queryRunner.query(`ALTER TABLE \`games\` ADD \`homeName\` varchar(5) NOT NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_5bf65742f88ff4fdd73ef8a535\` ON \`games\` (\`homeName\`)`);
    }

}
