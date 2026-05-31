// Team nickname (short) — unique across all 30 clubs.
// Used in the line-score band where the fixed 132px column can't fit a full club name.
// Keys cover both common abbreviation variants (e.g. KC/KCR, SD/SDP, SF/SFG, TB/TBR).
// Do NOT derive from the last word of club name: "Red Sox", "White Sox", "Blue Jays" are
// two-word nicknames, and bare "Sox" is ambiguous between BOS and CHW.
export const TEAM_NICKNAMES: Record<string, string> = {
  ARI: "Diamondbacks",
  ATL: "Braves",
  BAL: "Orioles",
  BOS: "Red Sox",
  CHC: "Cubs",
  CHW: "White Sox", CWS: "White Sox",
  CIN: "Reds",
  CLE: "Guardians",
  COL: "Rockies",
  DET: "Tigers",
  HOU: "Astros",
  KC:  "Royals",    KCR: "Royals",
  LAA: "Angels",
  LAD: "Dodgers",
  MIA: "Marlins",
  MIL: "Brewers",
  MIN: "Twins",
  NYM: "Mets",
  NYY: "Yankees",
  OAK: "Athletics",
  PHI: "Phillies",
  PIT: "Pirates",
  SD:  "Padres",    SDP: "Padres",
  SEA: "Mariners",
  SF:  "Giants",    SFG: "Giants",
  STL: "Cardinals",
  TB:  "Rays",      TBR: "Rays",
  TEX: "Rangers",
  TOR: "Blue Jays",
  WSH: "Nationals", WAS: "Nationals",
};
