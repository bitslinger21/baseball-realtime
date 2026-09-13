import '../pages/TeamPage.css';
import '../pages/SchedulePage.css';
import './TeamTransactionsPage.css';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import type { StandingTeamDto } from '@bitslinger21/baseball-realtime-client';
import { standingsApi } from '../api/baseballApiClient';
import { BrandHeader } from '../components/primitives/BrandHeader';
import { RouteTabs } from '../components/primitives/RouteTabs';
import { PlayerThumb } from '../components/primitives/PlayerThumb';
import { TEAMS } from '../utils/teams';
import { getReturnLabel } from '../utils/backLabel';

const CURRENT_SEASON = String(new Date().getFullYear());

function logoUrlStr(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

// ── data ──────────────────────────────────────────────────────────────────────

type TxType = 'injury' | 'roster' | 'trade' | 'signing';
type TxDirection = 'in' | 'out';

interface TransactionEntry {
  mlbId: number;
  name: string;
  position: string | null;
  jerseyNumber: string | null;
  date: string;
  type: TxType;
  direction: TxDirection;
  description: string;
}

interface TransactionsHero {
  activeRosterCount: number;
  activeRosterLimit: number;
  fortyManCount: number;
  fortyManOpen: number;
  ilCount: number;
  il60Count: number;
  movesThisMonth: number;
}

interface TeamTransactionsData {
  transactions: TransactionEntry[];
  hero: TransactionsHero;
  totalMoves: number;
}

async function fetchTransactions(teamId: number): Promise<TeamTransactionsData | null> {
  try {
    const res = await fetch(`/api/teams/${teamId}/transactions`);
    if (!res.ok) return null;
    return (await res.json()) as TeamTransactionsData;
  } catch {
    return null;
  }
}

// ── formatting helpers ───────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dateParts(dateStr: string): { month: string; day: string; dow: string; monthKey: string } {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return {
    month: MONTH_NAMES[d.getUTCMonth()],
    day: String(d.getUTCDate()),
    dow: DAY_NAMES[d.getUTCDay()],
    monthKey: dateStr.slice(0, 7),
  };
}

// Bolds the one operative phrase in a transaction's own sentence (an IL tier,
// "Designated for assignment", etc.) and mono-wraps embedded numerals — the
// row treatment the design specifies — without rewriting MLB's own text.
const OPERATIVE_RE = /(\d{1,3}-day injured list|Designated for assignment|restricted list|paternity list|outright(?:ed)?|(?<!\d)\d+(?!-day))/gi;

