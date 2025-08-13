import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LandingPage from "./LandingPage";
import Login from "./Login";
import DashboardLayout from "./DashboardLayout";
import DashboardHome from "./DashboardHome";
import SessionsPage from "./SessionsPage";
import StrategiesPage from "./StrategiesPage";
import ChecklistsPage from "./ChecklistsPage";
import JournalPage from "./JournalPage";
import AnalyticsPage from "./AnalyticsPage";
import SettingsPage from "./SettingsPage";

// Dummy-Auth-Hook
function useAuth() {
  return { isLoggedIn: localStorage.getItem("isLoggedIn") === "true" };
}
// Wrapper für LandingPage:
function RedirectIfLoggedIn({ children }) {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  // DARKMODE-Flag zentral steuern
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("darkMode") === "false" ? false : true;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", dark ? "true" : "false");
    if (dark) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
  }, [dark]);

  return (
    <div style={{
      minHeight: "100vh",
      background: dark ? "#1f1f1f" : "#fff",
      transition: "background 0.4s"
    }}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <RedirectIfLoggedIn>
                <LandingPage dark={dark} setDark={setDark} />
              </RedirectIfLoggedIn>
            }
          />
          <Route path="/login" element={<Login dark={dark} setDark={setDark} />} />

          {/* Dashboard mit verschachtelten Kindrouten */}
          <Route path="/dashboard/*" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="strategies" element={<StrategiesPage />} />
            <Route path="checklists" element={<ChecklistsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
