// src/JournalPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
// ganz oben in JournalPage.jsx
import { mapMtCsvToTrades } from "./import";



import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useOutletContext, useNavigate } from "react-router-dom";
import { FiCalendar, FiImage, FiList, FiAlertCircle, FiUploadCloud } from "react-icons/fi";

/* ---- External sub-views ---- */
import JournalCalendar from "./JournalCalendar";
import TradeList from "./TradeList";
import TradeGallery from "./TradeGallery";

/* ---- Detail modal ---- */
import TradeDetailModal from "./TradeDetailModal";

/* ---------- Theme ---------- */
const palette = {
  dark: {
    bg: "#181818",
    panel: "#181818",
    text: "#ffffff",
    sub: "#bfc4cf",
    border: "#2a2a2f",
    chip: "#23232a",
    accent: "#2c60fa",
    input: "#1f1f1f",
    inputBorder: "#4e4e4eff",
    shadow: "0 10px 40px rgba(0,0,0,.45)",
  },
  light: {
    bg: "#edf2fa",
    panel: "#ffffff",
    text: "#000000ff",
    sub: "#495060",
    border: "#e3e7ef",
    chip: "#f4f7ff",
    accent: "#2c60fa",
    input: "#ffffff",
    inputBorder: "#e3e7ef",
    shadow: "0 12px 40px rgba(30,36,64,.12)",
  },
};

function TabBtn({ icon, label, active, onClick, theme }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        background: active ? theme.accent : "transparent",
        color: active ? "#fff" : theme.text,
        fontWeight: 700,
      }}
      title={label}
    >
      {icon}
      {label}
    </button>
  );
}

