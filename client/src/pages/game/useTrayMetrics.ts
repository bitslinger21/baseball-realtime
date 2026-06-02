import { useState, useMemo, useEffect } from "react";

export interface TrayPlayer {
  name: string;
  pos: string;
  isPitcher: boolean;
  seq?: string | null;   // batter PA sequence: "HR · 1B · K"
  stat?: string | null;  // pitcher stat line: "5 2/3 IP · 3 R · 6 K"
  subs?: TrayPlayer[];
}

let _ctx: CanvasRenderingContext2D | null = null;

function measurePx(text: string, font: string): number {
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  if (!_ctx || !text) return 0;
  _ctx.font = font;
  return _ctx.measureText(text).width;
}

// Exact font strings used in the grid rows
const MONO_STAT = '600 11px "JetBrains Mono", ui-monospace, monospace'; // col5 stat/seq
const SANS_NAME = '600 13px "DM Sans", system-ui, sans-serif';          // player name
const MONO_POS  = '500 11px "JetBrains Mono", ui-monospace, monospace'; // " – POS"

export function useTrayMetrics(players: TrayPlayer[]): { statCol: number; trayWidth: number } {
  // tick forces a re-measurement once real fonts have resolved
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    const f = document.fonts;
    if (f?.load) {
      Promise.all([
        f.load('600 13px "DM Sans"'),
        f.load('500 11px "JetBrains Mono"'),
        f.load('600 11px "JetBrains Mono"'),
      ])
        .then(() => { if (live) setTick((n) => n + 1); })
        .catch(() => {});
    }
    return () => { live = false; };
  }, []);

  return useMemo(() => {
    let statW = 0;
    let nameW = 0;

    const consider = (pl: TrayPlayer): void => {
      statW = Math.max(statW, measurePx(
        pl.isPitcher ? (pl.stat ?? "") : (pl.seq ?? ""),
        MONO_STAT,
      ));
      nameW = Math.max(nameW,
        measurePx(pl.name, SANS_NAME) +
        measurePx(` – ${pl.pos}`, MONO_POS),
      );
    };

    for (const p of players) {
      consider(p);
      for (const s of (p.subs ?? [])) consider(s);
    }

    const statCol = Math.ceil(statW) + 20 /* left-pad */ + 6;
    // name slot must clear the AT BAT pill / "In · 6th" indicators
    const nameNeeded = Math.ceil(nameW) + 7 /* gap */ + 104 /* badge allowance */;
    // sub row is the tighter constraint: cols 68+34+40 + 4 gaps(32) + 16 right-pad
    const trayWidth = Math.min(900, Math.max(560,
      nameNeeded + 68 + 34 + 40 + 32 + 16 + statCol,
    ));

    return { statCol, trayWidth };
  }, [players, tick]);
}
