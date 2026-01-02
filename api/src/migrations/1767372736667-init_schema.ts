import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1767372736667 implements MigrationInterface {
    name = 'InitSchema1767372736667'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`games\` ADD UNIQUE INDEX \`IDX_f4ad0814dd46f134c46803ab7f\` (\`providerGameId\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`games\` DROP INDEX \`IDX_f4ad0814dd46f134c46803ab7f\``);
    }

}
