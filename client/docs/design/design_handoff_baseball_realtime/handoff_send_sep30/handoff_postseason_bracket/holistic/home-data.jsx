/* global React, T, TEAMS */

// ============================================================
// HOME — shared data + locked type scale, for the layout exploration.
// Sep 20, 2026.
//
// The DATA is settled (user: "the information is good"). What is being explored
// is layout, so all three candidates read from this ONE file: nothing differs
// between them except how it is arranged.
//
// The type scale is LOCKED here too (user's call). `home.jsx` had ~12 distinct
// sizes between 9.5 and 17px, several of them one-offs (13.5 / 12.5 / 11.5 /
// 10.5) — tuned per element rather than composed. Seven steps, and a candidate
// may only use these.
// ============================================================

window.HS = {
  xs: 11,     // eyebrows, unit labels
  sm: 12,     // mono meta, secondary numbers
  base: 13,   // ledger rows, table cells, dense lines
  md: 15,     // primary reading size — names, event text in dense layouts
  lg: 18,     // event text where it leads, tile names
  xl: 24,     // the lead story, section headings where they carry weight
  hero: 34,   // IQ answer headline only
};

// ---- MOCK. Not for port: every item comes from the significance generator.
// `iq` is a real availability flag from the IQ service, not a client guess.
window.HOME_HOT = [
  {
    id: 'brown-nohit', iq: true,
    text: 'Hunter Brown (HOU) has a no-hitter through six innings.',
    game: { away: 'ATL', home: 'HOU', ra: 0, rh: 3, half: 'bottom', inn: 7 },
    iqSuggested: ['When was the Astros\u2019 last no-hitter?', 'How often does a no-hitter through six get finished?', 'Has Brown ever thrown a complete-game shutout?'],
    iqAnswer: { q: 'How often does a no-hitter through six get finished?', headline: '7.4%', unit: 'of bids since 1961', sub: 'Of 1,284 no-hitters carried through six innings in the expansion era, 95 were completed. The eighth is where most end \u2014 nearly half of the bids that reach the seventh are broken up before the ninth.' },
  },
  {
    id: 'alvarez-trade', iq: false,
    text: 'Yordan \u00c1lvarez has been traded from Houston to Los Angeles.',
    move: { from: 'HOU', to: 'LAD' },
  },
  {
    id: 'tucker-cycle', iq: true,
    text: 'Kyle Tucker (LAD) needs a triple to complete the cycle. He\u2019ll likely have one more plate appearance.',
    game: { away: 'LAD', home: 'PIT', ra: 7, rh: 3, half: 'top', inn: 8 },
    iqSuggested: ['How many cycles have been hit this season?', 'How rare is the triple as the last leg?', 'Has Tucker ever hit for the cycle?'],
    iqAnswer: { q: 'How rare is the triple as the last leg?', headline: '1 in 3', unit: 'unfinished cycles', sub: 'The triple is the missing leg in roughly a third of cycle bids that die one hit short \u2014 more than the other three combined. It is both the rarest hit and the one a player cannot manufacture.' },
  },
  {
    id: 'judge-3hr', iq: true,
    text: 'Aaron Judge has hit three home runs and is due up again in the eighth.',
    game: { away: 'NYY', home: 'TOR', ra: 9, rh: 6, half: 'top', inn: 8 },
    iqSuggested: ['Who last hit four in a game?', 'How many four-homer games are there all-time?', 'What is Judge\u2019s career high?'],
    iqAnswer: { q: 'How many four-homer games are there all-time?', headline: '18', unit: 'in MLB history', sub: 'Eighteen players have done it, the most recent in 2017. No one has ever hit five. Three of the eighteen came in extra innings.' },
  },
  {
    id: 'wheeler-14k', iq: true,
    text: 'Zack Wheeler has struck out 14 through seven innings, two short of the franchise record.',
    game: { away: 'PHI', home: 'NYM', ra: 4, rh: 1, half: 'bottom', inn: 8 },
    iqSuggested: ['What is the Phillies\u2019 single-game strikeout record?', 'How often does a 14-K pitcher finish the game?', 'Has Wheeler been past 14 before?'],
    iqAnswer: { q: 'What is the Phillies\u2019 single-game strikeout record?', headline: '17', unit: 'Phillies record', sub: 'Set twice, and not approached since. Only four Phillies have reached 15 in a game, and none of them did it after the seventh inning of a start on four days\u2019 rest.' },
  },
  {
    id: 'skenes-il', iq: false,
    text: 'Paul Skenes has been placed on the 10-day injured list with right forearm tightness.',
    move: { from: 'PIT', to: null },
  },
];

