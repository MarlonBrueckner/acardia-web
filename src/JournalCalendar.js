// src/JournalCalendar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getFirestore, collection, getDocs, getDoc, doc } from "firebase/firestore";
import {
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiX,
  FiChevronDown,
} from "react-icons/fi";

function usePalette(dark) {
  return dark
    ? {
        bg: "#181818",
        panel: "#1f1f1f",
        ipanel: "#181818",
        text: "#ffffff",
        sub: "#bfc4cf",
        border: "#313131",
        input: "#1f1f1f",
        inputBorder: "#4e4e4e",
        accent: "#2c60fa",
        chipPos: "rgba(0, 247, 255, 0.18)",
        chipNeg: "rgba(255, 0, 200, 0.2)",
        chipNeu: "rgba(140,150,170,.22)",
        shadow: "0 6px 40px rgba(0,0,0,.45)",
      }
    : {
        bg: "#dee3e9",
        panel: "#ffffff",
        text: "#23232a",
        sub: "#495060",
        border: "#e3e7ef",
        input: "#edf2fa",
        inputBorder: "#ffffff",
        accent: "#2c60fa",
        chipPos: "rgba(0, 255, 136, 0.18)",
        chipNeg: "rgba(255, 0, 0, 0.18)",
        chipNeu: "rgba(140,150,170,.12)",
         shadow: "0 4px 18px rgba(30,36,64,.08)",
      };
}

// --- helpers ---
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const formatMonthLabel = (d) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

function parseDDMMYY(s) {
  // "08.09.25" -> Date(2025,8,8)
  const [dd, mm, yy] = s.split(".").map((v) => parseInt(v, 10));
  const fullYear = 2000 + (isNaN(yy) ? 0 : yy);
  return new Date(fullYear, (mm || 1) - 1, dd || 1);
}
function formatDayKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 6-week grid starting Monday
function getWeeks(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  const day = (first.getDay() + 6) % 7; // Mon=0
  start.setDate(first.getDate() - day);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + i);
      row.push(d);
    }
    weeks.push(row);
  }
  return weeks;
}

function aggregateMonth(trades, monthDate, filters) {
  const m = monthDate.getMonth();
  const y = monthDate.getFullYear();
  const map = {};
  for (const t of trades) {
    if (!t.entryDate) continue;
    const d = parseDDMMYY(t.entryDate);
    if (d.getMonth() !== m || d.getFullYear() !== y) continue;

    // filters
    if (filters.position !== "All" && t.position !== filters.position) continue;
    if (
      filters.outcome !== "All" &&
      t.outcome !== (filters.outcome === "BE" ? "Break-even" : filters.outcome)
    )
      continue;
    if (
      filters.q &&
      !String(t.symbol || "").toLowerCase().includes(filters.q.toLowerCase())
    )
      continue;

    const key = formatDayKey(d);
    if (!map[key]) map[key] = { profit: 0, count: 0, thumbs: [], items: [] };
    const p = Number(t.risk) || 0;
    map[key].profit += p;
    map[key].count += 1;
    map[key].items.push(t);
    if (map[key].thumbs.length < 2 && Array.isArray(t.images) && t.images[0]) {
      map[key].thumbs.push(t.images[0]);
    }
  }
  return map;
}

const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// ---- currency helpers ----
const CURRENCY_SYMBOL = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CHF: "CHF",
  JPY: "¥"
};



