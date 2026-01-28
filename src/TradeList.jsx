// src/components/TradeList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { FiSearch, FiX, FiChevronDown } from "react-icons/fi";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";

/* ---------- Theme ---------- */
function useTheme(dark) {
  return useMemo(
    () =>
      dark
        ? {
            cardBg: "#181818",
            cardBorder: "#2B2B2B",
            text: "#FFFFFF",
            sub: "#BFC4CF",
            accent: "#2c60fa",
            panel: "#181818",
            input: "#1f1f1f",
            inputBorder: "#4e4e4e",
          }
        : {
            cardBg: "#FFFFFF",
            cardBorder: "#E3E7EF",
            text: "#23232A",
            sub: "#495060",
            accent: "#2c60fa",
            panel: "#ffffff",
            input: "#ffffff",
            inputBorder: "#e3e7ef",
          },
    [dark]
  );
}

/* ---------- Helpers ---------- */
const OUTCOME_RGB = {
  win: { r: 28, g: 191, b: 115, hex: "#1CBF73" },
  loss: { r: 238, g: 78, b: 78, hex: "#EE4E4E" },
  be: { r: 140, g: 150, b: 170, hex: "#8C96AA" },
};
const CURRENCY_SYMBOL = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF", JPY: "¥" };


function pickOutcomeKey(o) {
  const k = String(o || "").toLowerCase();
  if (k === "win") return "win";
  if (k === "loss") return "loss";
  return "be";
}
function tintOverlay(dark, { r, g, b }) {
  return dark
    ? `linear-gradient(135deg, rgba(${r},${g},${b},0) 0%, rgba(${r},${g},${b},0.45) 100%)`
    : `rgba(${r},${g},${b},0.22)`;
}
function tintBorder(dark, { r, g, b }) {
  return dark ? `rgba(${r},${g},${b},0.55)` : `rgba(${r},${g},${b},0.40)`;
}
function hexToRgba(hex, a) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function parseDDMMYY(s) {
  if (!s) return null;
  const [dd, mm, yy] = s.split(".").map((x) => parseInt(x, 10));
  if (!dd || !mm || isNaN(yy)) return null;
  const full = 2000 + yy;
  return new Date(full, mm - 1, dd);
}
function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDate(d) {
  return d
    ? d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
    : "—";
}
function withinThisWeek(d) {
  const now = new Date();
  const start = new Date(now);
  const day = (now.getDay() + 6) % 7; // Mon=0
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end && !sameDay(d, new Date());
}
function monthKey(d) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function timeStr(s) {
  return s || "—";
}

/* ---------- Data hooks ---------- */
function useUserCurrency() {
  const uid = getAuth().currentUser?.uid;
  const db = getFirestore();
  const [code, setCode] = useState("USD");
  const symbol = CURRENCY_SYMBOL[code] || "$";
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const snap = await getDoc(doc(db, "users", uid));
      const c = snap.exists() ? snap.data()?.currency : null;
      if (c && CURRENCY_SYMBOL[c]) setCode(c);
    })();
  }, [db, uid]);
  return { code, symbol };
}

/** Map der Confluence-Farben aus users/{uid}/confluences  -> {textLower: hexColor} */
function useConfluencePalette() {
  const uid = getAuth().currentUser?.uid;
  const db = getFirestore();
  const [map, setMap] = useState({});
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users", uid, "confluences"));
        const m = {};
        snap.forEach((d) => {
          const { text, color } = d.data() || {};
          if (text && color) m[String(text).toLowerCase()] = color;
        });
        setMap(m);
      } catch (e) {
        console.error("confluences load error", e);
      }
    })();
  }, [db, uid]);
  return map;
}

