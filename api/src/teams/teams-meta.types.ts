export type TeamMeta = {
  abbr: string;              // e.g. "HOU"
  name: string;              // e.g. "Astros"
  displayName: string;       // e.g. "Houston Astros"
  primaryColorHex: string | null;
  alternateColorHex: string | null;
  logoUrl: string | null;
};

export type TeamMetaIndex = ReadonlyMap<string, TeamMeta>; // key = abbr
