// src/DashboardLayout.jsx
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiAlertCircle } from "react-icons/fi";
import TradeFormModal from "./TradeFormModal";

/* Firebase */
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";

/* ---------- Helpers ---------- */
function planToLimit(plan) {
  const p = String(plan || "").toLowerCase();
  if (p === "pro") return Infinity;
  if (p === "advanced" || p === "adv") return 15;
  return 7; // free
}

// robustes Datum-Parsen (Timestamp | epoch | ISO | dd.mm.yy | dd.mm.yyyy)
function parseTradeDate(trade) {
  const cand =
    trade?.journaledAt ||
    trade?.createdAt ||
    trade?.entryDate ||
    trade?.date ||
    trade?.timestamp ||
    trade?.time;

  if (!cand) return null;

  if (cand?.toDate) return cand.toDate();               // Firestore Timestamp
  if (typeof cand === "number") return new Date(cand);  // epoch ms

  if (typeof cand === "string") {
    const s = cand.trim();

    // dd.mm.yyyy
    let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
    // dd.mm.yy -> 20xx Heuristik
    m = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (m) {
      const [, dd, mm, yy] = m;
      const yyyy = 2000 + Number(yy);
      return new Date(yyyy, Number(mm) - 1, Number(dd));
    }

    // ISO oder sonstiges
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  if (cand instanceof Date) return cand;

  return null;
}

function daysAgoStart(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/* ---------- kleines Upgrade-Popup ---------- */
/* ---------- Upgrade Popup (EN + pink-blue gradient) ---------- */
function UpgradePopup({ open, dark, limit, onClose, onUpgrade }) {
  if (!open) return null;

  const theme = dark
    ? {
        panel: "#181818",
        text: "#fff",
        sub: "#bfc4cf",
        border: "#2a2a2f",
        shadow: "0 10px 40px rgba(0,0,0,.45)",
      }
    : {
        panel: "#fff",
        text: "#23232a",
        sub: "#495060",
        border: "#e3e7ef",
        shadow: "0 12px 40px rgba(30,36,64,.12)",
      };

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        zIndex: 3000,
        display: "grid",
        placeItems: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "min(480px, 92vw)",
          background: theme.panel,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          boxShadow: theme.shadow,
          padding: 22,
          display: "grid",
          gap: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
          }}
        >
          <FiAlertCircle style={{ color: "#ff4ecd", fontSize: 22 }} />
          Weekly Limit Reached
        </div>

        <div style={{ color: theme.sub, fontSize: 15, lineHeight: 1.6 }}>
          You’ve reached your 7-day journaling limit of{" "}
          <b>{limit === Infinity ? "∞" : limit}</b> trades.
          <br />
          Upgrade to <b>Advanced</b> (15/week) or <b>Pro</b> (unlimited) to
          continue journaling without restrictions.
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 6 }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
              minWidth: 120,
            }}
          >
            Later
          </button>

          <button
            onClick={onUpgrade}
            style={{
              background: "linear-gradient(135deg, #ff4ecd 0%, #2c60fa 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
              minWidth: 140,
              boxShadow: "0 4px 18px rgba(44,96,250,.25)",
              transition: "transform .15s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}


/* ---------- Main ---------- */
export default function DashboardLayout({ dark, setDark }) {
  const accent = "#2c60fa";
  const [showTradeForm, setShowTradeForm] = useState(false);
// oben im Component-Body (nach const navigate = useNavigate();)


  const [sidebarMin, setSidebarMin] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

    const goUpgrade = () => navigate("/dashboard/settings?tab=subscription");


  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [userDoc, setUserDoc] = useState(null);
  const [trades, setTrades] = useState([]);           // alle Trades (live)
  const [count7, setCount7] = useState(0);            // Trades in letzten 7 Tagen
  const [showUpgrade, setShowUpgrade] = useState(false);

  /* --- Auth & User-Dokument --- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid || null);
      if (u?.uid) {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? snap.data() : {};
        setUserDoc(data);
        console.log("👤 UserDoc geladen:", data);
      } else {
        setUserDoc(null);
      }
    });
    return () => unsub();
  }, [auth, db]);

  /* --- Trades live laden (wie Analytics) --- */
  useEffect(() => {
    if (!uid) {
      setTrades([]);
      setCount7(0);
      return;
    }
    const unsub = onSnapshot(collection(db, "users", uid, "trades"), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrades(all);

      // harte Logs
      console.group("📥 Trades Snapshot");
      console.log("Empfangen (gesamt):", all.length);

      // letzten 7 Tage zählen (inkl. dd.mm.yy etc.)
      const start = daysAgoStart(6);     // inkl. heute → 7 Kalendertage
      const now = new Date();

      const last7 = all.filter((t) => {
        const dt = parseTradeDate(t);
        if (!dt) return false;
        return dt >= start && dt <= now;
      });

      console.log("→ Start 7-Tage-Fenster:", start.toISOString());
      console.log("→ Ende  7-Tage-Fenster:", now.toISOString());
      console.log("Gezählt (letzte 7 Tage):", last7.length);
      console.groupEnd();

      setCount7(last7.length);
    });

    return () => unsub();
  }, [db, uid]);

const plan = useMemo(() => {
  if (!userDoc) return "free";

  // 1) ✅ App/Apple sync field on user doc (your Firebase field)
  // e.g. userDoc.subscriptionStatus = "Advanced" | "Pro" | "Free"
  const appStatus = String(userDoc.subscriptionStatus || "").trim().toLowerCase();
  if (appStatus === "pro") return "pro";
  if (appStatus === "advanced" || appStatus === "adv") return "advanced";

  // 2) ✅ Stripe-style subscription objects (web)
  const sub = userDoc.subscription || userDoc.stripeSubscription || {};
  const status = String(sub.status || "").trim().toLowerCase();
  const isActive = status === "active" || status === "trialing";

  if (isActive) {
    const p = String(
      sub.role ||
      userDoc.plan ||
      userDoc.stripeRole ||
      userDoc.tier ||
      ""
    )
      .trim()
      .toLowerCase();

    if (p === "pro") return "pro";
    if (p === "advanced" || p === "adv") return "advanced";
  }

  return "free";
}, [userDoc]);


const limit7 = useMemo(() => planToLimit(plan), [plan]);



  /* --- UI: Sidebar responsiv --- */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const WIDTH_EXPANDED = 230;
  const WIDTH_MIN = 90;
  const sidebarWidth = isMobile ? 0 : (sidebarMin ? WIDTH_MIN : WIDTH_EXPANDED);

  /* --- Gate vorm Öffnen des New-Trade Modals --- */
  function tryOpenNewTrade() {
    console.group("🔍 [Trade Creation Debug]");
    console.log("Plan:", plan);
    console.log("Limit (letzte 7 Tage):", limit7);
    console.log("Erkannt: Gesamt =", trades.length, "| letzte 7 Tage =", count7);

    if (limit7 === Infinity) {
      console.log("Entscheidung: öffnen (Pro, unlimitiert)");
      console.groupEnd();
      setShowTradeForm(true);
      return;
    }

    if (count7 < limit7) {
      console.log("Entscheidung: öffnen");
      console.log(`→ ${count7}/${limit7} → unter Limit, öffne Modal.`);
      console.groupEnd();
      setShowTradeForm(true);
      return;
    }

    console.warn("Entscheidung: BLOCKEN → Limit erreicht:", `${count7}/${limit7}`);
    console.groupEnd();
    setShowUpgrade(true);
  }

  /* --- Render --- */
  return (
    <div style={{ minHeight: "100vh", background: dark ? "#1f1f1f" : "#ffffff" }}>
      <Sidebar dark={dark} sidebarMin={sidebarMin} setSidebarMin={setSidebarMin} />

      {/* Schiebt TopBar + Inhalt gemeinsam */}
      <div
        style={{ marginLeft: sidebarWidth, transition: "margin-left .22s ease", minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <TopBar dark={dark} setDark={setDark} />
        <div style={{ flex: 1, padding: "32px 28px 28px" }}>
          <Outlet context={{ dark, userDoc, plan, limit7 }} />

        </div>
      </div>

      {/* Modal (neuer Trade) */}
      <TradeFormModal
        open={showTradeForm}
        onClose={() => setShowTradeForm(false)}
        dark={dark}
        uid={uid}                                   // ← wichtig: wohin speichern
        onCreated={(id) => {
          console.log("✅ Neuer Trade gespeichert, ID:", id);
          setShowTradeForm(false);
        }}
      />

      {/* FAB – mit Limit-Gate */}
      <button
        className="fab-new-trade"
        onClick={tryOpenNewTrade}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          background: accent,
          borderRadius: "50%",
          width: 58,
          height: 58,
          boxShadow: "0 2px 18px 0 #21347a3a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          border: "none",
          fontSize: 32,
          zIndex: 1000,
          cursor: "pointer",
          transition: "background .2s"
        }}
        aria-label="New Trade"
        title={limit7 === Infinity ? "Neuer Trade" : `Letzte 7 Tage: ${count7}/${limit7}`}
      >
        <FiPlus />
      </button>

     <UpgradePopup
  open={showUpgrade}
  dark={dark}
  limit={limit7} // oder weeklyLimit – was du oben nutzt
  onClose={() => setShowUpgrade(false)}
  onUpgrade={() => {
    setShowUpgrade(false);
    goUpgrade(); // ✅ nutzt den funktionierenden Pfad
  }}
/>

    </div>
  );
}
