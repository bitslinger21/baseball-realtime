// api/src/providers/mlb/mlb.types.ts

export type MlbLiveFeed = {
  liveData?: {
    linescore?: {
      currentInning?: number;
      isTopInning?: boolean;
      outs?: number;
      balls?: number;
      strikes?: number;
      offense?: {
        first?: unknown;
        second?: unknown;
        third?: unknown;
      };

      // 🆕 Add score fields (MLB uses different formats depending on endpoint)
      teams?: {
        home?: { runs?: number };
        away?: { runs?: number };
      };

      // 🆕 Some feeds use the older format
      home?: { runs?: number };
      away?: { runs?: number };
    };

    plays?: {
      currentPlay?: {
        count?: {
          balls?: number;
          strikes?: number;
        };
        matchup?: {
          batter?: { id?: number; fullName?: string };
          pitcher?: { id?: number; fullName?: string };
        };

        // 🆕 Add play description fields
        result?: {
          description?: string;
          event?: string;
        };
      };
    };
  };
};