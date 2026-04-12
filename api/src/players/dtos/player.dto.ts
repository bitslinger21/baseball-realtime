import { ApiProperty } from "@nestjs/swagger";

export class PlayerDto {
  @ApiProperty({ example: "660271" })
  mlbId: string;

  @ApiProperty({ example: "Mookie Betts" })
  fullName: string;

  @ApiProperty({ example: "RF", required: false, nullable: true })
  primaryPositionAbbr: string | null;

  @ApiProperty({ example: "Right", required: false, nullable: true })
  batSide: string | null;

  @ApiProperty({ example: "Right", required: false, nullable: true })
  pitchHand: string | null;

  @ApiProperty({ example: "Los Angeles Dodgers", required: false, nullable: true })
  currentTeamName: string | null;
}