// ---- TODAY'S MARQUEE. MOCK. Shown when the generator has nothing yet —
// which, before first pitch, is the NORMAL case, not an error.
//
// IT IS A SHORTLIST, NOT THE SLATE. `HOME_TODAY_COUNT` is how many games there
// actually are; this array is the few worth naming, and the section links out
// to Games for the rest. Fifteen rows here would make Home the Games page,
// which is the one thing Home is defined as not being. FOUR is the ceiling.
// Dev: the pick is the generator's job (aces, division and wild-card stakes,
// rivalry) — the same significance service at a lower bar. NOT "the first four
// by start time", which on a 15-game Sunday is four one-o'clock games.
window.HOME_TODAY_COUNT = 15;
window.HOME_TODAY = [
  { away: 'ATL', home: 'HOU', time: '1:10 PM', pa: 'C. Sale', pah: '11\u20134 \u00b7 2.38', ph: 'H. Brown', phh: '14\u20137 \u00b7 2.61', note: 'Both aces' },
  { away: 'NYY', home: 'TOR', time: '1:07 PM', pa: 'G. Cole', pah: '10\u20135 \u00b7 3.11', ph: 'K. Gausman', phh: '12\u20138 \u00b7 3.44', note: 'Wild card' },
  { away: 'SFG', home: 'LAD', time: '4:10 PM', pa: 'L. Webb', pah: '13\u20139 \u00b7 3.02', ph: 'Y. Yamamoto', phh: '12\u20136 \u00b7 2.90', note: 'NL West' },
  { away: 'BOS', home: 'BAL', time: '7:05 PM', pa: 'G. Crochet', pah: '12\u20137 \u00b7 2.85', ph: 'C. Irvin', phh: '9\u201310 \u00b7 4.02', note: 'AL East' },
  { away: 'SDP', home: 'ARI', time: '9:40 PM', pa: 'D. Cease', pah: '11\u20138 \u00b7 3.34', ph: 'Z. Gallen', phh: '13\u20137 \u00b7 3.12', note: 'Wild card' },
];

// A DASHBOARD of current state, not a feed. Face 1 is recency-first, then season.
window.HOME_FOLLOWING = [
  { kind: 'team', k: 'HOU', name: 'Houston Astros', live: true, tiles: [
    '\u25bc7th \u00b7 leading Atlanta 3\u20130', '86\u201367 \u00b7 2nd AL West \u00b7 W4', 'Next: Sat vs SEA, 7:05'] },
  { kind: 'player', k: 'HOU', name: 'Hunter Brown', mlbId: 686613, live: true, tiles: [
    '6.0 IP, 0 H, 9 K vs ATL', '14\u20137 \u00b7 2.61 ERA \u00b7 218 K'] },
  { kind: 'player', k: 'HOU', name: 'Jeremy Pe\u00f1a', mlbId: 665161, live: true, tiles: [
    '2-for-4, 2B, RBI vs ATL', '.327 \u00b7 14 HR \u00b7 61 RBI'] },
  { kind: 'player', k: 'NYY', name: 'Aaron Judge', mlbId: 592450, live: true, tiles: [
    '3-for-4, 3 HR, 5 RBI @ TOR', '.329 \u00b7 47 HR \u00b7 118 RBI'] },
  { kind: 'team', k: 'CHC', name: 'Chicago Cubs', tiles: [
    'Final \u00b7 beat Pittsburgh 5\u20133', '79\u201374 \u00b7 3rd NL Central'] },
  { kind: 'player', k: 'LAD', name: 'Kyle Tucker', mlbId: 663656, tiles: [
    'Final \u00b7 1-for-4, HR, 2 RBI', '.311 \u00b7 31 HR \u00b7 96 RBI'] },
  { kind: 'team', k: 'BAL', name: 'Baltimore Orioles', tiles: [
    'Tonight vs Cleveland, 7:05', '81\u201372 \u00b7 4th AL East'] },
  { kind: 'player', k: 'LAD', name: 'Shohei Ohtani', mlbId: 660271, tiles: [
    '.301 \u00b7 48 HR \u00b7 104 RBI', 'Next: Sat vs SFG'] },
];

