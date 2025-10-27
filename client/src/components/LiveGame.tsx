import type { LiveUpdate } from '../types';

export function LiveGame({ state, alerts }: { state?: LiveUpdate; alerts: LiveUpdate['alert'][] }) {
  if (!state) return <p>Select a game to begin live updates.</p>;

  const b = state.bases || {};
  const dot = (on?: boolean) => (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: 6,
      marginRight: 6, background: on ? '#2ecc71' : '#eee', border: '1px solid #ccc'
    }} />
  );

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>Inning: {state.half} {state.inning}</h2>
      <div>Outs: {state.outs}</div>
      <div>Count: {state.count?.balls ?? 0}-{state.count?.strikes ?? 0}</div>
      <div style={{ marginTop: 6 }}>
        Bases: {dot(b.on1)}1B {dot(b.on2)}2B {dot(b.on3)}3B
      </div>

      <h3 style={{ marginTop: 16 }}>Alerts</h3>
      {alerts.length === 0 && <div>No alerts yet.</div>}
      {alerts.map((a, i) => (
        <div key={i} style={{ background: '#fff8e1', border: '1px solid #ffecb5',
                               borderRadius: 6, padding: 8, marginTop: 6 }}>
          <b>{a?.type}</b> — <code>{JSON.stringify(a).slice(0,120)}</code>
        </div>
      ))}
    </div>
  );
}
