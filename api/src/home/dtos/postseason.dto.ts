import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostseasonTeamDto {
  @ApiProperty({ example: 147 }) id!: number;
  @ApiProperty({ example: 'NYY' }) abbr!: string;
}

export class PostseasonSideDto {
  @ApiPropertyOptional({ type: PostseasonTeamDto, nullable: true }) team!: PostseasonTeamDto | null;
  @ApiProperty({
    type: String,
    isArray: true,
    example: ['BOS', 'TOR'],
    description: 'One of two possible clubs (a logo pair) before the feeding series is decided.',
  })
  options!: string[];
  @ApiPropertyOptional({ type: String, nullable: true, example: 'AL champ', description: 'A word when not even the candidates are known.' })
  label!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 1, description: 'Derived from the bracket structure; MLB publishes none.' })
  seed!: number | null;
  @ApiProperty({ example: 2 }) wins!: number;
  @ApiProperty() eliminated!: boolean;
}

export class PostseasonGameSideDto {
  @ApiProperty({ example: 'HOU' }) abbr!: string;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 3 }) runs!: number | null;
}

export class PostseasonRecapDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ example: 226 }) durationSec!: number;
}

export class PostseasonProbablesDto {
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Gil' }) away!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Houck' }) home!: string | null;
}

export class PostseasonGameDto {
  @ApiProperty({ example: '813072' }) gamePk!: string;
  @ApiProperty({ example: 4 }) number!: number;
  @ApiProperty({ example: '2026-10-07' }) date!: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'ISO start; null while MLB lists the time as TBD.' })
  startTime!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'BOS' }) host!: string | null;
  @ApiProperty({ enum: ['final', 'live', 'scheduled', 'ifNecessary'] })
  state!: 'final' | 'live' | 'scheduled' | 'ifNecessary';
  @ApiProperty({ type: PostseasonGameSideDto }) away!: PostseasonGameSideDto;
  @ApiProperty({ type: PostseasonGameSideDto }) home!: PostseasonGameSideDto;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 10, description: 'Set only for extra innings ("F/10").' })
  innings!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Cole' }) winner!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Crochet' }) loser!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Williams' }) save!: string | null;
  @ApiPropertyOptional({ type: String,
    nullable: true,
    example: 'Judge 2-for-4, HR, 3 RBI',
    description: 'multi-HR > HR + RBI > 3+ hits > pitcher ≥7 IP or ≥10 K; null when nothing qualifies.',
  })
  note!: string | null;
  @ApiPropertyOptional({ type: PostseasonRecapDto, nullable: true, description: 'null = not posted yet.' })
  recap!: PostseasonRecapDto | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: '▼6' }) inning!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: '1 out · runner on 1st' }) situation!: string | null;
  @ApiPropertyOptional({ type: PostseasonProbablesDto, nullable: true }) probables!: PostseasonProbablesDto | null;
}

export class PostseasonSeriesDto {
  @ApiProperty({ example: 'D_1', description: "MLB's own series id." }) id!: string;
  @ApiProperty({ enum: ['wc', 'ds', 'cs', 'ws'] }) round!: 'wc' | 'ds' | 'cs' | 'ws';
  @ApiPropertyOptional({ enum: ['AL', 'NL'], nullable: true }) league!: 'AL' | 'NL' | null;
  @ApiProperty({ example: 'ALDS' }) label!: string;
  @ApiProperty({ example: 5 }) bestOf!: number;
  @ApiProperty({ enum: ['upcoming', 'current', 'finished'] }) state!: 'upcoming' | 'current' | 'finished';
  @ApiProperty({ type: PostseasonSideDto }) high!: PostseasonSideDto;
  @ApiProperty({ type: PostseasonSideDto }) low!: PostseasonSideDto;
  @ApiProperty({ example: 'Yankees lead 2–1' }) status!: string;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Waiting on ALDS' }) waitingOn!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-03' }) startDate!: string | null;
  @ApiProperty({ type: PostseasonGameDto, isArray: true }) games!: PostseasonGameDto[];
}

export class PostseasonBracketDto {
  @ApiProperty({ type: PostseasonSeriesDto, isArray: true }) alwc!: PostseasonSeriesDto[];
  @ApiProperty({ type: PostseasonSeriesDto, isArray: true }) alds!: PostseasonSeriesDto[];
  @ApiPropertyOptional({ type: PostseasonSeriesDto, nullable: true }) alcs!: PostseasonSeriesDto | null;
  @ApiPropertyOptional({ type: PostseasonSeriesDto, nullable: true }) ws!: PostseasonSeriesDto | null;
  @ApiPropertyOptional({ type: PostseasonSeriesDto, nullable: true }) nlcs!: PostseasonSeriesDto | null;
  @ApiProperty({ type: PostseasonSeriesDto, isArray: true }) nlds!: PostseasonSeriesDto[];
  @ApiProperty({ type: PostseasonSeriesDto, isArray: true }) nlwc!: PostseasonSeriesDto[];
}

export class PostseasonResponseDto {
  @ApiProperty({ description: 'All 12 berths clinched (or the postseason under way) — a condition, not a date.' })
  active!: boolean;
  @ApiProperty({ example: 'Division Series · 8 clubs left' }) note!: string;
  @ApiPropertyOptional({ type: PostseasonBracketDto, nullable: true }) bracket!: PostseasonBracketDto | null;
}