// FIXED SET: all eight team races every day, constant order. Only clubs still
// mathematically alive are listed, so a decided race collapses to one line.
window.HOME_SEPT_TEAMS = [
  { id: 'ale', title: 'AL East', left: 9, rows: [
    { abbr: 'NYY', wl: '94\u201359', gb: '\u2014' }, { abbr: 'BOS', wl: '90\u201363', gb: '4.0' }, { abbr: 'TOR', wl: '88\u201365', gb: '6.0' } ] },
  { id: 'alc', title: 'AL Central', left: 9, clinched: 'CLE', rows: [
    { abbr: 'CLE', wl: '89\u201364', gb: '\u2014' } ] },
  { id: 'alw', title: 'AL West', left: 9, rows: [
    { abbr: 'SEA', wl: '88\u201365', gb: '\u2014' }, { abbr: 'HOU', wl: '86\u201367', gb: '2.0' }, { abbr: 'TEX', wl: '83\u201370', gb: '5.0' } ] },
  { id: 'nle', title: 'NL East', left: 9, rows: [
    { abbr: 'PHI', wl: '92\u201361', gb: '\u2014' }, { abbr: 'NYM', wl: '84\u201369', gb: '8.0' } ] },
  { id: 'nlc', title: 'NL Central', left: 8, clinched: 'MIL', rows: [
    { abbr: 'MIL', wl: '93\u201360', gb: '\u2014' } ] },
  { id: 'nlw', title: 'NL West', left: 9, rows: [
    { abbr: 'LAD', wl: '95\u201358', gb: '\u2014' }, { abbr: 'SDP', wl: '85\u201368', gb: '10.0' } ] },
  { id: 'alwc', title: 'AL Wild Card', wc: true, spots: 3, left: 9, rows: [
    { abbr: 'BOS', wl: '90\u201363', gb: '+4.0', in: true }, { abbr: 'TOR', wl: '88\u201365', gb: '+2.0', in: true },
    { abbr: 'HOU', wl: '86\u201367', gb: '\u2014', in: true }, { abbr: 'TEX', wl: '83\u201370', gb: '3.0' },
    { abbr: 'DET', wl: '82\u201371', gb: '4.0' } ] },
  { id: 'nlwc', title: 'NL Wild Card', wc: true, spots: 3, left: 9, rows: [
    { abbr: 'SDP', wl: '85\u201368', gb: '+3.0', in: true }, { abbr: 'NYM', wl: '84\u201369', gb: '+2.0', in: true },
    { abbr: 'ARI', wl: '82\u201371', gb: '\u2014', in: true }, { abbr: 'CIN', wl: '81\u201372', gb: '1.0' },
    { abbr: 'SFG', wl: '79\u201374', gb: '3.0' } ] },
];

