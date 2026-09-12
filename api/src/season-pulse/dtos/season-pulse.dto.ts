import { ApiProperty } from '@nestjs/swagger';

export class SeasonPulsePhaseDto {
  @ApiProperty() key: string = '';
  @ApiProperty() label: string = '';
  @ApiProperty() statLabel: string = '';
  @ApiProperty() statValue: number = 0;
  @ApiProperty() rank: number = 0;
  @ApiProperty() prevRank: number = 0;
}

export class SeasonPulseOverallDto {
  @ApiProperty() rank: number = 0;
  @ApiProperty() prevRank: number = 0;
  @ApiProperty() movement: number = 0;
  @ApiProperty() narrative: string = '';
}

export class SeasonPulseDto {
  @ApiProperty() computedAt: string = '';
  @ApiProperty() overallLabel: string = 'Run differential';
  @ApiProperty({ type: SeasonPulseOverallDto }) overall: SeasonPulseOverallDto =
    new SeasonPulseOverallDto();
  @ApiProperty({ type: [Number] }) weeklyRanks: number[] = [];
  @ApiProperty({ type: [SeasonPulsePhaseDto] }) phases: SeasonPulsePhaseDto[] =
    [];
}
