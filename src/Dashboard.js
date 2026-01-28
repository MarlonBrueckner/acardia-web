// src/DashboardLayout.jsx
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FiPlus } from "react-icons/fi";
import TradeFormModal from "./TradeFormModal";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";

/* ---------- kleine Utils ---------- */
function startOfWeekBerlin(d = new Date()) {
  const day = d.getDay(); // 0=So ... 6=Sa
  const diffToMonday = (day + 6) % 7;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diffToMonday);
  return start;
}
function endOfWeekBerlin(d = new Date()) {
  const start = startOfWeekBerlin(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return end;
}
function getTradeDate(t, logId) {
  const cand =
    t?.journaledAt || t?.createdAt || t?.date || t?.timestamp || t?.time;

  // Debug: rohes Datum zeigen
  console.log(`[date-parse] trade=${logId} raw=`, cand);

  if (!cand) return null;

  // Firestore Timestamp
  if (cand?.toDate) {
    const d = cand.toDate();
    console.log(`[date-parse] trade=${logId} -> FirestoreTimestamp ->`, d);
    return d;
  }

  // Zahl (epoch ms)
  if (typeof cand === "number") {
    const d = new Date(cand);
    console.log(`[date-parse] trade=${logId} -> epoch(ms) ->`, d);
    return d;
  }

  // String: dd.mm.yyyy oder dd.mm.yy
  if (typeof cand === "string") {
    const s = cand.trim();

    // dd.mm.yyyy
    let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
      const [_, dd, mm, yyyy] = m;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      console.log(`[date-parse] trade=${logId} -> dd.mm.yyyy ->`, d);
      return d;
    }

    // dd.mm.yy  (→ 20xx heuristik)
    m = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (m) {
      const [_, dd, mm, yy] = m;
      const yyyy = 2000 + Number(yy);
      const d = new Date(yyyy, Number(mm) - 1, Number(dd));
      console.log(`[date-parse] trade=${logId} -> dd.mm.yy ->`, d);
      return d;
    }

    // ISO / yyyy-mm-dd / sonst von JS geparst
    const d = new Date(s);
    console.log(`[date-parse] trade=${logId} -> Date(string) ->`, d);
    if (!isNaN(d.getTime())) return d;
  }

  // Bereits Date?
  if (cand instanceof Date) {
    console.log(`[date-parse] trade=${logId} -> Date instance ->`, cand);
    return cand;
  }

  console.warn(`[date-parse] trade=${logId} -> unparseable`, cand);
  return null;
}

function planToLimit(plan) {
  const p = String(plan || "").toLowerCase();
  if (p === "pro") return Infinity;
  if (p === "advanced" || p === "adv") return 15;
  return 7; // free
}

export default function DashboardLayout({ dark, setDark }) {
  const [showTradeForm, setShowTradeForm] = useState(false);
  const accent = "#2c60fa";

  const [sidebarMin, setSidebarMin] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  // --- Neu: Auth/DB/Plan/Counter ---
  const auth = useMemo(() => getAuth(), []);
  const db = useMemo(() => getFirestore(), []);
  const navigate = useNavigate();

  const [uid, setUid] = useState(null);
  const [plan, setPlan] = useState("free");
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [lastComputedAt, setLastComputedAt] = useState(null);

  const weeklyLimit = useMemo(() => planToLimit(plan), [plan]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sidebar width
  const WIDTH_EXPANDED = 230;
  const WIDTH_MIN = 90;
  const sidebarWidth = isMobile ? 0 : (sidebarMin ? WIDTH_MIN : WIDTH_EXPANDED);
useEffect(() => {
  if (!uid) {
    setWeeklyCount(0);
    setTotalCount(0);
    setLast7Count(0);
    return;
  }

  const since7 = daysAgo(7);

  const unsub = onSnapshot(collection(db, "users", uid, "trades"), (snap) => {
    let total = 0;
    let weekCnt = 0;
    let last7 = 0;

    const debugRows = [];
    const noDate = [];

    snap.forEach((d) => {
      total += 1;
      const t = d.data();
      const dt = getTradeDate(t);

      if (!dt) {
        noDate.push({ id: d.id, raw: t?.date || t?.entryDate || t?.createdAt || t?.journaledAt });
        return;
      }

      const inWeek = dt >= weekStart && dt <= weekEnd;
      const in7d   = dt >= since7;

      if (inWeek) weekCnt += 1;
      if (in7d)   last7   += 1;

      debugRows.push({
        id: d.id,
        parsedISO: dt.toISOString(),
        raw: t?.journaledAt || t?.createdAt || t?.entryDate || t?.date || t?.timestamp || t?.time,
        inWeek,
        inLast7: in7d,
      });
    });

    setTotalCount(total);
    setWeeklyCount(weekCnt);
    setLast7Count(last7);

    // ---- fette Debug-Ausgaben ----
    console.group("📊 Trade-Scan");
    console.log("Gesamt-Trades:", total);
    console.log(`Kalenderwoche (${weekStart.toISOString()} – ${weekEnd.toISOString()}):`, weekCnt);
    console.log(`Letzte 7 Tage (ab ${since7.toISOString()}):`, last7);

    console.groupCollapsed(`📄 Details (${debugRows.length})`);
    debugRows.forEach((r) =>
      console.log(
        `id=${r.id} | parsed=${r.parsedISO} | inWeek=${r.inWeek} | inLast7=${r.inLast7} | raw=`,
        r.raw
      )
    );
    console.groupEnd();

    if (noDate.length) {
      console.warn("⚠️ Trades ohne erkennbares Datum:", noDate);
    }
    console.groupEnd();
  });

  return () => unsub();
}, [db, uid, weekStart, weekEnd]);


  // --- Auth + Userdoc laden ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid || null);
      if (!u?.uid) {
        console.log("👤 [Dashboard] kein User eingeloggt – Plus-Button wird blockiert.");
        setPlan("free");
        setWeeklyCount(0);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const data = snap.exists() ? snap.data() : {};
        // Plan-Logik an dein Schema anpassen
        let p = "free";
        if (data.isPro === true) p = "pro";
        const role = String(data.stripeRole || data.plan || "").toLowerCase();
        if (role === "pro") p = "pro";
        else if (role === "advanced" || role === "adv") p = "advanced";
        const sub = data.subscription || data.stripeSubscription || {};
        if (p === "free" && String(sub.status || "").toLowerCase() === "active") {
          p = "advanced";
        }
        setPlan(p);
        console.log("🪪 [Dashboard] erkannter Plan:", p);
      } catch (e) {
        console.error("❗[Dashboard] Fehler beim Laden des Userdocs:", e);
        setPlan("free");
      }
      // gleich initial zählen
      await recomputeWeeklyCount();
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, db]);

  // --- Zähler neu rechnen ---