export default function JournalCalendar({ dark, uid, onOpenTrade, refreshKey = 0 }) {
  const isNarrow = useMediaMax(820);
  const theme = usePalette(dark);
  const db = getFirestore();
  const CURRENCY_SYMBOL = { USD:"$", EUR:"€", GBP:"£", CHF:"CHF", JPY:"¥" };

 const calendarRef = useRef(null);
  const weekdaysRef = useRef(null);
  const [cellSize, setCellSize] = useState(96); // Startwert

     useEffect(() => {
    function recalc() {
      if (!calendarRef.current || !weekdaysRef.current) return;

      const outerRect = calendarRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;

      // verfügbare Höhe unterhalb des Kalenders
      const totalAvailH = viewportH - outerRect.top - 24; // kleiner Puffer

      const headerRect = weekdaysRef.current.getBoundingClientRect();
      const headerH = headerRect.height;

      // Deine Styles: padding: 12, gap: 8
      const paddingV = 12 * 2; // oben + unten
      const gapV = 8 * 5;      // 6 Zeilen => 5 Zwischenräume

      const availGridH = totalAvailH - headerH - paddingV - gapV;
      const rawFromHeight = availGridH / 6; // 6 Zeilen

      // Breite der Kalenderbox
      const availW = calendarRef.current.clientWidth;
      const paddingH = 12 * 2;
      const gapH = 8 * 6;      // 7 Spalten => 6 Zwischenräume

      const availGridW = availW - paddingH - gapH;
      const rawFromWidth = availGridW / 7; // 7 Spalten

      // bisschen zugunsten der Höhe gewichtet
      const cellFromHeight = rawFromHeight * 0.98;
      const cellFromWidth  = rawFromWidth * 1.0;

      const size = Math.max(
        60,
        Math.floor(Math.min(cellFromHeight, cellFromWidth))
      );

      setCellSize(size);
    }

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);




async function loadUserCurrencySymbol(db, uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const code = snap.exists() ? snap.data()?.currency : null;
    return CURRENCY_SYMBOL[code] || "$";
  } catch {
    return "$";
  }
}

  // ...
  const [currencySym, setCurrencySym] = useState("$");

  // data
  const [allTrades, setAllTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // ui state
  const [monthDate, setMonthDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [filters, setFilters] = useState({
    q: "",
    position: "All",
    outcome: "All",
  });
  const [qInput, setQInput] = useState("");
  const [detail, setDetail] = useState({ open: false, dayKey: null });
  const gridRef = useRef(null);
  const [focusKey, setFocusKey] = useState(formatDayKey(new Date()));

  // fetch trades once (client-side aggregate by month)
useEffect(() => {
  if (!uid) return;
  (async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users", uid, "trades"));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })); // <-- ID sicherstellen
    setAllTrades(items);
    setLoading(false);
  })();
}, [uid, db, refreshKey]); // <- refreshKey hier rein

 useEffect(() => {
    if (!uid) return;
    loadUserCurrencySymbol(db, uid).then(setCurrencySym);
  }, [db, uid]);

  
  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, q: qInput.trim() }));
    }, 250);
    return () => clearTimeout(t);
  }, [qInput]);

  // memoized
  const weeks = useMemo(() => getWeeks(monthDate), [monthDate]);
  const monthAgg = useMemo(
    () => aggregateMonth(allTrades, monthDate, filters),
    [allTrades, monthDate, filters]
  );

  const todayKey = formatDayKey(new Date());

  // keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (!gridRef.current) return;
      const d = new Date(
        Number(focusKey.slice(0, 4)),
        Number(focusKey.slice(5, 7)) - 1,
        Number(focusKey.slice(8, 10))
      );
      if (e.key === "ArrowRight") {
        d.setDate(d.getDate() + 1);
        setFocusKey(formatDayKey(d));
      } else if (e.key === "ArrowLeft") {
        d.setDate(d.getDate() - 1);
        setFocusKey(formatDayKey(d));
      } else if (e.key === "ArrowDown") {
        d.setDate(d.getDate() + 7);
        setFocusKey(formatDayKey(d));
      } else if (e.key === "ArrowUp") {
        d.setDate(d.getDate() - 7);
        setFocusKey(formatDayKey(d));
      } else if (e.key === "Enter") {
        setDetail({ open: true, dayKey: focusKey });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusKey]);

  // helpers ui
