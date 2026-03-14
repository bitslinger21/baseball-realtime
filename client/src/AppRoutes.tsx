import type { ChangeEvent, ReactElement } from "react";
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import DailyGamesPage from "./pages/DailyGamesPage";
import { GamePage } from "./pages/GamePage";
import PlayerPage from "./pages/PlayerPage";
import StandingsPage from "./pages/StandingsPage";

const REPLAY_DELAY_STORAGE_KEY = "br-replay-delay-ms";
const DEFAULT_REPLAY_DELAY_MS = 2000;

function readReplayDelayMs(): number {
  try {
    const raw = window.localStorage.getItem(REPLAY_DELAY_STORAGE_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 50) {
      return parsed;
    }
  } catch {
    // ignore
  }

  return DEFAULT_REPLAY_DELAY_MS;
}

function SettingsPage(): ReactElement {
  const [replayDelayInput, setReplayDelayInput] = useState<string>(() =>
    String(readReplayDelayMs()),
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleReplayDelayChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextValue = event.target.value;
    setReplayDelayInput(nextValue);

    const parsed = Number(nextValue);
    if (Number.isFinite(parsed) && parsed >= 50) {
      try {
        window.localStorage.setItem(REPLAY_DELAY_STORAGE_KEY, String(parsed));
      } catch {
        // ignore
      }
      setValidationMessage(null);
      return;
    }

    setValidationMessage("Choose a replay delay value.");
  };

  return (
    <section className="page-container settings-page">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-list" role="table" aria-label="Application settings">
        <div className="settings-row" role="row">
          <div className="settings-copy" role="cell">
            <div className="settings-label">Historical replay delay</div>
            <div className="settings-description">
              Delay in milliseconds between historical pitch
              updates when replaying a completed game on the
              Daily Games page. Changes apply immediately.
            </div>
            {validationMessage != null && (
              <div className="settings-error">{validationMessage}</div>
            )}
          </div>

          <div className="settings-control" role="cell">
            <select
              className="settings-input"
              value={replayDelayInput}
              onChange={handleReplayDelayChange}
              aria-label="Historical replay delay in milliseconds"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
              <option value="1500">1500</option>
              <option value="2000">2000</option>
              <option value="3000">3000</option>
              <option value="4000">4000</option>
              <option value="5000">5000</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<DailyGamesPage />} />
      <Route path="/standings" element={<StandingsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/game/:providerGameId" element={<GamePage />} />
      <Route path="/player/:mlbId" element={<PlayerPage />} />
    </Routes>
  );
}