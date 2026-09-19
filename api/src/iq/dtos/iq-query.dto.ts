import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// One prior question + the answer's own headline/sub (not the full facts
// array — enough for the model to resolve a pronoun/follow-up against, e.g.
// "wasn't he traded?" after "what team is X on"). Session-only: the client
// clears this on panel close, so it never outlives one sitting.
export class IqConversationTurnDto {
  @ApiProperty({ example: 'What team is Mauricio Dubon on?' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ example: 'Houston Astros' })
  @IsString()
  headline!: string;

  @ApiProperty({ example: 'Mauricio Dubon plays for the Houston Astros.' })
  @IsString()
  sub!: string;
}

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

  @ApiPropertyOptional({
    type: IqConversationTurnDto,
    isArray: true,
    description:
      'Prior turns from this same panel session, oldest first — lets a follow-up question ' +
      '("wasn\'t he traded?") resolve against what was already asked/answered.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IqConversationTurnDto)
  conversationHistory?: IqConversationTurnDto[];
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
