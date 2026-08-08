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
  plateAppearances?: number | null;
  atBats?: number | null;
  hits?: number | null;
  homeRuns?: number | null;
  rbi?: number | null;
  walks?: number | null;
  strikeouts?: number | null;
  avg?: string | null;
  gameStatus?: string | null;
  opponent?: string | null;
  gameId?: string | null;
  playerState?: 'atBat' | 'onDeck' | 'inTheHole' | 'idle' | null;
};

export type BatterOverviewDto = {
  playerId: string;
  season: number;
  headline: BatterOverviewHeadlineDto;
  secondary: BatterOverviewSecondaryDto;
  today: BatterOverviewTodayDto | null;
};