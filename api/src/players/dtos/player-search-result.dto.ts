import { ApiProperty } from '@nestjs/swagger';

export class PlayerSearchResultDto {
  @ApiProperty({ example: 665742 }) mlbId: number;
  @ApiProperty({ example: 'Yordan Alvarez' }) name: string;
  @ApiProperty({ example: 'DH' }) position: string;
  @ApiProperty({ example: 'HOU' }) teamAbbr: string;
  @ApiProperty({ example: 117 }) teamId: number;
}
