import type { PlayUpdate } from "./types";

function buildPlayAnchorId(renderKey: string): string {
  return `play-${renderKey}`;
}

function buildInningAnchorId(renderKey: string): string {
  return `inning-${renderKey}`;
}

export function getPlayRenderKey(u: PlayUpdate, index: number): string {
  return u.playKey ?? `${u.ts ?? "na"}-${index}`;
}

export function getPlayAnchorId(u: PlayUpdate, index: number): string {
  const renderKey = getPlayRenderKey(u, index);
  return buildPlayAnchorId(renderKey);
}

export function getPlayAnchorIdFromKey(key: string): string {
  return buildPlayAnchorId(key);
}

export function getInningAnchorId(u: PlayUpdate, index: number): string {
  const renderKey = getPlayRenderKey(u, index);
  return buildInningAnchorId(renderKey);
}

export function getInningAnchorIdFromKey(key: string): string {
  return buildInningAnchorId(key);
}

function buildBatterAnchorId(renderKey: string): string {
  return `batter-${renderKey}`;
}

export function getBatterAnchorId(u: PlayUpdate, index: number): string {
  const renderKey = getPlayRenderKey(u, index);
  return buildBatterAnchorId(renderKey);
}

export function getBatterAnchorIdFromKey(key: string): string {
  return buildBatterAnchorId(key);
}