// ---- INDIVIDUAL CHASES, in two families: HITTING and PITCHING.
//
// A SECTION OF THEIR OWN, not a group inside Races (user's call, Sep 21). The
// earlier reading — "a batting title IS a race" — is true of the word and false
// of the object: a team race has a cut line, a deadline and an elimination
// rule, and every device on a race row (the rust tick, "3 spots", games left)
// belongs to that. A chase has none of them. Sharing a band forced one set of
// column rules onto two different things.
//
// Third element of each row is the player's TEAM, for the logo — a chase is
// individual, but "who is he" is most of what a name answers.
//
// Cy Young is deliberately ABSENT: an award VOTE, not a countable lead. Every
// row here is a number you can check — which is also why saves are in, despite
// being a poor measure of a season.
// LEAGUE-SPLIT (Sep 22, 2026). Every chase now carries `al` and `nl` row sets
// and the Chases header owns an AL/NL toggle. This also retires the odd pair of
// 'AL Batting' + 'NL Batting' cards sitting beside MLB-wide HR/RBI/K/ERA/SV:
// batting average was split by league because a batting TITLE is per-league —
// but so is every other one of these. One rule now covers all six.
window.HOME_CHASES_RUNIN = {
  hitting: [
    { id: 'avg', title: 'Batting average',
      al: [['Witt', '.332', 'KCR'], ['Judge', '.329', 'NYY'], ['Pe\u00f1a', '.327', 'HOU']],
      nl: [['Freeman', '.318', 'LAD'], ['Tucker', '.311', 'CHC'], ['Alonso', '.305', 'NYM']] },
    { id: 'hr', title: 'Home runs',
      al: [['Judge', '47', 'NYY'], ['Witt', '34', 'KCR'], ['Rooker', '33', 'OAK']],
      nl: [['Schwarber', '51', 'PHI'], ['Ohtani', '49', 'LAD'], ['Alonso', '40', 'NYM']] },
    { id: 'rbi', title: 'RBI',
      al: [['Judge', '118', 'NYY'], ['Ram\u00edrez', '106', 'CLE'], ['Witt', '102', 'KCR']],
      nl: [['Schwarber', '112', 'PHI'], ['Ohtani', '104', 'LAD'], ['Alonso', '98', 'NYM']] },
  ],
  pitching: [
    { id: 'so', title: 'Strikeouts',
      al: [['Brown', '232', 'HOU'], ['Skubal', '228', 'DET'], ['Gilbert', '214', 'SEA']],
      nl: [['Skenes', '241', 'PIT'], ['Wheeler', '238', 'PHI'], ['Sale', '219', 'ATL']] },
    { id: 'era', title: 'ERA',
      al: [['Brown', '2.61', 'HOU'], ['Skubal', '2.66', 'DET'], ['Valdez', '2.88', 'HOU']],
      nl: [['Sale', '2.38', 'ATL'], ['Skenes', '2.44', 'PIT'], ['Wheeler', '2.52', 'PHI']] },
    { id: 'sv', title: 'Saves',
      al: [['Clase', '41', 'CLE'], ['Hader', '37', 'HOU'], ['Duran', '34', 'MIN']],
      nl: [['Su\u00e1rez', '36', 'PHI'], ['D\u00edaz', '33', 'NYM'], ['Helsley', '30', 'STL']] },
  ],
};

// Flat form kept for the broadsheet exploration file (`home-a.jsx`), which
// renders chases as a single column and predates the league toggle — it takes
// the AL side so its `rows` contract still holds.
window.HOME_SEPT_CHASES = window.HOME_CHASES_RUNIN.hitting.concat(window.HOME_CHASES_RUNIN.pitching)
  .map(c => ({ ...c, rows: c.al }));

// Early-season records for quiet mode. A separate set on purpose: reusing the
// run-in numbers put "94–59" under a note reading "opening weeks".
window.HOME_SEPT_EARLY = {
  ale: { abbr: 'BAL', wl: '13–7', by: '1.5' },
  alc: { abbr: 'CLE', wl: '12–8', by: '0.5' },
  alw: { abbr: 'SEA', wl: '11–9', by: '1.0' },
  nle: { abbr: 'ATL', wl: '14–6', by: '2.0' },
  nlc: { abbr: 'MIL', wl: '12–8', by: '1.0' },
  nlw: { abbr: 'LAD', wl: '13–7', by: '0.5' },
};

// Search results for the Manage panel. MOCK — in the app this is the existing
// search query (teams + the player name-search built for the header field).
window.HOME_FOLLOW_SEARCH = [
  { kind: 'team', k: 'SEA', name: 'Seattle Mariners' },
  { kind: 'team', k: 'PHI', name: 'Philadelphia Phillies' },
  { kind: 'player', k: 'HOU', name: 'Jos\u00e9 Altuve', mlbId: 514888, sub: '2B · HOU' },
  { kind: 'player', k: 'LAD', name: 'Shohei Ohtani', mlbId: 660271, sub: 'DH · LAD' },
];

