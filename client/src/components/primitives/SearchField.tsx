import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PlayerSearchResultDto } from "@bitslinger21/baseball-realtime-client";
import { gamesApi, playersApi } from "../../api/baseballApiClient";
import { TEAMS } from "../../utils/teams";
import { mlbLogoUrl } from "../../utils/teamDirectory";
import "./SearchField.css";

const CURRENT_SEASON = String(new Date().getFullYear());
const DATE_STORAGE_KEY = "br-selected-date";

interface TeamMatch {
  abbr: string;
  name: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// Forgiving date parsing: "may 23", "5/23", "2026-05-23". A bare month with no
// day is deliberately unmatched — it collides with team names.
function parseDateQuery(q: string): string | null {
  const s = q.trim().toLowerCase();
  if (s === "") return null;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${pad2(Number(m))}-${pad2(Number(d))}`;
  }

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const [, m, d, yRaw] = slash;
    const year = yRaw == null
      ? new Date().getFullYear()
      : yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    return `${year}-${pad2(Number(m))}-${pad2(Number(d))}`;
  }

  const named = s.match(/^([a-z]{3,9})\.?\s+(\d{1,2})$/);
  if (named) {
    const [, monName, d] = named;
    const idx = MONTHS.findIndex((mo) => mo.startsWith(monName));
    if (idx >= 0) {
      return `${new Date().getFullYear()}-${pad2(idx + 1)}-${pad2(Number(d))}`;
    }
  }

  return null;
}

function fmtDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

interface SearchFieldProps {
  onNavigate: () => void;
}

export function SearchField({ onNavigate }: SearchFieldProps): ReactElement {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResultDto[]>([]);
  const [dateRow, setDateRow] = useState<{ iso: string; count: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = (): void => {
    setOpen(false);
    setQ("");
    setPlayers([]);
    setDateRow(null);
  };

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const t = setTimeout(() => {
      setShown(true);
      inputRef.current?.focus();
    }, 10);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    const onDoc = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  // Live-as-you-type: players need a network call, so debounce; team + date
  // matching are local and stay synchronous below.
  useEffect(() => {
    const ql = q.trim();
    if (ql === "") {
      setPlayers([]);
      setDateRow(null);
      return;
    }
    const iso = parseDateQuery(ql);
    const t = setTimeout(() => {
      void playersApi.playersSearchPlayers(ql, CURRENT_SEASON)
        .then((res) => setPlayers(res.data ?? []))
        .catch(() => setPlayers([]));
      if (iso != null) {
        void gamesApi.gamesListByDate(iso)
          .then((res) => setDateRow({ iso, count: (res.data ?? []).length }))
          .catch(() => setDateRow({ iso, count: 0 }));
      } else {
        setDateRow(null);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const ql = q.trim().toLowerCase();
  const teamMatches: TeamMatch[] = ql === "" ? [] : Object.values(TEAMS)
    .filter((t) => t.name.toLowerCase().includes(ql) || t.short.toLowerCase().includes(ql) || t.abbr.toLowerCase() === ql)
    .slice(0, 5)
    .map((t) => ({ abbr: t.abbr, name: t.name }));

  const hasQuery = ql !== "";
  const hasResults = teamMatches.length > 0 || players.length > 0 || dateRow != null;

  const goTo = (path: string): void => {
    close();
    onNavigate();
    navigate(path);
  };

  const goToDate = (iso: string): void => {
    try { localStorage.setItem(DATE_STORAGE_KEY, iso); } catch { /* ignore */ }
    goTo("/");
  };

  return (
    <div className="search-field" ref={wrapRef}>
      {!open && (
        <button
          type="button"
          className="search-field__icon"
          aria-label="Search"
          onClick={() => setOpen(true)}
        >
          <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <line x1="11.2" y1="11.2" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {open && (
        <div className={`search-field__panel${shown ? " search-field__panel--shown" : ""}`}>
          <div className="search-field__pill">
            <svg width="15" height="15" viewBox="0 0 17 17" aria-hidden="true" className="search-field__pill-icon">
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <line x1="11.2" y1="11.2" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="search-field__input"
              placeholder="Team, player or date"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="button" className="search-field__clear" aria-label="Close search" onClick={close}>✕</button>
          </div>

          {hasQuery && (
            <div className="search-field__dropdown">
              {!hasResults && (
                <div className="search-field__empty">No teams, players or dates match &quot;{q}&quot;</div>
              )}
              {teamMatches.length > 0 && (
                <div className="search-field__group">
                  <div className="search-field__group-label">Teams</div>
                  {teamMatches.map((t) => (
                    <button key={t.abbr} type="button" className="search-field__row" onClick={() => goTo(`/team/${t.abbr}`)}>
                      <img src={mlbLogoUrl(t.abbr) ?? ""} alt="" className="search-field__row-logo" />
                      <span className="search-field__row-name">{t.name}</span>
                      <span className="search-field__row-abbr num">{t.abbr}</span>
                    </button>
                  ))}
                </div>
              )}
              {players.length > 0 && (
                <div className="search-field__group">
                  <div className="search-field__group-label">Players</div>
                  {players.map((p) => {
                    const parts = p.name.trim().split(/\s+/);
                    const last = parts[parts.length - 1];
                    const first = parts.slice(0, -1).join(" ");
                    return (
                      <button key={p.mlbId} type="button" className="search-field__row" onClick={() => goTo(`/player/${p.mlbId}`)}>
                        <img src={mlbLogoUrl(p.teamAbbr) ?? ""} alt="" className="search-field__row-logo" />
                        <span className="search-field__row-name">{first} <strong>{last}</strong></span>
                        <span className="search-field__row-pos">{p.position}</span>
                        <span className="search-field__row-abbr num">{p.teamAbbr}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {dateRow != null && (
                <div className="search-field__group">
                  <div className="search-field__group-label">Games</div>
                  <button type="button" className="search-field__row" onClick={() => goToDate(dateRow.iso)}>
                    <span className="search-field__row-name">Games · {fmtDateLabel(dateRow.iso)}</span>
                    <span className="search-field__row-abbr num">{dateRow.count} game{dateRow.count === 1 ? "" : "s"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
