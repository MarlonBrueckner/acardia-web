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

import EconomicCalendar from "./tools/EconomicCalendar";
import NotesPage from "./NotesPage";
// OPTIONAL: Wenn du einen Einzel-Editor hast, kommentiere es ein
// import NoteEditor from "./notes/NoteEditor";

// --- Dummy-Auth-Hook ---
function useAuth() {
  return { isLoggedIn: localStorage.getItem("isLoggedIn") === "true" };
}

// --- Wrapper für LandingPage: Ist der User eingeloggt, direkt ins Dashboard ---
function RedirectIfLoggedIn({ children }) {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) {
    // Ziel: Dashboard-Analytics
    return <Navigate to="/dashboard/analytics" replace />;
  }
  return children;
}

export default function App() {
  // Darkmode global steuern
  const [dark, setDark] = useState(() => {
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
          <Route path="/dashboard/*" element={<DashboardLayout />}>
            {/* Startseite des Dashboards */}
            <Route index element={<DashboardHome />} />

            {/* Hauptbereiche */}
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="checklists" element={<ChecklistsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Notes (Galerie) */}
            <Route path="notes" element={<NotesPage dark={dark} />} />
             <Route path="notes/:id" element={<NotesPage />} />
            {/* OPTIONAL: Einzel-Editor (nur falls vorhanden) */}
            {/* <Route path="notes/:noteId" element={<NoteEditor dark={dark} />} /> */}

            {/* Tools → Economic Calendar (im Dashboard-Namespace) */}
            <Route
              path="tools/economic-calendar"
              element={<EconomicCalendar dark={dark} setDark={setDark} />}
            />
          </Route>

          {/* Legacy/Externe Pfade → sauber umbiegen */}
          <Route
            path="/tools/EconomicCalendar"
            element={<Navigate to="/dashboard/tools/economic-calendar" replace />}
          />

          {/* Fallback 404 → ins Dashboard */}
          <Route path="*" element={<Navigate to="/dashboard/analytics" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