/* ---------- Row ---------- */
function TradeRow({ dark, theme, t, currencySymbol, onClick }) {
  const outcomeKey = pickOutcomeKey(t.outcome);
  const rgb = OUTCOME_RGB[outcomeKey];
  const overlay = tintOverlay(dark, rgb);
  const borderTint = tintBorder(dark, rgb);

  const hasImg = Array.isArray(t.images) && t.images[0];
  const entryD = parseDDMMYY(t.entryDate) || parseDDMMYY(t.date);
  const exitD = parseDDMMYY(t.exitDate);
  const multiDay = exitD && entryD && !sameDay(entryD, exitD);

  const val = Number(t.risk) || 0;
  const signed = (val > 0 ? "+" : "") + currencySymbol + Math.trunc(val);
  const pillColor =
    outcomeKey === "win" ? OUTCOME_RGB.win.hex : outcomeKey === "loss" ? OUTCOME_RGB.loss.hex : theme.sub;

  return (
    <button
      onClick={() => onClick?.(t)}
      style={{
        width: "100%",
        textAlign: "left",
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 14,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        transition: "transform .16s ease, border-color .16s ease",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = borderTint;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = theme.cardBorder;
      }}
      onFocus={(e) => (e.currentTarget.style.outline = `2px solid ${theme.accent}`)}
      onBlur={(e) => (e.currentTarget.style.outline = "none")}
    >
      {/* Thumb (jetzt ohne Farb-Overlay, immer mit tintBorder umrandet) */}
      <div
        style={{
          width: window.innerWidth >= 1280 ? 84 : window.innerWidth < 640 ? 64 : 76,
          height: window.innerWidth >= 1280 ? 84 : window.innerWidth < 640 ? 64 : 76,
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
          border: `1px solid ${borderTint}`,       // <<< einheitlich: getönter Rahmen
          background: hasImg ? theme.cardBg : overlay, // kein Overlay bei Bild
          display: "grid",
          placeItems: "center",
        }}
      >
       {hasImg ? (
  <>
    <img
      src={t.images[0]}
      alt=""
      loading="lazy"
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
    {/* sehr leichte Einfärbung über dem Bild */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: dark
          ? `linear-gradient(135deg, rgba(${rgb.r},${rgb.g},${rgb.b},0) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},0.06) 100%)`
          : `rgba(${rgb.r},${rgb.g},${rgb.b},0.06)`,
      }}
    />
  </>
) : (
  // Platzhalter (unverändert)
  <div
    style={{
      fontSize: 13,
      fontWeight: 700,
      color: dark ? "#fff" : "#23232A",
      padding: 6,
      textAlign: "center",
      lineHeight: 1.1,
    }}
  >
    {t.riskReward ? `RR ${t.riskReward}` : "RR —"}
  </div>
)}

      </div>

      {/* Mitte: Titel + Meta */}
      <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: theme.text, overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.symbol || "—"}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: theme.sub }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: theme.sub }}>
            {t.position} • RR {t.riskReward || "—"}
          </span>
          <span style={{ fontSize: 13, color: theme.sub }}>
            {timeStr(t.time)} → {timeStr(t.exitTime || t.timeZone || "—")}
          </span>
          <ConfluenceTags tags={t.confluenceEntries} theme={theme} />
        </div>
      </div>

      {/* Rechts: Datum & P/L Pill */}
      <div style={{ display: "grid", alignContent: "center", justifyItems: "end", gap: 6 }}>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: tintOverlay(dark, rgb),
            border: `1px solid ${tintBorder(dark, rgb)}`,
            color: pillColor,
            fontSize: 13,
            fontWeight: 800,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            textAlign: "right",
          }}
        >
          {signed}
        </div>

        <div style={{ fontSize: 12, color: theme.sub, textAlign: "right", lineHeight: 1.2 }}>
          {(() => {
            const entryD = parseDDMMYY(t.entryDate) || parseDDMMYY(t.date);
            const exitD = parseDDMMYY(t.exitDate);
            const multiDay = exitD && entryD && !sameDay(entryD, exitD);
            return multiDay ? (
              <>
                {formatDate(entryD)} <span style={{ display: "inline-block", transform: "translateY(-1px)" }}>→</span>{" "}
                {formatDate(exitD)}
              </>
            ) : (
              formatDate(entryD)
            );
          })()}
        </div>
      </div>
    </button>
  );
}

