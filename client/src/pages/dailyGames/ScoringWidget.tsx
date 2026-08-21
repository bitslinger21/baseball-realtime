import { useState, useRef, useEffect, useId } from 'react';
import type { ReactElement } from 'react';
import type { PitchMixData, WinProbData, FieldData, WeatherData } from '../../realtime/useRealtimeDailyGames';
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
  pitchMix?: PitchMixData | null;
  winProb?: WinProbData | null;
  venueCity?: string | null;
  venueState?: string | null;
  fieldCard?: FieldData | null;
  weather?: WeatherData | null;
  startTimeUtc?: string | null;
  onEnter: () => void;
  onMinimize: () => void;
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

function DonutChart({ data }: { data: PitchMixData }): ReactElement {
  const C = 2 * Math.PI * 40;
  let cumulative = 0;
  const arcs = data.entries.map(e => {
    const dash = (e.percent / 100) * C;
    const off = cumulative;
    cumulative += dash;
    return { ...e, dash, off };
  });
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx={60} cy={60} r={40} fill="none" stroke="var(--color-border)" strokeWidth={1} />
      <g transform="rotate(-90 60 60)">
        {arcs.map(a => (
          <circle key={a.code} cx={60} cy={60} r={40} fill="none"
            stroke={a.color} strokeWidth={22}
            strokeDasharray={`${a.dash} ${C}`} strokeDashoffset={-a.off}
            opacity={0.85}
          />
        ))}
      </g>
      <text x={60} y={56} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fontWeight={700} fill="var(--color-text-muted)">Seen</text>
      <text x={60} y={69} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fontWeight={700} fill="var(--color-ink)">{data.seenCount}</text>
    </svg>
  );
}

