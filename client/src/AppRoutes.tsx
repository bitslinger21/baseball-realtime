// src/AppRoutes.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DailyGamesPage from "./pages/DailyGamesPage";
import { GamePage } from "./pages/GamePage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DailyGamesPage />} />
      <Route path="/game/:providerGameId" element={<GamePage />} />
    </Routes>
  );
}