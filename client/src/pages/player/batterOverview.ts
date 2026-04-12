export type BatterOverviewHeadlineDto = {
  battingAverage: string;
  onBasePercentage: string;
  sluggingPercentage: string;
  onBasePlusSlugging: string;
  homeRuns: number;
  runsBattedIn: number;
};

export type BatterOverviewSecondaryDto = {
  games: number;
  atBats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
};

export type BatterOverviewTodayDto = {
  label: string;
  statLine: string;
  isLive: boolean;
};

export type BatterOverviewDto = {
  playerId: string;
  season: number;
  headline: BatterOverviewHeadlineDto;
  secondary: BatterOverviewSecondaryDto;
  today: BatterOverviewTodayDto | null;
};