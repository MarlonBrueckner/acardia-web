// src/components/TradeGallery.jsx
import React, { useMemo, useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { FiSearch, FiX, FiChevronDown } from "react-icons/fi";

/* ---------------- Theme ---------------- */
function useTheme(dark) {
  return useMemo(
    () =>
      dark
        ? {
            bg: "#181818",
            panel: "#181818",
            text: "#ffffff",
            sub: "#bfc4cf",
            border: "#2b2b2b",
            chip: "#23232a",
            accent: "#2c60fa",
            input: "#1f1f1f",
            inputBorder: "#4e4e4e",
          }
        : {
            bg: "#edf2fa",
            panel: "#ffffff",
            text: "#23232a",
            sub: "#495060",
            border: "#e3e7ef",
            chip: "#f4f7ff",
            accent: "#2c60fa",
            input: "#ffffff",
            inputBorder: "#e3e7ef",
          },
    [dark]
  );
}

/* ---------------- Helpers ---------------- */
const OUTCOME_RGB = {
  win: { r: 28, g: 191, b: 115, hex: "#1CBF73" },
  loss: { r: 238, g: 78, b: 78, hex: "#EE4E4E" },
  be: { r: 140, g: 150, b: 170, hex: "#8C96AA" },
};
const CURRENCY_SYMBOL = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF", JPY: "¥" };

function symbolFallback(sym) {
  return sym && String(sym).trim().length ? sym : "—";
}
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
function monthKey(d) {
  return d
    ? d.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";
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


/* ---------------- Data hooks ---------------- */
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

/** Map Confluence-Farben users/{uid}/confluences -> {textLower: hex} */
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

/* ---------------- Tags ---------------- */
function ConfluenceTags({ tags, palette, theme }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const visible = window.innerWidth >= 1280 ? 5 : 3;
  const head = tags.slice(0, visible);
  const rest = tags.length - head.length;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {head.map((t, i) => {
        const key = String(t?.text || t).toLowerCase();
        const base = palette[key] || "#2C60FA";
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
              borderRadius: 10, // weniger rund
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
            borderRadius: 10,
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

/* ---------------- Empty ---------------- */
function Empty({ theme }) {
  return (
    <div
      style={{
        padding: 28,
        color: theme.sub,
        background: theme.panel,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        textAlign: "center",
      }}
    >
      No trades yet.
    </div>
  );
}

/* ---------------- Card ---------------- */
function GalleryCard({ t, dark, theme, currencySymbol, palette, onOpen }) {
  const outcomeKey = pickOutcomeKey(t.outcome);
  const rgbOutcome = OUTCOME_RGB[outcomeKey];

  const hasImg = Array.isArray(t.images) && t.images[0];
  const src = hasImg ? t.images[0] : null;

  const val = Number(t.risk) || 0;
  const profitSignRgb =
    val > 0 ? OUTCOME_RGB.win : val < 0 ? OUTCOME_RGB.loss : OUTCOME_RGB.be;
  const profitTextColor =
    val > 0 ? OUTCOME_RGB.win.hex : val < 0 ? OUTCOME_RGB.loss.hex : theme.sub;
  const profitBg = tintOverlay(dark, profitSignRgb);
  const profitBorder = tintBorder(dark, profitSignRgb);

  const overlayOutcome = tintOverlay(dark, rgbOutcome);
  const borderOutcome = tintBorder(dark, rgbOutcome);

  const showSymbolInThumb = !hasImg;
  const signed =
    (val > 0 ? "+" : val < 0 ? "-" : "") + currencySymbol + Math.trunc(Math.abs(val));

  // Hover-Handler: Card anheben + Border einfärben
  const onEnter = (e) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.borderColor = borderOutcome; // Rand verstärken in Outcome-Tönung
  };
  const onLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.borderColor = theme.border;
  };

  return (
    <button
      onClick={() => onOpen?.(t)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      title="Open details"
      style={{
        background: theme.panel,
        color: theme.text,
        border: `1px solid ${theme.border}`,   // sichtbare Card-Border
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        transition: "transform .16s ease, border-color .16s ease",
        display: "grid",
        gridTemplateRows: "1fr 1fr",
        height: 280,
      }}
    >
      {/* Media – füllt komplette obere Hälfte */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          width: "100%",
          height: "100%",
          border: hasImg
            ? `1px solid ${outcomeKey === "loss" ? OUTCOME_RGB.loss.hex : "transparent"}` // dünner Bild-Rand, rot bei Loss
            : "none",
        }}
      >
        {hasImg ? (
          <>
            <img
              src={src}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: dark
                  ? `linear-gradient(135deg, rgba(${rgbOutcome.r},${rgbOutcome.g},${rgbOutcome.b},0) 0%, rgba(${rgbOutcome.r},${rgbOutcome.g},${rgbOutcome.b},0.08) 100%)`
                  : `rgba(${rgbOutcome.r},${rgbOutcome.g},${rgbOutcome.b},0.08)`,
              }}
            />
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: overlayOutcome,
              display: "grid",
              placeItems: "center",
              color: dark ? "#fff" : "#23232A",
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: 0.2,
              textTransform: "uppercase",
            }}
          >
            {symbolFallback(t.symbol)}
          </div>
        )}

        {/* Outcome-Chip */}
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 10,
            padding: "4px 8px",
            borderRadius: 12,
            background: overlayOutcome,
            border: `1px solid ${borderOutcome}`,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {t.outcome}
        </div>
      </div>

    {/* Body – untere Hälfte */}
<div
  style={{
    padding: "8px 12px 12px",
    display: "grid",
    gridTemplateRows: "auto auto auto auto", // Platz für Datum + Confluences
    alignContent: "start",
    gap: 6,
    background: theme.bg,
    borderTop: `1px solid ${theme.border}`,
  }}
>
 

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "center",
      gap: 8,
    }}
  >
    <div style={{ color: theme.sub, fontSize: 12, minWidth: 0 }}>
      {t.position} • RR {t.riskReward || "—"}
    </div>

  <div
    style={{
      justifySelf: "end",
      marginTop: showSymbolInThumb ? "5px" : "0px", // Platz nach oben bei Symbol-Placeholder
      padding: "4px 10px",
      borderRadius: 999,
      background: profitBg,
      border: `1px solid ${profitBorder}`,
      color: profitTextColor,
      fontSize: 13,
      fontWeight: 800,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    }}
  >
    {signed}
  </div>
 {!showSymbolInThumb && (
    <div
      style={{
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {symbolFallback(t.symbol)}
    </div>
  )}

  </div>

  {/* Datum */}
  <div style={{ color: theme.sub, fontSize: 12, marginTop: 2 }}>
    {t.entryDate}
    {t.exitDate ? ` → ${t.exitDate}` : ""}
  </div>

  {/* Confluences – jetzt unter dem Datum */}
  {Array.isArray(t.confluenceEntries) && t.confluenceEntries.length > 0 && (
    <div style={{ marginTop: 2 }}>
      <ConfluenceTags tags={t.confluenceEntries} palette={palette} theme={theme} />
    </div>
  )}
</div>



    </button>
  );
}

