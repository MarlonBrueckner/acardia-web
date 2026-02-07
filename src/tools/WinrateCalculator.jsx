import React, { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";


/* --------------- Theme (wie eure Tools) --------------- */
const theme = (dark = true) => ({
  dark,
  bg: dark ? "#1f1f1f" : "#f5f7fb",
  card: dark ? "#181818" : "#ffffff",
  text: dark ? "#ffffff" : "#121316",
  sub: dark ? "#BFC4CF" : "#495060",
  border: dark ? "#2a2a2f" : "#e3e7ef",
  grid: dark ? "#242730" : "#edf2fa",
  good: "#1cbf73",
  bad: "#ee4e4e",
  accent: "#2c60fa",
});

/* --------------- Utils --------------- */
const arr = (x) => (Array.isArray(x) ? x : []);
const str = (x) => (x == null ? "" : String(x));

/** dd.MM.yyyy oder dd.MM.yy → JS Date (UTC Mitternacht) */
function parseDottedDate(d) {
  const s = str(d).trim();
  // dd.MM.yyyy
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    const [, dd, MM, yyyy] = m;
    return new Date(`${yyyy}-${MM}-${dd}T00:00:00Z`);
  }
  // dd.MM.yy → mit 20xx (YY 00–69 → 20xx, 70–99 → 19xx)
  m = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) {
    const [, dd, MM, yy] = m;
    const Y = Number(yy);
    const yyyy = Y <= 69 ? 2000 + Y : 1900 + Y;
    return new Date(`${yyyy}-${MM}-${dd}T00:00:00Z`);
  }
  // Fallback: ISO/Date-kompatibel
  const maybe = s.includes("T") ? s : `${s}T00:00:00`;
  const dt = new Date(maybe);
  return isNaN(dt.getTime()) ? null : dt;
}

function weekdayAbbr(d) {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return days[d.getUTCDay()];
}

function dayOfWeekFromDateStr(dateStr) {
  const dt = parseDottedDate(dateStr);
  return dt ? weekdayAbbr(dt) : null;
}

function winratePercent(trades) {
  if (!trades?.length) return null;
  const wins = trades.filter((t) => str(t.outcome).trim().toLowerCase() === "win").length;
  return (wins / trades.length) * 100;
}

/** Extrahiert Confluences in robusten Formaten aus einem Trade */
function getConfluences(t) {
  // Kandidaten:
  // 1) t.emotions?.confluenceEntries: string[] | {text:string}[] | {id:{text:string,...},...} (Map)
  // 2) t.confluenceEntries: gleiche Varianten
  const cand = t?.emotions?.confluenceEntries ?? t?.confluenceEntries ?? [];

  // Map -> Werte
  if (!Array.isArray(cand) && typeof cand === "object" && cand !== null) {
    return Object.values(cand)
      .map((v) => (typeof v === "string" ? v : (v?.text ?? "")))
      .filter(Boolean)
      .map(String);
  }
  // Array aus Strings
  if (Array.isArray(cand) && cand.every((x) => typeof x === "string")) {
    return cand.slice();
  }
  // Array aus Objekten
  if (Array.isArray(cand) && cand.some((x) => typeof x === "object")) {
    return cand
      .map((x) => (typeof x === "string" ? x : (x?.text ?? "")))
      .filter(Boolean)
      .map(String);
  }
  return [];
}

/** Normalisiert Symbol, falls im Format "🟡 GC – Gold" o.ä. */
function normalizeSymbol(sym) {
  const s = str(sym).trim();
  // Split an " – " (Gedankenstrich) oder "-"
  const parts = s.split("–");
  if (parts.length >= 2) return parts[0].replace(/[^\w/]+/g, "").trim(); // "GC"
  return s;
}

const weights = {
  confluence: 0.20,
  symbol: 0.15,
  day: 0.15,
  position: 0.05,
};