/* Confluence-Tags: Farbe aus Context (setzt Parent) */
function ConfluenceTags({ tags, theme }) {
  const palette = React.useContext(ConfluenceColorContext);
  if (!Array.isArray(tags) || tags.length === 0) return null;

  const visible = window.innerWidth >= 1280 ? 5 : 3;
  const head = tags.slice(0, visible);
  const rest = tags.length - head.length;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {head.map((t, i) => {
        const key = String(t?.text || t).toLowerCase();
        const base = palette[key] || "#2C60FA"; // fallback
        return (
          <span
            key={`${key}-${i}`}
            title={t?.text || t}
            style={{
              background: hexToRgba(base, 0.16),
              border: `1px solid ${hexToRgba(base, 0.4)}`,
              color: base,
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: 8,
              lineHeight: 1,
            }}
          >
            {t?.text || t}
          </span>
        );
      })}
      {rest > 0 && (
        <span
          style={{
            background: hexToRgba("#8C96AA", 0.16),
            border: `1px solid ${hexToRgba("#8C96AA", 0.4)}`,
            color: theme.sub,
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: 999,
            lineHeight: 1,
          }}
          title={`${rest} more…`}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
function useMediaMax(px = 720) {
  const [match, setMatch] = React.useState(() => window.innerWidth <= px);
  React.useEffect(() => {
    const onResize = () => setMatch(window.innerWidth <= px);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [px]);
  return match;
}

/* ---------- Context für Tag-Farben ---------- */
const ConfluenceColorContext = React.createContext({});

/* ---------- Gruppierung + Filterleiste ---------- */
export default function TradeList({ dark, items, onItemClick }) {
  const theme = useTheme(dark);
  const { symbol: currencySymbol } = useUserCurrency();
  const confPalette = useConfluencePalette();
  const isNarrow = useMediaMax(720);
  // Filter UI
  const [position, setPosition] = useState("All"); // All | Buy | Sell
  const [outcome, setOutcome] = useState("All"); // All | Win | Loss | BE
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return (items || []).filter((t) => {
      if (position !== "All" && String(t.position) !== position) return false;
      if (
        outcome !== "All" &&
        pickOutcomeKey(t.outcome) !==
          (outcome === "BE" ? "be" : outcome.toLowerCase())
      )
        return false;
      if (query.trim()) {
        const blob = JSON.stringify(t).toLowerCase();
        if (!blob.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [items, position, outcome, query]);

  // Gruppierung
 const groups = useMemo(() => {
  const byId = new Map();
  const now = new Date();

  function getTradeDate(t) {
    return parseDDMMYY(t.entryDate) || parseDDMMYY(t.date) || now;
  }

  function ensure(id, label, sortTs) {
    if (!byId.has(id)) byId.set(id, { id, label, sortTs, items: [] });
    return byId.get(id);
  }

  for (const t of filtered) {
    const d = getTradeDate(t);

    // 1) Today / This week
    if (sameDay(d, now)) {
      ensure("today", `Today • ${formatDate(d)}`, Number.POSITIVE_INFINITY).items.push(t);
      continue;
    }
    if (withinThisWeek(d)) {
      // liegt unter "today" aber über Monaten
      ensure("week", "This week", Number.POSITIVE_INFINITY - 1).items.push(t);
      continue;
    }

    // 2) Month groups (sortierbar ohne Locale-Probleme)
    const y = d.getFullYear();
    const m = d.getMonth(); // 0..11
    const monthId = `${y}-${String(m + 1).padStart(2, "0")}`; // z.B. "2025-10"
    const monthLabel = d.toLocaleDateString(undefined, { month: "long", year: "numeric" }); // z.B. "Oktober 2025"
    const monthSortTs = new Date(y, m, 1).getTime();

    ensure(monthId, monthLabel, monthSortTs).items.push(t);
  }

  // Trades innerhalb der Gruppen auch sortieren (neu -> alt)
  for (const g of byId.values()) {
    g.items.sort((a, b) => getTradeDate(b) - getTradeDate(a));
  }

  // Reihenfolge der Gruppen: Today, This week, dann Monate desc
  const arr = Array.from(byId.values());

  const today = arr.find((g) => g.id === "today");
  const week = arr.find((g) => g.id === "week");
  const months = arr
    .filter((g) => g.id !== "today" && g.id !== "week")
    .sort((a, b) => b.sortTs - a.sortTs);

  const ordered = [];
  if (today) ordered.push(today);
  if (week) ordered.push(week);
  ordered.push(...months);

  // Output kompatibel zu deinem Render:
  return ordered.map((g) => ({ key: g.label, items: g.items }));
}, [filtered]);


  return (
    <ConfluenceColorContext.Provider value={confPalette}>
      {/* Filterzeile */}
      <div
        style={{
          display: "flex",
          justifyContent: isNarrow ? "flex-start" : "flex-end", // <<< links auf schmal
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
          marginTop: 8,
        }}
      >
        {/* Suche */}
        <div style={{ position: "relative", flex: isNarrow ? "1 1 100%" : "0 0 auto" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol…"
            style={{
              width: isNarrow ? "100%" : 240,              // <<< volle Breite auf schmal
              background: theme.input,
              color: theme.text,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 12,
              padding: "10px 40px 10px 36px",
              outline: "none",
              fontSize: 14,
            }}
          />
          <FiSearch
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: theme.sub,
              pointerEvents: "none",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                color: theme.sub,
                cursor: "pointer",
              }}
              aria-label="Clear search"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {/* Position */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            style={{
              background: theme.input,
              color: theme.text,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 12,
              padding: "10px 28px 10px 12px",
              fontSize: 14,
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              width: "auto",
            }}
            title="Position"
          >
            <option>All</option>
            <option>Buy</option>
            <option>Sell</option>
          </select>
          <FiChevronDown
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: theme.sub,
              pointerEvents: "none",
            }}
            size={16}
          />
        </div>

        {/* Outcome */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            style={{
              background: theme.input,
              color: theme.text,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 12,
              padding: "10px 28px 10px 12px",
              fontSize: 14,
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              width: "auto",
            }}
            title="Outcome"
          >
            <option>All</option>
            <option>Win</option>
            <option>Loss</option>
            <option value="BE">Break-even</option>
          </select>
          <FiChevronDown
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: theme.sub,
              pointerEvents: "none",
            }}
            size={16}
          />
        </div>

        {/* Clear */}
        <button
          onClick={() => {
            setQuery("");
            setPosition("All");
            setOutcome("All");
          }}
          style={{
            border: `1px solid ${theme.inputBorder}`,
            background: "transparent",
            color: theme.text,
            borderRadius: 12,
            padding: "10px 12px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Clear
        </button>
      </div>


    {/* Liste mit Überschriften */}
    <div style={{ display: "grid", gap: 10 }}>
      {groups.length === 0 && (
        <div
          style={{
            padding: 28,
            borderRadius: 14,
            border: `1px solid ${theme.border}`,
            background: dark
              ? "linear-gradient(135deg, rgba(140,150,170,0) 0%, rgba(140,150,170,.10) 100%)"
              : "rgba(140,150,170,.12)",
            color: theme.sub,
            textAlign: "center",
          }}
        >
          No trades yet.
        </div>
      )}

      {groups.map(({ key, items }) => (
        <div key={key} style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              color: theme.sub,
              padding: "4px 2px",
            }}
          >
            {key}
          </div>

          {items.map((t) => (
            <TradeRow
              key={t.id}
              dark={dark}
              theme={theme}
              t={t}
              currencySymbol={currencySymbol}
              onClick={onItemClick}
            />
          ))}
        </div>
      ))}
    </div>
  </ConfluenceColorContext.Provider>
);
}