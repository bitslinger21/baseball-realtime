import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertsContext } from "./alertsContext";
import type { ReactElement, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ClipOverlay } from "../../pages/home/ClipOverlay";
import type { ClipWire } from "../../pages/game/clipTypes";
import type { AlertWire } from "./alertTypes";
import { AlertToast } from "./AlertToast";
import "./Alerts.css";

// Alerts (PROMPT_alerts.md, F-009) — one app-level owner for the header
// bell, its tray and the pop-up, so they survive page changes (every page
// mounts its own BrandHeader).
//
// The arrival flow: a `big` alert arrives as the pop-up and counts down
// (~8s, hover pauses). At zero it fades and LANDS in the tray; only then
// does the bell count change, with one pulse. ✕ / Later land it at once.
// Tray-only alerts land straight away. A second `big` alert waits for the
// current pop-up to land — never two at once. The tray never opens itself.

const POLL_MS = 30_000;
const TOAST_LIFE_MS = 8_000;
const TOAST_FADE_MS = 450;

export function AlertsProvider({ children }: { children: ReactNode }): ReactElement {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<AlertWire[]>([]);
  const [landed, setLanded] = useState<ReadonlySet<string>>(new Set());
  const [queue, setQueue] = useState<string[]>([]);
  const [toast, setToast] = useState<{ id: string; leaving: boolean } | null>(null);
  const [life, setLife] = useState(1);
  const [hover, setHover] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [playing, setPlaying] = useState<{ gamePk: string; clipId: string; clips: ClipWire[]; live: boolean } | null>(null);
  // id → big, as last seen. null until the first answer: everything already
  // there lands silently (no pop-ups for what happened before you arrived).
  const seen = useRef<Map<string, boolean> | null>(null);

  const land = useCallback((ids: readonly string[]): void => {
    if (ids.length === 0) return;
    setLanded((s) => new Set([...s, ...ids]));
    setPulse((p) => p + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      void fetch("/api/alerts/feed")
        .then((res) => (res.ok ? (res.json() as Promise<AlertWire[]>) : Promise.reject(new Error("bad response"))))
        .then((rows) => {
          if (cancelled) return;
          setFeed(rows);
          const prev = seen.current;
          seen.current = new Map(rows.map((r) => [r.id, r.big]));
          if (prev == null) {
            setLanded(new Set(rows.map((r) => r.id)));
            return;
          }
          const toLand: string[] = [];
          const toPop: string[] = [];
          // Oldest first, so queued pop-ups play in the order they happened.
          for (const r of [...rows].reverse()) {
            const was = prev.get(r.id);
            if (was === undefined) (r.big ? toPop : toLand).push(r.id);
            // A story that turns big (the cycle batter steps in) pops up again.
            else if (r.big && !was) toPop.push(r.id);
          }
          land(toLand);
          if (toPop.length > 0) setQueue((q) => [...q, ...toPop.filter((id) => !q.includes(id))]);
        })
        .catch(() => {
          // Keep what was last loaded.
        });
    };
    load();
    const t = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [land]);

  // Next pop-up off the queue once the current one has landed.
  useEffect(() => {
    if (toast != null || queue.length === 0) return;
    setToast({ id: queue[0], leaving: false });
    setQueue((q) => q.slice(1));
    setLife(1);
    setHover(false);
  }, [toast, queue]);

  // Countdown; hovering pauses it.
  useEffect(() => {
    if (toast == null || toast.leaving || hover) return;
    const t = window.setInterval(() => setLife((l) => l - 100 / TOAST_LIFE_MS), 100);
    return () => window.clearInterval(t);
  }, [toast, hover]);

  useEffect(() => {
    if (toast != null && !toast.leaving && life <= 0) setToast({ ...toast, leaving: true });
  }, [life, toast]);

  // Faded → lands in the tray.
  useEffect(() => {
    if (toast == null || !toast.leaving) return;
    const t = window.setTimeout(() => {
      land([toast.id]);
      setToast(null);
    }, TOAST_FADE_MS);
    return () => window.clearTimeout(t);
  }, [toast, land]);

  // A pop-up whose alert left the feed (the 4am reset) just goes.
  useEffect(() => {
    if (toast != null && !feed.some((a) => a.id === toast.id)) setToast(null);
  }, [toast, feed]);

  const dismiss = useCallback((): void => {
    setToast((t) => (t == null || t.leaving ? t : { ...t, leaving: true }));
  }, []);

  const act = useCallback(
    (a: AlertWire): void => {
      if (!a.live && a.clipId != null) {
        const clipId = a.clipId;
        void fetch(`/api/games/${encodeURIComponent(a.gamePk)}/clips`)
          .then((res) => (res.ok ? (res.json() as Promise<ClipWire[]>) : Promise.reject(new Error("bad response"))))
          .then((clips) => {
            if (clips.some((c) => c.id === clipId)) setPlaying({ gamePk: a.gamePk, clipId, clips, live: a.half !== "Final" });
            else navigate(`/game/${a.gamePk}`);
          })
          .catch(() => navigate(`/game/${a.gamePk}`));
        return;
      }
      navigate(`/game/${a.gamePk}`);
    },
    [navigate],
  );

  const tray = useMemo(() => feed.filter((a) => landed.has(a.id)), [feed, landed]);
  const liveCount = tray.filter((a) => a.live).length;
  const toastAlert = toast != null ? feed.find((a) => a.id === toast.id) : undefined;
  const value = useMemo(() => ({ tray, liveCount, pulse, act }), [tray, liveCount, pulse, act]);

  return (
    <AlertsContext.Provider value={value}>
      {children}
      {toast != null && toastAlert != null && (
        <AlertToast
          a={toastAlert}
          life={life}
          leaving={toast.leaving}
          onHover={setHover}
          onClose={dismiss}
          onAct={() => {
            act(toastAlert);
            dismiss();
          }}
        />
      )}
      {playing != null && (
        <ClipOverlay
          title="More from this game"
          clips={playing.clips}
          activeId={playing.clipId}
          gameId={playing.gamePk}
          live={playing.live}
          onPick={(clipId) => setPlaying((p) => (p != null ? { ...p, clipId } : p))}
          onClose={() => setPlaying(null)}
        />
      )}
    </AlertsContext.Provider>
  );
}