// ---- MID-SEASON races. June is NOT the early-season quiet mode and NOT the
// run-in: the standings are real and worth reading, but nothing is decided and
// no one is chasing a cut line for keeps.
//
// The board's membership rule has to change with it. "Mathematically alive" is
// a useless filter in June — every club in baseball qualifies — so the rule
// that actually holds all season is WITHIN STRIKING DISTANCE, a games-back
// threshold that tightens as games remaining falls (roughly 10 games in June,
// converging on "alive" in late September, which is the same rule at the end of
// its range). One knob, and it yields 3–4 clubs per division here.
window.HOME_RACES_MID = [
  { id: 'ale', title: 'AL East', left: 88, rows: [
    { abbr: 'NYY', wl: '44–30', gb: '\u2014' }, { abbr: 'BOS', wl: '42–32', gb: '2.0' },
    { abbr: 'TOR', wl: '40–34', gb: '4.0' }, { abbr: 'BAL', wl: '37–37', gb: '7.0' } ] },
  { id: 'alc', title: 'AL Central', left: 88, rows: [
    { abbr: 'CLE', wl: '43–31', gb: '\u2014' }, { abbr: 'KCR', wl: '38–36', gb: '5.0' },
    { abbr: 'DET', wl: '37–37', gb: '6.0' } ] },
  { id: 'alw', title: 'AL West', left: 87, rows: [
    { abbr: 'SEA', wl: '41–33', gb: '\u2014' }, { abbr: 'HOU', wl: '39–35', gb: '2.0' },
    { abbr: 'TEX', wl: '38–36', gb: '3.0' } ] },
  { id: 'nle', title: 'NL East', left: 88, rows: [
    { abbr: 'PHI', wl: '46–28', gb: '\u2014' }, { abbr: 'NYM', wl: '41–33', gb: '5.0' },
    { abbr: 'ATL', wl: '39–35', gb: '7.0' } ] },
  { id: 'nlc', title: 'NL Central', left: 88, rows: [
    { abbr: 'MIL', wl: '45–29', gb: '\u2014' }, { abbr: 'CHC', wl: '40–34', gb: '5.0' },
    { abbr: 'CIN', wl: '38–36', gb: '7.0' } ] },
  { id: 'nlw', title: 'NL West', left: 87, rows: [
    { abbr: 'LAD', wl: '47–27', gb: '\u2014' }, { abbr: 'SDP', wl: '42–32', gb: '5.0' },
    { abbr: 'SFG', wl: '39–35', gb: '8.0' } ] },
  { id: 'alwc', title: 'AL Wild Card', wc: true, spots: 3, left: 88, rows: [
    { abbr: 'BOS', wl: '42–32', gb: '+2.0', in: true }, { abbr: 'TOR', wl: '40–34', gb: '+1.0', in: true },
    { abbr: 'HOU', wl: '39–35', gb: '\u2014', in: true }, { abbr: 'KCR', wl: '38–36', gb: '1.0' },
    { abbr: 'DET', wl: '37–37', gb: '2.0' } ] },
  { id: 'nlwc', title: 'NL Wild Card', wc: true, spots: 3, left: 88, rows: [
    { abbr: 'SDP', wl: '42–32', gb: '+3.0', in: true }, { abbr: 'NYM', wl: '41–33', gb: '+2.0', in: true },
    { abbr: 'CHC', wl: '40–34', gb: '\u2014', in: true }, { abbr: 'SFG', wl: '39–35', gb: '1.0' },
    { abbr: 'CIN', wl: '38–36', gb: '2.0' } ] },
];

window.HOME_CHASES_MID = {
  hitting: [
    { id: 'avg', title: 'Batting average',
      al: [['Witt', '.341', 'KCR'], ['Judge', '.325', 'NYY'], ['Pe\u00f1a', '.318', 'HOU']],
      nl: [['Freeman', '.329', 'LAD'], ['Tucker', '.314', 'CHC'], ['Alonso', '.301', 'NYM']] },
    { id: 'hr', title: 'Home runs',
      al: [['Judge', '26', 'NYY'], ['Witt', '18', 'KCR'], ['Rooker', '17', 'OAK']],
      nl: [['Ohtani', '24', 'LAD'], ['Schwarber', '23', 'PHI'], ['Alonso', '20', 'NYM']] },
    { id: 'rbi', title: 'RBI',
      al: [['Judge', '61', 'NYY'], ['Ram\u00edrez', '55', 'CLE'], ['Witt', '52', 'KCR']],
      nl: [['Ohtani', '57', 'LAD'], ['Schwarber', '54', 'PHI'], ['Alonso', '49', 'NYM']] },
  ],
  pitching: [
    { id: 'so', title: 'Strikeouts',
      al: [['Brown', '110', 'HOU'], ['Skubal', '108', 'DET'], ['Gilbert', '101', 'SEA']],
      nl: [['Skenes', '121', 'PIT'], ['Wheeler', '118', 'PHI'], ['Sale', '104', 'ATL']] },
    { id: 'era', title: 'ERA',
      al: [['Brown', '2.64', 'HOU'], ['Skubal', '2.71', 'DET'], ['Valdez', '2.95', 'HOU']],
      nl: [['Sale', '2.21', 'ATL'], ['Skenes', '2.30', 'PIT'], ['Wheeler', '2.58', 'PHI']] },
    { id: 'sv', title: 'Saves',
      al: [['Clase', '21', 'CLE'], ['Hader', '19', 'HOU'], ['Duran', '17', 'MIN']],
      nl: [['Su\u00e1rez', '18', 'PHI'], ['D\u00edaz', '16', 'NYM'], ['Helsley', '14', 'STL']] },
  ],
};

