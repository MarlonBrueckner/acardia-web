import React, { useEffect, useMemo, useState } from "react";

/* ---------------- Theme (an euren Stil angelehnt) ---------------- */
const theme = (dark = true) => ({
  dark,
  bg: dark ? "#121316" : "#f5f7fb",
  card: dark ? "#18191c" : "#ffffff",
  text: dark ? "#ffffff" : "#121316",
  sub: dark ? "#BFC4CF" : "#495060",
  border: dark ? "#2a2d34" : "#e3e7ef",
  grid: dark ? "#242730" : "#edf2fa",
  good: "#1cbf73",
  bad: "#ee4e4e",
  accent: "#2c60fa",
  chipLow: "#4bc0c0",
  chipMed: "#ffb400",
  chipHigh: "#ff5e57",
  chipHol: "#8c96aa",
});

/* ---------------- kleine Helfer ---------------- */
const tzChoices = [
  "Europe/Berlin",
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const currencyFlag = (c) =>
  ({
    USD: "🇺🇸",
    EUR: "🇪🇺",
    GBP: "🇬🇧",
    JPY: "🇯🇵",
    CHF: "🇨🇭",
    AUD: "🇦🇺",
    NZD: "🇳🇿",
    CAD: "🇨🇦",
    CNY: "🇨🇳",
  }[String(c || "").toUpperCase()] || "🏳️");

const pad2 = (n) => String(n).padStart(2, "0");
const fmtDate = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfWeek = (d) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mo=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/* ICS & CSV Export */
function download(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function toCSV(rows) {
  const head = [
    "date",
    "time",
    "currency",
    "title",
    "impact",
    "actual",
    "forecast",
    "previous",
  ];
  const body = rows.map((r) =>
    [
      r.date,
      r.time,
      r.country,
      `"${(r.title || "").replace(/"/g, '""')}"`,
      r.impact,
      r.actual ?? "",
      r.forecast ?? "",
      r.previous ?? "",
    ].join(",")
  );
  return [head.join(","), ...body].join("\n");
}

function toICS(rows) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Acardia//Economic Calendar//EN",
  ];
  rows.forEach((r) => {
    const dt = new Date(`${r.date}T${(r.time || "00:00")}:00Z`); // Basic UTC
    const stamp = `${dt
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z")}`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:ec-${r.id || `${r.date}-${r.time}-${r.title}`}`);
    lines.push(`DTSTART:${stamp}`);
    lines.push(`DTEND:${stamp}`);
    lines.push(
      `SUMMARY:${r.country || ""} ${r.title || ""} (${r.impact?.toUpperCase()})`
    );
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\n");
}

/* Impact-Map für Chips/Filter */
const impactOrder = ["low", "medium", "high", "holiday"];
const impactColor = (T, imp) =>
  imp === "low"
    ? T.chipLow
    : imp === "medium"
    ? T.chipMed
    : imp === "high"
    ? T.chipHigh
    : T.chipHol;

/* ---------------- Hauptkomponente ---------------- */
export default function EconomicCalendar({ dark = true }) {
  const T = theme();

  // Woche & Tag
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [activeDay, setActiveDay] = useState(0); // 0..6 innerhalb dieser Woche

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );
  const rangeLabel = `${fmtDate(weekDays[0])} – ${fmtDate(weekDays[6])}`;

  // Filter/Optionen
  const [selectedImpacts, setSelectedImpacts] = useState(
    new Set(["low", "medium", "high", "holiday"])
  );
  const [hidePast, setHidePast] = useState(false);
  const [restrictedOnly, setRestrictedOnly] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [tz, setTz] = useState("Europe/Berlin");

  // Daten
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState([]); // rohe Events (API)

  // echte API → FCS (Mock fallback, falls kein Key)
  useEffect(() => {
    const from = fmtDate(weekDays[0]);
    const to = fmtDate(weekDays[6]);
    const key = process.env.REACT_APP_FCS_KEY;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        if (!key) {
          // --- Mock (funktioniert ohne Key, damit UI nutzbar ist)
          await new Promise((r) => setTimeout(r, 400));
          setRows(mockFcs(from));
        } else {
          const url = `https://fcsapi.com/api-v3/forex/economic_calendar?from=${from}&to=${to}&access_key=${key}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const list = Array.isArray(json?.response) ? json.response : [];
          setRows(list);
        }
      } catch (e) {
        console.error(e);
        setErr("Kalenderdaten konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [weekDays]);

  // Normalisieren → unified Objektform
  const items = useMemo(() => {
    const norm = (r) => {
      // FCS Felder: country (currency), title, impact, date, time, actual, previous, forecast, id
      const imp = String(r?.impact || "")
        .toLowerCase()
        .replace(/importance|level|impact:?\s*/g, "");
      const impact =
        imp.includes("high") || imp === "3"
          ? "high"
          : imp.includes("medium") || imp === "2"
          ? "medium"
          : imp.includes("low") || imp === "1"
          ? "low"
          : r?.title?.toLowerCase()?.includes("holiday")
          ? "holiday"
          : "low";

      const date = r?.date || r?.date_event || "";
      const time = (r?.time || r?.time_event || "").slice(0, 5);
      return {
        id: r?.id || `${date}-${time}-${r?.title}`,
        date,
        time: time || "00:00",
        country: r?.country || r?.currency || r?.cur || "—",
        title: r?.title || r?.event || "—",
        actual: r?.actual ?? r?.actual_value ?? null,
        forecast: r?.forecast ?? r?.forecast_value ?? null,
        previous: r?.previous ?? r?.previous_value ?? null,
        impact,
        source: r?.url || r?.link || "",
      };
    };
    return rows.map(norm);
  }, [rows]);

  // Filter + Sort
  const filtered = useMemo(() => {
    const now = new Date();
    const keepCurrency = (c) =>
      currencyFilter === "All" ||
      String(c || "").toUpperCase() === currencyFilter.toUpperCase();

    const isRestricted = (t) =>
      /\b(rate|decision|cpi|gdp|employment|nfp|ecb|fed|pmi|inflation)\b/i.test(
        t || ""
      );

    const keep = items.filter((e) => {
      if (!selectedImpacts.has(e.impact)) return false;
      if (!keepCurrency(e.country)) return false;
      if (restrictedOnly && !isRestricted(e.title)) return false;

      if (hidePast) {
        const dt = new Date(`${e.date}T${(e.time || "00:00")}:00Z`);
        if (dt < now) return false;
      }
      return true;
    });

    // Sort: Datum/Zeit aufsteigend
    keep.sort((a, b) => {
      const da = new Date(`${a.date}T${a.time}:00Z`).getTime();
      const db = new Date(`${b.date}T${b.time}:00Z`).getTime();
      return da - db;
    });
    return keep;
  }, [items, selectedImpacts, currencyFilter, hidePast, restrictedOnly]);

  // Gruppieren je Tag der aktiven Woche
  const byDay = useMemo(() => {
    const map = new Map();
    weekDays.forEach((d) => map.set(fmtDate(d), []));
    filtered.forEach((e) => {
      if (map.has(e.date)) map.get(e.date).push(e);
    });
    return map;
  }, [filtered, weekDays]);

  // „sichtbarer Tag“ + Label
  const activeDate = fmtDate(weekDays[activeDay] || weekDays[0]);

  // Export
  const exportRows = Array.from(byDay.values()).flat();

  /* ---------------- UI ---------------- */
  return (
    <div
      style={{
        background: T.bg,
        color: T.text,
        padding: 16,
        minHeight: "100vh",
      }}
    >
      {/* Header-Bar */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <strong style={{ fontSize: 18 }}>Economic Calendar</strong>
            <span
              style={{
                padding: "6px 10px",
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                color: T.sub,
                fontWeight: 600,
              }}
              title="Woche"
            >
              {rangeLabel}
            </span>
            <button
              onClick={() => {
                setWeekAnchor(addDays(weekAnchor, -7));
                setActiveDay(0);
              }}
              style={btnGhost(T)}
            >
              ◀︎ Prev
            </button>
            <button
              onClick={() => {
                setWeekAnchor(startOfWeek(new Date()));
                setActiveDay(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
              }}
              style={btnGhost(T)}
              title="Heute / aktuelle Woche"
            >
              Today
            </button>
            <button
              onClick={() => {
                setWeekAnchor(addDays(weekAnchor, 7));
                setActiveDay(0);
              }}
              style={btnGhost(T)}
            >
              Next ▶︎
            </button>
          </div>

          {/* Zeitzone */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 12,
                color: T.sub,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Timezone
            </span>
            <select
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              style={selectStyle(T)}
            >
              {tzChoices.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          {/* Export */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={btnSolid(T)}
              onClick={() =>
                download(
                  `calendar_${rangeLabel.replace(/\s+/g, "")}.csv`,
                  toCSV(exportRows)
                )
              }
            >
              Export CSV
            </button>
            <button
              style={btnOutline(T)}
              onClick={() =>
                download(
                  `calendar_${rangeLabel.replace(/\s+/g, "")}.ics`,
                  toICS(exportRows)
                )
              }
            >
              Export ICS
            </button>
          </div>
        </div>

        {/* Filter-Zeile */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr",
            gap: 10,
            marginTop: 12,
          }}
        >
          {/* Impact */}
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 8,
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={labelMini(T)}>Impact</span>
            {impactOrder.map((imp) => {
              const active = selectedImpacts.has(imp);
              return (
                <button
                  key={imp}
                  onClick={() => {
                    const next = new Set(selectedImpacts);
                    active ? next.delete(imp) : next.add(imp);
                    setSelectedImpacts(next);
                  }}
                  style={{
                    ...chipStyle(T, impactColor(T, imp)),
                    opacity: active ? 1 : 0.4,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 6,
                      background: impactColor(T, imp),
                      display: "inline-block",
                      marginRight: 8,
                    }}
                  />
                  {imp === "holiday" ? "Holidays" : imp[0].toUpperCase() + imp.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Visibility */}
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 8,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={labelMini(T)}>Visibility</span>
            <label style={checkLabel(T)}>
              <input
                type="checkbox"
                checked={hidePast}
                onChange={(e) => setHidePast(e.target.checked)}
              />
              Hide past news
            </label>
            <label style={checkLabel(T)}>
              <input
                type="checkbox"
                checked={restrictedOnly}
                onChange={(e) => setRestrictedOnly(e.target.checked)}
              />
              Only restricted events
            </label>
          </div>

          {/* Instrument / Currency */}
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 8,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span style={labelMini(T)}>Instrument</span>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              style={selectStyle(T)}
            >
              {["All", "USD", "EUR", "GBP", "JPY", "CHF", "AUD", "NZD", "CAD", "CNY"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Tages-Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 10,
            overflowX: "auto",
            scrollbarWidth: "thin",
          }}
        >
          {weekDays.map((d, i) => {
            const isActive = i === activeDay;
            const label = d.toLocaleDateString(undefined, {
              weekday: "short",
              day: "2-digit",
            });
            return (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1px solid ${isActive ? T.accent : T.border}`,
                  background: isActive ? T.accent : "transparent",
                  color: isActive ? "#fff" : T.text,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inhalt – Tagesabschnitte (ein Tag sichtbar) */}
      <DaySection
        T={T}
        tz={tz}
        dateKey={activeDate}
        rows={byDay.get(activeDate) || []}
        loading={loading}
        err={err}
      />
    </div>
  );
}

/* ---------------- Unterkomponenten ---------------- */

function DaySection({ T, tz, dateKey, rows, loading, err }) {
  const niceDate = new Date(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  return (
    <section
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <strong style={{ fontSize: 16 }}>{niceDate}</strong>
        <span style={{ color: T.sub, fontWeight: 700 }}>({rows.length} events)</span>
      </div>

      {loading ? (
        <SkeletonTable T={T} />
      ) : err ? (
        <div style={{ padding: 16, color: T.bad, fontWeight: 600 }}>{err}</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 16, color: T.sub, fontWeight: 600 }}>
          Keine Ereignisse gefunden.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              minWidth: 760,
            }}
          >
            <thead>
              <tr
                style={{
                  position: "sticky",
                  top: 0,
                  background: T.card,
                  zIndex: 1,
                }}
              >
                {[
                  "Description",
                  "Instrument",
                  "Date",
                  "Actual",
                  "Forecast",
                  "Previous",
                  "Actions",
                ].map((h, i) => (
                  <th key={i} style={thStyle(T, i === 0)}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {/* Description */}
                  <td style={tdStyle(T, true)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        title={r.impact}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 8,
                          background: impactColor(T, r.impact),
                        }}
                      />
                      <div style={{ display: "grid" }}>
                        <span style={{ fontWeight: 700 }}>{r.title}</span>
                        <span style={{ fontSize: 12, color: T.sub }}>
                          {r.impact === "holiday" ? "Holiday" : r.impact}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Instrument */}
                  <td style={tdStyle(T)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{currencyFlag(r.country)}</span>
                      <span style={{ fontWeight: 700 }}>{r.country}</span>
                    </div>
                  </td>

                  {/* Date (nach Zeitzone formatiert) */}
                  <td style={tdStyle(T)}>
                    {formatTimeLocal(r.date, r.time, tz)}
                    <div style={{ fontSize: 12, color: T.sub }}>{tz}</div>
                  </td>

                  {/* Zahlen */}
                  <td style={tdStyle(T)}>{toColoredNum(T, r.actual)}</td>
                  <td style={tdStyle(T)}>{toColoredNum(T, r.forecast)}</td>
                  <td style={tdStyle(T)}>{toColoredNum(T, r.previous)}</td>

                  {/* Actions */}
                  <td style={tdStyle(T)}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a
                        href={r.source || "#"}
                        target="_blank"
                        rel="noreferrer"
                        title="Quelle öffnen"
                        style={actBtn(T)}
                      >
                        🔗
                      </a>
                      <button
                        title="Als ICS download (Einzel)"
                        style={actBtn(T)}
                        onClick={() =>
                          download(
                            `event_${r.date}_${r.time}.ics`,
                            toICS([r])
                          )
                        }
                      >
                        ⏰
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- Styles ---------------- */

const btnGhost = (T) => ({
  padding: "8px 10px",
  borderRadius: 10,
  border: `1px solid ${T.border}`,
  background: "transparent",
  color: T.text,
  fontWeight: 700,
});
const btnSolid = (T) => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: T.accent,
  color: "#fff",
  fontWeight: 800,
});
const btnOutline = (T) => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid ${T.accent}`,
  background: "transparent",
  color: T.accent,
  fontWeight: 800,
});
const selectStyle = (T) => ({
  border: `1px solid ${T.border}`,
  background: "transparent",
  color: T.text,
  padding: "6px 8px",
  borderRadius: 8,
  fontWeight: 600,
});
const chipStyle = (T, color) => ({
  padding: "6px 10px",
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  background: "transparent",
  color: T.text,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
});
const labelMini = (T) => ({
  color: T.sub,
  fontWeight: 800,
  textTransform: "uppercase",
  fontSize: 11,
});
const checkLabel = (T) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: T.text,
  fontWeight: 600,
});

const thStyle = (T, first = false) => ({
  position: "sticky",
  top: 0,
  textAlign: first ? "left" : "right",
  padding: "12px 12px",
  borderBottom: `1px solid ${T.border}`,
  color: T.sub,
  fontWeight: 800,
  background: T.card,
});
const tdStyle = (T, first = false) => ({
  padding: "12px 12px",
  borderBottom: `1px solid ${T.border}`,
  textAlign: first ? "left" : "right",
});
const actBtn = (T) => ({
  padding: "6px 8px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: "transparent",
  color: T.text,
});

/* ---------------- Utilities ---------------- */

function formatTimeLocal(dateStr, timeStr, timeZone) {
  // Eventzeit ist als UTC interpretiert → lokalisieren
  const dt = new Date(`${dateStr}T${(timeStr || "00:00")}:00Z`);
  try {
    return dt.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      hour12: false,
    });
  } catch {
    // Fallback ohne TZ
    return `${timeStr || "00:00"}`;
  }
}

function toColoredNum(T, v) {
  if (v == null || v === "") return <span style={{ color: T.sub }}>—</span>;
  const num = Number(String(v).replace(/[^\d.-]/g, ""));
  const col = isNaN(num) ? T.text : num < 0 ? T.bad : T.good;
  return <span style={{ color: col, fontWeight: 700 }}>{String(v)}</span>;
}

/* ---------------- Lade-Skeleton ---------------- */
function SkeletonTable({ T }) {
  return (
    <div style={{ padding: 14 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 18,
            marginBottom: 12,
            background:
              T.dark ? "linear-gradient(90deg,#1e2026,#252832,#1e2026)" : "#eef1f8",
            borderRadius: 6,
            opacity: 0.7,
            animation: "pulse 1.4s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%{opacity:.45}
          50%{opacity:1}
          100%{opacity:.45}
        }
      `}</style>
    </div>
  );
}

/* ---------------- Mock-Daten (falls kein API-Key) ---------------- */
function mockFcs(from) {
  // erzeugt 2 Tage Demo-Daten rund um "from"
  const d0 = new Date(from);
  const d1 = addDays(d0, 0);
  const d2 = addDays(d0, 1);

  const mk = (date, time, country, title, impact, actual, forecast, previous) => ({
    id: `${date}-${time}-${country}-${title}`,
    date,
    time,
    country,
    title,
    impact,
    actual,
    forecast,
    previous,
    url: "https://www.forexfactory.com/calendar", // Demo-Link
  });

  return [
    mk(fmtDate(d1), "00:30", "NZD", "BusinessNZ Services Index", "low", "48.9", "-", "47.3"),
    mk(fmtDate(d1), "01:01", "GBP", "Rightmove HPI m/m", "low", "-1.3%", "-", "-1.2%"),
    mk(fmtDate(d1), "06:30", "JPY", "Tertiary Industry Activity m/m", "medium", "0.5%", "0.1%", "0.6%"),
    mk(fmtDate(d1), "11:00", "EUR", "Trade Balance", "high", "2.8B", "18.1B", "16.2B"),
    mk(fmtDate(d1), "14:15", "CAD", "Housing Starts", "medium", "294K", "270K", "284K"),
    mk(fmtDate(d1), "14:30", "CAD", "Foreign Securities Purchases", "low", "0.71B", "-4.75B", "-2.79B"),
    mk(fmtDate(d1), "16:00", "USD", "NAHB Housing Market Index", "high", "32", "34", "33"),
    mk(fmtDate(d2), "00:45", "NZD", "PPI Input q/q", "low", "0.6%", "1.4%", "2.9%"),
    mk(fmtDate(d2), "01:48", "AUD", "Westpac Consumer Sentiment", "medium", "5.7%", "-", "0.6%"),
    mk(fmtDate(d2), "02:00", "CNY", "FDI y/y", "holiday", "-", "-", "-"),
    mk(fmtDate(d2), "14:30", "USD", "Core Retail Sales m/m", "high", "0.4%", "0.5%", "0.3%"),
  ];
}