function profitPill(profit) {
  const bg = profit > 0 ? theme.chipPos : profit < 0 ? theme.chipNeg : theme.chipNeu;
  const color = profit > 0 ? "#00ff88ff" : profit < 0 ? "#ff0000ff" : theme.sub;
  const text = `${profit > 0 ? "+" : ""}${currencySym}${Math.trunc(profit)}`; // <- hier
  return (
      <div
        style={{
          padding: "2px 8px",
          borderRadius: 999,
          background: bg,
          color,
          fontWeight: 800,
          fontSize: 12,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {text}
      </div>
    );
  }
function DayCell({ d, cellSize }) {
  const key = formatDayKey(d);
  const info = monthAgg[key];
  const isCurrMonth = d.getMonth() === monthDate.getMonth();
  const isToday = key === todayKey;
  const focused = key === focusKey;

  if (!isCurrMonth) {
    return (
      <div
        aria-hidden="true"
        style={{
  width: "100%",
  aspectRatio: "1 / 1",
  borderRadius: 12,}}
      />
    );
  }

  const base = 110; // Referenzbreite
  const scale = Math.max(0.6, Math.min(1.2, cellSize / base));
  const fsDayNum  = Math.round(14 * scale);
  const dayCircle = Math.round(26 * scale);
  const fsBadge   = Math.max(9, Math.round(11 * scale));
  const fsCount   = Math.max(9, Math.round(11 * scale));
  const padCell   = Math.round(8 * scale);

  // Heatmap-Farben wie bisher
  const baseKey = info
    ? info.profit > 0
      ? "pos"
      : info.profit < 0
      ? "neg"
      : "neu"
    : null;

  const baseRGB = {
    pos: { r: 28,  g: 191, b: 115 },
    neg: { r: 238, g: 78,  b: 78  },
    neu: { r: 140, g: 150, b: 170 },
  };

  const c = baseKey ? baseRGB[baseKey] : null;

  const tintOverlay = c
    ? dark
      ? `linear-gradient(135deg, rgba(${c.r},${c.g},${c.b},0) 0%, rgba(${c.r},${c.g},${c.b},0.45) 100%)`
      : `rgba(${c.r},${c.g},${c.b},0.22)`
    : "transparent";

  const tintBorder = c
    ? `rgba(${c.r},${c.g},${c.b},${dark ? 0.55 : 0.4})`
    : theme.border;

  return (
    <button
      onClick={() => setDetail({ open: true, dayKey: key })}
      onFocus={() => setFocusKey(key)}
      tabIndex={0}
      aria-label={`${d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      })}. Profit ${info ? info.profit : 0}. ${info ? info.count : 0} trades.`}
     style={{
  textAlign: "left",
  width: "100%",
  aspectRatio: "1 / 1",
  background: theme.ipanel,
  border: `1px solid ${tintBorder}`,
  borderRadius: 12,
  padding: padCell,
  position: "relative",
  overflow: "hidden",
  outline: focused ? `2px solid ${theme.accent}` : "none",
  transform: "translateY(0px)",
  boxShadow: "none",
  transition: "all .18s ease",
}}

      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px)";
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Kopfzeile in der Zelle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(6 * scale),
          }}
        >
          {/* Tageszahl im Kreis */}
          <div
            style={{
              width: dayCircle,
              height: dayCircle,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.text,
              fontWeight: 800,
              fontSize: fsDayNum,
              border: isToday
                ? `2px solid ${theme.accent}`
                : "2px solid transparent",
            }}
          >
            {d.getDate()}
          </div>

          {/* Profit + Count (wenn es Trades gibt) */}
          {info?.count ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: Math.round(6 * scale),
              }}
            >
 <div
  style={{
    padding: `${Math.max(2, Math.round(2 * scale))}px ${Math.max(6, Math.round(8 * scale))}px`,
    borderRadius: 999,
    background:
      info.profit > 0 ? theme.chipPos : info.profit < 0 ? theme.chipNeg : theme.chipNeu,
    color:
      info.profit > 0 ? "#00ff88ff" : info.profit < 0 ? "#ff0000ff" : theme.sub,
    fontWeight: 800,
    fontSize: fsBadge,
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",   // 👈 verhindert Zeilenumbruch
    lineHeight: 1.1,        // 👈 stabilisiert Darstellung
  }}
