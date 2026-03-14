// boxscore/dtos/boxscore.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamLineScoreDto {
  @ApiProperty() runs!: number;
  @ApiProperty() hits!: number;
  @ApiProperty() errors!: number;
}

export class BatterLineDto {
  @ApiProperty() playerId!: number;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ required: false, nullable: true, type: String }) battingOrder?: string | null;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  jerseyNumber?: string | null;

  @ApiProperty() ab!: number;
  @ApiProperty() r!: number;
  @ApiProperty() h!: number;
  @ApiProperty() rbi!: number;
  @ApiProperty() bb!: number;
  @ApiProperty() so!: number;
  @ApiProperty() hr!: number;
}

export class PitcherLineDto {
  @ApiProperty() playerId!: number;
  @ApiProperty() name!: string;

  @ApiPropertyOptional({ required: false, nullable: true, type: String })
  jerseyNumber?: string | null;

  @ApiProperty() ip!: string;
  @ApiProperty() h!: number;
  @ApiProperty() r!: number;
  @ApiProperty() er!: number;
  @ApiProperty() bb!: number;
  @ApiProperty() so!: number;

  @ApiPropertyOptional({ required: false, nullable: true }) pitches?: number | null;
  @ApiPropertyOptional({ required: false, nullable: true }) strikes?: number | null;
}

export class BoxScoreSideDto {
  @ApiProperty() teamAbbr!: string;
  @ApiProperty({ type: TeamLineScoreDto }) linescore!: TeamLineScoreDto;
  @ApiProperty({ type: [BatterLineDto] }) batting!: BatterLineDto[];
  @ApiProperty({ type: [PitcherLineDto] }) pitching!: PitcherLineDto[];
}

export class BoxScoreDto {
  @ApiProperty() providerGameId!: string;
  @ApiProperty({ type: BoxScoreSideDto }) away!: BoxScoreSideDto;
  @ApiProperty({ type: BoxScoreSideDto }) home!: BoxScoreSideDto;
  @ApiProperty() ts!: string;
}