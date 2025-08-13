// src/JournalPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { useOutletContext } from "react-router-dom";
import { FiCalendar, FiImage, FiList } from "react-icons/fi";

/* ---- External sub-views ---- */
import JournalCalendar from "./JournalCalendar";
import TradeList from "./TradeList";
import TradeGallery from "./TradeGallery";

/* ---- NEW: detail modal component ---- */
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

/* ---------- Tab Button ---------- */
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

/* ---------- Main ---------- */
export default function JournalPage() {
  const db = getFirestore();
  const uid = getAuth().currentUser?.uid;
  const { dark } = useOutletContext();
  const theme = useMemo(() => (dark ? palette.dark : palette.light), [dark]);

  // "journal" | "gallery" | "calendar"
  const [tab, setTab] = useState("calendar");

  const [trades, setTrades] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "trades"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrades(items);
    });
    return unsub;
  }, [db, uid]);

  return (
    <div style={{ padding: "0 8px 24px" }}>
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
          margin: "8px 0 14px",
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
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "inline-flex",
          gap: 6,
          background: dark ? "#202028" : "#f5f7fd",
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
          icon={<FiList />}
          label="Journal"
          active={tab === "journal"}
          onClick={() => setTab("journal")}
          theme={theme}
        />
        <TabBtn
          icon={<FiImage />}
          label="Gallery"
          active={tab === "gallery"}
          onClick={() => setTab("gallery")}
          theme={theme}
        />
      </div>

      {/* Content */}
      <div style={{ marginTop: 14 }}>
        {tab === "calendar" && (
          <JournalCalendar
            dark={dark}
            uid={uid}
            onOpenTrade={(t) => setSelected(t)}
          />
        )}

        {tab === "journal" && (
          <TradeList
            dark={dark}
            items={trades}
            onItemClick={setSelected}
          />
        )}

        {tab === "gallery" && (
          <TradeGallery
            dark={dark}
            items={trades}
            onOpen={setSelected}
          />
        )}
      </div>

      {/* Detail modal (NEU) */}
     <TradeDetailModal
  open={!!selected}
  trade={selected}
  dark={dark}
  onClose={() => setSelected(null)}
  onDeleted={() => setSelected(null)}

      />
    </div>
  );
}
