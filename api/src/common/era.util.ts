// MLB's innings-pitched notation is thirds, not decimal tenths — "5.2" means
// 5 and 2/3 innings (17 outs), not 5.2 innings.
export function ipToOuts(ip: string): number {
  const [whole, frac] = ip.split('.');
  const wholeInnings = parseInt(whole ?? '0', 10) || 0;
  const fracOuts = frac ? parseInt(frac, 10) || 0 : 0;
  return wholeInnings * 3 + fracOuts;
}

export function eraFrom(er: number, outs: number): number | null {
  if (outs <= 0) return null;
  return Math.round((er / outs) * 27 * 100) / 100;
}
