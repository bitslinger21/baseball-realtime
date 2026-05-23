import { type ReactElement, useEffect, useState } from "react";

type AlertRecord = {
  id: string | number;
  gameId: string;
  type: string;
  at: string | null;
  note: string | null;
  payload: unknown;
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  "cycle-watch": "Cycle Watch",
  "cycle-achieved": "Cycle Achieved",
  "no-hitter-watch": "No-Hitter Watch",
  "no-hitter-broken": "No-Hitter Broken",
  "score-change": "Score Change",
  "game-tied": "Game Tied",
  "lead-change": "Lead Change",
};

const ALERT_TYPE_COLORS: Record<string, string> = {
  "cycle-watch": "#7c3aed",
  "cycle-achieved": "#6d28d9",
  "no-hitter-watch": "#d97706",
  "no-hitter-broken": "#b45309",
  "score-change": "#2563eb",
  "game-tied": "#0891b2",
  "lead-change": "#059669",
};

function formatAt(at: string | null): string {
  if (at == null) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AlertHistoryDrawer(props: {
  gameId: string | null;
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const { gameId, open, onClose } = props;

  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || gameId == null) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/alerts?limit=100`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AlertRecord[];
        setAlerts(Array.isArray(json) ? json : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [open, gameId]);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 200,
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(420px, 92vw)",
          background: "#fff",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 250ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1rem",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: "1rem" }}>Alert History</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "1.25rem",
              lineHeight: 1,
              color: "#6b7280",
              padding: "0.2rem 0.4rem",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem" }}>
          {loading && (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Loading…</div>
          )}
          {error != null && (
            <div style={{ color: "#dc2626", fontSize: "0.9rem" }}>{error}</div>
          )}
          {!loading && error == null && alerts.length === 0 && (
            <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>No alerts recorded for this game.</div>
          )}
          {alerts.map((a) => {
            const color = ALERT_TYPE_COLORS[a.type] ?? "#374151";
            const label = ALERT_TYPE_LABELS[a.type] ?? a.type;
            return (
              <div
                key={String(a.id)}
                style={{
                  borderLeft: `3px solid ${color}`,
                  background: "#f9fafb",
                  borderRadius: "0 8px 8px 0",
                  padding: "0.55rem 0.75rem",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      color,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {label}
                  </span>
                  {a.at != null && (
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af", flexShrink: 0 }}>
                      {formatAt(a.at)}
                    </span>
                  )}
                </div>
                {a.note != null && (
                  <div style={{ marginTop: "0.2rem", fontSize: "0.88rem", color: "#374151" }}>
                    {a.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
