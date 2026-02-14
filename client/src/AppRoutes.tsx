// src/AppRoutes.tsx
import { Routes, Route } from "react-router-dom";
import DailyGamesPage from "./pages/DailyGamesPage";
import { GamePage } from "./pages/GamePage";
import PlayerPage from "./pages/PlayerPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DailyGamesPage />} />
      <Route path="/game/:providerGameId" element={<GamePage />} />
      <Route path="/player/:mlbId" element={<PlayerPage />} />
    </Routes>
  );
}