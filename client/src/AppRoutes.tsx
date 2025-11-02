// src/AppRoutes.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DailyGamesPage } from "./pages/DailyGamesPage";
import { GamePage } from "./pages/GamePage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DailyGamesPage />} />
        <Route path="/games/:gamePk" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}