// FOLLOW CAP. Eight was the first pass's number and it was arbitrary: a
// dashboard of eight is a design, a dashboard of twenty is a list, and a user
// with twenty interests is not misusing the feature. So the cap is 20 (a real
// ceiling, because face-1 usefulness dies once you cannot see the rail's end)
// and the rail scrolls past what fits — see FollowRail in `home.jsx`.
window.HOME_FOLLOW_CAP = 20;

// A 20-follow set, for the crowded state. Extends the eight above rather than
// replacing them, so the two states are comparable.
window.HOME_FOLLOWING_MANY = window.HOME_FOLLOWING.concat([
  { kind: 'player', k: 'KCR', name: 'Bobby Witt Jr.', mlbId: 677951, live: true, tiles: ['1-for-3, 2B vs DET', '.332 · 29 HR · 98 RBI'] },
  { kind: 'player', k: 'PHI', name: 'Kyle Schwarber', mlbId: 656941, live: true, tiles: ['2-for-4, HR vs NYM', '.248 · 51 HR · 112 RBI'] },
  { kind: 'team', k: 'PHI', name: 'Philadelphia Phillies', live: true, tiles: ['▲3rd · tied with New York 2–2', '92–61 · 1st NL East · W2'] },
  { kind: 'player', k: 'PIT', name: 'Paul Skenes', mlbId: 694973, tiles: ['Final · 7.0 IP, 1 ER, 11 K', '13–5 · 2.44 ERA · 241 K'] },
  { kind: 'team', k: 'SEA', name: 'Seattle Mariners', tiles: ['Tonight vs Texas, 9:40', '88–65 · 1st AL West'] },
  { kind: 'player', k: 'ATL', name: 'Chris Sale', mlbId: 519242, tiles: ['Final · 6.0 IP, 2 ER, 8 K', '11–4 · 2.38 ERA · 197 K'] },
  { kind: 'team', k: 'NYM', name: 'New York Mets', live: true, tiles: ['▼3rd · tied with Philadelphia 2–2', '84–69 · 2nd NL East'] },
  { kind: 'player', k: 'CLE', name: 'Emmanuel Clase', mlbId: 661403, tiles: ['Final · 1.0 IP, SV (41)', '41 SV · 1.88 ERA'] },
  { kind: 'team', k: 'BOS', name: 'Boston Red Sox', tiles: ['Tonight @ Baltimore, 7:05', '90–63 · 2nd AL East'] },
  { kind: 'player', k: 'NYM', name: 'Pete Alonso', mlbId: 624413, live: true, tiles: ['0-for-3 vs PHI', '.305 · 38 HR · 101 RBI'] },
  { kind: 'team', k: 'LAD', name: 'Los Angeles Dodgers', tiles: ['Final · beat Pittsburgh 7–3', '95–58 · 1st NL West'] },
  { kind: 'player', k: 'TOR', name: 'Kevin Gausman', mlbId: 592332, live: true, tiles: ['5.0 IP, 6 ER, 4 K vs NYY', '12–8 · 3.44 ERA'] },
]);

// ---- IN THE NEWS. MOCK.
//
// A DIFFERENT PROVENANCE, therefore a different section. What's hot is what the
// app's own feeds PROVE is happening (generated, carries structured context,
// speaks in the app's voice). A headline is what someone else is claiming
// (fetched, carries a source and a link, no structured context). Merging them
// would put an IQ insight and an outside claim at the same weight in one list,
// and the reader could no longer tell which is the app's own judgment — the
// single most valuable thing the page has.
//
// Shape per item: `title` (verbatim, never paraphrased into our voice — a
// rewritten headline is a claim we did not verify), `source`, `ago`, and an
// optional `subject` naming what it is about so the section can be deduped
// against the hot list and marked when it concerns a followed entity.
window.HOME_NEWS = [
  { id: 'n1', title: 'Cubs’ Bregman hospitalized after being hit in face by foul ball on deck', source: 'AP', ago: '14h', subject: 'bregman-hbp' },
  { id: 'n2', title: 'Playoff picture: six clubs clinched, four races still open with six to play', source: 'MLB.com', ago: '3h' },
  { id: 'n3', title: 'Dodgers complete sweep in San Francisco to stay alive for a first-round bye', source: 'ESPN', ago: '18h', subject: 'dodgers-bye' },
  { id: 'n4', title: 'White Sox chase a berth and a division in the same week', source: 'The Athletic', ago: '6h' },
  { id: 'n5', title: 'Guardians’ rotation sets up for a one-game Central lead', source: 'Cleveland.com', ago: '9h' },
  { id: 'n6', title: 'Rangers hold on in the West as Houston’s margin narrows', source: 'MLB.com', ago: '11h' },
];

