export interface TeamInfo {
  abbr: string;
  id: number;
  name: string;
  short: string;
  primary: string;
  secondary: string;
}

export const TEAMS: Record<string, TeamInfo> = {
  HOU: { abbr: 'HOU', id: 117, name: 'Houston Astros',           short: 'Astros',    primary: '#002D62', secondary: '#EB6E1F' },
  CHC: { abbr: 'CHC', id: 112, name: 'Chicago Cubs',             short: 'Cubs',      primary: '#0E3386', secondary: '#CC3433' },
  PIT: { abbr: 'PIT', id: 134, name: 'Pittsburgh Pirates',       short: 'Pirates',   primary: '#27251F', secondary: '#FDB827' },
  TOR: { abbr: 'TOR', id: 141, name: 'Toronto Blue Jays',        short: 'Blue Jays', primary: '#134A8E', secondary: '#1D2D5C' },
  DET: { abbr: 'DET', id: 116, name: 'Detroit Tigers',           short: 'Tigers',    primary: '#0C2340', secondary: '#FA4616' },
  BAL: { abbr: 'BAL', id: 110, name: 'Baltimore Orioles',        short: 'Orioles',   primary: '#DF4601', secondary: '#27251F' },
  CLE: { abbr: 'CLE', id: 114, name: 'Cleveland Guardians',      short: 'Guardians', primary: '#00385D', secondary: '#E50022' },
  PHI: { abbr: 'PHI', id: 143, name: 'Philadelphia Phillies',    short: 'Phillies',  primary: '#E81828', secondary: '#284898' },
  TBR: { abbr: 'TBR', id: 139, name: 'Tampa Bay Rays',           short: 'Rays',      primary: '#092C5C', secondary: '#8FBCE6' },
  NYY: { abbr: 'NYY', id: 147, name: 'New York Yankees',         short: 'Yankees',   primary: '#0C2340', secondary: '#C4CED4' },
  LAD: { abbr: 'LAD', id: 119, name: 'Los Angeles Dodgers',      short: 'Dodgers',   primary: '#005A9C', secondary: '#EF3E42' },
  ATL: { abbr: 'ATL', id: 144, name: 'Atlanta Braves',           short: 'Braves',    primary: '#13274F', secondary: '#CE1141' },
};
