// client/src/pages/GameInfoPanel.tsx
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameDto } from "@bitslinger21/baseball-realtime-client";
import type { PlayUpdate } from "../realtime/types";

type Props = {
  selectedDate: string;
  games: readonly GameDto[];
  selectedGame: GameDto | null;
  isWatched: boolean;
  updates: readonly PlayUpdate[];
  isConnected: boolean;
  connectionError: string | null;

  watchedGames: readonly GameDto[];
  watchedGameIds: readonly string[];
  onSelectGame: (id: string) => void;
};

type Id = string;
type Counts = { total: number; live: number; final: number; upcoming: number };

const NEW_CHIP_FLASH_MS = 1000;

function getStatus(g: GameDto): string {
  const anyG: Record<string, unknown> = g as unknown as Record<string, unknown>;
  const status = typeof anyG.status === "string" ? anyG.status : null;
  return status ?? "—";
}

function computeCounts(games: readonly GameDto[]): Counts {
  let live = 0;
  let final = 0;
  let upcoming = 0;

  for (const g of games) {
    const status = getStatus(g);
    if (status === "live") live += 1;
    else if (status === "final") final += 1;
    else upcoming += 1;
  }

  return { total: games.length, live, final, upcoming };
}

export function GameInfoPanel(props: Props): ReactElement {
  const { games, selectedGame, isWatched, watchedGames, watchedGameIds, onSelectGame } =
    props;
  // Normalize "watch IDs" to a single list, regardless of whether we got games or ids.
  const watchIds = useMemo((): readonly Id[] => {
    if (watchedGames.length > 0) {
      return watchedGames
        .map((g: GameDto): Id | null =>
          g.providerGameId != null && g.providerGameId !== "" ? g.providerGameId : null,
        )
        .filter((id: Id | null): id is Id => id != null);
    }

    return watchedGameIds
      .map((id: string): Id | null => (id != null && id !== "" ? id : null))
      .filter((id: Id | null): id is Id => id != null);
  }, [watchedGames, watchedGameIds]);

  // Track which IDs were newly added, so we can apply .is-new once.
  const [newlyAddedIds, setNewlyAddedIds] = useState<ReadonlySet<Id>>(() => new Set<Id>());
  const prevWatchIdsRef = useRef<ReadonlySet<Id>>(new Set<Id>());
  const timeoutsRef = useRef<Map<Id, number>>(new Map<Id, number>());

  useEffect((): (() => void) => {
    const prev = prevWatchIdsRef.current;
    const next = new Set<Id>(watchIds);

    const added: Id[] = [];
    for (const id of next) {
      if (!prev.has(id)) added.push(id);
    }

    if (added.length > 0) {
      setNewlyAddedIds((curr: ReadonlySet<Id>): ReadonlySet<Id> => {
        const n = new Set(curr);
        for (const id of added) n.add(id);
        return n;
      });

      for (const id of added) {
        const existing = timeoutsRef.current.get(id) ?? null;
        if (existing != null) window.clearTimeout(existing);

        const t = window.setTimeout((): void => {
          timeoutsRef.current.delete(id);
          setNewlyAddedIds((curr: ReadonlySet<Id>): ReadonlySet<Id> => {
            if (!curr.has(id)) return curr;
            const n = new Set(curr);
            n.delete(id);
            return n;
          });
        }, NEW_CHIP_FLASH_MS);

        timeoutsRef.current.set(id, t);
      }
    }

    prevWatchIdsRef.current = next;

    return (): void => {
      for (const t of timeoutsRef.current.values()) window.clearTimeout(t);
      timeoutsRef.current.clear();
    };
  }, [watchIds]);

  const showPills: boolean = watchIds.length > 0;
  ``
  if (selectedGame == null) {
    const c = computeCounts(games);

    return (
      <div className="info-card">
        {showPills && (
          <div className="watching-strip">
            <div className="watching-strip__label">WATCHING</div>
            <div className="watching-strip__count">{watchIds.length}</div>

            <div className="watching-strip__chips">
              {watchedGames.length > 0
                ? watchedGames
                  .filter((g: GameDto): boolean => (g.providerGameId ?? "") !== "")
                  .map((g: GameDto): ReactElement => {
                    const id: string = g.providerGameId ?? "";
                    const isNew: boolean = newlyAddedIds.has(id);

                    return (
                      <button
                        key={id}
                        type="button"
                        className={`watching-chip ${isNew ? "is-new" : ""}`}
                        onClick={(): void => onSelectGame(id)}
                        title={`${g.awayAbbr} @ ${g.homeAbbr}`}
                      >
                        {g.awayAbbr} @ {g.homeAbbr}
                      </button>
                    );
                  })
                : watchIds.map((id: string): ReactElement => {
                  const isNew: boolean = newlyAddedIds.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`watching-chip ${isNew ? "is-new" : ""}`}
                      onClick={(): void => onSelectGame(id)}
                      title={id}
                    >
                      {id}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        <div className="info-row">
          <span>Live</span>
          <strong>{c.live}</strong>
        </div>
        <div className="info-row">
          <span>Upcoming</span>
          <strong>{c.upcoming}</strong>
        </div>
        <div className="info-row">
          <span>Final</span>
          <strong>{c.final}</strong>
        </div>
      </div>
    );
  }

  return isWatched && showPills ? (
    <div className="watching-strip">
      <div className="watching-strip__label">WATCHING</div>
      <div className="watching-strip__count">{watchIds.length}</div>

      <div className="watching-strip__chips">
        {watchedGames.length > 0
          ? watchedGames
            .filter((g: GameDto): boolean => (g.providerGameId ?? "") !== "")
            .map((g: GameDto): ReactElement => {
              const id: string = g.providerGameId ?? "";
              const isSelected: boolean =
                selectedGame.providerGameId != null && selectedGame.providerGameId === id;
              const isNew: boolean = newlyAddedIds.has(id);

              return (
                <button
                  key={id}
                  type="button"
                  className={`watching-chip ${isSelected ? "is-selected" : ""} ${isNew ? "is-new" : ""}`}
                  onClick={(): void => onSelectGame(id)}
                  title={`${g.awayAbbr} @ ${g.homeAbbr}`}
                >
                  {g.awayAbbr} @ {g.homeAbbr}
                </button>
              );
            })
          : watchIds.map((id: string): ReactElement => {
            const isSelected: boolean =
              selectedGame.providerGameId != null && selectedGame.providerGameId === id;
            const isNew: boolean = newlyAddedIds.has(id);

            return (
              <button
                key={id}
                type="button"
                className={`watching-chip ${isSelected ? "is-selected" : ""} ${isNew ? "is-new" : ""}`}
                onClick={(): void => onSelectGame(id)}
                title={id}
              >
                {id}
              </button>
            );
          })}
      </div>
    </div>
  ) : (
    <></>
  );
}