window.HOME_IQ_MS = 1400;

// ---- the mark for a followed entity: team logo or player headshot, one size.
window.FollowMark = function FollowMark({ f, size = 30 }) {
  const t = TEAMS[f.k];
  return f.kind === 'team'
    ? <window.TeamDot team={t} size={size} />
    : <window.Headshot team={t} mlbId={f.mlbId} initials={f.name.split(' ').map(w => w[0]).join('')} size={size} />;
};

// ---- the Baseball IQ contextual panel, invoked from the diamond bullet. The
// EXISTING IQ experience on a light surface — same object, not a second feature.
// Shared by all three candidates: the panel is not what is being explored.
window.HomeIQPanel = function HomeIQPanel({ item, onClose, width }) {
  const HS = window.HS;
  const [q, setQ] = React.useState('');
  const [phase, setPhase] = React.useState('idle');
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const ask = (text) => { setQ(text); setPhase('thinking'); setTimeout(() => setPhase('answered'), window.HOME_IQ_MS); };
  const a = item.iqAnswer;
  return (
    <div style={{ marginTop: 12, maxWidth: width || 640, background: T.surface, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.accent}`, borderRadius: `0 0 ${T.r.md}px ${T.r.md}px`, boxShadow: T.sh.md }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderBottom: `1px solid ${T.border}` }}>
        <window.IQDiamond size={15} />
        <window.Eyebrow style={{ fontSize: HS.xs, color: T.accent }}>Baseball IQ</window.Eyebrow>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} aria-label="Close Baseball IQ" style={{ ...window.iconBtn, width: 26, height: 26, fontSize: HS.sm }}>&#10005;</button>
      </div>
      <div style={{ padding: '12px 13px 14px' }}>
        <input value={q} onChange={e => { setQ(e.target.value); setPhase('idle'); }}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) ask(q); }}
          disabled={phase === 'thinking'} placeholder="Ask about this…"
          style={{ width: '100%', boxSizing: 'border-box', height: 34, padding: '0 12px', background: T.bg, border: `1px solid ${T.borderStrong}`, borderRadius: T.r.pill, fontFamily: T.sans, fontSize: HS.base, color: T.text, outline: 'none' }} />
        {phase === 'idle' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {item.iqSuggested.map(s => (
              <button key={s} onClick={() => ask(s)} style={{ fontFamily: T.sans, fontSize: HS.sm, fontWeight: 500, color: T.text, background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.r.pill, padding: '6px 11px', cursor: 'pointer', textAlign: 'left' }}>{s}</button>
            ))}
          </div>
        )}
        {phase === 'thinking' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 28, marginTop: 10 }}>
            <span style={{ display: 'inline-flex', animation: 'iqPulseLight 1.1s ease-in-out infinite' }}><window.IQDiamond size={16} /></span>
            <span style={{ fontFamily: T.sans, fontSize: HS.base, color: T.textMuted }}>Reading the record…</span>
            <style>{'@keyframes iqPulseLight{0%,100%{opacity:1}50%{opacity:.4}}'}</style>
          </div>
        )}
        {phase === 'answered' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: T.mono, fontSize: HS.hero, fontWeight: 800, lineHeight: 1, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{a.headline}</span>
              <window.Eyebrow style={{ fontSize: HS.xs, color: T.accent }}>{a.unit}</window.Eyebrow>
            </div>
            <p style={{ margin: 0, fontFamily: T.sans, fontSize: HS.base, lineHeight: 1.55, color: T.textMuted, textWrap: 'pretty' }}>{a.sub}</p>
          </div>
        )}
      </div>
    </div>
  );
};
