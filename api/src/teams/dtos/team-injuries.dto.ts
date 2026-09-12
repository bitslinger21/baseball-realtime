import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InjuryEntryDto {
  @ApiProperty() mlbId: number = 0;
  @ApiProperty() name: string = '';
  @ApiProperty() position: string = '';
  @ApiProperty({ enum: ['60-day', '15-day', '10-day'] })
  ilType: '60-day' | '15-day' | '10-day' = '10-day';
  @ApiPropertyOptional({ nullable: true }) injuryDescription: string | null =
    null;
  @ApiProperty() sinceDate: string = '';
  // No real source exists in MLB's public feed for this today — always "Unknown".
  // Field kept for forward-compat if a source is ever wired up.
  @ApiProperty() expectedReturn: string = 'Unknown';
}

export class TeamInjuriesDto {
  @ApiProperty({ type: [InjuryEntryDto] }) players: InjuryEntryDto[] = [];
}