function renderDescription(text: string): ReactNode {
  const parts = text.split(OPERATIVE_RE);
  return parts.map((part, i) => {
    if (part === '' || part === undefined) return null;
    if (/^\d+$/.test(part)) return <span key={i} className="num">{part}</span>;
    if (/^(\d{1,3}-day injured list|Designated for assignment|restricted list|paternity list|outright(ed)?)$/i.test(part)) {
      return <b key={i}>{part}</b>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const TYPE_LABEL: Record<TxType, string> = {
  injury: 'Injury',
  roster: 'Roster',
  trade: 'Trade',
  signing: 'Signing',
};

const FILTERS = ['all', 'injury', 'roster', 'deal'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  injury: 'Injuries',
  roster: 'Roster',
  deal: 'Trades & signings',
};

function matchesFilter(t: TransactionEntry, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'deal') return t.type === 'trade' || t.type === 'signing';
  return t.type === filter;
}

// The 2026 trade deadline — a league calendar fact, not derived from any feed.
const TRADE_DEADLINE_DATE = '2026-07-31';
const TRADE_DEADLINE_LABEL = 'Trade deadline · Jul 31, 5:00 PM CT';

// ── row/day components ───────────────────────────────────────────────────────

function TxRow({ t }: { t: TransactionEntry }): ReactElement {
  const meta = [t.position, t.jerseyNumber ? `#${t.jerseyNumber}` : null].filter(Boolean).join(' · ');
  return (
    <div className="txp__tx">
      <div className={`txp__dir txp__dir--${t.direction}`} title={t.direction === 'in' ? 'Added to the active roster' : 'Removed from the active roster'}>
        {t.direction === 'in' ? '+' : '−'}
      </div>
      <PlayerThumb mlbId={t.mlbId} className="txp__shot" />
      <div className="txp__tx-b">
        <div className="txp__tx-n"><Link to={`/player/${t.mlbId}`}>{t.name}</Link></div>
        {meta !== '' && <div className="txp__tx-m">{meta}</div>}
        <div className="txp__tx-d">{renderDescription(t.description)}</div>
      </div>
      <span className={`txp__tag txp__tag--${t.type}`}>{TYPE_LABEL[t.type]}</span>
    </div>
  );
}

interface DayGroup {
  dateKey: string;
  monthKey: string;
  entries: TransactionEntry[];
}

function DeadlineMarker(): ReactElement {
  return (
    <div className="txp__marker">
      <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
        <path d="M6.5 1 12 6.5 6.5 12 1 6.5Z" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M5 9.6h3v1.4l-1.5 1-1.5-1Z" fill="var(--color-accent)" />
      </svg>
      <span>{TRADE_DEADLINE_LABEL}</span>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function TeamTransactionsPage(): ReactElement {
  const { teamAbbr = '' } = useParams<{ teamAbbr: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const abbr = teamAbbr.toUpperCase();

  const locState = location.state as { from?: string; fromLabel?: string } | null;
  const returnLabel = getReturnLabel(locState?.from, locState?.fromLabel);
  const handleBack = useCallback((): void => {
    if (locState?.from) navigate(locState.from);
    else navigate('/');
  }, [navigate, locState?.from]);

  const [standings, setStandings] = useState<StandingTeamDto[]>([]);
  const [data, setData] = useState<TeamTransactionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const standingsResp = await standingsApi.standingsGetStandings(CURRENT_SEASON);
        if (cancelled) return;
        setStandings(standingsResp.data ?? []);
        const teamId = TEAMS[abbr]?.id ?? null;
        if (teamId != null) {
          const txData = await fetchTransactions(teamId);
          if (!cancelled) setData(txData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [abbr]);

  const myStanding = standings.find((s) => s.abbr === abbr);
  const heroLogoSrc = logoUrlStr(myStanding?.logoUrl);
  const divPart = (myStanding?.divisionName.match(/East|Central|West/) ?? [''])[0];
  const heroEyebrow = myStanding != null ? `${myStanding.leagueName} ${divPart}` : '';

  const filteredEntries = useMemo(
    () => (data?.transactions ?? []).filter((t) => matchesFilter(t, filter)),
    [data, filter],
  );

  const dayGroups = useMemo<DayGroup[]>(() => {
    const byDate = new Map<string, TransactionEntry[]>();
    for (const t of filteredEntries) {
      const list = byDate.get(t.date) ?? [];
      list.push(t);
      byDate.set(t.date, list);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, entries]) => ({ dateKey, monthKey: dateKey.slice(0, 7), entries }));
  }, [filteredEntries]);

  const monthKeys = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const g of dayGroups) {
      if (!seen.has(g.monthKey)) { seen.add(g.monthKey); order.push(g.monthKey); }
    }
    return order;
  }, [dayGroups]);

  const scrollToMonth = useCallback((monthKey: string) => {
    document.getElementById(`txp-m-${monthKey}`)?.scrollIntoView({ block: 'start' });
  }, []);

  if (loading) {
    return (
      <div className="tp-page">
        <BrandHeader active="teams" />
        <div className="tp__wrap">
          <div className="tp__loading">Loading…</div>
        </div>
      </div>
    );
  }

  if (myStanding == null) {
    return (
      <div className="tp-page">
        <BrandHeader active="teams" />
        <div className="tp__wrap">
          <div className="tp__loading">Team not found</div>
        </div>
      </div>
    );
  }

  const hero = data?.hero ?? null;
  const todayMonthKey = new Date().toISOString().slice(0, 7);

  return (
    <div className="tp-page">
      <BrandHeader active="teams" />
      <div className="tp__wrap">
        {returnLabel != null && (
          <button type="button" className="page-title-row__return" onClick={handleBack}>
            ← {returnLabel}
          </button>
        )}
        <div className="tp__hero">
          <div className="tp__hero-logo">
            {heroLogoSrc
              ? <img src={heroLogoSrc} alt={myStanding.displayName} width={96} height={96} style={{ width: 96, height: 96, objectFit: 'contain' }} />
              : <span className="tp__logo-fb" style={{ width: 96, height: 96, fontSize: 42 }}>{abbr.charAt(0)}</span>
            }
          </div>
          <div className="tp__hero-id">
            <h1 className="tp__hero-name">{myStanding.displayName}</h1>
            <div className="tp__hero-meta">
              <span className="tp__eyebrow">{heroEyebrow}</span>
              {myStanding.venue != null && myStanding.city != null && (
                <span> · {myStanding.venue} · {myStanding.city}</span>
              )}
              <span> · Est. <span className="num">{myStanding.founded ?? '—'}</span></span>
            </div>
          </div>
          {/* Hero stats are tab-specific (PROMPT_transactions_tab.md §3) — this
              tab shows the roster-state the ledger produces, not the standings
              line Overview shows or the W/L split Schedule shows. */}
          <div className="tp__hero-stats">
            <div className="tp__hstat">
              <div className="tp__hstat-l">Active roster</div>
              <div className="tp__hstat-v num">{hero?.activeRosterCount ?? '—'}</div>
              <div className="tp__hstat-sub num">of {hero?.activeRosterLimit ?? 26}</div>
            </div>
            <div className="tp__hstat">
              <div className="tp__hstat-l">40-man</div>
              <div className="tp__hstat-v num">{hero?.fortyManCount ?? '—'}</div>
              <div className="tp__hstat-sub num">{hero != null ? `${hero.fortyManOpen} open` : '—'}</div>
            </div>
            <div className="tp__hstat">
              <div className="tp__hstat-l">On the IL</div>
              <div className="tp__hstat-v num txp__hstat-v--warn">{hero?.ilCount ?? '—'}</div>
              <div className="tp__hstat-sub num">{hero != null ? `${hero.il60Count} on 60-day` : '—'}</div>
            </div>
            <div className="tp__hstat">
              <div className="tp__hstat-l">Moves</div>
              <div className="tp__hstat-v num">{hero?.movesThisMonth ?? '—'}</div>
              <div className="tp__hstat-sub">in {MONTH_NAMES[new Date().getUTCMonth()]}</div>
            </div>
          </div>
        </div>

        <RouteTabs
          items={[
            { label: 'Overview', to: `/team/${abbr}` },
            { label: 'Schedule', to: `/team/${abbr}/schedule` },
            { label: 'Transactions', to: `/team/${abbr}/transactions` },
          ]}
          activeIndex={2}
        />

        <div className="sp__bar">
          <div className="txp__seg" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={filter === f ? 'txp__seg-btn txp__seg-btn--on' : 'txp__seg-btn'}
                onClick={() => setFilter(f)}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>
          {monthKeys.length > 0 && (
            <div className="sp__month-chips">
              {monthKeys.map((mk) => (
                <button
                  key={mk}
                  type="button"
                  className={mk === todayMonthKey ? 'sp__month-chip sp__month-chip--on' : 'sp__month-chip'}
                  onClick={() => scrollToMonth(mk)}
                >
                  {MONTH_NAMES[Number(mk.slice(5, 7)) - 1].toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {dayGroups.length === 0 && (
          <div className="txp__empty">No moves of this type this season.</div>
        )}

        {dayGroups.length > 0 && (
          <div className="txp__led">
            {dayGroups.map((g, i) => {
              const { month, day, dow } = dateParts(g.dateKey);
              const isFirstOfMonth = i === 0 || dayGroups[i - 1].monthKey !== g.monthKey;
              // The deadline marker sits between the day-group on/after the
              // deadline and the one before it — hidden on any filter but All.
              const prevGroup = dayGroups[i + 1] ?? null;
              const showDeadlineAfter =
                filter === 'all' &&
                g.dateKey >= TRADE_DEADLINE_DATE &&
                (prevGroup == null || prevGroup.dateKey < TRADE_DEADLINE_DATE);
              return (
                <Fragment key={g.dateKey}>
                  <div className="txp__day" id={isFirstOfMonth ? `txp-m-${g.monthKey}` : undefined}>
                    <div className="txp__d-date">
                      {month} <span className="num">{day}</span>
                      <span className="txp__d-dow">{dow}</span>
                    </div>
                    <div className="txp__d-rows">
                      {g.entries.map((t) => <TxRow key={`${t.mlbId}-${t.date}-${t.description}`} t={t} />)}
                    </div>
                  </div>
                  {showDeadlineAfter && <DeadlineMarker />}
                </Fragment>
              );
            })}
          </div>
        )}

        {data != null && (
          <div className="txp__foot">
            <span className="num">{filteredEntries.length}</span> moves · {CURRENT_SEASON} season ·{' '}
            <span className="num">+</span> joins the active roster, <span className="num">−</span> leaves it
          </div>
        )}
      </div>
    </div>
  );
}