/* ---------------- Hauptkomponente ---------------- */
export default function TradeGallery({ dark, items, onOpen }) {
  const theme = useTheme(dark);
  const { symbol: currencySymbol } = useUserCurrency();
  const confPalette = useConfluencePalette();
  const isNarrow = useMediaMax(720); // <<< neu
  // Filter
  const [position, setPosition] = useState("All");
  const [outcome, setOutcome] = useState("All");
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

  // Gruppierung nach Monat
  const groups = useMemo(() => {
    const byMonth = {};
    filtered.forEach((t) => {
      const d = parseDDMMYY(t.entryDate) || parseDDMMYY(t.date) || new Date();
      const key = monthKey(d);
      (byMonth[key] ||= []).push(t);
    });
    const orderedKeys = Object.keys(byMonth).sort((a, b) => {
      const ad = new Date(a);
      const bd = new Date(b);
      return bd - ad;
    });
    return orderedKeys.map((k) => ({ key: k, items: byMonth[k] }));
  }, [filtered]);

  if (!items || items.length === 0) return <Empty theme={theme} />;

     return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Filterzeile */}
      <div
        style={{
          display: "flex",
          justifyContent: isNarrow ? "flex-start" : "flex-end", // <<< links auf schmal
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        {/* Suche */}
        <div style={{ position: "relative", flex: isNarrow ? "1 1 100%" : "0 0 auto" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol…"
            style={{
              width: isNarrow ? "100%" : 240,                    // <<< volle Breite auf schmal
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

      {/* Gruppen nach Monat */}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(208px, 1fr))",
              gap: 12,
            }}
          >
            {items.map((t) => (
              <GalleryCard
                key={t.id}
                t={t}
                dark={dark}
                theme={theme}
                currencySymbol={currencySymbol}
                palette={confPalette}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