>
  {`${info.profit > 0 ? "+" : ""}${currencySym}${Math.trunc(info.profit)}`}
</div>



              <div
                style={{
                  fontSize: fsCount,
                  color: theme.sub,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: Math.round(6 * scale),
                }}
              >
                <span
                  style={{
                    width: Math.max(4, Math.round(6 * scale)),
                    height: Math.max(4, Math.round(6 * scale)),
                    borderRadius: "50%",
                    background: theme.sub,
                    opacity: 0.9,
                    display: "inline-block",
                  }}
                />
                {info.count}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Farb-Overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          background: tintOverlay,
          opacity: c ? 1 : 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </button>
  );
}


  const dayTrades = useMemo(() => {
    if (!detail.dayKey) return [];
    // re-apply filters for list
    return (monthAgg[detail.dayKey]?.items || []).filter((t) => {
      if (filters.position !== "All" && t.position !== filters.position)
        return false;
      if (
        filters.outcome !== "All" &&
        t.outcome !== (filters.outcome === "BE" ? "Break-even" : filters.outcome)
      )
        return false;
      if (
        filters.q &&
        !String(t.symbol || "")
          .toLowerCase()
          .includes(filters.q.toLowerCase())
      )
        return false;
      return true;
    });
  }, [detail.dayKey, monthAgg, filters]);

  const dayProfit = useMemo(
    () => dayTrades.reduce((s, t) => s + (Number(t.risk) || 0), 0),
    [dayTrades]
  );

  

 return (
    <div>
      {/* Header */}
{isNarrow ? (
  <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
    {/* Row 1: Suche (volle Breite) */}
    <div style={{ position: "relative" }}>
      <input
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
        placeholder="Search symbol…"
        style={{
          width: "100%",
          background: theme.input,
          color: theme.text,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: 10,
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
      {qInput && (
        <button
          onClick={() => setQInput("")}
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

    {/* Row 2: Dropdowns + Clear (links orientiert) */}
    <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, flexWrap: "wrap" }}>
      {/* Position */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <select
          value={filters.position}
          onChange={(e) => setFilters((f) => ({ ...f, position: e.target.value }))}
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
          value={filters.outcome}
          onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value }))}
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
          setQInput("");
          setFilters({ q: "", position: "All", outcome: "All" });
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

    {/* Row 3: Month Navigation (links) */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifyContent: "flex-start",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
        title="Previous month"
        style={{
          border: `1px solid ${theme.border}`,
          background: theme.panel,
          color: theme.text,
          borderRadius: 8,
          padding: "6px 10px",
        }}
      >
        <FiChevronLeft />
      </button>

      <div
        style={{
          fontWeight: 800,
          color: theme.text,
          minWidth: 0,
          textAlign: "left",
        }}
      >
        {formatMonthLabel(monthDate)}
      </div>

      <button
        onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
        title="Next month"
        style={{
          border: `1px solid ${theme.border}`,
          background: theme.panel,
          color: theme.text,
          borderRadius: 8,
          padding: "6px 10px",
        }}
      >
        <FiChevronRight />
      </button>

      <button
        onClick={() =>
          setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
        }
        style={{
          border: "none",
          background: theme.accent,
          color: "#fff",
          borderRadius: 8,
          padding: "6px 12px",
          fontWeight: 600,
          marginLeft: 6,
        }}
      >
        Today
      </button>
    </div>
  </div>
) : (
        // --- BREIT: dein bisheriges Grid-Layout ---
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 800,
                color: theme.text,
                letterSpacing: 0.3,
              }}
            />
          </div>

          {/* Month nav (mittig) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              title="Previous month"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <FiChevronLeft />
            </button>
            <div
              style={{
                fontWeight: 800,
                color: theme.text,
                minWidth: 190,
                textAlign: "center",
              }}
            >
              {formatMonthLabel(monthDate)}
            </div>
            <button
              onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              title="Next month"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <FiChevronRight />
            </button>
            <button
              onClick={() =>
                setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
              }
              style={{
                border: "none",
                background: theme.accent,
                color: "#fff",
                borderRadius: 8,
                padding: "6px 12px",
                fontWeight: 600,
                marginLeft: 6,
              }}
            >
              Today
            </button>
          </div>

          {/* Filters (rechts, wrap) */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ position: "relative" }}>
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search symbol…"
                style={{
                  width: 180,
                  background: theme.input,
                  color: theme.text,
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 10,
                  padding: "8px 32px 8px 30px",
                  outline: "none",
                  fontSize: 14,
                }}
              />
              <FiSearch
                size={16}
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: theme.sub,
                }}
              />
              {qInput && (
                <button
                  onClick={() => setQInput("")}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    color: theme.sub,
                    cursor: "pointer",
                  }}
                >
                  <FiX size={16} />
                </button>
              )}
            </div>

            <select
              value={filters.position}
              onChange={(e) => setFilters((f) => ({ ...f, position: e.target.value }))}
              style={{
                background: theme.input,
                color: theme.text,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 14,
              }}
            >
              <option>All</option>
              <option>Buy</option>
              <option>Sell</option>
            </select>

            <select
              value={filters.outcome}
              onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value }))}
              style={{
                background: theme.input,
                color: theme.text,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 14,
              }}
            >
              <option>All</option>
              <option>Win</option>
              <option value="BE">BE</option>
              <option>Loss</option>
            </select>

            <button
              onClick={() => {
                setQInput("");
                setFilters({ q: "", position: "All", outcome: "All" });
              }}
              style={{
                border: `1px solid ${theme.inputBorder}`,
                background: theme.panel,
                color: theme.text,
                borderRadius: 10,
                padding: "8px 10px",
                fontWeight: 600,
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

           {/* Calendar container */}
      <div
        ref={calendarRef}
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          boxShadow: theme.shadow,
          overflow: "hidden",
        }}
      >

 <div
  ref={weekdaysRef}
  style={{
    display: "grid",
    gridTemplateColumns: `repeat(7, ${cellSize}px)`, // gleiche Breite wie Zellen
    gap: 8,
    padding: "12px 12px 6px",
    borderBottom: `1px solid ${theme.border}`,
    color: theme.sub,
    fontWeight: 800,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    justifyContent: "center", // zentriert im Container
  }}