async function recomputeWeeklyCount() {
  try {
    if (!uid) {
      setWeeklyCount(0);
      setLastComputedAt(new Date());
      return;
    }

    // Ohne orderBy, damit auch Mischschema lädt
    const snap = await getDocs(collection(db, "users", uid, "trades"));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const ws = startOfWeekBerlin(new Date());
    const we = endOfWeekBerlin(new Date());

    let count = 0;
    for (const t of items) {
      const d = getTradeDate(t, t.id);
      const inWeek = d && d >= ws && d <= we;
      console.log(
        `[week-check] trade=${t.id} parsed=${d?.toISOString?.() ?? d} inWeek=${!!inWeek}`
      );
      if (inWeek) count += 1;
    }

    setWeeklyCount(count);
    setLastComputedAt(new Date());
    console.log(
      `🔁 [Counter] Woche ${ws.toLocaleDateString()}–${we.toLocaleDateString()}:`,
      { weeklyCount: count, totalTradesLoaded: items.length }
    );
  } catch (e) {
    console.error("❗[Counter] Fehler beim Zählen:", e);
  }
}


  // --- FAB Click mit fetten Logs ---
  async function handleFabClick() {
    console.clear?.(); // optional: Konsole leeren für deutliche Logs
    console.log("➕ [PlusButton] Klick erkannt.");

    if (!uid) {
      console.log("🚫 [PlusButton] Kein Nutzer eingeloggt → blockiert.");
      return;
    }

    // vor der Entscheidung immer kurz frisch zählen
    await recomputeWeeklyCount();

    const canOpen =
      weeklyLimit === Infinity ? true : weeklyCount < weeklyLimit;

    console.log("[PlusButton] Entscheidungsgrundlage:", {
      plan,
      weeklyLimit,
      weeklyCount,
      lastComputedAt,
      decision: canOpen ? "OPEN_MODAL" : "BLOCK_AND_SUGGEST_UPGRADE",
    });

    if (canOpen) {
      setShowTradeForm(true);
      console.log("✅ [PlusButton] Modal geöffnet.");
    } else {
      console.log(
        `🚫 [PlusButton] Limit erreicht (${weeklyCount}/${weeklyLimit}). Weiterleitung zur Abo-Seite.`
      );
      navigate("/settings?tab=subscription");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: dark ? "#1f1f1f" : "#ffffff" }}>
      <Sidebar dark={dark} sidebarMin={sidebarMin} setSidebarMin={setSidebarMin} />

      {/* Schiebt TopBar + Inhalt gemeinsam */}
      <div
        style={{
          marginLeft: sidebarWidth,
          transition: "margin-left .22s ease",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TopBar dark={dark} setDark={setDark} />
        <div style={{ flex: 1, padding: "32px 28px 28px" }}>
          <Outlet context={{ dark }} />
        </div>
      </div>

      {/* Trade-Form Modal */}
      <TradeFormModal
        open={showTradeForm}
        onClose={() => {
          console.log("ℹ️ [Modal] geschlossen.");
          setShowTradeForm(false);
          // nach dem Speichern/Schließen erneut zählen (falls du im Modal speicherst)
          setTimeout(() => recomputeWeeklyCount(), 300);
        }}
        dark={dark}
      />

      {/* FAB */}
      <button
        onClick={handleFabClick}
        className="fab-new-trade"             // <- eindeutige Klasse für Debug/Tests
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
          transition: "background .2s",
        }}
        aria-label="New Trade"
        title="Neuen Trade anlegen"
      >
        <FiPlus />
      </button>
    </div>
  );
}
