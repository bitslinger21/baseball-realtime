export interface TeamVenue {
  venue: string;
  city: string;
  founded: number;
}

export const TEAM_VENUES: Record<string, TeamVenue> = {
  // AL East
  BAL: { venue: 'Oriole Park at Camden Yards', city: 'Baltimore, MD',        founded: 1901 },
  BOS: { venue: 'Fenway Park',                  city: 'Boston, MA',           founded: 1901 },
  NYY: { venue: 'Yankee Stadium',               city: 'New York, NY',         founded: 1901 },
  TB:  { venue: 'Tropicana Field',              city: 'St. Petersburg, FL',   founded: 1998 },
  TOR: { venue: 'Rogers Centre',                city: 'Toronto, ON',          founded: 1977 },
  // AL Central
  CWS: { venue: 'Guaranteed Rate Field',        city: 'Chicago, IL',          founded: 1900 },
  CLE: { venue: 'Progressive Field',            city: 'Cleveland, OH',        founded: 1901 },
  DET: { venue: 'Comerica Park',                city: 'Detroit, MI',          founded: 1901 },
  KC:  { venue: 'Kauffman Stadium',             city: 'Kansas City, MO',      founded: 1969 },
  MIN: { venue: 'Target Field',                 city: 'Minneapolis, MN',      founded: 1901 },
  // AL West
  HOU: { venue: 'Daikin Park',                  city: 'Houston, TX',          founded: 1962 },
  LAA: { venue: 'Angel Stadium',                city: 'Anaheim, CA',          founded: 1961 },
  ATH: { venue: 'Sutter Health Park',           city: 'West Sacramento, CA',  founded: 1901 },
  SEA: { venue: 'T-Mobile Park',                city: 'Seattle, WA',          founded: 1977 },
  TEX: { venue: 'Globe Life Field',             city: 'Arlington, TX',        founded: 1961 },
  // NL East
  ATL: { venue: 'Truist Park',                  city: 'Atlanta, GA',          founded: 1876 },
  MIA: { venue: 'loanDepot park',               city: 'Miami, FL',            founded: 1993 },
  NYM: { venue: 'Citi Field',                   city: 'New York, NY',         founded: 1962 },
  PHI: { venue: 'Citizens Bank Park',           city: 'Philadelphia, PA',     founded: 1883 },
  WSH: { venue: 'Nationals Park',               city: 'Washington, DC',       founded: 1969 },
  // NL Central
  CHC: { venue: 'Wrigley Field',                city: 'Chicago, IL',          founded: 1876 },
  CIN: { venue: 'Great American Ball Park',     city: 'Cincinnati, OH',       founded: 1882 },
  MIL: { venue: 'American Family Field',        city: 'Milwaukee, WI',        founded: 1969 },
  PIT: { venue: 'PNC Park',                     city: 'Pittsburgh, PA',       founded: 1882 },
  STL: { venue: 'Busch Stadium',                city: 'St. Louis, MO',        founded: 1882 },
  // NL West
  AZ:  { venue: 'Chase Field',                  city: 'Phoenix, AZ',          founded: 1998 },
  COL: { venue: 'Coors Field',                  city: 'Denver, CO',           founded: 1993 },
  LAD: { venue: 'Dodger Stadium',               city: 'Los Angeles, CA',      founded: 1883 },
  SD:  { venue: 'Petco Park',                   city: 'San Diego, CA',        founded: 1969 },
  SF:  { venue: 'Oracle Park',                  city: 'San Francisco, CA',    founded: 1883 },
};