>
  {weekdayShort.map((w) => (
    <div key={w} style={{ textAlign: "center" }}>
      {w}
    </div>
  ))}
</div>


<div
  ref={gridRef}
  style={{
    display: "grid",
    gridTemplateColumns: `repeat(7, ${cellSize}px)`,
    gap: 8,
    padding: 12,
    justifyContent: "center",
  }}
>
  {loading
    ? Array.from({ length: 42 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: cellSize,
            height: cellSize,
            borderRadius: 12,
            background: dark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.04)",
            border: `1px solid ${theme.border}`,
            animation: "pulse 1.2s ease-in-out infinite",
          }}
        />
      ))
    : weeks.flat().map((d) => (
        <DayCell
          key={formatDayKey(d)}
          d={d}
          cellSize={cellSize}   // 👈 wichtig
        />
      ))}
</div>



      
      </div>

      {/* Day detail panel */}
      {detail.open && detail.dayKey && (
        <DayDetailPanel
          dark={dark}
          theme={theme}
          dateKey={detail.dayKey}
          trades={dayTrades}
          totalProfit={dayProfit}
          onClose={() => setDetail({ open: false, dayKey: null })}
          onOpenTrade={onOpenTrade}
        />
      )}

      {/* tiny keyframes for skeleton */}
      <style>{`
        @keyframes pulse {
          0% { opacity:.6}
          50% { opacity:1}
          100% { opacity:.6}
        }
      `}</style>
    </div>
  );
}


