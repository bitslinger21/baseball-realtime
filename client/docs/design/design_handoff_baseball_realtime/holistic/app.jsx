/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard, Foundations, LandingScreen, GameScreen, GameScreenV2Wireframe, GameScreenV2WireframeR3, GameScreenV2WireframeR4, GameScreenV2, PlayerScreen */

function App() {
  return (
    <DesignCanvas
      title="Baseball Realtime — Holistic redesign"
      subtitle="One design language across landing, game view, and player profile. Each artboard is at full page width; pan and zoom to explore. Double-click any artboard to focus it."
    >
      <DCSection id="foundations" title="00 · Foundations" subtitle="The shared vocabulary every screen draws from — colors, type, stat cards, tabs, tables, and game-state primitives.">
        <DCArtboard id="foundations" label="Design language" width={1400} height={1100}>
          <Foundations />
        </DCArtboard>
      </DCSection>

      <DCSection id="landing" title="01 · Daily slate (landing)" subtitle="Restructured: filter bar + sectioned Live / Final / Upcoming. Live games get rich face-off cards; finals and upcoming compress to a grid.">
        <DCArtboard id="landing" label="Daily slate" width={1440} height={1400}>
          <LandingScreen />
        </DCArtboard>
      </DCSection>

      <DCSection id="game" title="02 · Game view" subtitle="Top: strike zone (left) + pitch description (right). Below: pitch-by-pitch list (primary) + lineup. No box score, no timeline.">
        <DCArtboard id="game" label="Game view (current)" width={1440} height={1500}>
          <GameScreen />
        </DCArtboard>
        <DCArtboard id="game-v2-wire" label="Game view v2 — Option A wireframe r2" width={1440} height={1500}>
          <GameScreenV2Wireframe />
        </DCArtboard>
        <DCArtboard id="game-v2" label="Game view v2 — Option A (hi-fi)" width={1440} height={1500}>
          <GameScreenV2 />
        </DCArtboard>
        <DCArtboard id="game-v2-wire-r3" label="Game view v2 — r3 wireframe (line score + play-state move)" width={1440} height={1300}>
          <GameScreenV2WireframeR3 />
        </DCArtboard>
        <DCArtboard id="game-v2-wire-r4" label="Game view v2 — r4 wireframe (light eyebrow + scoring summary + leaders)" width={1440} height={1300}>
          <GameScreenV2WireframeR4 />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-overview" title="03 · Player · Overview" subtitle="The awkward left sidebar is gone — profile becomes a full-width hero. Overview is the front page: recent form, hot zones, contextual streaks.">
        <DCArtboard id="player-overview" label="Player · Overview" width={1440} height={1100}>
          <PlayerScreen tab={0} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-stats" title="04 · Player · Stats" subtitle="Sectioned KPI cards with league-average comparisons inline. Heavy red label fills are gone; data is the visual.">
        <DCArtboard id="player-stats" label="Player · Stats" width={1440} height={1500}>
          <PlayerScreen tab={1} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-splits" title="05 · Player · Splits" subtitle="Tables get visual bars and league-delta markers. Same data as before, scannable in a glance.">
        <DCArtboard id="player-splits" label="Player · Splits" width={1440} height={1500}>
          <PlayerScreen tab={2} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-pitching" title="06 · Player · Pitching" subtitle="New tab: how pitchers attack this batter. Pitch mix donut, performance by pitch type with embedded bars, damage heat map, count-leverage attack patterns.">
        <DCArtboard id="player-pitching" label="Player · Pitching" width={1440} height={1200}>
          <PlayerScreen tab={3} />
        </DCArtboard>
      </DCSection>

      <DCSection id="player-history" title="07 · Player · History" subtitle="Career arc as a visual band of year-cards. Game log gets W/L pills and a notes column for context, not just numbers.">
        <DCArtboard id="player-history" label="Player · History" width={1440} height={1100}>
          <PlayerScreen tab={4} />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
