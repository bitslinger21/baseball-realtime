import { ApiProperty } from '@nestjs/swagger';

export class BullpenPitcherDto {
  @ApiProperty() mlbId: number = 0;
  @ApiProperty() name: string = '';
  @ApiProperty({ enum: ['L', 'R'] }) hand: 'L' | 'R' = 'R';
  @ApiProperty() evidence: string = '';
  @ApiProperty({ enum: ['ready', 'available', 'rest'] })
  state: 'ready' | 'available' | 'rest' = 'ready';
}

export class TeamBullpenDto {
  @ApiProperty() availableCount: number = 0;
  @ApiProperty() totalCount: number = 0;
  @ApiProperty({ type: [BullpenPitcherDto] }) pitchers: BullpenPitcherDto[] =
    [];
}
