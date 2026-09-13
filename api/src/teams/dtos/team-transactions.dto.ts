import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionEntryDto {
  @ApiProperty() mlbId: number = 0;
  @ApiProperty() name: string = '';
  @ApiPropertyOptional({ nullable: true }) position: string | null = null;
  @ApiPropertyOptional({ nullable: true }) jerseyNumber: string | null = null;
  @ApiProperty() date: string = '';
  @ApiProperty({ enum: ['injury', 'roster', 'trade', 'signing'] })
  type: 'injury' | 'roster' | 'trade' | 'signing' = 'roster';
  @ApiProperty({ enum: ['in', 'out'] })
  direction: 'in' | 'out' = 'in';
  @ApiProperty() description: string = '';
}

export class TransactionsHeroDto {
  @ApiProperty() activeRosterCount: number = 0;
  // 26 all season, 28 during the September roster-expansion window — computed
  // server-side so the client never has to know the rule.
  @ApiProperty() activeRosterLimit: number = 26;
  @ApiProperty() fortyManCount: number = 0;
  @ApiProperty() fortyManOpen: number = 0;
  @ApiProperty() ilCount: number = 0;
  @ApiProperty() il60Count: number = 0;
  @ApiProperty() movesThisMonth: number = 0;
}

export class TeamTransactionsDto {
  @ApiProperty({ type: [TransactionEntryDto] })
  transactions: TransactionEntryDto[] = [];
  @ApiProperty({ type: TransactionsHeroDto }) hero: TransactionsHeroDto =
    new TransactionsHeroDto();
  @ApiProperty() totalMoves: number = 0;
}