function WinProbChart({ data }: { data: WinProbData }): ReactElement {
  const rawUid = useId();
  const uid = rawUid.replace(/:/g, '');

  const X_START = 8, X_END = 344, X_RANGE = X_END - X_START;
  const Y_MID = 58;
  const Y_RANGE = 38;

  // Expand X-axis for extra innings; minimum 9
  const lastInning = data.dataPoints[data.dataPoints.length - 1]?.inning ?? 0;
  const maxInning = Math.max(9, Math.ceil(lastInning));

  const pts = data.dataPoints.map(p => ({
    x: X_START + (p.inning / maxInning) * X_RANGE,
    y: Y_MID - (p.prob / 100) * Y_RANGE,
  }));

  if (pts.length < 2) return <div className="sw-wp-empty">No data yet</div>;

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const first = pts[0];
  const fillD = `${pathD} L${last.x.toFixed(1)} ${Y_MID} L${first.x.toFixed(1)} ${Y_MID} Z`;

  return (
    <svg style={{ flex: 1 }} viewBox="0 0 380 120" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <clipPath id={`${uid}a`}><rect x={0} y={0} width={380} height={Y_MID} /></clipPath>
        <clipPath id={`${uid}b`}><rect x={0} y={Y_MID} width={380} height={120 - Y_MID} /></clipPath>
        <linearGradient id={`${uid}ag`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b8421e" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#b8421e" stopOpacity={0.08} />
        </linearGradient>
        <linearGradient id={`${uid}bg`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2c4a78" stopOpacity={0.08} />
          <stop offset="100%" stopColor="#2c4a78" stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <line x1={X_START} y1={20} x2={X_END} y2={20} stroke="#b4ae9b" strokeWidth={0.8} />
      <line x1={X_START} y1={Y_MID} x2={X_END} y2={Y_MID} stroke="#cfc8b4" strokeWidth={1.5} strokeDasharray="3,3" />
      <line x1={X_START} y1={96} x2={X_END} y2={96} stroke="#b4ae9b" strokeWidth={0.8} />
      <path d={fillD} fill={`url(#${uid}ag)`} clipPath={`url(#${uid}a)`} />
      <path d={fillD} fill={`url(#${uid}bg)`} clipPath={`url(#${uid}b)`} />
      <path d={pathD} fill="none" stroke="#15161a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={3.5} fill="#b8421e" stroke="#fcfaf6" strokeWidth={1.5} />
      <text x={351} y={13} fontFamily="JetBrains Mono, monospace" fontSize={11} fill="#6f685f">100</text>
      <text x={351} y={Y_MID} fontFamily="JetBrains Mono, monospace" fontSize={11} fill="#6f685f">50</text>
      <text x={351} y={113} fontFamily="JetBrains Mono, monospace" fontSize={11} fill="#6f685f">100</text>
      {Array.from({ length: maxInning }, (_, i) => {
        const n = i + 1;
        const x = X_START + (n / maxInning) * X_RANGE;
        return (
          <g key={n}>
            <line x1={x} y1={Y_MID} x2={x} y2={Y_MID + 2} stroke="#15161a" strokeWidth={1} />
            <text x={x} y={Y_MID + 10} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={9} fill="#15161a">{n}</text>
          </g>
        );
      })}
    </svg>
  );
}

function WindRose({ windRotation, windSpeed }: { windRotation: number | null; windSpeed: number | null }): ReactElement {
  const opacity = windSpeed != null && windSpeed > 0 ? 1 : 0.25;
  const transform = windRotation != null ? `rotate(${windRotation}deg)` : 'none';
  return (
    <svg
      className="sw-wx-wind-streaks"
      viewBox="0 0 80 80"
      style={{ transform, opacity }}
      aria-hidden="true"
    >
      {[25, 35, 45, 55].map(x => (
        <g key={x}>
          <path
            d={`M ${x} 10 Q ${x+2} 14 ${x} 18 Q ${x-2} 22 ${x} 26 Q ${x+2} 30 ${x} 38`}
            stroke="white" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.9}
          />
          <path
            d={`M ${x} 10 Q ${x+2} 14 ${x} 18 Q ${x-2} 22 ${x} 26 Q ${x+2} 30 ${x} 38`}
            stroke="#FAF59A" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
          <polygon points={`${x} 44, ${x-3} 37, ${x+3} 37`} fill="white" opacity={0.9} />
          <polygon points={`${x} 44, ${x-3} 37, ${x+3} 37`} fill="#FAF59A" />
        </g>
      ))}
    </svg>
  );
}

function windDirText(windLabel: string | null): string {
  if (!windLabel) return '—';
  const i = windLabel.indexOf(', ');
  return i >= 0 ? windLabel.slice(i + 2) : windLabel;
}

function conditionEmoji(condition: string | null): string {
  if (condition == null) return '🌡️';
  const c = condition.toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧️';
  if (c.includes('snow') || c.includes('sleet') || c.includes('freez')) return '🌨️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  if (c.includes('partly') || c.includes('mostly cloudy')) return '⛅';
  if (c.includes('overcast') || c.includes('cloud')) return '☁️';
  if (c.includes('clear') || c.includes('sunny') || c.includes('fair') || c.includes('hot')) return '☀️';
  return '🌡️';
}

function formatGameTime(utc: string | null | undefined): string {
  if (!utc) return '—';
  const d = new Date(utc);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const CARD_COUNT = 7;

// Infinite clone carousel layout: [last, 0, 1, …, last, 0]
// For 7 cards: [6, 0, 1, 2, 3, 4, 5, 6, 0]
// virtualIndex starts at 1 (real card 0).
const CLONE_ORDER = [CARD_COUNT - 1, ...Array.from({ length: CARD_COUNT }, (_, i) => i), 0];

const SAMPLE_WIN_PROB: WinProbData = {
  homeTeamWinProb: 62,
  dataPoints: [
    { inning: 0, prob: 0 },
    { inning: 1, prob: 8 },
    { inning: 2, prob: -6 },
    { inning: 3, prob: 14 },
    { inning: 4, prob: 5 },
    { inning: 5, prob: 22 },
    { inning: 6, prob: 31 },
    { inning: 7, prob: 19 },
    { inning: 8, prob: 24 },
    { inning: 9, prob: 24 },
  ],
};

const SAMPLE_PITCH_MIX: PitchMixData = {
  entries: [
    { code: 'FF', name: '4-Seam FB',  color: '#b8421e', percent: 42 },
    { code: 'SL', name: 'Slider',     color: '#2c4a78', percent: 28 },
    { code: 'CH', name: 'Changeup',   color: '#4a7c3e', percent: 18 },
    { code: 'CU', name: 'Curveball',  color: '#c8941c', percent: 12 },
  ],
  seenCount: 47,
  avgVelocity: '93.4 mph',
};

const SAMPLE_FIELD_CARD: FieldData = {
  altitude: 853,
  seasonHR: 142,
  distLF: 340,
  distCF: 400,
  distRF: 325,
};

const SAMPLE_WEATHER: WeatherData = {
  temp: 72,
  condition: 'Partly Cloudy',
  windSpeed: 8,
  windDirection: 'SW',
  windLabel: '8 mph, Out to LF',
  windRotation: 225,
  humidity: null,
  pressure: null,
};

export function ScoringWidget({
  away, home, awayScore, homeScore,
  awayHits, homeHits, awayErrors, homeErrors,
  inning, half, balls, strikes, outs,
  bases, pitcher, batter,
  venue, elapsedMinutes, pitchMix, winProb,
  venueCity, venueState, fieldCard, weather, startTimeUtc,
  onEnter, onMinimize,
}: ScoringWidgetProps): ReactElement {
  // virtualIndex 1..CARD_COUNT = real slides; 0 and CARD_COUNT+1 = clones
  const [virtualIndex, setVirtualIndex] = useState(1);
  const [noTransition, setNoTransition] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const didDrag = useRef(false);

  // Real slide index (0-based) for the dots indicator
  const realIndex = ((virtualIndex - 1 + CARD_COUNT) % CARD_COUNT);

  const navigate = (dir: 1 | -1) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setVirtualIndex(v => v + dir);
  };

  // After the slide animation finishes, snap clones back to their real counterpart
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    if (virtualIndex <= 0) {
      // Slid left past C-clone (position 0) → snap to real C (position CARD_COUNT)
      setNoTransition(true);
      setVirtualIndex(CARD_COUNT);
    } else if (virtualIndex >= CARD_COUNT + 1) {
      // Slid right past A-clone (position CARD_COUNT+1) → snap to real A (position 1)
      setNoTransition(true);
      setVirtualIndex(1);
    } else {
      setIsAnimating(false);
    }
  };

  // Re-enable transition on the frame after a no-transition snap
  useEffect(() => {
    if (!noTransition) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNoTransition(false);
        setIsAnimating(false);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [noTransition]);

  const inningLabel = inning != null ? ordinal(inning) : '—';
  const halfArrow = half === 'top' ? '▲' : half === 'bottom' ? '▼' : '';

  // Coalesce real data with sample fallbacks; track which cards are using samples
  const effectiveWinProb   = winProb   ?? SAMPLE_WIN_PROB;
  const effectivePitchMix  = pitchMix  ?? SAMPLE_PITCH_MIX;
  const effectiveFieldCard = fieldCard ?? SAMPLE_FIELD_CARD;
  const effectiveWeather   = weather   ?? SAMPLE_WEATHER;
  const isSampleWinProb    = winProb   == null;
  const isSamplePitchMix   = pitchMix  == null;
  const isSampleFieldCard  = fieldCard == null;
  const isSampleWeather    = weather   == null;

  const MinimizeBtn = (): ReactElement => (
    <div className="sw-header-btns">
      <button
        className="sw-flip-btn"
        aria-label="Minimize"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onMinimize(); }}
      >
        <span className="sw-minimize-bar" />
      </button>
    </div>
  );

  // Slide content keyed by real index
  const slideContent = (si: number): ReactElement => {
    if (si === 0) return (
      <>
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
          <MinimizeBtn />
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
      </>
    );

    if (si === 1) return (
      <>
        <div className="sw-back-header">
          <span className="sw-venue">{venue ?? '—'}</span>
          <MinimizeBtn />
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
      </>
    );

    if (si === 2) return (
      <>
        <div className="sw-info-header">
          <span className="sw-info-title">Matchup</span>
          <MinimizeBtn />
        </div>
        <div className="sw-info-body">
          <div className="sw-info-row">
            <span className="sw-info-label">On mound</span>
            <div className="sw-info-player">
              {pitcher?.logoUrl && <img src={pitcher.logoUrl} alt="" className="sw-matchup__logo" />}
              <span className="sw-info-name">{pitcher?.name ?? '—'}</span>
            </div>
            <div className="sw-info-stats">
              <span className="sw-info-stat num">{pitcher?.era ?? '—'} ERA</span>
              {pitcher?.pc != null && <span className="sw-info-stat num">{pitcher.pc} pitches</span>}
            </div>
          </div>
          <div className="sw-info-sep" />
          <div className="sw-info-row">
            <span className="sw-info-label">At bat</span>
            <div className="sw-info-player">
              {batter?.logoUrl && <img src={batter.logoUrl} alt="" className="sw-matchup__logo" />}
              <span className="sw-info-name">{batter?.name ?? '—'}</span>
            </div>
            <div className="sw-info-stats">
              <span className="sw-info-stat num">{batter?.avg ?? '—'} AVG</span>
              {batter?.ab != null && batter.ab > 0 && (
                <span className="sw-info-stat num">{batter.h ?? 0}-{batter.ab} today</span>
              )}
            </div>
          </div>
          <div className="sw-info-sep" />
          <div className="sw-info-venue">
            <span className="sw-info-venue-name">{venue ?? '—'}</span>
            <span className="sw-info-elapsed num">{formatElapsed(elapsedMinutes)}</span>
          </div>
        </div>
      </>
    );

    // si === 3 — Win Probability
    if (si === 3) {
      const wp = effectiveWinProb;
      const isHomeLeading = wp.homeTeamWinProb >= 50;
      const leadingLogo = isHomeLeading ? home.logoUrl : away.logoUrl;
      const leadingAbbr = isHomeLeading ? home.abbr : away.abbr;
      const leadingPct = isHomeLeading ? wp.homeTeamWinProb : 100 - wp.homeTeamWinProb;
      return (
        <>
          <div className="sw-wp-header">
            <span className="sw-wp-title">Win Probability</span>
            <div className="sw-wp-header-right">
              {isSampleWinProb && <span className="sw-sample-badge">SAMPLE</span>}
              <div className="sw-wp-badge">
                {leadingLogo && <img src={leadingLogo} alt={leadingAbbr} className="sw-wp-badge-logo" />}
                <span className="num">{leadingPct}%</span>
              </div>
              <MinimizeBtn />
            </div>
          </div>
          <div className="sw-wp-chart">
            {wp.dataPoints.length > 1
              ? <WinProbChart data={wp} />
              : <div className="sw-wp-empty">No data yet</div>
            }
          </div>
        </>
      );
    }

    // si === 4 — Pitch Mix
    if (si === 4) {
      const pm = effectivePitchMix;
      const pmLogoUrl = pitcher?.logoUrl ?? (half === 'top' ? home.logoUrl : half === 'bottom' ? away.logoUrl : null);
      return (
        <>
          <div className="sw-pm-header">
            <div className="sw-pm-header__row1">
              <span className="sw-pm-title">Pitch Mix</span>
              <div className="sw-pm-header__right">
                {isSamplePitchMix && <span className="sw-sample-badge">SAMPLE</span>}
                <MinimizeBtn />
              </div>
            </div>
            {(pitcher != null || pmLogoUrl != null) && (
              <div className="sw-pm-subtitle">
                {pmLogoUrl && <img src={pmLogoUrl} alt="" className="sw-pm-logo" />}
                <span className="sw-pm-pitcher">{pitcher?.name ?? '—'}</span>
              </div>
            )}
          </div>
          <div className="sw-pm-body">
            <div className="sw-pm-chart">
              <DonutChart data={pm} />
            </div>
            <div className="sw-pm-data">
              <div className="sw-pm-table">
                {pm.entries.map(e => (
                  <div key={e.code} className="sw-pm-row">
                    <span className="sw-pm-dot" style={{ background: e.color }} />
                    <span className="sw-pm-name">{e.name}</span>
                    <span className="sw-pm-pct num">{e.percent}%</span>
                  </div>
                ))}
              </div>
              <div className="sw-pm-velocity">
                <span className="sw-pm-velocity__label">Avg velocity</span>
                <span className="sw-pm-velocity__value num">{pm.avgVelocity ?? '— mph'}</span>
              </div>
            </div>
          </div>
        </>
      );
    }

    // si === 5 — Field Card
    if (si === 5) {
      const fc = effectiveFieldCard;
      const cityState = [venueCity, venueState].filter(Boolean).join(', ');
      return (
        <>
          <div className="sw-fc-header">
            <div className="sw-fc-header__row">
              <div className="sw-fc-header__text">
                <div className="sw-fc-venue">{venue ?? '—'}</div>
                {cityState && <div className="sw-fc-location">{cityState}</div>}
              </div>
              {isSampleFieldCard && <span className="sw-sample-badge">SAMPLE</span>}
            </div>
          </div>
          <div className="sw-fc-body">
            <div className="sw-fc-image-wrap">
              <img src="/ballpark.png" alt="" className="sw-fc-image-placeholder" />
              {fc.distLF != null && <span className="sw-fc-dist sw-fc-dist--left">{fc.distLF}</span>}
              {fc.distCF != null && <span className="sw-fc-dist sw-fc-dist--center">{fc.distCF}</span>}
              {fc.distRF != null && <span className="sw-fc-dist sw-fc-dist--right">{fc.distRF}</span>}
            </div>
            <div className="sw-fc-stats">
              <div className="sw-fc-stat">
                <span className="sw-fc-stat__label">Altitude</span>
                <span className="sw-fc-stat__value num">
                  {fc.altitude != null ? `${fc.altitude} ft` : '— ft'}
                </span>
              </div>
              <div className="sw-fc-stat">
                <span className="sw-fc-stat__label">HR 2026</span>
                <span className="sw-fc-stat__value num">
                  {fc.seasonHR != null ? fc.seasonHR : '—'}
                </span>
              </div>
            </div>
          </div>
        </>
      );
    }

    // si === 6 — Weather Card
    const wx = effectiveWeather;
    return (
      <>
        <div className="sw-wx-header">
          <div className="sw-wx-title-row">
            <div className="sw-wx-title">Weather</div>
            {isSampleWeather && <span className="sw-sample-badge">SAMPLE</span>}
          </div>
          <div className="sw-wx-subtitle">
            <span className="sw-wx-venue-name">{venue ?? '—'}</span>
            <span className="sw-wx-gametime">
              GAME TIME{' '}
              <span className="sw-wx-gametime-value num">{formatGameTime(startTimeUtc)}</span>
            </span>
          </div>
        </div>
        <div className="sw-wx-body">
          <div className="sw-wx-temp">
            <span className="sw-wx-temp__icon">{conditionEmoji(wx.condition)}</span>
            <span className="sw-wx-temp__value num">
              {wx.temp != null ? `${wx.temp}°` : '—°'}
            </span>
          </div>
          <div className="sw-wx-wind">
            <div className="sw-wx-wind-field">
              <img src="/ballpark.png" alt="" className="sw-wx-wind-placeholder" />
              <WindRose windRotation={wx.windRotation} windSpeed={wx.windSpeed} />
            </div>
            <div className="sw-wx-wind-info">
              <span className="sw-wx-wind-speed num">
                {wx.windSpeed != null ? `${wx.windSpeed} mph` : '—'}
              </span>
              <span className="sw-wx-wind-dir">
                {windDirText(wx.windLabel)}
              </span>
            </div>
          </div>
          <div className="sw-wx-cond">
            <div className="sw-wx-cond-row">
              <span className="sw-wx-cond-value">
                {wx?.condition ?? '—'}
              </span>
            </div>
            <div className="sw-wx-cond-row">
              <span className="sw-wx-cond-label">Humidity</span>{' '}
              <span className="sw-wx-cond-value num">
                {wx?.humidity != null ? `${wx.humidity}%` : '—'}
              </span>
            </div>
            <div className="sw-wx-cond-row">
              <span className="sw-wx-cond-label">Pressure</span>{' '}
              <span className="sw-wx-cond-value num">
                {wx?.pressure != null ? wx.pressure : '—'}
              </span>
            </div>
            <div className="sw-wx-cond-row">
              <span className="sw-wx-cond-label">Precip</span>{' '}
              <span className="sw-wx-cond-value num">—</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className="sw"
      role="region"
      aria-label={`${away.abbr} at ${home.abbr} live game`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEnter(); }}
      onPointerDown={(e) => {
        startX.current = e.clientX;
        isDragging.current = true;
        didDrag.current = false;
      }}
      onPointerMove={(e) => {
        if (isDragging.current && Math.abs(e.clientX - startX.current) > 8) {
          didDrag.current = true;
        }
      }}
      onPointerUp={(e) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        const delta = e.clientX - startX.current;
        if (Math.abs(delta) > 50) {
          navigate(delta < 0 ? 1 : -1);
        } else if (!didDrag.current) {
          onEnter();
        }
      }}
      onPointerCancel={() => { isDragging.current = false; }}
    >
      {/* ── Sliding track (5 slides: clone + 3 real + clone) ── */}
      <div
        className="sw-track"
        style={{
          transform: `translateX(${virtualIndex * -100}%)`,
          transition: noTransition ? 'none' : undefined,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {CLONE_ORDER.map((si, vi) => (
          <div key={vi} className="sw-slide">
            {slideContent(si)}
          </div>
        ))}
      </div>

      {/* ── Edge nav chevrons ── */}
      <button
        className="sw-nav-btn sw-nav-btn--prev"
        aria-label="Previous"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); navigate(-1); }}
      >‹</button>
      <button
        className="sw-nav-btn sw-nav-btn--next"
        aria-label="Next"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); navigate(1); }}
      >›</button>

      {/* ── Slide position dots ── */}
      <div className="sw-dots" aria-hidden="true">
        {Array.from({ length: CARD_COUNT }, (_, i) => (
          <div key={i} className={`sw-dot${i === realIndex ? ' sw-dot--active' : ''}`} />
        ))}
      </div>
    </div>
  );
}
