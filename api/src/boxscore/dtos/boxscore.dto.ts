import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamLineScoreDto {
  @ApiProperty() runs!: number;
  @ApiProperty() hits!: number;
  @ApiProperty() errors!: number;
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'number', nullable: true },
    nullable: true,
    description: 'Runs per inning (index 0 = inning 1); null means inning not yet played',
  })
  inningRuns?: (number | null)[];
}

export class BatterLineDto {
  @ApiProperty() playerId!: number;
  @ApiProperty() name!: string;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  battingOrder?: string | null;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  jerseyNumber?: string | null;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  position?: string | null;

  @ApiProperty() ab!: number;
  @ApiProperty() r!: number;
  @ApiProperty() h!: number;
  @ApiProperty() rbi!: number;
  @ApiProperty() bb!: number;
  @ApiProperty() so!: number;
  @ApiProperty() hr!: number;

  @ApiPropertyOptional({ required: false, nullable: true, type: String,
    description: 'Plate-appearance results, e.g. "HR · 1B · K · BB"' })
  pa?: string | null;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  seasonAvg?: string | null;
}

export class PitcherLineDto {
  @ApiProperty() playerId!: number;
  @ApiProperty() name!: string;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  jerseyNumber?: string | null;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  position?: string | null;

  @ApiProperty() ip!: string;
  @ApiProperty() h!: number;
  @ApiProperty() r!: number;
  @ApiProperty() er!: number;
  @ApiProperty() bb!: number;
  @ApiProperty() so!: number;

  @ApiPropertyOptional({ required: false, nullable: true })
  pitches?: number | null;

  @ApiPropertyOptional({ required: false, nullable: true })
  strikes?: number | null;
}

export class BenchPlayerDto {
  @ApiProperty() playerId!: number;
  @ApiProperty() name!: string;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  jerseyNumber?: string | null;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  position?: string | null;
}

export class BullpenPlayerDto {
  @ApiProperty() playerId!: number;
  @ApiProperty() name!: string;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  jerseyNumber?: string | null;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  position?: string | null;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  era?: string | null;
}

export class BoxScoreSideDto {
  @ApiProperty() teamAbbr!: string;
  @ApiProperty({ type: TeamLineScoreDto }) linescore!: TeamLineScoreDto;
  @ApiProperty({ type: [BatterLineDto] }) batting!: BatterLineDto[];
  @ApiProperty({ type: [BenchPlayerDto] }) bench!: BenchPlayerDto[];
  @ApiProperty({ type: [PitcherLineDto] }) pitching!: PitcherLineDto[];
  @ApiProperty({ type: [BullpenPlayerDto] }) bullpen!: BullpenPlayerDto[];
}

export class BoxScoreDto {
  @ApiProperty() providerGameId!: string;
  @ApiProperty({ type: BoxScoreSideDto }) away!: BoxScoreSideDto;
  @ApiProperty({ type: BoxScoreSideDto }) home!: BoxScoreSideDto;
  @ApiProperty() ts!: string;
}
