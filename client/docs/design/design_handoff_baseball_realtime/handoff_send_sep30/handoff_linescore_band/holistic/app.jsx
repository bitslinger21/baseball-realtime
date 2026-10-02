/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard, Foundations, LandingScreen, GameScreen, GameScreenV2Wireframe, GameScreenV2WireframeR3, GameScreenV2WireframeR4, GameScreenV2, GameScreenV2Pregame, PlayerScreen, UpcomingTab, FrontCard, LineScoreCard, PitchMixCard, WinProbCard, FieldCard, WeatherCard */

function App() {
  return (
    <DesignCanvas
      title="Baseball Realtime — Holistic redesign"
      subtitle="One design language across landing, game view, and player profile. Each artboard is at full page width; pan and zoom to explore. Double-click any artboard to focus it."
    >
      <DCSection id="foundations" title="00 · Foundations" subtitle="The shared vocabulary every screen draws from — colors, type, stat cards, tabs, tables, and game-state primitives.">
        <DCArtboard id="foundations" label="Design language" width={1530} height={1480}>
          <Foundations />
        </DCArtboard>
      </DCSection>

      <DCSection id="landing" title="01 · Daily slate (landing)" subtitle="Restructured: filter bar + sectioned Live / Final / Upcoming. Live games get rich face-off cards; finals and upcoming compress to a grid.">
        <DCArtboard id="landing" label="Daily slate" width={1450} height={1400}>
          <LandingScreen />
        </DCArtboard>
      </DCSection>

      <DCSection id="game" title="02 · Game view" subtitle="Top: strike zone (left) + pitch description (right). Below: pitch-by-pitch list (primary) + lineup. No box score, no timeline.">
        <DCArtboard id="game" label="Game view (current)" width={1450} height={1500}>
          <GameScreen />
        </DCArtboard>
        <DCArtboard id="game-v2-wire" label="Game view v2 — Option A wireframe r2" width={1450} height={1500}>
          <GameScreenV2Wireframe />
        </DCArtboard>
        <DCArtboard id="game-v2" label="Game view v2 — Option A (hi-fi)" width={1650} height={1900}>
          <GameScreenV2 />
        </DCArtboard>
        <DCArtboard id="game-v2-scout" label="Game view — Scout mode (marker + timeline, finals)" width={1450} height={1900}>
          <window.GameScoutPrototype showIntro={false} />
        </DCArtboard>
        <DCArtboard id="game-v2-jump-live" label="Pitch by pitch — Jump-to-live pill (follow broken)" width={700} height={700}>
          <div style={{ padding: 20, background: T.bg }}>
            {/* Non-resting state: the reader has scrolled away from the live edge, so
                the pill appears with a count of at-bats behind. Hidden by default. */}
            <window.PitchByPitchV2 initialBehind={3} />
          </div>
        </DCArtboard>
        <DCArtboard id="game-v2-atbats-chevrons" label="MatchupLeft — narrow (at-bats row overflow + chevrons)" width={620} height={640}>
          <div style={{ padding: 20, background: T.bg }}>
            {/* Deliberately narrow so the At-bats scorebook row overflows: proves the
                gradient fade + ‹ › chevrons and the scroll-to-edge behaviour. */}
            <window.MatchupLeft lineupsOpen={false} onToggleLineups={() => {}} />
          </div>
        </DCArtboard>
        <DCArtboard id="game-v2-extra-innings" label="Game view v2 — line-score drawer, extra innings (scroll + chevrons)" width={1240} height={280}>
          <div style={{ padding: 24, background: T.bg }}>
            {/* Narrow frame on purpose: proves the innings row overflows, syncs all three
                rows, and shows the ‹ › chevrons. 13-inning game, ▼13 current.
                defaultOpen so the drawer's grid is visible without a click. */}
            <window.LineScoreBand
              defaultOpen
              curInning={13}
              runsAway={[0, 1, 0, 0, 2, 0, 1, 4, 0, 1, 0, 2, 1]}
              runsHome={[0, 0, 1, 2, 0, 1, 1, 0, 0, 1, 0, 2, null]}
              totals={{ away: [12, 16, 0], home: [8, 12, 1] }}
            />
          </div>
        </DCArtboard>
        <DCArtboard id="game-v2-pregame" label="Game view v2 — Pregame (before first pitch)" width={1650} height={1940}>
          <GameScreenV2Pregame />
        </DCArtboard>
        <DCArtboard id="game-v2-wire-r3" label="Game view v2 — r3 wireframe (line score + play-state move)" width={1450} height={1300}>
          <GameScreenV2WireframeR3 />
        </DCArtboard>
        <DCArtboard id="game-v2-wire-r4" label="Game view v2 — r4 wireframe (light eyebrow + scoring summary + leaders)" width={1450} height={1300}>
          <GameScreenV2WireframeR4 />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-overview" title="03 · Player · Overview" subtitle="The awkward left sidebar is gone — profile becomes a full-width hero. Overview is the front page: recent form, hot zones, contextual streaks.">
        <DCArtboard id="player-overview" label="Player · Overview" width={1450} height={1280}>
          <PlayerScreen tab={0} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-stats" title="04 · Player · Stats" subtitle="Sectioned KPI cards with league-average comparisons inline. Heavy red label fills are gone; data is the visual.">
        <DCArtboard id="player-stats" label="Player · Stats" width={1450} height={2560}>
          <PlayerScreen tab={1} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-splits" title="05 · Player · Splits" subtitle="Tables get visual bars and league-delta markers. Same data as before, scannable in a glance.">
        <DCArtboard id="player-splits" label="Player · Splits" width={1450} height={2000}>
          <PlayerScreen tab={2} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-pitching" title="06 · Player · Pitching" subtitle="New tab: how pitchers attack this batter. Pitch mix donut, performance by pitch type with embedded bars, damage heat map, count-leverage attack patterns.">
        <DCArtboard id="player-pitching" label="Player · Pitching" width={1450} height={1360}>
          <PlayerScreen tab={3} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-history" title="07 · Player · History" subtitle="Career arc as a visual band of year-cards. Game log gets W/L pills and a notes column for context, not just numbers.">
        <DCArtboard id="player-history" label="Player · History" width={1450} height={1380}>
          <PlayerScreen tab={4} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-upcoming" title="08 · Player · Upcoming" subtitle="New forward-looking tab: the next 3 games. Pick one to see how the batter projects against the probable starter — head-to-head, his arsenal crossed with the batter's pitch-type history, splits, and location overlap. Clean 'first meeting' state when there's no history.">
        <DCArtboard id="player-upcoming" label="Player · Upcoming" width={1450} height={1880}>
          <PlayerScreen tab={5} />
        </DCArtboard>
      </DCSection>

      <DCSection id="matchup-explorer" title="09 · Matchup Explorer" subtitle="Standalone, not tied to today's game — scout any pitcher vs any batter across the league. The old per-game Head-to-head still exists for today's actual matchup; this is the general-purpose version. Mock data only covers the two rosters in LINEUPS (HOU/CHC); blocks same-team pairings since a pitcher never faces his own teammates.">
        <DCArtboard id="matchup-explorer" label="Matchup Explorer" width={2460} height={780}>
          <div style={{ padding: 24, background: T.bg, minHeight: '100%' }}>
            <window.LeagueMatchupScreen lineups={window.LINEUPS} />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="scoring-widget-flip" title="10 · Scoring Widget" subtitle="Front: live at-bat. Back: score summary with R/H/E. Minimized: compact dock view.">
        <DCArtboard id="scoring-widget-carousel" label="Carousel slides: Front · Line Score · Win Prob · Pitch Mix · Field · Weather" width={1860} height={280}>
          <div style={{ padding: 24, background: T.bg, minHeight: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(max-content, 1fr))', gap: 24, alignItems: 'start' }}>
            <div style={{ gridColumn: 1 }}>
              <window.SWFrame><FrontCard /></window.SWFrame>
            </div>
            <div style={{ gridColumn: 2 }}>
              <window.SWFrame><LineScoreCard /></window.SWFrame>
            </div>
            <div style={{ gridColumn: 3 }}>
              <window.SWFrame><PitchMixCard /></window.SWFrame>
            </div>
            <div style={{ gridColumn: 4 }}>
              <window.SWFrame><WinProbCard /></window.SWFrame>
            </div>
          </div>
        </DCArtboard>

        <DCArtboard id="scoring-widget-minimized" label="Minimized (dock)" width={300} height={100}>
          <div style={{ padding: 16, background: T.bg, minHeight: '100%' }}>
            <div style={{ width: 200, background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: T.r.sm, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gridTemplateRows: 'auto auto', alignItems: 'center', gap: '6px 8px', padding: '8px 12px', position: 'relative' }}>
              <img src="https://www.mlbstatic.com/team-logos/141.svg" alt="TOR" style={{ width: 20, height: 20, gridRow: 1, gridColumn: 1 }} />
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.ink, gridRow: 1, gridColumn: 2 }}>1</span>
              <img src="https://www.mlbstatic.com/team-logos/117.svg" alt="HOU" style={{ width: 20, height: 20, gridRow: 2, gridColumn: 1 }} />
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: T.ink, gridRow: 2, gridColumn: 2 }}>3</span>
              <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.textMuted, textAlign: 'center', gridRow: '1 / 3', gridColumn: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>2<span style={{ fontSize: 10 }}>▲</span></div>
            </div>
          </div>
        </DCArtboard>

        <DCArtboard id="field-card" label="Field" width={505} height={280}>
          <div style={{ padding: 24, background: T.bg }}>
            <window.SWFrame><FieldCard /></window.SWFrame>
          </div>
        </DCArtboard>
        <DCArtboard id="weather-card" label="Weather" width={505} height={245}>
          <div style={{ padding: 24, background: T.bg }}>
            <window.SWFrame><WeatherCard /></window.SWFrame>
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

window.App = App;
