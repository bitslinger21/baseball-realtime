import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class IqQueryRequestDto {
  @ApiProperty({ example: '776543' })
  @IsString()
  @IsNotEmpty()
  gameId!: string;

  @ApiProperty({
    example: 412,
    description:
      'Which moment the user is asking from — required, since review mode may be earlier than live. ' +
      '-1 is valid and means no play has happened yet (Scout paused at marker 0, or pregame).',
  })
  @IsInt()
  @Min(-1)
  updateIndex!: number;

  @ApiProperty({ example: 'Would that last hit be out in other parks?' })
  @IsString()
  @IsNotEmpty()
  question!: string;
}

export class IqFactDto {
  @ApiProperty({ example: 'Distance' })
  label!: string;

  @ApiProperty({
    example: '361 ft',
    description:
      'Pre-formatted with units — the client does no number formatting.',
  })
  value!: string;
}

export class IqQueryResponseDto {
  @ApiProperty({
    description:
      'False when no real answer could be produced (bad gameId, no history yet, Claude unavailable, etc.) — the client should render its designed "unavailable" state rather than sniffing headline/sub text.',
  })
  ok!: boolean;

  @ApiProperty({
    example: '22 of 30',
    description:
      'Short, mono, usually numeric — rendered at 30px, not a sentence.',
  })
  headline!: string;

  @ApiPropertyOptional({ example: 'parks', nullable: true })
  unit?: string;

  @ApiProperty({
    example:
      "Suzuki's single to right field (104.1 mph, 12° launch) clears the wall in 22 of 30 parks.",
  })
  sub!: string;

  @ApiProperty({ type: IqFactDto, isArray: true })
  facts!: IqFactDto[];
}
