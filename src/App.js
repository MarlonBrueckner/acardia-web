// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import LandingPage from "./LandingPage";
import Login from "./Login";

import DashboardLayout from "./DashboardLayout";
import DashboardHome from "./DashboardHome";
import SessionsPage from "./SessionsPage";
import ChecklistsPage from "./ChecklistsPage";
import JournalPage from "./JournalPage";
import AnalyticsPage from "./AnalyticsPage";
import SettingsPage from "./SettingsPage";

import LotSizeCalculator from "./tools/LotSizeCalculator";
import EconomicCalendar from "./tools/EconomicCalendar";

import WinrateCalculator from "./tools/WinrateCalculator";
import NotesPage from "./NotesPage"; // Falls dein NotesPage in /notes/ liegt, ggf. anpassen
// import NoteEditor from "./notes/NoteEditor"; // optionaler Einzel-Editor

// --- Dummy-Auth-Hook ---
function useAuth() {
  return { isLoggedIn: localStorage.getItem("isLoggedIn") === "true" };
}

// --- Wrapper: Eingeloggt? -> direkt ins Dashboard ---
function RedirectIfLoggedIn({ children }) {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <Navigate to="/dashboard/analytics" replace />;
  return children;
}

export default function App() {
  // Darkmode global steuern
  const [dark, setDark] = useState(() => {
    // Default: true (wenn nicht explizit "false")
    return localStorage.getItem("darkMode") === "false" ? false : true;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", dark ? "true" : "false");
    if (dark) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
  }, [dark]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: dark ? "#1f1f1f" : "#fff",
        transition: "background 0.4s",
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route
            path="/"
            element={
              <RedirectIfLoggedIn>
                <LandingPage dark={dark} setDark={setDark} />
              </RedirectIfLoggedIn>
            }
          />
          <Route path="/login" element={<Login dark={dark} setDark={setDark} />} />

          {/* Dashboard + Kindrouten */}
       <Route path="/dashboard/*" element={<DashboardLayout dark={dark} setDark={setDark} />}>
            {/* Startseite */}
            <Route index element={<DashboardHome />} />

            {/* Hauptbereiche */}
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="checklists" element={<ChecklistsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Notes (Galerie + Detail) */}
            <Route path="notes" element={<NotesPage dark={dark} />} />
            <Route path="notes/:id" element={<NotesPage dark={dark} />} />
            {/* Optional einzelner Editor:
            <Route path="notes/:noteId" element={<NoteEditor dark={dark} />} /> */}

            {/* TOOLS im Dashboard-Namespace */}
           <Route path="tools/economic-calendar" element={<EconomicCalendar />} />
   <Route path="tools/lot-size" element={<LotSizeCalculator />} />
          </Route>

          {/* ---------- Legacy/Externe Pfade → Redirects ---------- */}
          {/* Economic Calendar */}
          <Route
            path="/tools/EconomicCalendar"
            element={<Navigate to="/dashboard/tools/economic-calendar" replace />}
          />
          <Route
            path="/tools/economic-calendar"
            element={<Navigate to="/dashboard/tools/economic-calendar" replace />}
          />

          {/* Lot Size Calculator */}
          {/* Unterstützt Sidebar-Links wie /tools/LotSizeCalculator und /tools/lot-size */}
          <Route
            path="/tools/LotSizeCalculator"
            element={<Navigate to="/dashboard/tools/lot-size" replace />}
          />
          <Route
            path="/tools/lot-size"
            element={<Navigate to="/dashboard/tools/lot-size" replace />}
          />
          {/* Optional: Falls mal /dashboard/tools/LotSizeCalculator verlinkt wurde */}
          <Route
            path="/dashboard/tools/LotSizeCalculator"
            element={<Navigate to="/dashboard/tools/lot-size" replace />}
          />

          {/* Fallback 404 → Dashboard */}
          <Route path="*" element={<Navigate to="/dashboard/analytics" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
