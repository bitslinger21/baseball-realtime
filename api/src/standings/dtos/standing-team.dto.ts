import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WinsByDayEntryDto {
  @ApiProperty({ example: '2026-04-12' }) date: string;
  @ApiProperty({ example: 8 }) wins: number;
}

export class StandingTeamDto {
  @ApiProperty({ example: 'HOU' }) abbr: string;
  @ApiProperty({ example: 'Astros' }) teamName: string;
  @ApiProperty({ example: 'Houston Astros' }) displayName: string;
  @ApiProperty({ example: 'American League' }) leagueName: string;
  @ApiProperty({ example: 'American League West' }) divisionName: string;
  @ApiProperty({ example: 1 }) rank: number;
  @ApiProperty({ example: 45 }) wins: number;
  @ApiProperty({ example: 30 }) losses: number;
  @ApiProperty({ example: '.600' }) pct: string;
  @ApiProperty({ example: '-' }) gamesBack: string;
  @ApiProperty({ example: '7-3' }) lastTen: string;
  @ApiProperty({ example: 'W3' }) streak: string;
  @ApiPropertyOptional({ nullable: true, example: 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png' })
  logoUrl: string | null;
  @ApiPropertyOptional({ nullable: true, example: '#EB6E1F' })
  primaryColorHex: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: '45–30' })
  homeRecord: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: '33–45' })
  awayRecord: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: '10–8' })
  oneRunRecord: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Daikin Park' })
  venue: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Houston, TX' })
  city: string | null;
  @ApiPropertyOptional({ nullable: true, type: Number, example: 1962 })
  founded: number | null;
  @ApiProperty({ type: [WinsByDayEntryDto], description: 'Cumulative wins as of each date the team played a completed game. Sparse — one entry per game date, not per calendar day.' })
  winsByDay: WinsByDayEntryDto[];
}
