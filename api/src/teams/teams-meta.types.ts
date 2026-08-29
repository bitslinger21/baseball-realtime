export type TeamMeta = {
  abbr: string;              // e.g. "HOU"
  name: string;              // e.g. "Astros"
  displayName: string;       // e.g. "Houston Astros"
  primaryColorHex: string | null;
  alternateColorHex: string | null;
  logoUrl: string | null;
  venue: string | null;      // e.g. "Daikin Park"
  city: string | null;       // e.g. "Houston, TX"
  founded: number | null;    // e.g. 1962
};

export type TeamMetaIndex = ReadonlyMap<string, TeamMeta>; // key = abbr