/* ---------- kleines Upgrade-Popup ---------- */
function UpgradePopup({ open, dark, onClose, onUpgrade, limit }) {
  if (!open) return null;
  const theme = dark ? palette.dark : palette.light;
  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        zIndex: 3000,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          background: theme.panel,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          boxShadow: theme.shadow,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
          <FiAlertCircle style={{ color: theme.accent }} />
          Limit erreicht
        </div>
        <div style={{ color: theme.sub, lineHeight: 1.4 }}>
          Du hast dein wöchentliches Journal-Limit von <b>{limit}</b> Trades erreicht.
          Upgrade auf <b>Advanced</b> (bis 15/Woche) oder <b>Pro</b> (unbegrenzt), um weiter zu journalen.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: theme.text,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Später
          </button>
          <button
            onClick={onUpgrade}
            style={{
              background: theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Jetzt upgraden
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function startOfWeekBerlin(d = new Date()) {
  const day = d.getDay(); // 0=So ... 6=Sa
  const diffToMonday = (day + 6) % 7; // Mo=0, Di=1, ..., So=6
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

function getTradeDate(t) {
  const cand =
    t?.journaledAt || t?.createdAt || t?.date || t?.timestamp || t?.time;

  if (!cand) return null;

  if (cand?.toDate) return cand.toDate();
  if (typeof cand === "number") return new Date(cand);
  if (cand instanceof Date) return cand;

  if (typeof cand === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(cand)) return new Date(cand);
    const m = cand.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }
  }
  return null;
}

/** Nutzerplan zu Limit mappen */
function planToLimit(plan) {
  const p = String(plan || "").toLowerCase();
  if (p === "pro") return Infinity;
  if (p === "advanced" || p === "adv") return 15;
  return 7; // free
}

/* ---------- Main ---------- */
export default function JournalPage() {
  const [refreshCal, setRefreshCal] = useState(0);
  const db = getFirestore();
  const auth = getAuth();
  const { dark } = useOutletContext();
  const navigate = useNavigate();
  const theme = useMemo(() => (dark ? palette.dark : palette.light), [dark]);

  const [tab, setTab] = useState("calendar");
 const [importing, setImporting] = useState(false);

  const [uid, setUid] = useState(() => auth.currentUser?.uid || null);
  const [userDoc, setUserDoc] = useState(null);
  const [trades, setTrades] = useState([]);
  const [selected, setSelected] = useState(null);

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(7);

  // Import-Button / File input
  const fileInputRef = useRef(null);
  
  /* --- Auth & Userdoc --- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid || null);
      if (u?.uid) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setUserDoc(snap.exists() ? snap.data() : {});
      } else {
        setUserDoc(null);
      }
    });
    return () => unsub();
  }, [auth, db]);

  /* --- Trades laden --- */
  useEffect(() => {
    if (!uid) return;
    const qy = query(
      collection(db, "users", uid, "trades"),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(qy, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrades(items);
    });
    return unsub;
  }, [db, uid]);

  /* --- Plan & Limit bestimmen --- */
  const plan = useMemo(() => {
    if (!userDoc) return "free";
    if (userDoc.isPro === true) return "pro";
    const role = String(userDoc.stripeRole || userDoc.plan || "").toLowerCase();
    if (role === "pro") return "pro";
    if (role === "advanced" || role === "adv") return "advanced";

    const sub = userDoc.subscription || userDoc.stripeSubscription || {};
    if (String(sub.status || "").toLowerCase() === "active") {
      return "advanced";
    }
    return "free";
  }, [userDoc]);

  const weeklyLimit = useMemo(() => planToLimit(plan), [plan]);

  /* --- Weekly count --- */
  const weekStart = useMemo(() => startOfWeekBerlin(new Date()), []);
  const weekEnd = useMemo(() => endOfWeekBerlin(new Date()), []);

  const weeklyCount = useMemo(() => {
    return trades.reduce((acc, t) => {
      const dt = getTradeDate(t);
      if (!dt) return acc;
      if (dt >= weekStart && dt <= weekEnd) acc += 1;
      return acc;
    }, 0);
  }, [trades, weekStart, weekEnd]);

  /* --- Gatekeeper vorm Öffnen des Modals --- */
  function tryOpenTrade(t) {
    const isNew = !t?.id && t?.__isNew === true;

    if (!isNew) {
      setSelected(t);
      return;
    }

    if (weeklyLimit === Infinity || weeklyCount < weeklyLimit) {
      setSelected(t);
    } else {
      setCurrentLimit(weeklyLimit === Infinity ? "∞" : weeklyLimit);
      setShowUpgrade(true);
    }
  }

  /* --- Import Trades (CSV) --- */
  const handleImportClick = () => {
    if (!uid) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // reset, damit gleiche Datei erneut geht
      fileInputRef.current.click();
    }
  };
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    try {
      setImporting(true);
      const text = await file.text();

      const mapped = mapMtCsvToTrades(text);

      // alles nach Firestore schieben
      const tradesCol = collection(db, "users", uid, "trades");

      for (const t of mapped) {
        await addDoc(tradesCol, {
          ...t,
          createdAt: serverTimestamp(),
          journaledAt: serverTimestamp(),
        });
      }

      // Kalender refreshen
      setRefreshCal((k) => k + 1);
    } catch (err) {
      console.error("Import error:", err);
      alert("Import failed – check console for details.");
    } finally {
      setImporting(false);
      // damit derselbe File noch einmal gewählt werden kann
      e.target.value = "";
    }
  }
  

  return (
    <div style={{ padding: "0 5px 10px" }}>
      <style>{`
        ::-webkit-scrollbar{display:none}
        *{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "8px 0 10px",
          gap: 12,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 34,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: 0.3,
            lineHeight: 1.2,
          }}
        >
          Journal
        </h1>

        {/* Rechts: Import-Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing || !uid}
            title="Import trades (z.B. CSV von MetaTrader)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: dark ? "#1f1f1f" : "#f5f7fd",
              color: theme.text,
              fontWeight: 700,
              cursor: importing ? "default" : "pointer",
              opacity: importing ? 0.6 : 1,
              fontSize: 13,
            }}
          >
            <FiUploadCloud />
            {importing ? "Importing…" : "Import trades"}
          </button>

          {/* verstecktes File-Input */}
               <input
        type="file"
        accept=".csv,.txt"
        style={{ display: "none" }}
        id="mt-import-file"
        onChange={handleImportFile}
      />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "inline-flex",
          gap: 6,
          background: dark ? "#181818" : "#f5f7fd",
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          padding: 4,
        }}
      >
        <TabBtn
          icon={<FiCalendar />}
          label="Calendar"
          active={tab === "calendar"}
          onClick={() => setTab("calendar")}
          theme={theme}
        />

        <TabBtn
          icon={<FiImage />}
          label="Gallery"
          active={tab === "gallery"}
          onClick={() => setTab("gallery")}
          theme={theme}
        />
        <TabBtn
          icon={<FiList />}
          label="Journal"
          active={tab === "journal"}
          onClick={() => setTab("journal")}
          theme={theme}
        />
      </div>

      {/* Content */}
      <div style={{ marginTop: 14 }}>
        {tab === "calendar" && (
          <JournalCalendar
            dark={dark}
            uid={uid}
            onOpenTrade={(t) => tryOpenTrade(t)}
            refreshKey={refreshCal}
          />
        )}

        {tab === "journal" && (
          <TradeList
            dark={dark}
            items={trades}
            onItemClick={(t) => tryOpenTrade(t)}
          />
        )}

        {tab === "gallery" && (
          <TradeGallery
            dark={dark}
            items={trades}
            onOpen={(t) => tryOpenTrade(t)}
          />
        )}
      </div>

      {/* Detail modal */}
      <TradeDetailModal
        open={!!selected}
        trade={selected}
        dark={dark}
        onClose={() => setSelected(null)}
        onSaved={() => setRefreshCal((k) => k + 1)}
        onDeleted={() => {
          setSelected(null);
          setRefreshCal((k) => k + 1);
        }}
        createLimit={{
          weeklyCount,
          weeklyLimit,
          plan,
        }}
        onCreateBlocked={() => {
          setCurrentLimit(weeklyLimit === Infinity ? "∞" : weeklyLimit);
          setShowUpgrade(true);
        }}
      />

      {/* Upgrade Popup */}
      <UpgradePopup
        open={showUpgrade}
        dark={dark}
        limit={currentLimit}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          navigate("/settings?tab=subscription");
        }}
      />
    </div>
  );
}
