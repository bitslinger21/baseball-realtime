import { Fragment, useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";
import { TeamDot } from "../../components/primitives/TeamDot";
import { SeriesDrawer } from "./SeriesDrawer";
import {
  formatDay,
  formatWhen,
  teamInfo,
  type PostseasonBracketWire,
  type PostseasonSeriesWire,
  type PostseasonSideWire,
} from "./postseason";
import "./PlayoffBracket.css";

// POSTSEASON BRACKET — Home's Races slot once all 12 berths are clinched
// (PROMPT_postseason_bracket.md, holistic/bracket.jsx). Seven rounds in one
// mirrored row: AL WC · ALDS · ALCS · WS · NLCS · NLDS · NL WC. Layout values
// are the design's, verbatim.

// Rev 3 (Oct 2): current card 150 → 176 → 186 so the live footer never clips,
// even at its longest ("● LIVE · ▼10 SEA 10 DET 11").
const BK = { H: 92, G: 26, row: 28, pad: 8, doneW: 58, nextW: 84, curW: 186, minGap: 44, head: 44 };
const CH = 2 * BK.H + BK.G; // 210: every round's body height
const CTR = { pair: [BK.H / 2, BK.H + BK.G + BK.H / 2], mid: [CH / 2] };
const DRAWER_CLOSE_MS = 230;

function widthOf(s: PostseasonSeriesWire): number {
  if (s.state === "finished") return BK.doneW;
  if (s.state === "upcoming") return BK.nextW;
  return BK.curW;
}

function isFollowed(abbrs: readonly string[], followed: ReadonlySet<string>): boolean {
  return abbrs.some((a) => followed.has(a));
}

function FollowBar({ inset }: { inset: number }): ReactElement {
  return <span className="pb__follow-bar" style={{ top: inset, bottom: inset }} />;
}

// ── Current: 186 × 92, seed · logo · abbr · wins, then a two-line footer ──

function CurrentTeamRow({
  side,
  other,
  started,
  followed,
}: {
  side: PostseasonSideWire;
  other: PostseasonSideWire;
  started: boolean;
  followed: ReadonlySet<string>;
}): ReactElement {
  const abbr = side.team?.abbr ?? "";
  const team = teamInfo(abbr, side.team?.id);
  const lead = started && side.wins > other.wins;
  return (
    <div className="pb__team" title={followed.has(abbr) ? `You follow the ${team.name}` : team.name}>
      {followed.has(abbr) && <FollowBar inset={5} />}
      <span className="pb__seed num">{side.seed ?? ""}</span>
      <TeamDot team={team} size={18} />
      <span className="pb__abbr">{abbr}</span>
      <span className={`pb__wins num${lead ? " pb__wins--lead" : ""}`}>{started ? side.wins : ""}</span>
    </div>
  );
}

function CurrentCard({
  s,
  followed,
  onOpen,
}: {
  s: PostseasonSeriesWire;
  followed: ReadonlySet<string>;
  onOpen: () => void;
}): ReactElement {
  const started = s.games.some((g) => g.state === "final");
  // The game the card is about: the live one, else the next to be played.
  const next = s.games.find((g) => g.state === "live") ?? s.games.find((g) => g.state !== "final");
  const live = next?.state === "live" ? next : null;
  const [a, b] = live != null ? [live.away, live.home] : [null, null];
  return (
    <button
      type="button"
      className="pb__card pb__card--current"
      style={{ width: BK.curW, height: BK.H }}
      onClick={onOpen}
    >
      <CurrentTeamRow side={s.high} other={s.low} started={started} followed={followed} />
      <CurrentTeamRow side={s.low} other={s.high} started={started} followed={followed} />
      <div className="pb__footer">
        {next != null && (
          <div className="pb__line pb__line--game num">
            Game {next.number} of {s.bestOf} @ {next.host ?? ""}
          </div>
        )}
        {live != null && a != null && b != null ? (
          <div className="pb__line pb__line--live num">
            <span className="pb__live-dot" />
            <span className="pb__live-word">LIVE</span>
            <span>
              · {live.inning ?? ""} {a.abbr} {a.runs ?? 0} {b.abbr} {b.runs ?? 0}
            </span>
          </div>
        ) : next != null ? (
          <div className="pb__line pb__line--when num">{formatWhen(next.date, next.startTime)}</div>
        ) : null}
      </div>
    </button>
  );
}

// ── Finished: 58 wide, winner first on pale green, loser not faded ──

function FinishedCard({
  s,
  followed,
  onOpen,
}: {
  s: PostseasonSeriesWire;
  followed: ReadonlySet<string>;
  onOpen: () => void;
}): ReactElement {
  const rows = s.high.eliminated ? [s.low, s.high] : [s.high, s.low];
  const [w, l] = rows;
  return (
    <button
      type="button"
      className="pb__card pb__card--done"
      style={{ width: BK.doneW }}
      onClick={onOpen}
      title={`${w.team?.abbr ?? ""} won ${w.wins}–${l.wins}`}
    >
      {rows.map((side, i) => {
        const abbr = side.team?.abbr ?? "";
        const win = !side.eliminated;
        return (
          <div
            key={abbr || i}
            className={`pb__done-row${win ? " pb__done-row--win" : ""}`}
            title={teamInfo(abbr).name}
          >
            {followed.has(abbr) && <FollowBar inset={4} />}
            <TeamDot team={teamInfo(abbr, side.team?.id)} size={18} />
            <span className="pb__done-wins num">{side.wins}</span>
          </div>
        );
      })}
    </button>
  );
}

// ── Upcoming: 84 wide, a logo / logo pair / word per side, then a date ──

function UpcomingSide({ side, followed }: { side: PostseasonSideWire; followed: ReadonlySet<string> }): ReactElement {
  const abbrs = side.team != null ? [side.team.abbr] : side.options;
  const title = abbrs.length > 0 ? abbrs.map((a) => teamInfo(a).name).join(" or ") : (side.label ?? "");
  return (
    <div className="pb__next-side" title={title}>
      {abbrs.length > 0 && isFollowed(abbrs, followed) && <FollowBar inset={4} />}
      {abbrs.length > 0 ? (
        abbrs.map((a, i) => (
          <Fragment key={a}>
            {i > 0 && <span className="pb__next-slash num">/</span>}
            <TeamDot team={teamInfo(a, a === side.team?.abbr ? side.team.id : undefined)} size={18} />
          </Fragment>
        ))
      ) : (
        <span className="pb__next-word">{side.label}</span>
      )}
    </div>
  );
}

function UpcomingCard({ s, followed }: { s: PostseasonSeriesWire; followed: ReadonlySet<string> }): ReactElement {
  return (
    <div className="pb__card pb__card--next" style={{ width: BK.nextW }} title={s.waitingOn ?? undefined}>
      <UpcomingSide side={s.high} followed={followed} />
      <div className="pb__next-divider">
        <UpcomingSide side={s.low} followed={followed} />
      </div>
      <div className="pb__next-date num">{s.startDate != null ? formatDay(s.startDate) : ""}</div>
    </div>
  );
}

// ── Rounds and the gaps between them ──

// One horizontal connector segment (1.5px, one colour everywhere).
function HLine({ top, left, right }: { top: number; left: number | string; right: number | string }): ReactElement {
  return <span className="pb__line-h" style={{ top: top - 0.75, left, right }} />;
}

interface Col {
  label: string;
  bestOf: number;
  series: PostseasonSeriesWire[];
  pos: "pair" | "mid";
  inL: boolean; // connectors arrive from the left
  inR: boolean;
}

// A card narrower than its round gets stubs out to the round's edges so the
// connectors in the gaps always reach it.
function BracketCol({
  c,
  followed,
  onOpen,
}: {
  c: Col;
  followed: ReadonlySet<string>;
  onOpen: (id: string) => void;
}): ReactElement {
  const w = Math.max(BK.doneW, ...c.series.map(widthOf));
  const ys = CTR[c.pos];
  return (
    <div className="pb__col" style={{ width: w }}>
      <div className="pb__head" style={{ height: BK.head - 10, marginBottom: 10 }}>
        <span className="pb__head-name">{c.label}</span>
        <span className="pb__head-bo num">Best of {c.bestOf}</span>
      </div>
      <div className="pb__body" style={{ height: CH }}>
        {c.series.map((s, i) => {
          const slack = (w - widthOf(s)) / 2;
          return (
            <Fragment key={s.id}>
              {slack > 0 && c.inL && <HLine top={ys[i]} left={0} right={w - slack} />}
              {slack > 0 && c.inR && <HLine top={ys[i]} left={w - slack} right={0} />}
              <div className="pb__slot" style={{ top: ys[i] - BK.H / 2, height: BK.H }}>
                {s.state === "finished" ? (
                  <FinishedCard s={s} followed={followed} onOpen={() => onOpen(s.id)} />
                ) : s.state === "upcoming" ? (
                  <UpcomingCard s={s} followed={followed} />
                ) : (
                  <CurrentCard s={s} followed={followed} onOpen={() => onOpen(s.id)} />
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Every gap flexes equally (flex:1, min 44), so rounds sit equal distances
// apart; the gaps draw the connectors.
function BracketGap({ kind, mirror = false }: { kind: "straight2" | "straight1" | "elbow"; mirror?: boolean }): ReactElement {
  const [a, b] = CTR.pair;
  const m = CH / 2;
  const lines: ReactElement[] = [];
  if (kind === "straight2") {
    lines.push(<HLine key="a" top={a} left={0} right={0} />, <HLine key="b" top={b} left={0} right={0} />);
  } else if (kind === "straight1") {
    lines.push(<HLine key="m" top={m} left={0} right={0} />);
  } else {
    // DS → CS: out to the middle of the gap, down/up to the LCS centre, across.
    const near = mirror ? { left: "50%", right: 0 } : { left: 0, right: "50%" };
    const far = mirror ? { left: 0, right: "50%" } : { left: "50%", right: 0 };
    lines.push(
      <HLine key="a" top={a} {...near} />,
      <HLine key="b" top={b} {...near} />,
      <HLine key="m" top={m} {...far} />,
    );
    [a, b].forEach((y, i) =>
      lines.push(
        <span key={`v${i}`} className="pb__line-v" style={{ top: Math.min(y, m) - 0.75, height: Math.abs(m - y) + 1.5 }} />,
      ),
    );
  }
  return (
    <div className="pb__gap" style={{ minWidth: BK.minGap, paddingTop: BK.head }}>
      <div className="pb__body" style={{ height: CH }}>
        {lines}
      </div>
    </div>
  );
}

export function PlayoffBracket({
  bracket,
  followedTeams,
}: {
  bracket: PostseasonBracketWire;
  followedTeams: readonly string[];
}): ReactElement {
  const followed = new Set(followedTeams);
  const [openId, setOpenId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const open = useCallback((id: string): void => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    setClosing(false);
    setOpenId(id);
  }, []);
  // Reverse-animate, then unmount — same close gesture as the Lineups panel.
  const close = useCallback((): void => {
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setOpenId(null);
      setClosing(false);
      closeTimer.current = null;
    }, DRAWER_CLOSE_MS);
  }, []);

  const single = (s: PostseasonSeriesWire | null): PostseasonSeriesWire[] => (s != null ? [s] : []);
  const cols: Col[] = [
    { label: "AL Wild Card", bestOf: 3, series: bracket.alwc, pos: "pair", inL: false, inR: true },
    { label: "ALDS", bestOf: 5, series: bracket.alds, pos: "pair", inL: true, inR: true },
    { label: "ALCS", bestOf: 7, series: single(bracket.alcs), pos: "mid", inL: true, inR: true },
    { label: "World Series", bestOf: 7, series: single(bracket.ws), pos: "mid", inL: true, inR: true },
    { label: "NLCS", bestOf: 7, series: single(bracket.nlcs), pos: "mid", inL: true, inR: true },
    { label: "NLDS", bestOf: 5, series: bracket.nlds, pos: "pair", inL: true, inR: true },
    { label: "NL Wild Card", bestOf: 3, series: bracket.nlwc, pos: "pair", inL: true, inR: false },
  ];
  const gaps: { kind: "straight2" | "straight1" | "elbow"; mirror?: boolean }[] = [
    { kind: "straight2" },
    { kind: "elbow" },
    { kind: "straight1" },
    { kind: "straight1" },
    { kind: "elbow", mirror: true },
    { kind: "straight2" },
  ];

  const all = [...bracket.alwc, ...bracket.alds, ...single(bracket.alcs), ...single(bracket.ws), ...single(bracket.nlcs), ...bracket.nlds, ...bracket.nlwc];
  const openSeries = openId != null ? (all.find((s) => s.id === openId) ?? null) : null;

  return (
    <div className="pb__scroller">
      <div className="pb__row">
        {cols.map((c, i) => (
          <Fragment key={c.label}>
            {i > 0 && <BracketGap {...gaps[i - 1]} />}
            <BracketCol c={c} followed={followed} onOpen={open} />
          </Fragment>
        ))}
      </div>
      {openSeries != null && <SeriesDrawer series={openSeries} closing={closing} onClose={close} />}
    </div>
  );
}