export default function WinrateCalculator() {
  // Zentrale, robuste Dark-Erkennung (ohne Prop):
  const getGlobalDark = () => {
    const docEl = document.documentElement;
    const body = document.body;

    // a) neues Schema: <html data-theme="dark" | "light">
    const attr = docEl.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;

    // b) App-Storage: localStorage("darkMode") -> "true"/"false"
    try {
      const saved = localStorage.getItem("darkMode");
      if (saved === "true") return true;
      if (saved === "false") return false;
    } catch {}

    // c) legacy: body.classList.contains("dark")
    if (body && body.classList && body.classList.contains("dark")) return true;

    // d) Fallback: System-Theme
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return true;

    return false;
  };

  const [isDark, setIsDark] = useState(getGlobalDark);

// direkt in WinrateCalculator()
const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 820);
useEffect(() => {
  const onResize = () => setIsNarrow(window.innerWidth <= 820);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    const docEl = document.documentElement;
    const body = document.body;

    // Beobachte <html data-theme="...">
    const obsHtml = new MutationObserver(() => setIsDark(getGlobalDark()));
    obsHtml.observe(docEl, { attributes: true, attributeFilter: ["data-theme"] });

    // Beobachte body.class (legacy)
    const obsBody = new MutationObserver(() => setIsDark(getGlobalDark()));
    obsBody.observe(body, { attributes: true, attributeFilter: ["class"] });

    // Reagiere auf Systemwechsel
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    const onMQ = () => setIsDark(getGlobalDark());
    if (mq && mq.addEventListener) mq.addEventListener("change", onMQ);

    // Reagiere auf Änderungen von localStorage (darkMode)
    const onStorage = (e) => {
      if (e.key === "darkMode") setIsDark(getGlobalDark());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      obsHtml.disconnect();
      obsBody.disconnect();
      if (mq && mq.removeEventListener) mq.removeEventListener("change", onMQ);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const T = theme(isDark);

  const auth = getAuth();
  const db = getFirestore();
  const uid = auth.currentUser?.uid || null;

  // Firestore
  const [trades, setTrades] = useState([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [fireErr, setFireErr] = useState("");

  // Confluence-Palette: text -> color HEX
  const [palette, setPalette] = useState({});
  const [loadingPalette, setLoadingPalette] = useState(false);


  // ---------- DRAFT (UI) ----------
  const [draftPair, setDraftPair] = useState("");
// 2) Abgerundetes Select (sichtbar in Dark/Light)
const selectStyleWide = (T) => ({
  border: `1px solid ${T.border}`,
  background: T.dark ? "#1f1f1f" : "#ffffff",
  color: T.text,
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 700,
  width: "100%",
  minHeight: 44,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  outline: "none",
  caretColor: T.text,
  overflow: "hidden",        // sorgt dafür, dass die Ecken wirken
});

// 1) Nur Symbole aus Trades (normalisiert 
const allPairs = useMemo(() => {
  const set = new Set();
  arr(trades).forEach((t) => {
    const s = str(t.symbol).trim();
    if (s) set.add(s);   // vollständiger Text, nicht normalizeSymbol
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}, [trades]);


  const [draftPosition, setDraftPosition] = useState("Buy");
  const [draftDay, setDraftDay] = useState("Mon");
  const [draftConfs, setDraftConfs] = useState([]);

  // ---------- APPLIED (Berechnung) ----------
  const [appliedPair, setAppliedPair] = useState("");
  const [appliedPosition, setAppliedPosition] = useState("Buy");
  const [appliedDay, setAppliedDay] = useState("Mon");
  const [appliedConfs, setAppliedConfs] = useState([]);

  // UX
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalcTs, setLastCalcTs] = useState(null);

  /* ---- Daten laden ---- */
  useEffect(() => {
    if (!uid) return;
    setLoadingTrades(true);
    setFireErr("");
    const q = query(collection(db, "users", uid, "trades"), orderBy("date", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTrades(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingTrades(false);
      },
      (err) => {
        console.error(err);
        setFireErr("Konnte Trades nicht laden.");
        setLoadingTrades(false);
      }
    );
    return unsub;
  }, [db, uid]);

  useEffect(() => {
    if (!uid) return;
    setLoadingPalette(true);
    const unsub = onSnapshot(
      collection(db, "users", uid, "confluences"),
      (snap) => {
        const map = {};
        snap.forEach((d) => {
          const { text, color } = d.data() || {};
          if (!text) return;
          const hex = /^#/.test(String(color || "")) ? String(color) : ("#" + String(color || "").replace(/[^0-9a-fA-F]/g, ""));
          map[String(text)] = hex.length >= 4 ? hex : "#2c60fa";
        });
        setPalette(map);
        setLoadingPalette(false);
      },
      (err) => {
        console.error(err);
        setLoadingPalette(false);
      }
    );
    return unsub;
  }, [db, uid]);



  const allConfs = useMemo(() => {
    const s = new Set();
    arr(trades).forEach((t) => getConfluences(t).forEach((c) => s.add(c)));
    s.delete("");
    return Array.from(s).sort();
  }, [trades]);

  useEffect(() => {
    if (!draftPair && allPairs.length) setDraftPair(allPairs[0]);
  }, [allPairs, draftPair]);

  /* ---- Teilraten (nur APPLIED) ---- */
  const parts = useMemo(() => {
    if (!trades.length) {
      return { confluenceRate: null, symbolRate: null, dayRate: null, positionRate: null, pairUsed: appliedPair || allPairs[0] || "" };
    }
    const confFiltered = trades.filter((t) => {
      if (!appliedConfs.length) return true;
      const have = new Set(getConfluences(t).map(str));
      return appliedConfs.every((c) => have.has(c));
    });
    const confluenceRate = winratePercent(confFiltered);

    const pairUsed = normalizeSymbol(appliedPair || allPairs[0] || "");
    const symFiltered = trades.filter((t) => normalizeSymbol(t.symbol) === pairUsed);
    const symbolRate = winratePercent(symFiltered);

    const dayFiltered = trades.filter((t) => {
      const d = dayOfWeekFromDateStr(t.date);
      if (!appliedDay) return true;
      return d === appliedDay;
    });
    const dayRate = winratePercent(dayFiltered);

    const posFiltered = trades.filter(
      (t) => str(t.position).trim().toLowerCase() === str(appliedPosition).trim().toLowerCase()
    );
    const positionRate = winratePercent(posFiltered);

    return { confluenceRate, symbolRate, dayRate, positionRate, pairUsed };
  }, [trades, appliedConfs, appliedPair, appliedDay, appliedPosition, allPairs]);

  const result = useMemo(() => {
    let totalW = 0,
      weighted = 0;
    if (parts.confluenceRate != null) {
      weighted += parts.confluenceRate * weights.confluence;
      totalW += weights.confluence;
    }
    if (parts.symbolRate != null) {
      weighted += parts.symbolRate * weights.symbol;
      totalW += weights.symbol;
    }
    if (parts.dayRate != null) {
      weighted += parts.dayRate * weights.day;
      totalW += weights.day;
    }
    if (parts.positionRate != null) {
      weighted += parts.positionRate * weights.position;
      totalW += weights.position;
    }
    return totalW > 0 ? weighted / totalW : null;
  }, [parts]);

  /* ---- Calculate ---- */
  function handleCalculate() {
    if (isCalculating) return;
    setIsCalculating(true);
    setTimeout(() => {
      setAppliedPair(draftPair);
      setAppliedPosition(draftPosition);
      setAppliedDay(draftDay);
      setAppliedConfs(draftConfs.slice());
      setIsCalculating(false);
      setLastCalcTs(Date.now());
    }, 900);
  }

  /* ---- Hilfen ---- */
  const fmtPct = (x) => (x == null || isNaN(x) ? "—" : `${x.toFixed(2)}%`);
  const mood = (r) => (r == null ? "neutral" : r >= 60 ? "pos" : r >= 40 ? "neu" : "neg");

  /* ---- UI ---- */
  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text }}>
      <div style={{ maxWidth: "none", margin: "0 auto", padding: "8px 3px 36px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <h1 style={{ margin: "-5px 0 2px", fontSize: 34, fontWeight: 700, color: T.text }}>Winrate Calculator</h1>
          <span
            style={{
              padding: "6px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              color: T.sub,
              fontWeight: 700,
              fontSize: 12,
                transform: "translateY(-4px)" 
            }}
          >
            {loadingTrades ? "Loading trades…" : fireErr ? "No data" : `${trades.length} trades`}
          </span>
        </div>

        {/* ---------- Filter (DRAFT) ---------- */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            {/* Symbol – abgerundet + im Dark Mode nicht weiß */}
            <LabeledBox label="Symbol" T={T}>
<select
  value={draftPair}
  onChange={(e) => setDraftPair(e.target.value)}
  style={selectStyleWide(T)}
>
  {allPairs.length ? (
    allPairs.map((p) => (
      <option
        key={p}
        value={p}
        style={{
          background: T.dark ? "#1f1f1f" : "#ffffff",
          color: T.text,
          borderRadius: 12,          // auch die Option-Ecken abrunden
        }}
      >
        {p}
      </option>
    ))
  ) : (
    <option
      value=""
      style={{
        background: T.dark ? "#1f1f1f" : "#ffffff",
        color: T.text,
      }}
    >
      —
    </option>
  )}
</select>



            </LabeledBox>

            {/* Day of Week – direkt unter Symbol */}
            <LabeledBox label="Day of Week" T={T}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <button key={d} onClick={() => setDraftDay(d)} style={pillBtnBig(T, draftDay === d)}>{d}</button>
                ))}
              </div>
            </LabeledBox>

            {/* Position */}
            <LabeledBox label="Position" T={T}>
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button onClick={() => setDraftPosition("Buy")}  style={segBtnWide(T, draftPosition === "Buy")}>Buy</button>
                <button onClick={() => setDraftPosition("Sell")} style={segBtnWide(T, draftPosition === "Sell")}>Sell</button>
              </div>
            </LabeledBox>

            {/* Confluences – NUR Überschrift, kein Dropdown */}
            <div>
              <div style={{ color: T.sub, fontWeight: 800, fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>
                Confluences
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 10,
                }}
              >
                {allConfs.length === 0 ? (
                  <div style={{ color: T.sub, fontWeight: 600 }}>no confluences found.</div>
                ) : (
                  allConfs.map((c) => {
                    const active = draftConfs.includes(c);
                    const color = palette[c] || T.accent;
                    return (
                      <button
                        key={c}
                        onClick={() => setDraftConfs((prev) => (active ? prev.filter((x) => x !== c) : [...prev, c]))}
                        style={chipColored(T, active, color)}
                        title={c}
                      >
                        {active ? "✓" : "✕"}
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Ergebnis (APPLIED) ---------- */}
        <div
          style={{
            position: "relative",
            background: T.card,
            border: `1px solid ${T.accent}`,
            boxShadow: "0 0 0 2px rgba(44,96,250,.10), 0 0 30px rgba(44,96,250,.18), inset 0 0 10px rgba(44,96,250,.08)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          {isCalculating && <BorderGlow />}

          {/* Zwei Spalten: links Wert + BUTTON (statt „Weighted by …“), rechts die 4 Felder */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
            {/* Linke Spalte */}
            <div>
              <div style={{ color: T.sub, fontWeight: 800, textTransform: "uppercase", fontSize: 12 }}>Result</div>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  minHeight: 52,
                  color:
                    result == null
                      ? T.text
                      : mood(result) === "pos"
                      ? T.good
                      : mood(result) === "neg"
                      ? T.bad
                      : T.text,
                  transition: "transform .25s",
                  transform: isCalculating ? "scale(0.98)" : "scale(1)",
                }}
              >
                {isCalculating ? <Dots T={T} /> : result == null || isNaN(result) ? "—" : `${result.toFixed(2)}%`}
              </div>

              {/* <-- HIER der Calculate-Button auf der Höhe der rechten Felder */}
              <div style={{ marginTop: 10 }}>
                <button onClick={handleCalculate} style={primaryBtnBlock(T)} disabled={isCalculating}>
                  {isCalculating ? "Calculating…" : "Calculate Winrate"}
                </button>
                {isCalculating && <ProgressLine />}
                {lastCalcTs && (
                  <div style={{ color: T.sub, fontWeight: 700, fontSize: 12, marginTop: 6 }}>
                    Last calc: {new Date(lastCalcTs).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            {/* Rechte Spalte – Mini Felder */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              <MiniStat T={T} label="Confluence" value={fmtPct(parts.confluenceRate)} />
              <MiniStat T={T} label="Symbol"     value={fmtPct(parts.symbolRate)} />
              <MiniStat T={T} label="Day"        value={fmtPct(parts.dayRate)} />
              <MiniStat T={T} label="Position"   value={fmtPct(parts.positionRate)} />
            </div>
          </div>

          {/* Insight */}
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              background: T.dark ? "#1f1f1f" : "#f4f7ff",
              border: `1px solid ${T.dark ? "#2a2d34" : "#dfe7ff"}`,
              color: T.text,
              fontWeight: 600,
            }}
          >
            {buildInsight(result, appliedDay, appliedConfs, appliedPosition, parts.pairUsed)}
          </div>
        </div>

{/* ---------- Breakdown ---------- */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "repeat(12,1fr)",
    gap: 14,
  }}
>
  <Card title="Winrate by Weekday" T={T} colSpan={isNarrow ? 12 : 6}>
    <WeekdayTable T={T} trades={trades} />
  </Card>

  <Card title="Confluence Breakdown" T={T} colSpan={isNarrow ? 12 : 6}>
    <ConfluenceTable T={T} trades={trades} palette={palette} />
  </Card>

  <Card title="Matching Trades (Applied filters)" T={T} colSpan={12}>
    <MatchList
      T={T}
      trades={trades}
      pair={appliedPair}
      day={appliedDay}
      pos={appliedPosition}
      confs={appliedConfs}
      palette={palette}
    />
  </Card>
</div>


      </div>
    </div>
  );
}



const segBtnWide = (T, active) => ({
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  border: `1px solid ${active ? T.accent : T.border}`,
  background: active ? T.accent : "transparent",
  color: active ? "#fff" : T.text,
  fontWeight: 800,
  minHeight: 44,
});

const pillBtnBig = (T, active) => ({
  padding: "8px 12px",
  borderRadius: 12,
  border: `1px solid ${active ? T.accent : T.border}`,
  background: active ? T.accent : "transparent",
  color: active ? "#fff" : T.text,
  fontWeight: 800,
  minWidth: 60,
  minHeight: 40,
});

const chipColored = (T, active, color) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 12,
  border: `1px solid ${(color || T.accent) + "66"}`,
  background: (color || T.accent) + (T.dark ? "26" : "1a"),
 color: T.dark ? "#fff" : "#000",
  fontWeight: 800,
});

const primaryBtnBlock = (T) => ({
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "none",
  background: T.accent,
  color: "#fff",
  fontWeight: 900,
  boxShadow: "0 8px 24px rgba(44,96,250,.35)",
});


/* ---------- animierte Elemente ---------- */
function BorderGlow() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          boxShadow: "0 0 40px rgba(44,96,250,.35) inset",
          borderRadius: 16,
          animation: "glow 1.2s ease-in-out infinite",
        }}
      />
      <style>{`@keyframes glow{0%{box-shadow:0 0 18px rgba(44,96,250,.18) inset}50%{box-shadow:0 0 40px rgba(44,96,250,.35) inset}100%{box-shadow:0 0 18px rgba(44,96,250,.18) inset}}`}</style>
    </>
  );
}

function Dots({ T }) {
  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 8,
            background: T.accent,
            opacity: 0.5,
            animation: `dot 1s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes dot{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-6px);opacity:1}}`}</style>
    </div>
  );
}

function ProgressLine() {
  return (
    <>
      <div style={{ position: "relative", height: 4, background: "rgba(44,96,250,.18)", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute", 
            inset: 0,
            transform: "translateX(-60%)",
            width: "60%",
            background: "linear-gradient(90deg, rgba(44,96,250,.0), rgba(44,96,250,.9), rgba(44,96,250,.0))",
            animation: "bar 0.9s linear infinite",
          }}
        />
      </div>
      <style>{`@keyframes bar{0%{transform:translateX(-60%)}100%{transform:translateX(160%)}}`}</style>
    </>
  );
}






/* --------------- Insight-Text wie iOS --------------- */
function buildInsight(rate, dayAbbr, confs, position, symbol) {
  if (rate == null || isNaN(rate)) return "Insufficient data.";
  const map = { Mon:"Monday", Tue:"Tuesday", Wed:"Wednesday", Thu:"Thursday", Fri:"Friday", Sat:"Saturday", Sun:"Sunday" };
  const fullDay = map[dayAbbr] || dayAbbr;
  const confStr = (confs||[]).join(", ");
  const pos = position;
  const sym = symbol || "instrument";
  const has = (confs||[]).length>0;

  const excellent = [
    `This is an excellent setup. Past ${sym} trades delivered ≈ ${Math.round(rate)}% wins. ${has?`Your confluences (${confStr}) often boosted entry precision. `:""}${pos} entries on ${fullDay} historically show strong edge.`,
    `An excellent outlook: ${sym} averaged about ${Math.round(rate)}% wins. ${has?`Chosen confluences (${confStr}) aligned well. `:""}${fullDay} ${pos} signals outperformed other weekdays.`,
  ];
  const good = [
    `This is a good setup. ${sym} trended at ~${Math.round(rate)}% wins. ${has?`Filters (${confStr}) helped capture solid moves. `:""}Consider minor refinements for timing.`,
    `${sym} historically around ${Math.round(rate)}% wins. ${has?`Your criteria (${confStr}) added confidence. `:""}${pos} on ${fullDay} performs reasonably well.`,
  ];
  const medium = [
    `Medium setup. ${sym} showed ~${Math.round(rate)}% wins. ${has?`Confluences (${confStr}) mixed—some hits, some misses. `:""}${pos} on ${fullDay} needs stronger confirmation.`,
    `Balanced results (~${Math.round(rate)}%). ${has?`Your signals (${confStr}) were inconsistent. `:""}Be selective with ${pos} entries on ${fullDay}.`,
  ];
  const bad = [
    `Weak setup. ${sym} had only ~${Math.round(rate)}% wins. ${has?`Confluences (${confStr}) produced many false positives. `:""}${pos} on ${fullDay} is risky—prefer staying flat.`,
    `Underperforming context (~${Math.round(rate)}%). ${has?`Signals (${confStr}) didn’t align profitably. `:""}Reassess filters before taking ${pos} trades on ${fullDay}.`,
  ];
  const pick = (a)=>a[Math.floor(Math.random()*a.length)];
  return rate>=60?pick(excellent):rate>=40?pick(good.concat(medium)):pick(bad);
}

/* --------------- Unterkomponenten --------------- */

function LabeledBox({ label, T, children }) {
  return (
    <div>
      <div style={{ color: T.sub, fontWeight: 800, fontSize: 11, textTransform:"uppercase", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function MiniStat({ T, label, value }) {
  return (
    <div style={{ background: T.dark?"#1f1f1f":"#f6f9ff", border:`1px solid ${T.dark?"#2a2d34":"#e1e8ff"}`, borderRadius:12, padding:10 }}>
      <div style={{ color: T.sub, fontWeight: 800, fontSize: 11, textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 18, marginTop: 2, color: T.text }}>{value}</div>
    </div>
  );
}

function Card({ title, T, colSpan=12, children }) {
  return (
    <section style={{
      gridColumn: `span ${colSpan}`,
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 12
    }}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

/* Winrate by Weekday */
function WeekdayTable({ T, trades }) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const rows = days.map((d) => {
    const list = trades.filter((t)=>dayOfWeekFromDateStr(t.date)===d);
    const wr = winratePercent(list);
    return { day: d, count: list.length, wr };
  });
  return (
    <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
      <thead>
        <tr>
          <th style={th(T,true)}>Day</th>
          <th style={th(T)}>Trades</th>
          <th style={th(T)}>Winrate</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r)=>(
          <tr key={r.day}>
            <td style={td(T,true)}>{r.day}</td>
            <td style={td(T)}>{r.count}</td>
            <td style={td(T)}>{r.wr==null?"—":`${r.wr.toFixed(2)}%`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* Confluence Breakdown (Farben aus Firestore) */
function ConfluenceTable({ T, trades, palette }) {
  // Map confluence -> {wins,total}
  const map = {};
  trades.forEach((t)=>{
    const list = getConfluences(t);
    const isWin = str(t.outcome).trim().toLowerCase()==="win";
    list.forEach((c)=>{
      if (!map[c]) map[c] = { wins:0, total:0 };
      map[c].total += 1;
      if (isWin) map[c].wins += 1;
    });
  });
  const rows = Object.entries(map).map(([c,stat])=>{
    const wr = stat.total>0 ? (stat.wins/stat.total*100) : null;
    return { conf:c, wins:stat.wins, total:stat.total, wr, color: palette[c] || null };
  }).sort((a,b)=> (b.total - a.total));

  if (!rows.length) return <div style={{ color:T.sub, fontWeight:600 }}>No confluences found.</div>;

  return (
    <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
      <thead>
        <tr>
          <th style={th(T,true)}>Confluence</th>
          <th style={th(T)}>Trades</th>
          <th style={th(T)}>Wins</th>
          <th style={th(T)}>Winrate</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r)=>(
          <tr key={r.conf}>
            <td style={{...td(T,true)}}>
              <span style={{
                display:"inline-block", width:10, height:10, borderRadius:6,
                background: r.color || T.accent, marginRight:8, verticalAlign:"middle"
              }} />
              {r.conf}
            </td>
            <td style={td(T)}>{r.total}</td>
            <td style={td(T)}>{r.wins}</td>
            <td style={td(T)}>{r.wr==null?"—":`${r.wr.toFixed(2)}%`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}



/* neu */
function MatchList({ T, trades, pair, day, pos, confs, palette }) {
  const pal = palette || {};  // falls undefined absichern
  const pairUsed = normalizeSymbol(pair);

  const rows = trades.filter((t) => {
    const okPair = !pairUsed || normalizeSymbol(t.symbol) === pairUsed;
    const okPos  = !pos || str(t.position).trim().toLowerCase() === str(pos).trim().toLowerCase();
    const okDay  = !day || dayOfWeekFromDateStr(t.date) === day;
    const have   = new Set(getConfluences(t).map(str));
    const okConf = !confs?.length || confs.every((c) => have.has(c));
    return okPair && okPos && okDay && okConf;
  });

  if (!rows.length) return <div style={{ color:T.sub, fontWeight:600 }}>No trades match current (applied) filters.</div>;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:10 }}>
      {rows.map((t) => (
        <div key={t.id} style={{ border:`1px solid ${T.border}`, borderRadius:12, padding:10, background:T.dark?"#15171b":"#fff" }}>
          <div style={{ fontWeight:800 }}>
            {normalizeSymbol(t.symbol) || "—"}{" "}
            <span style={{ color:T.sub, fontWeight:700 }}>· {str(t.position)||"—"}</span>
          </div>

          <div style={{ color:T.sub, fontWeight:600, fontSize:12, marginTop:4 }}>
            {str(t.date)||"—"} · {dayOfWeekFromDateStr(t.date) || "—"}
          </div>

          <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
            {getConfluences(t).map((c) => (
              <span
                key={c}
                style={{
                  display:"inline-flex", alignItems:"center", gap:6,
                  padding:"4px 8px", borderRadius:10,
                  border:`1px solid ${(pal[c] || "#8aa0ff") + "66"}`,
                  background:(pal[c] || "#8aa0ff") + "1a",
                  color:"#fff", fontWeight:800, fontSize:12
                }}
              >
                <i style={{
                  display:"inline-block", width:8, height:8, borderRadius:6,
                  background: pal[c] || "#8aa0ff"
                }}/>
                {c}
              </span>
            ))}
          </div>

          <div style={{ marginTop:10, fontWeight:700, color: str(t.outcome).trim().toLowerCase()==="win" ? "#1cbf73" : "#ee4e4e" }}>
            {str(t.outcome)||"—"}
          </div>
        </div>
      ))}
    </div>
  );
}


const th = (T, left=false)=>({
  textAlign:left?"left":"right", padding:"10px 10px",
  borderBottom:`1px solid ${T.border}`, color:T.sub, fontWeight:800, position:"sticky", top:0, background:T.card
});
const td = (T, left=false)=>({
  textAlign:left?"left":"right", padding:"10px 10px",
  borderBottom:`1px solid ${T.border}`
});
