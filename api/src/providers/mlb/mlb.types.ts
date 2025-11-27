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

      // Score fields (MLB uses different formats depending on endpoint)
      teams?: {
        home?: { runs?: number };
        away?: { runs?: number };
      };

      // Older format fallback
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
        result?: {
          description?: string;
          event?: string;
          homeScore?: number;
          awayScore?: number;
        };
        about?: {
          halfInning?: string; // "top" | "bottom" | others
          inning?: number;
          outs?: number;
          isComplete?: boolean;
        };
      };

      // Full play list – used for "replay" mode
      allPlays?: Array<{
        count?: {
          balls?: number;
          strikes?: number;
        };
        matchup?: {
          batter?: { id?: number; fullName?: string };
          pitcher?: { id?: number; fullName?: string };
        };
        result?: {
          description?: string;
          event?: string;
          homeScore?: number;
          awayScore?: number;
        };
        about?: {
          halfInning?: string; // "top" | "bottom" | others
          inning?: number;
          outs?: number;
          isComplete?: boolean;
        };
      }>;
    };
  };
};