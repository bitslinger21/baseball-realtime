import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1761517686370 implements MigrationInterface {
    name = 'InitSchema1761517686370'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`games\` (\`id\` varchar(36) NOT NULL, \`gameDate\` date NOT NULL, \`homeAbbr\` varchar(5) NOT NULL, \`awayAbbr\` varchar(5) NOT NULL, \`status\` varchar(20) NOT NULL, \`startTimeUtc\` timestamp NULL, \`snapshot\` json NULL, INDEX \`IDX_ff8871185b78ee757de1f1fb12\` (\`gameDate\`), INDEX \`IDX_0e1c7c502f997a45e8ad5e3677\` (\`homeAbbr\`), INDEX \`IDX_2de7762f933945ec9ed90a86a4\` (\`awayAbbr\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`alerts\` (\`id\` varchar(36) NOT NULL, \`gameId\` varchar(255) NOT NULL, \`type\` varchar(40) NOT NULL, \`payload\` json NULL, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX \`IDX_1071855291c8dc01aa15f457b7\` (\`gameId\`), INDEX \`IDX_b5262085cf88e336618af2cc68\` (\`type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_b5262085cf88e336618af2cc68\` ON \`alerts\``);
        await queryRunner.query(`DROP INDEX \`IDX_1071855291c8dc01aa15f457b7\` ON \`alerts\``);
        await queryRunner.query(`DROP TABLE \`alerts\``);
        await queryRunner.query(`DROP INDEX \`IDX_2de7762f933945ec9ed90a86a4\` ON \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_0e1c7c502f997a45e8ad5e3677\` ON \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_ff8871185b78ee757de1f1fb12\` ON \`games\``);
        await queryRunner.query(`DROP TABLE \`games\``);
    }

}