function useMediaMax(px = 820) {
  const [narrow, setNarrow] = React.useState(() => window.innerWidth <= px);
  React.useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= px);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [px]);
  return narrow;
}

async function loadUserCurrencySymbol(db, uid){
  try {
    const snap = await getDoc(doc(db,"users",uid));
    const code = snap.exists() ? snap.data()?.currency : null;
    return CURRENCY_SYMBOL[code] || "$";
  } catch { return "$"; }
}
// -------- Day detail panel ----------
function DayDetailPanel({ dark, theme, dateKey, trades, totalProfit, onClose, onOpenTrade }) {
  const d = new Date(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10))
  );
  const title = d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const badgeStyle = (outcome) => {
    let bg =
      outcome === "Win"
        ? theme.chipPos
        : outcome === "Loss"
        ? theme.chipNeg
        : theme.chipNeu;
    return {
      background: bg,
      borderRadius: 999,
      fontWeight: 800,
      fontSize: 12,
      padding: "4px 10px",
      color:
        outcome === "Win"
          ? "#00ff88ff"
          : outcome === "Loss"
          ? "#ff0000ff"
          : theme.sub,
      border: `1px solid ${theme.border}`,
    };
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        zIndex: 2000,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 92vw)",
          height: "100%",
          background: theme.panel,
          color: theme.text,
          borderLeft: `1px solid ${theme.border}`,
          boxShadow: dark
            ? "0 0 40px rgba(0,0,0,.45)"
            : "0 10px 40px rgba(30,36,64,.18)",
          padding: 16,
          overflowY: "auto",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
            <div style={{ color: theme.sub, fontSize: 13, marginTop: 4 }}>
              {trades.length} trades •{" "}
              <strong
                style={{
                  color:
                    totalProfit > 0
                      ? "#00ff88ff"
                      : totalProfit < 0
                      ? "#ff0000ff"
                      : theme.sub,
                }}
              >
                {totalProfit > 0 ? "+" : ""}
                {Math.trunc(totalProfit)}
              </strong>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: theme.sub,
              fontSize: 18,
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* list */}
     {trades.map((t, i) => (
  <div key={t.id || `${t.symbol || 't'}-${i}`}

            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              background: dark ? "#202020" : "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badgeStyle(t.outcome)}>{t.outcome}</span>
              <div style={{ fontWeight: 800 }}>{t.symbol || "—"}</div>
              <div style={{ color: theme.sub }}>
                {t.position} • RR {t.riskReward || "—"}
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontWeight: 800,
                  color:
                    Number(t.risk) > 0
                      ? "#00ff88ff"
                      : Number(t.risk) < 0
                      ? "#ff0000ff"
                      : theme.sub,
                }}
              >
                {Number(t.risk) > 0 ? "+" : ""}
                {t.risk || 0}
              </div>
            </div>

            <div
              style={{ color: theme.sub, fontSize: 13, marginBottom: 10 }}
            >{`${t.entryDate || "—"} • ${t.time || "—"} → ${
              t.exitDate || "—"
            } • ${t.timeZone || "—"}`}</div>

            {t.images?.[0] && (
              <img
                src={t.images[0]}
                alt=""
                loading="lazy"
                style={{
                  width: "100%",
                  maxHeight: 180,
                  objectFit: "cover",
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  marginBottom: 10,
                }}
              />
            )}

            {onOpenTrade && (
              <button
                onClick={() => onOpenTrade(t)}
                style={{
                  border: "none",
                  background: theme.accent,
                  color: "#fff",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontWeight: 800,
                }}
              >
                Open Trade
              </button>
            )}
          </div>
        ))}

        {!trades.length && (
          <div style={{ color: theme.sub, marginTop: 20 }}>
            No trades for this day.
          </div>
        )}
      </aside>
    </div>
  );
}
