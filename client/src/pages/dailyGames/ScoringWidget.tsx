import { useState } from 'react';
import type { ReactElement } from 'react';
import './ScoringWidget.css';

function formatElapsed(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}H ${m}M` : `${m}M`;
}

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function Pips({ filled, total }: { filled: number; total: number }): ReactElement {
  return (
    <div className="sw-pips">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`sw-pip${i < filled ? ' sw-pip--filled' : ''}`} />
      ))}
    </div>
  );
}

interface TeamSide {
  abbr: string;
  name: string;
  logoUrl: string | null;
}

export interface ScoringWidgetProps {
  away: TeamSide;
  home: TeamSide;
  awayScore: number | null;
  homeScore: number | null;
  awayHits: number | null;
  homeHits: number | null;
  awayErrors: number | null;
  homeErrors: number | null;
  inning: number | null;
  half: 'top' | 'bottom' | null;
  balls: number;
  strikes: number;
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean; runner1: string | null; runner2: string | null; runner3: string | null };
  pitcher: { name: string; era: string | null; pc: number | null; logoUrl: string | null } | null;
  batter: { name: string; avg: string | null; ab: number | null; h: number | null; logoUrl: string | null } | null;
  venue: string | null;
  elapsedMinutes: number | null;
  onEnter: () => void;
}

function TeamColumn({ team, score }: { team: TeamSide; score: number | null }): ReactElement {
  return (
    <div className="sw-team">
      {team.logoUrl ? (
        <img src={team.logoUrl} alt={team.abbr} className="sw-team__logo" loading="lazy" />
      ) : (
        <div className="sw-team__logo-fallback">{team.abbr.charAt(0)}</div>
      )}
      <div className="sw-team__abbr">{team.abbr}</div>
      <div className="sw-team__score num">{score ?? '—'}</div>
    </div>
  );
}

export function ScoringWidget({
  away, home, awayScore, homeScore,
  awayHits, homeHits, awayErrors, homeErrors,
  inning, half, balls, strikes, outs,
  bases, pitcher, batter,
  venue, elapsedMinutes,
  onEnter,
}: ScoringWidgetProps): ReactElement {
  const [flipped, setFlipped] = useState(false);

  const inningLabel = inning != null ? ordinal(inning) : '—';
  const halfArrow = half === 'top' ? '▲' : half === 'bottom' ? '▼' : '';

  return (
    <div
      className="sw"
      onClick={onEnter}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEnter(); }}
    >
      <div className={`sw-inner${flipped ? ' sw-inner--flipped' : ''}`}>

        {/* ── Front face ── */}
        <div className="sw-face sw-face--front">
          <div className="sw-front-header">
            <div className="sw-matchup">
              <div className="sw-matchup__row">
                <div className="sw-matchup__person">
                  {pitcher?.logoUrl && <img src={pitcher.logoUrl} alt="" className="sw-matchup__logo" />}
                  <span className="sw-matchup__name">{pitcher?.name ?? '—'}</span>
                </div>
                <span className="sw-matchup__stat">{pitcher?.era ?? '—'}</span>
                <span className="sw-matchup__stat num">{pitcher?.pc != null ? `${pitcher.pc} PC` : '—'}</span>
              </div>
              <div className="sw-matchup__row">
                <div className="sw-matchup__person">
                  {batter?.logoUrl && <img src={batter.logoUrl} alt="" className="sw-matchup__logo" />}
                  <span className="sw-matchup__name">{batter?.name ?? '—'}</span>
                </div>
                <span className="sw-matchup__stat">{batter?.avg ?? '—'}</span>
                {batter?.ab != null && batter.ab > 0
                  ? <span className="sw-matchup__stat num">{batter.h ?? 0}-{batter.ab}</span>
                  : <span className="sw-matchup__stat">—</span>
                }
              </div>
            </div>
            <button
              className="sw-flip-btn"
              aria-label="Show box score"
              onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
            >⟲</button>
          </div>

          <div className="sw-body">
            <TeamColumn team={away} score={awayScore} />
            <div className="sw-divider" />

            <div className="sw-game-state">
              <div className="sw-game-state__inning">
                <span className="num">{inningLabel}</span>
                {halfArrow && <span className="sw-game-state__arrow">{halfArrow}</span>}
              </div>
              <div className="sw-bases">
                <div className={`sw-base sw-base--2${bases.second ? ' sw-base--on' : ''}`} data-tooltip={bases.second && bases.runner2 ? bases.runner2 : undefined}>{bases.second ? '◆' : '◇'}</div>
                <div className={`sw-base sw-base--3${bases.third ? ' sw-base--on' : ''}`} data-tooltip={bases.third && bases.runner3 ? bases.runner3 : undefined}>{bases.third ? '◆' : '◇'}</div>
                <div className={`sw-base sw-base--1${bases.first ? ' sw-base--on' : ''}`} data-tooltip={bases.first && bases.runner1 ? bases.runner1 : undefined}>{bases.first ? '◆' : '◇'}</div>
              </div>
            </div>

            <div className="sw-divider" />

            <div className="sw-count">
              {(['balls', 'strikes', 'outs'] as const).map((label) => {
                const [val, total] =
                  label === 'balls'   ? [balls,   3] :
                  label === 'strikes' ? [strikes, 2] :
                                        [outs,    2];
                return (
                  <div key={label} className="sw-count__row">
                    <span className="sw-count__label">{label}</span>
                    <Pips filled={val} total={total} />
                  </div>
                );
              })}
            </div>

            <div className="sw-divider" />
            <TeamColumn team={home} score={homeScore} />
          </div>
        </div>

        {/* ── Back face ── */}
        <div className="sw-face sw-face--back">
          <div className="sw-back-header">
            <span className="sw-venue">{venue ?? '—'}</span>
            <button
              className="sw-flip-btn"
              aria-label="Show live game"
              onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
            >←</button>
          </div>

          <div className="sw-elapsed">
            <span className="sw-elapsed__time num">{formatElapsed(elapsedMinutes)}</span>
            <span className="sw-elapsed__label">elapsed</span>
          </div>

          <div className="sw-rhe-body">
            <div className="sw-rhe-grid">
              <div />
              <div className="sw-rhe-header">R</div>
              <div className="sw-rhe-header">H</div>
              <div className="sw-rhe-header">E</div>

              <div className="sw-rhe-team">
                {away.logoUrl
                  ? <img src={away.logoUrl} alt={away.abbr} className="sw-rhe-logo" />
                  : <span className="sw-rhe-abbr">{away.abbr}</span>
                }
                <span className="sw-rhe-team__name">{away.name}</span>
              </div>
              <div className="sw-rhe-val sw-rhe-val--runs num">{awayScore ?? '—'}</div>
              <div className="sw-rhe-val sw-rhe-val--hits num">{awayHits ?? '—'}</div>
              <div className="sw-rhe-val num">{awayErrors ?? '—'}</div>

              <div className="sw-rhe-team">
                {home.logoUrl
                  ? <img src={home.logoUrl} alt={home.abbr} className="sw-rhe-logo" />
                  : <span className="sw-rhe-abbr">{home.abbr}</span>
                }
                <span className="sw-rhe-team__name">{home.name}</span>
              </div>
              <div className="sw-rhe-val sw-rhe-val--runs num">{homeScore ?? '—'}</div>
              <div className="sw-rhe-val sw-rhe-val--hits num">{homeHits ?? '—'}</div>
              <div className="sw-rhe-val num">{homeErrors ?? '—'}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
