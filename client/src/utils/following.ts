import { useSyncExternalStore } from "react";

// Following identity is device-local for now (PROMPT_home_page.md §6.4) —
// accounts later. Cost, stated up front: no sync across devices, and the
// follow set dies with browser storage. A tiny external store (not React
// Context) so any component — the player header, team pages, Home — can
// read/write the same list and re-render when it changes, in this tab.

export interface FollowedEntity {
  kind: "team" | "player";
  id: string; // team abbr, or player mlbId as a string
  name: string;
}

const STORAGE_KEY = "br-following";
// Raised from 8 (PROMPT_home_layout.md §A5): "a dashboard of eight is a
// design; twenty is a list, and a user with twenty interests is not
// misusing the feature."
export const MAX_FOLLOWED = 20;

let cache: FollowedEntity[] = readFromStorage();
const listeners = new Set<() => void>();

function readFromStorage(): FollowedEntity[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is FollowedEntity =>
        e != null &&
        typeof e === "object" &&
        (e.kind === "team" || e.kind === "player") &&
        typeof e.id === "string" &&
        typeof e.name === "string",
    );
  } catch {
    return [];
  }
}

function writeToStorage(next: FollowedEntity[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable/full — the in-memory cache still works for this
    // session, it just won't persist across a reload.
  }
}

function notify(): void {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): FollowedEntity[] {
  return cache;
}

export function isFollowing(kind: "team" | "player", id: string): boolean {
  return cache.some((e) => e.kind === kind && e.id === id);
}

export function follow(entity: FollowedEntity): void {
  if (cache.length >= MAX_FOLLOWED) return;
  if (isFollowing(entity.kind, entity.id)) return;
  cache = [...cache, entity];
  writeToStorage(cache);
  notify();
}

export function unfollow(kind: "team" | "player", id: string): void {
  cache = cache.filter((e) => !(e.kind === kind && e.id === id));
  writeToStorage(cache);
  notify();
}

export function useFollowing(): FollowedEntity[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
