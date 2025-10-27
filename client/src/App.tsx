// baseball-ui/src/App.tsx
import { useCallback, useMemo, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { GameList } from './components/GameList';
import { LiveGame } from './components/LiveGame';
import type { LiveUpdate } from './types';
import { todayYmd, addDays } from './date';

export default function App() {
  const [date, setDate] = useState<string>(todayYmd());
  const [selected, setSelected] = useState<string>('');
  const [stateByGame, setStateByGame] = useState<Record<string, LiveUpdate>>({});
  const [alertsByGame, setAlertsByGame] = useState<Record<string, LiveUpdate['alert'][]>>({});

  const onUpdate = useCallback((u: LiveUpdate) => {
    setStateByGame((s) => ({ ...s, [u.gameId]: u }));
    if (u.alert) {
      setAlertsByGame((s) => ({ ...s, [u.gameId]: [u.alert!, ...(s[u.gameId] ?? [])].slice(0, 50) }));
    }
  }, []);

  // only connect when a game is selected
  useSocket(selected, onUpdate);

  const current = useMemo(() => stateByGame[selected], [selected, stateByGame]);
  const currentAlerts = useMemo(() => alertsByGame[selected] ?? [], [selected, alertsByGame]);

  const go = (delta: number) => setDate((d) => addDays(d, delta));

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 20, display: 'grid', gap: 20, gridTemplateColumns: '360px 1fr' }}>
      <section>
        <h1 style={{ marginTop: 0 }}>⚾ Games</h1>

        {/* Date controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => go(-1)}>&laquo; Prev</button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button onClick={() => go(1)}>Next &raquo;</button>
        </div>

        <GameList date={date} selected={selected} onSelect={setSelected} />
      </section>

      <section>
        <h1 style={{ marginTop: 0 }}>Live</h1>
        <LiveGame state={current} alerts={currentAlerts} />
      </section>
    </main>
  );
}