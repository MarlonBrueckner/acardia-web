// src/components/SymbolPicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { FiChevronDown, FiSearch, FiBookmark } from "react-icons/fi";
import { FaBookmark } from "react-icons/fa";

/* ---------- optional: TradingView Suche ---------- */
async function fetchTVSymbols(query) {
  if (!query) return [];
  try {
    const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(
      query
    )}&lang=en`;
    const res = await fetch(url);
    const data = await res.json();
    return (data || []).map((d) => ({
      label: `${d.symbol} – ${d.description || d.exchange || ""}`.trim(),
    }));
  } catch {
    return [];
  }
}

/* ---------- Theme ---------- */
function useTheme(dark, themeFromParent) {
  return useMemo(() => {
    if (themeFromParent) return themeFromParent;
    return dark
      ? {
        panel: "#1f1f1f",
        input: "#1f1f1f",
        inputBorder: "#4e4e4e",
        text: "#ffffff",
        sub: "#bfc4cf",
        border: "#4e4e4e",
        accent: "#2c60fa",
        shadow: "0 6px 40px rgba(0,0,0,.45)",
      }
      : {
        panel: "#ffffff",
        input: "#ffffff",
        inputBorder: "#e3e7ef",
        text: "#23232a",
        sub: "#495060",
        border: "#e3e7ef",
        accent: "#2c60fa",
        shadow: "0 10px 40px rgba(30,36,64,.18)",
      };
  }, [dark, themeFromParent]);
}

/* ---------- UI Hilfen ---------- */
function Section({ title, color, children, theme }) {
  return (
    <div style={{ padding: "8px 0" }}>
      <div
        style={{
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 800,
          color: color || theme.sub,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
function Row({ label, isFav, selected = false, onPick, onToggleFav, theme, dark }) {
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onPick();
      }}
      style={{
        padding: "10px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        outline: "none",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = dark ? theme.input : "#f7f7fb")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        style={{
          color: theme.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={label}
      >
        {label}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav?.();
        }}
        title={isFav ? "Remove favorite" : "Add favorite"}
        style={{
          border: "none",
          background: "transparent",
          color: isFav ? theme.accent : theme.sub,
          cursor: "pointer",
        }}
        aria-label={isFav ? "Remove favorite" : "Add favorite"}
      >
        {isFav ? <FaBookmark size={16} /> : <FiBookmark size={18} />}
      </button>
    </div>
  );
}


/* ---------- SymbolPicker ---------- */
/**
 * Props:
 *  - value: string
 *  - onChange: (label: string) => void
 *  - dark?: boolean
 *  - theme?: object
 *  - categories?: Record<string, string[]>
 *  - enableTVSearch?: boolean
 */
export default function SymbolPicker({
  value,
  onChange,
  dark = true,
  theme: themeFromParent,
  categories,
  enableTVSearch = true,
}) {
  const theme = useTheme(dark, themeFromParent);
  const uid = getAuth().currentUser?.uid;
  const db = getFirestore();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [favSymbols, setFavSymbols] = useState([]);
  const [favIds, setFavIds] = useState({});
  const [tvResults, setTvResults] = useState([]);

  // Custom-Symbol-Modus
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const customRef = useRef(null);

  /* Favoriten laden */
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const snap = await getDocs(collection(db, "users", uid, "symbolFavorites"));
      const items = snap.docs.map((d) => ({ id: d.id, label: d.data().label }));
      setFavSymbols(items.map((it) => it.label));
      setFavIds(items.reduce((acc, it) => ({ ...acc, [it.label]: it.id }), {}));

    })();
  }, [db, uid]);

  /* TV-Suche */
  useEffect(() => {
    if (!enableTVSearch) return;
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setTvResults([]);
        return;
      }
      const results = await fetchTVSymbols(q.trim());
      setTvResults(results);
    }, 300);
    return () => clearTimeout(t);
  }, [q, enableTVSearch]);

  const toggleFavorite = async (label) => {
    if (!uid) return;
    if (favIds[label]) {
      await deleteDoc(doc(db, "users", uid, "symbolFavorites", favIds[label]));
      setFavSymbols((prev) => prev.filter((x) => x !== label));
      setFavIds(({ [label]: _, ...rest }) => rest);
    } else {
      const ref = await addDoc(collection(db, "users", uid, "symbolFavorites"), {
        label,
        createdAt: Date.now(),
      });
      setFavSymbols((prev) => [label, ...prev]);
      setFavIds((prev) => ({ ...prev, [label]: ref.id }));
    }
  };

  const match = (label) =>
    !q.trim() || label.toLowerCase().includes(q.trim().toLowerCase());

  const pick = (label) => {
    onChange?.(label);
    setOpen(false);
    setIsCustom(false);
  };

  /* ---------- Trigger-UI ---------- */
  if (isCustom) {
    // Permanentes Textfeld – Dropdown nur über Chevron rechts
    return (
      <div style={{ position: "relative" }}>
        <input
          ref={customRef}
          value={customValue}
          placeholder="Type your custom symbol…"
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange?.(e.target.value);
          }}
          style={{
            width: "100%",
            background: theme.input,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 12,
            padding: "11px 40px 11px 12px",
            color: theme.text,
            fontSize: 15,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setIsCustom(false); // beim Öffnen kehren wir in den Dropdown-Modus zurück
            setQ(customValue || "");
          }}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: theme.sub,
            cursor: "pointer",
            padding: 4,
          }}
          title="Open picker"
        >
          <FiChevronDown size={18} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger */}
      <div
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
        style={{
          background: theme.input,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: 12,
          padding: "11px 40px 11px 12px",
          color: theme.text,
          cursor: "pointer",
          userSelect: "none",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
        }}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Choose symbol"
      >
        <span style={{ opacity: value ? 1 : 0.6 }}>
          {value || "Select a symbol…"}
        </span>
        <FiChevronDown
          size={18}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: theme.sub,
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: theme.panel,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 12,
            boxShadow: theme.shadow,
            zIndex: 50,
            overflow: "hidden",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Suche */}
          <div
            style={{
              padding: 10,
              borderBottom: `1px solid ${theme.inputBorder}`,
              background: theme.input,
            }}
          >
            <div style={{ position: "relative" }}>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search symbols…"
                style={{
                  width: "100%",
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.panel,
                  color: theme.text,
                  borderRadius: 10,
                  outline: "none",
                  padding: "10px 34px 10px 34px",
                  fontSize: 14,
                }}
              />
              <FiSearch
                size={16}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: theme.sub,
                }}
              />
            </div>
          </div>

          {/* Scrollbereich */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {/* Favoriten – Titel & Icon in Blau */}
            {favSymbols.filter(match).length > 0 && (
              <Section title="Favorites" color={theme.accent} theme={theme}>
                {favSymbols.filter(match).map((s) => (
                  <Row
                    key={`fav-${s}`}
                    label={s}
                    isFav={true}
                    onPick={() => pick(s)}
                    onToggleFav={() => toggleFavorite(s)}
                    theme={theme}
                    dark={dark}
                  />
                ))}
              </Section>
            )}

            {/* Kategorien (falls per Prop übergeben) */}
            {categories &&
              Object.entries(categories).map(([cat, list]) => {
                const items = list.filter((s) => match(s) && !favSymbols.includes(s));
                if (items.length === 0) return null;
                return (
                  <Section key={cat} title={cat} theme={theme}>
                    {items.map((s) => (
                      <Row
                        key={`${cat}-${s}`}
                        label={s}
                        isFav={!!favIds[s]}
                        onPick={() => pick(s)}
                        onToggleFav={() => toggleFavorite(s)}
                        theme={theme}
                        dark={dark}
                      />
                    ))}
                  </Section>
                );
              })}

            {/* TradingView */}
            {enableTVSearch && tvResults.length > 0 && (
              <Section title="TradingView" theme={theme}>
                {tvResults
                  .filter((r) => !favSymbols.includes(r.label))
                  .map((r, i) => (
                    <Row
                      key={`tv-${r.label}-${i}`}
                      label={r.label}
                      isFav={!!favIds[r.label]}
                      onPick={() => pick(r.label)}
                      onToggleFav={() => toggleFavorite(r.label)}
                      theme={theme}
                      dark={dark}
                    />
                  ))}
              </Section>
            )}

            {/* ----- OTHER (immer ganz unten) ----- */}
            <div
              onClick={() => {
                setOpen(false);
                setIsCustom(true);
                setCustomValue("");
                // Fokus nach Render
                setTimeout(() => customRef.current?.focus(), 0);
              }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderTop: `1px solid ${theme.inputBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: theme.text,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = dark ? theme.input : "#f7f7fb")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              role="option"
              title="Type custom symbol"
            >
              <span>Other</span>
              <span style={{ fontSize: 12, opacity: 0.6 }}>
                Type custom symbol
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
