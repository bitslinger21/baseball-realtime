import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1791716833680 implements MigrationInterface {
    name = 'Baseline1791716833680'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`statcast_batter_summary\` (\`id\` int NOT NULL AUTO_INCREMENT, \`mlbId\` int NOT NULL, \`season\` int NOT NULL, \`fetchedAt\` datetime NOT NULL, \`pitchCount\` int NOT NULL DEFAULT '0', \`pitchMix\` json NULL, \`zoneSlg\` json NULL, \`countTendencies\` json NULL, \`inZonePitchMix\` json NULL, \`outZonePitchMix\` json NULL, \`pitchesSeen\` int NOT NULL DEFAULT '0', \`chasePct\` float NULL, \`whiffPct\` float NULL, \`contactPct\` float NULL, \`swingPct\` float NULL, \`battedBalls\` int NOT NULL DEFAULT '0', \`exitVeloAvg\` float NULL, \`exitVeloMax\` float NULL, \`hardHitPct\` float NULL, \`barrelPct\` float NULL, \`launchAngleAvg\` float NULL, INDEX \`IDX_51b94215fd6c2c28df48756fe8\` (\`mlbId\`), UNIQUE INDEX \`IDX_f424799fc7d1f3bf0e74125602\` (\`mlbId\`, \`season\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`season_pulse_snapshot\` (\`id\` int NOT NULL AUTO_INCREMENT, \`teamId\` int NOT NULL, \`computedAt\` datetime NOT NULL, \`overallRank\` int NOT NULL, \`overallPrevRank\` int NOT NULL, \`runDiff\` float NOT NULL, \`weeklyRanks\` json NOT NULL, \`offenseRank\` int NOT NULL, \`offensePrevRank\` int NOT NULL, \`offenseStat\` float NOT NULL, \`startingRank\` int NULL, \`startingPrevRank\` int NULL, \`startingStat\` float NULL, \`bullpenRank\` int NULL, \`bullpenPrevRank\` int NULL, \`bullpenStat\` float NULL, UNIQUE INDEX \`IDX_5dd58ccb60359f27f37d52ffe6\` (\`teamId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`games\` (\`id\` varchar(36) NOT NULL, \`providerGameId\` varchar(255) NOT NULL, \`gameDate\` date NOT NULL, \`homeAbbr\` varchar(5) NOT NULL, \`awayAbbr\` varchar(5) NOT NULL, \`homeName\` varchar(255) NOT NULL, \`awayName\` varchar(255) NOT NULL, \`status\` varchar(20) NOT NULL, \`startTimeUtc\` datetime NULL, \`snapshot\` text NULL, \`homeScore\` int NULL, \`awayScore\` int NULL, UNIQUE INDEX \`IDX_f4ad0814dd46f134c46803ab7f\` (\`providerGameId\`), INDEX \`IDX_ff8871185b78ee757de1f1fb12\` (\`gameDate\`), INDEX \`IDX_0e1c7c502f997a45e8ad5e3677\` (\`homeAbbr\`), INDEX \`IDX_2de7762f933945ec9ed90a86a4\` (\`awayAbbr\`), INDEX \`IDX_5bf65742f88ff4fdd73ef8a535\` (\`homeName\`), INDEX \`IDX_6b830fbece6bcd554d62f1cd5a\` (\`awayName\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`game_insight\` (\`id\` int NOT NULL AUTO_INCREMENT, \`providerGameId\` varchar(64) NOT NULL, \`atBatIndex\` int NOT NULL, \`createdAt\` datetime NOT NULL, \`candidates\` json NOT NULL, \`suggested\` json NOT NULL, INDEX \`IDX_be14d678df7f1eaa7bf87bdd07\` (\`providerGameId\`), UNIQUE INDEX \`IDX_18a1a467727565b03d4a59d9ac\` (\`providerGameId\`, \`atBatIndex\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`clip\` (\`id\` varchar(191) NOT NULL, \`gameId\` varchar(64) NOT NULL, \`atBatIndex\` int NULL, \`inning\` int NULL, \`half\` varchar(8) NULL, \`title\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`durationSec\` int NOT NULL, \`mp4Url\` varchar(512) NOT NULL, \`thumbnailUrl\` varchar(512) NULL, \`players\` json NOT NULL, \`scoreAfter\` json NULL, \`publishedAt\` datetime NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_752a0139dd498696fd704e8498\` (\`gameId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`alerts\` (\`id\` varchar(36) NOT NULL, \`gameId\` varchar(64) NOT NULL, \`type\` varchar(64) NOT NULL, \`payload\` json NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`alerts\``);
        await queryRunner.query(`DROP INDEX \`IDX_752a0139dd498696fd704e8498\` ON \`clip\``);
        await queryRunner.query(`DROP TABLE \`clip\``);
        await queryRunner.query(`DROP INDEX \`IDX_18a1a467727565b03d4a59d9ac\` ON \`game_insight\``);
        await queryRunner.query(`DROP INDEX \`IDX_be14d678df7f1eaa7bf87bdd07\` ON \`game_insight\``);
        await queryRunner.query(`DROP TABLE \`game_insight\``);
        await queryRunner.query(`DROP INDEX \`IDX_6b830fbece6bcd554d62f1cd5a\` ON \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_5bf65742f88ff4fdd73ef8a535\` ON \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_2de7762f933945ec9ed90a86a4\` ON \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_0e1c7c502f997a45e8ad5e3677\` ON \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_ff8871185b78ee757de1f1fb12\` ON \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_f4ad0814dd46f134c46803ab7f\` ON \`games\``);
        await queryRunner.query(`DROP TABLE \`games\``);
        await queryRunner.query(`DROP INDEX \`IDX_5dd58ccb60359f27f37d52ffe6\` ON \`season_pulse_snapshot\``);
        await queryRunner.query(`DROP TABLE \`season_pulse_snapshot\``);
        await queryRunner.query(`DROP INDEX \`IDX_f424799fc7d1f3bf0e74125602\` ON \`statcast_batter_summary\``);
        await queryRunner.query(`DROP INDEX \`IDX_51b94215fd6c2c28df48756fe8\` ON \`statcast_batter_summary\``);
        await queryRunner.query(`DROP TABLE \`statcast_batter_summary\``);
    }

}
