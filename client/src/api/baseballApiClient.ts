import { BoxscoreApi, Configuration, GamesApi } from '@bitslinger21/baseball-realtime-client';

const configuration: Configuration = new Configuration({
  // Pattern A: same-origin, API mounted under /api
  basePath: '/api',
});

// Export typed API instances here
export const gamesApi: GamesApi = new GamesApi(configuration);
export const boxScoreApi = new BoxscoreApi(configuration);