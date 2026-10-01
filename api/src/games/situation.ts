// The live situation as one short phrase — "1 out · runner on 2nd",
// "2 outs · bases loaded", or "Middle of the 6th" between halves. Shared by
// the postseason drawer, Home Following and the clip player's live strip.

export interface LinescoreLike {
  currentInning?: number;
  inningState?: string;
  outs?: number;
  offense?: { first?: unknown; second?: unknown; third?: unknown };
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function situationText(ls: LinescoreLike): string {
  const state = ls.inningState ?? '';
  if ((state === 'Middle' || state === 'End') && ls.currentInning != null) {
    return `${state} of the ${ordinal(ls.currentInning)}`;
  }
  const outs = ls.outs ?? 0;
  const on = [ls.offense?.first && '1st', ls.offense?.second && '2nd', ls.offense?.third && '3rd'].filter(
    (b): b is string => typeof b === 'string',
  );
  let runners = 'bases empty';
  if (on.length === 3) runners = 'bases loaded';
  else if (on.length === 2) runners = `runners on ${on[0]} and ${on[1]}`;
  else if (on.length === 1) runners = `runner on ${on[0]}`;
  return `${outs} ${outs === 1 ? 'out' : 'outs'} · ${runners}`;
}
