import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { PrivacyPolicyPage, TermsOfUsePage, HelpCenterPage } from "./LegalPages";
import ScrollToTop from "./helpers/ScrollToTop";

/* Pages */
import LandingPage from "./LandingPage";
import { ImpressumPage } from "./features/ImpressumPage";
import Login from "./Login";

import { Navbar  } from "./helpers/Navbar";
import { Footer } from "./helpers/Footer";
import DashboardLayout from "./DashboardLayout";
import DashboardHome from "./DashboardHome";
import SessionsPage from "./SessionsPage";
import ChecklistsPage from "./ChecklistsPage";
import JournalPage from "./JournalPage";
import AnalyticsPage from "./AnalyticsPage";
import SettingsPage from "./SettingsPage";
import {
  FeatureTradeSyncPage,
  FeatureEmotionsPage,
  FeatureAnalyticsPage
} from "./features/FeaturesPages";
import {
  PricingPage
} from "./features/PricingPage";
/* Notes */
import NotesPage from "./NotesPage";

/* Tools */
import LotSizeCalculator from "./tools/LotSizeCalculator";
import EconomicCalendar from "./tools/EconomicCalendar";
import WinrateCalculator from "./tools/WinrateCalculator";
import MetaTraderSyncPage from "./tools/MetaTraderSyncPage";
import { getAuth, onAuthStateChanged } from "firebase/auth";




function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => setUser(u || null));
    return () => unsub();
  }, []);
  return { user, loading: user === undefined, isLoggedIn: !!user };
}


function AppFallback() {
  const { isLoggedIn } = useAuth();
  return <Navigate to={isLoggedIn ? "/dashboard/analytics" : "/"} replace />;
}


function RequireAuth({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return null; // oder Spinner
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}


function RedirectIfLoggedIn({ children }) {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) return <Navigate to="/dashboard/analytics" replace />;
  return children;
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? saved === "true" : false;
  });


  useEffect(() => {
  const unsub = onAuthStateChanged(getAuth(), (u) => {
    localStorage.setItem("isLoggedIn", u ? "true" : "false");
  });
  return () => unsub();
}, []);



  useEffect(() => {
    localStorage.setItem("darkMode", dark ? "true" : "false");
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--fg)",
        transition: "background 0.3s ease"
      }}
    >
      <BrowserRouter>
       <ScrollToTop />
        {/* ⬇️ WICHTIG: Alle <Route> müssen in <Routes> */}
        <Routes>
          {/* ---------- Public ---------- */}
          <Route
            path="/"
            element={
              <RedirectIfLoggedIn>
                <LandingPage dark={dark} setDark={setDark} />
              </RedirectIfLoggedIn>
            }
          />
          <Route path="/login" element={<Login dark={dark} setDark={setDark} />} />

          {/* Legal/Help */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfUsePage />} />
          <Route path="/help" element={<HelpCenterPage />} />


<Route path="/features/trade-sync" element={<FeatureTradeSyncPage />} />
<Route path="/features/emotions"    element={<FeatureEmotionsPage />} />
<Route path="/features/analytics"   element={<FeatureAnalyticsPage />} />
<Route path="/features"             element={<Navigate to="/features/trade-sync" replace />} />
<Route path="/impressum" element={<ImpressumPage />} />
<Route path="/pricing" element={<PricingPage />} />

          {/* ---------- Dashboard ---------- */}
         <Route
  path="/dashboard/*"
  element={
    <RequireAuth>
      <DashboardLayout dark={dark} setDark={setDark} />
    </RequireAuth>
  }
>

            <Route index element={<DashboardHome />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="checklists" element={<ChecklistsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notes" element={<NotesPage dark={dark} />} />
            
            <Route path="notes/:id" element={<NotesPage dark={dark} />} />

            {/* Tools */}
            <Route path="tools/economic-calendar" element={<EconomicCalendar dark={dark} />} />
            <Route path="tools/lot-size" element={<LotSizeCalculator dark={dark} />} />
            <Route path="tools/winrate" element={<WinrateCalculator dark={dark} />} />
            <Route path="tools/metatrader-sync" element={<MetaTraderSyncPage />} />

          </Route>

          {/* ---------- Redirects & Fallback ---------- */}
          <Route path="/tools/EconomicCalendar" element={ <RequireAuth><Navigate to="/dashboard/tools/economic-calendar" replace /> </RequireAuth>} />
          <Route path="/tools/economic-calendar" element={ <RequireAuth><Navigate to="/dashboard/tools/economic-calendar" replace /> </RequireAuth>} />
          <Route path="/tools/LotSizeCalculator" element={ <RequireAuth><Navigate to="/dashboard/tools/lot-size" replace /> </RequireAuth>} />
          <Route path="/tools/lot-size" element={ <RequireAuth><Navigate to="/dashboard/tools/lot-size" replace /> </RequireAuth>} />
          <Route path="/dashboard/tools/LotSizeCalculator" element={ <RequireAuth><Navigate to="/dashboard/tools/lot-size" replace /> </RequireAuth>} />
          <Route path="/tools/WinrateCalculator" element={ <RequireAuth><Navigate to="/dashboard/tools/winrate" replace /> </RequireAuth>} />
          <Route path="/tools/winrate" element={ <RequireAuth><Navigate to="/dashboard/tools/winrate" replace /> </RequireAuth>} />
          <Route path="/dashboard/tools/WinrateCalculator" element={ <RequireAuth><Navigate to="/dashboard/tools/winrate" replace /> </RequireAuth>} />
         <Route
  path="/tools/MetaTraderSyncPage"
  element={ <RequireAuth><Navigate to="/dashboard/tools/metatrader-sync" replace /> </RequireAuth>}
/>

         <Route path="*" element={<AppFallback />} />

        </Routes>
      </BrowserRouter>
    </div>
  );
}
