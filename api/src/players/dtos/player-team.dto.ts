import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// The shape getPlayerTeam already returns — declared so the spec (and the
// generated SDK) stop typing this endpoint's response as void.
export class PlayerTeamDto {
  @ApiProperty({ description: 'false when the upstream people lookup failed' }) ok!: boolean;
  @ApiProperty({ example: 665161 }) mlbId!: number;
  @ApiPropertyOptional({ type: Number, nullable: true, example: 117 }) teamId!: number | null;
  @ApiPropertyOptional({ description: 'Upstream HTTP status, only when ok is false' }) status?: number;
  @ApiPropertyOptional({ type: String, nullable: true, example: '/api/v1/teams/117' })
  currentTeamLink?: string | null;
}
