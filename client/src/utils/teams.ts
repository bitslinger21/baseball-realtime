export interface TeamInfo {
  abbr: string;
  id: number;
  name: string;
  short: string;
  primary: string;
  secondary: string;
}

export const TEAMS: Record<string, TeamInfo> = {
  // AL East
  BAL: { abbr: 'BAL', id: 110, name: 'Baltimore Orioles',        short: 'Orioles',    primary: '#DF4601', secondary: '#27251F' },
  BOS: { abbr: 'BOS', id: 111, name: 'Boston Red Sox',           short: 'Red Sox',    primary: '#BD3039', secondary: '#0D2B56' },
  NYY: { abbr: 'NYY', id: 147, name: 'New York Yankees',         short: 'Yankees',    primary: '#0C2340', secondary: '#C4CED4' },
  TB:  { abbr: 'TB',  id: 139, name: 'Tampa Bay Rays',           short: 'Rays',       primary: '#092C5C', secondary: '#8FBCE6' },
  TOR: { abbr: 'TOR', id: 141, name: 'Toronto Blue Jays',        short: 'Blue Jays',  primary: '#134A8E', secondary: '#1D2D5C' },
  // AL Central
  CWS: { abbr: 'CWS', id: 145, name: 'Chicago White Sox',        short: 'White Sox',  primary: '#27251F', secondary: '#C4CED4' },
  CLE: { abbr: 'CLE', id: 114, name: 'Cleveland Guardians',      short: 'Guardians',  primary: '#00385D', secondary: '#E50022' },
  DET: { abbr: 'DET', id: 116, name: 'Detroit Tigers',           short: 'Tigers',     primary: '#0C2340', secondary: '#FA4616' },
  KC:  { abbr: 'KC',  id: 118, name: 'Kansas City Royals',       short: 'Royals',     primary: '#174885', secondary: '#C09A5B' },
  MIN: { abbr: 'MIN', id: 142, name: 'Minnesota Twins',          short: 'Twins',      primary: '#002B5C', secondary: '#D31145' },
  // AL West
  HOU: { abbr: 'HOU', id: 117, name: 'Houston Astros',           short: 'Astros',     primary: '#002D62', secondary: '#EB6E1F' },
  LAA: { abbr: 'LAA', id: 108, name: 'Los Angeles Angels',       short: 'Angels',     primary: '#003263', secondary: '#BA0021' },
  ATH: { abbr: 'ATH', id: 133, name: 'Athletics',                short: 'Athletics',  primary: '#003831', secondary: '#EFB21E' },
  SEA: { abbr: 'SEA', id: 136, name: 'Seattle Mariners',         short: 'Mariners',   primary: '#0C2C56', secondary: '#005C5C' },
  TEX: { abbr: 'TEX', id: 140, name: 'Texas Rangers',            short: 'Rangers',    primary: '#003278', secondary: '#C0111F' },
  // NL East
  ATL: { abbr: 'ATL', id: 144, name: 'Atlanta Braves',           short: 'Braves',     primary: '#13274F', secondary: '#CE1141' },
  MIA: { abbr: 'MIA', id: 146, name: 'Miami Marlins',            short: 'Marlins',    primary: '#00A3E0', secondary: '#EF3340' },
  NYM: { abbr: 'NYM', id: 121, name: 'New York Mets',            short: 'Mets',       primary: '#002D72', secondary: '#FF5910' },
  PHI: { abbr: 'PHI', id: 143, name: 'Philadelphia Phillies',    short: 'Phillies',   primary: '#E81828', secondary: '#284898' },
  WSH: { abbr: 'WSH', id: 120, name: 'Washington Nationals',     short: 'Nationals',  primary: '#AB0003', secondary: '#14225A' },
  // NL Central
  CHC: { abbr: 'CHC', id: 112, name: 'Chicago Cubs',             short: 'Cubs',       primary: '#0E3386', secondary: '#CC3433' },
  CIN: { abbr: 'CIN', id: 113, name: 'Cincinnati Reds',          short: 'Reds',       primary: '#C6011F', secondary: '#000000' },
  MIL: { abbr: 'MIL', id: 158, name: 'Milwaukee Brewers',        short: 'Brewers',    primary: '#12284B', secondary: '#FFC52F' },
  PIT: { abbr: 'PIT', id: 134, name: 'Pittsburgh Pirates',       short: 'Pirates',    primary: '#27251F', secondary: '#FDB827' },
  STL: { abbr: 'STL', id: 138, name: 'St. Louis Cardinals',      short: 'Cardinals',  primary: '#C41E3A', secondary: '#0C2340' },
  // NL West
  AZ:  { abbr: 'AZ',  id: 109, name: 'Arizona Diamondbacks',     short: 'D-backs',    primary: '#A71930', secondary: '#E3D4AD' },
  COL: { abbr: 'COL', id: 115, name: 'Colorado Rockies',         short: 'Rockies',    primary: '#33006F', secondary: '#C4CED4' },
  LAD: { abbr: 'LAD', id: 119, name: 'Los Angeles Dodgers',      short: 'Dodgers',    primary: '#005A9C', secondary: '#EF3E42' },
  SD:  { abbr: 'SD',  id: 135, name: 'San Diego Padres',         short: 'Padres',     primary: '#2F241D', secondary: '#FFC425' },
  SF:  { abbr: 'SF',  id: 137, name: 'San Francisco Giants',     short: 'Giants',     primary: '#FD5A1E', secondary: '#27251F' },
  // Keep legacy aliases so existing code using TBR still resolves
  TBR: { abbr: 'TBR', id: 139, name: 'Tampa Bay Rays',           short: 'Rays',       primary: '#092C5C', secondary: '#8FBCE6' },
};
