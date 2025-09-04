import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
} from "firebase/firestore";

import {
  ResponsiveContainer,
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine,
  ComposedChart,      // NEW
  ScatterChart, Scatter, ZAxis,   Brush,    // NEW
} from "recharts";


/* ---------------- Theme ---------------- */
const themeSet = {
  dark: {
    bg: "#181818",
    text: "#fff",
    sub: "#BFC4CF",
    card: "#181818",
    border: "#313131",
    grid: "#262b33",
    accent: "#2c60fa",
    good: "#1cbf73",
    bad: "#ee4e4e",
    kpiShadow: "none",
  },
  light: {
    bg: "#f4f6fb",
    text: "#23232a",
    sub: "#495060",
    card: "#fff",
    border: "#e3e7ef",
    grid: "#e9edf5",
    accent: "#2c60fa",
    good: "#1cbf73",
    bad: "#ff0000ff",
    // weicher „nach unten“-Schatten
    kpiShadow: "0 14px 24px rgba(30,36,64,.12)",
  },
};
const useTheme = (dark) => useMemo(() => (dark ? themeSet.dark : themeSet.light), [dark]);
const PINK = "#FF69B4";
const OUTCOME_COLORS = { win: "#1cbf73", loss: "#ee4e4e", be: "#8C96AA" };
const GOLD = "#FFD700";

const fmtCurrencyTick = (currency) => (v) =>
  `${v < 0 ? "-" : ""}${currency}${Math.abs(v)}`;
const fmtPercentTick = (v) => `${Math.round(v)}%`;


function useViewport() {
  const [w, setW] = React.useState(() => window.innerWidth);
  React.useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return {
    width: w,
    isPhone: w <= 720,    // 1-spaltig
    isTablet: w <= 1200,  // 6-spaltig
  };
}



// 123 → "123m"; 200 → "3h"; 2880 → "2d" (keine Dezimalstellen)
function formatAvgHold(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  if (m <= 180) return `${m}m`;                  // bis 3h in Minuten
  const h = Math.round(m / 60);
  if (h % 24 === 0) return `${h / 24}d`;         // Vielfaches von 24 -> Tage
  return `${h}h`;                                 // sonst Stunden (integer)
}

/* --------------- Helpers --------------- */
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const parseDDMMYY = (s) => {
  if (!s) return null;
  const [dd, mm, yy] = s.split(".").map((v) => parseInt(v, 10));
  return new Date(2000 + (yy || 0), (mm || 1) - 1, dd || 1);
};
const parseTimeHM = (s) => {
  if (!s) return { h: 0, m: 0 };
  const [h, m] = s.split(":").map((v) => parseInt(v, 10));
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
};
const combine = (dStr, tStr) => {
  const d = parseDDMMYY(dStr);
  const { h, m } = parseTimeHM(tStr);
  if (!d) return null;
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
const startOfWeek=(d)=>{const x=startOfDay(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x;};
const endOfWeek  =(d)=>endOfDay(new Date(startOfWeek(d).getTime()+6*86400000));
const startOfMonth=(d)=>new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth  =(d)=>endOfDay(new Date(d.getFullYear(), d.getMonth()+1, 0));
const startOfYear =(d)=>new Date(d.getFullYear(),0,1);
const endOfYear   =(d)=>endOfDay(new Date(d.getFullYear(),11,31));

const outcomeKey = (o) => {
  const k = String(o||"").toLowerCase();
  if (k==="win") return "win";
  if (k==="loss") return "loss";
  return "be";
};
const parseRR = (rr) => {
  if (!rr) return null;
  const s = String(rr).replace(",", ".").trim();
  const parts = s.split(":");
  if (parts.length !== 2) return parseFloat(s) || null;
  const a = parseFloat(parts[0]); const b = parseFloat(parts[1]);
  if (!isFinite(a)||!isFinite(b)||a===0) return null;
  return b/a;
};

/* currency from users/{uid}.currency -> symbol */
const CURRENCY_SYMBOL = { USD:"$", EUR:"€", GBP:"£", CHF:"CHF", JPY:"¥" };
async function loadUserCurrencySymbol(db, uid){
  try {
    const snap = await getDoc(doc(db,"users",uid));
    const code = snap.exists() ? snap.data()?.currency : null;
    return CURRENCY_SYMBOL[code] || "$";
  } catch { return "$"; }
}

/* ---------------- Component ---------------- */
export default function AnalyticsPage() {
  const { dark } = useOutletContext();
  const T = useTheme(dark);
  const db = getFirestore();
  const uid = getAuth().currentUser?.uid;

const { isPhone, isTablet } = useViewport();
const gridCols = isPhone ? "repeat(1, 1fr)" : isTablet ? "repeat(6, 1fr)" : "repeat(12, 1fr)";
const stackCharts = useMediaMax(980); // <– bei <= 980px untereinander
const CONF_COLORS = ["#ff9f1a", "#00c3a3", "#a06bff", "#ff5ea0", "#00d0ff", "#ffaa00"];

  const [currency, setCurrency] = useState("$");
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState("Year");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
// in deiner Component:
const [bmMode, setBmMode] = useState("winners"); // "winners" | "losers"

// Buttons neben dem Titel: klar “Win / Loss”
const bubbleActions = (
  <div style={{ display:"flex", gap:8 }}>
    <button
      onClick={()=>setBmMode("winners")}
      style={{
        padding:"6px 12px",
        borderRadius:10,
        border:`1px solid ${bmMode==="winners" ? T.accent : T.border}`,
        background: bmMode==="winners" ? T.accent : "transparent",
        color: bmMode==="winners" ? "#fff" : T.text,
        fontWeight:800,
        cursor:"pointer",
      }}
      title="Top Winners"
    >
      Win
    </button>
    <button
      onClick={()=>setBmMode("losers")}
      style={{
        padding:"6px 12px",
        borderRadius:10,
        border:`1px solid ${bmMode==="losers" ? T.bad : T.border}`,
        background: bmMode==="losers" ? T.bad : "transparent",
        color: bmMode==="losers" ? "#fff" : T.text,
        fontWeight:800,
        cursor:"pointer",
      }}
      title="Top Losers"
    >
      Loss
    </button>
  </div>
);
// ---- Confluences aus Firebase ----
// ---- Confluences aus Firebase (mit Label/Name & optionalen Aliases) ----
// State für Confluences (Meta + Sichtbarkeit)
const [confMeta, setConfMeta] = useState([]);       // [{id, key, label, color}]
const [confEnabled, setConfEnabled] = useState({}); // { KEY: boolean }

// Confluences laden
useEffect(() => {
  if (!uid) return;
  const colRef = collection(getFirestore(), "users", uid, "confluences");

  const unsub = onSnapshot(colRef, (snap) => {
    // Fallback-Palette, falls kein color gespeichert ist
    const AUTOP = ["#2c60fa","#00C3A3","#FF9F1A","#FF5EA0","#00D0FF","#A06BFF","#ffaa00","#8C96AA"];

    const rows = snap.docs.map((d, i) => {
      const v = d.data() || {};
      const label = String(v.text || d.id).trim();   // Anzeigename (wie gewünscht)
      const color = String(v.color || AUTOP[i % AUTOP.length]).trim();
      return {
        id: d.id,
        key: label.toUpperCase(),  // Normalisierter Schlüssel fürs Matching
        label,
        color,
      };
    });

    setConfMeta(rows);
    // neue Confluences standardmäßig „sichtbar“ schalten
    setConfEnabled(prev => {
      const next = { ...prev };
      rows.forEach(m => { if (typeof next[m.key] !== "boolean") next[m.key] = true; });
      return next;
    });
  });

  return unsub;
}, [uid]);

  // currency
  useEffect(() => {
    if (!uid) return;
    loadUserCurrencySymbol(db, uid).then(setCurrency);
  }, [db, uid]);

  // live trades
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const q = query(collection(db, "users", uid, "trades"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrades(items);
      setLoading(false);
    });
    return unsub;
  }, [db, uid]);

  // range dates
  useEffect(() => {
    const now = new Date();
    if (range==="Today") { setFrom(startOfDay(now)); setTo(endOfDay(now)); }
    if (range==="Week")  { setFrom(startOfWeek(now)); setTo(endOfWeek(now)); }
    if (range==="Month") { setFrom(startOfMonth(now)); setTo(endOfMonth(now)); }
    if (range==="Year")  { setFrom(startOfYear(now)); setTo(endOfYear(now)); }
  }, [range]);

// 1) range, trades etc. … (wie gehabt)


// 3) weitere useMemos wie KPIs, equity, winrateSpark, rrSpark, holdSpark …

  const scoped = useMemo(() => {
    if (!from || !to) return trades;
    return trades.filter((t) => {
      const d = combine(t.entryDate||t.date, t.time) || parseDDMMYY(t.entryDate||t.date);
      if (!d) return false;
      const ts = d.getTime();
      return ts >= from.getTime() && ts <= to.getTime();
    });
  }, [trades, from, to]);

const outcomeData = useMemo(() => buildOutcome(scoped), [scoped]);
const outcomeTotal = useMemo(
  () => outcomeData.reduce((s, d) => s + (d.value || 0), 0),
  [outcomeData]
);

  
  /* --------------- KPIs --------------- */
  const KPIs = useMemo(() => {
    if (!scoped.length) {
      return {
        totalPL: 0, winRate: 0, avgRR: 0,
        avgHoldMin: 0, maxProfit: 0, maxLoss: 0,
        avgProfit: 0, avgLoss: 0,
      };
    }
    let wins=0, sumPL=0, rrSum=0, rrN=0;
    let holdSum=0, holdN=0;
    let maxP = -Infinity, maxL = Infinity;
    let profits=[], losses=[];

    scoped.forEach((t)=>{
      const pl = Number(String(t.risk).replace(",", ".")) || 0;
      sumPL += pl;
      if (pl>0){ profits.push(pl); if(pl>maxP) maxP=pl; }
      if (pl<0){ losses.push(pl); if(pl<maxL) maxL=pl; }
      if (outcomeKey(t.outcome)==="win") wins++;

      const rr=parseRR(t.riskReward);
      if (rr!=null && isFinite(rr)){ rrSum+=rr; rrN++; }

      const s = combine(t.entryDate||t.date, t.time);
      const e = combine(t.exitDate||t.entryDate||t.date, t.timeZone||t.exitTime||t.time);
      if (s && e){ holdSum += Math.max(1, Math.round((e-s)/60000)); holdN++; }
    });

    const avgProf = profits.length ? Math.round(profits.reduce((a,b)=>a+b,0)/profits.length) : 0;
    const avgLoss = losses.length ? Math.round(losses.reduce((a,b)=>a+b,0)/losses.length) : 0;

    return {
      totalPL: Math.round(sumPL),
      winRate: Math.round((wins/scoped.length)*100),
      avgRR: rrN ? Math.round((rrSum/rrN)*100)/100 : 0,
      avgHoldMin: holdN ? Math.round(holdSum/holdN) : 0,
      maxProfit: isFinite(maxP) ? Math.round(maxP) : 0,
      maxLoss:   isFinite(maxL) ? Math.round(maxL) : 0,
      avgProfit: avgProf,
      avgLoss:   avgLoss,
    };
  }, [scoped]);

  /* --------------- Data for charts --------------- */
  // Equity (für großes Area unter KPIs)
  const equity = useMemo(() => {
    const rows = scoped
      .map((t)=>({
        date: combine(t.entryDate||t.date, t.time) || parseDDMMYY(t.entryDate||t.date),
        pl: Number(String(t.risk).replace(",", ".")) || 0,
      }))
      .filter(r=>!!r.date)
      .sort((a,b)=>a.date-b.date);

    let run=0;
    return rows.map(r=>{
      run += r.pl;
      return { x: r.date.toLocaleDateString(undefined,{day:"2-digit", month:"short"}), equity: Math.round(run) };
    });
  }, [scoped]);

  // Winrate Verlauf (Sparkline)
  const winrateSpark = useMemo(() => {
    let wins=0, cnt=0;
    return equity.map((_,i)=>{
      const t = scoped[i];
      if (t){ cnt++; if (outcomeKey(t.outcome)==="win") wins++; }
      const wr = cnt? (wins/cnt)*100 : 0;
      return { x: i, y: Math.round(wr*100)/100 };
    });
  }, [equity, scoped]);

  // Avg RR Sparkline
  const rrSpark = useMemo(()=>{
    const acc=[]; let sum=0, n=0;
    scoped.forEach((t,i)=>{
      const r = parseRR(t.riskReward);
      if (r!=null && isFinite(r)){ sum+=r; n++; }
      acc.push({ x:i, y: n? Math.round((sum/n)*100)/100 : 0 });
    });
    return acc;
  },[scoped]);

  // Hold Time Sparkline
  const holdSpark = useMemo(()=>{
    const acc=[]; let sum=0, n=0;
    scoped.forEach((t,i)=>{
      const s = combine(t.entryDate||t.date, t.time);
      const e = combine(t.exitDate||t.entryDate||t.date, t.timeZone||t.exitTime||t.time);
      const val = (s && e) ? Math.max(1, Math.round((e-s)/60000)) : null;
      if (val!=null){ sum+=val; n++; }
      acc.push({ x:i, y: n? Math.round(sum/n) : 0 });
    });
    return acc;
  },[scoped]);
// --- STATE: ausgewähltes Jahr (oben auf Page-Komponenten-Ebene) ---
const [yearMonthly, setYearMonthly] = useState(null); // z.B. 2024

// Liste der Jahre aus Trades (wird nach scoped aktualisiert)
const yearsAvailable = useMemo(() => {
  const ys = new Set();
  scoped.forEach(t => {
    const d = combine(t.entryDate || t.date, t.time) || parseDDMMYY(t.entryDate || t.date);
    if (d) ys.add(d.getFullYear());
  });
  return [...ys].sort(); // aufsteigend
}, [scoped]);

// initiales Jahr wählen (falls noch nicht gesetzt oder nicht mehr vorhanden)
useEffect(() => {
  if (!yearsAvailable.length) return;
  setYearMonthly(prev => {
    if (prev && yearsAvailable.includes(prev)) return prev;
    const thisYear = new Date().getFullYear();
    // Preferiere aktuelles Jahr, sonst das letzte verfügbare
    return yearsAvailable.includes(thisYear) ? thisYear : yearsAvailable[yearsAvailable.length - 1];
  });
}, [yearsAvailable]);

// Daten für das aktuell gewählte Jahr
const monthlyRows = useMemo(() => {
  return buildMonthlyPLForYear(scoped, yearMonthly); // 12 Einträge Jan..Dez
}, [scoped, yearMonthly]);

const monthlyMA = useMemo(() => movingAvgN(monthlyRows, 3), [monthlyRows]);

// Farb-Gradienten-IDs stabilisieren
const gradPosId = "barPosMonthly";
const gradNegId = "barNegMonthly";

  /* --------------- Reusable styles --------------- */
  const tooltipStyle = {
    background: T.card, border:`1px solid ${T.border}`, borderRadius:8, color:T.text, fontSize:12,
  };

  /* --------------- UI --------------- */
  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Hintergrund (dezent) */}
      <div style={{ position:"fixed", inset:0, zIndex:-1, background: T.bg }} />

     {/* Header & Filter (Überschrift oben, Filter darunter) */}
<div style={{ marginBottom: 20 }}>
  {/* Überschrift */}
  <h1
    style={{
            marginTop: 10,  
      margin: 0,
      color: T.text,
      fontSize: 34,
      fontWeight: 700,
      marginBottom: 12,   // Abstand nach unten
    }}
  >
    Analytics
  </h1>

  {/* Zeitraum-Filter */}
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    {["Today", "Week", "Month", "Year"].map((k) => (
      <button
        key={k}
        onClick={() => setRange(k)}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: `1px solid ${range === k ? T.accent : T.border}`,
          background: range === k ? T.accent : "transparent",
          color: range === k ? "#fff" : T.text,
          fontWeight: 400,
          cursor: "pointer",
        }}
      >
        {k}
      </button>
    ))}
    <span style={{ color: T.sub, margin: "0 6px" }}>Custom</span>
    <input
      type="date"
      value={
        from
          ? `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(
              from.getDate()
            )}`
          : ""
      }
      onChange={(e) => setFrom(startOfDay(new Date(e.target.value)))}
      style={{
        background: T.card,
        color: T.text,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "6px 8px",
      }}
    />
    <span style={{ color: T.sub }}>→</span>
    <input
      type="date"
      value={
        to
          ? `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`
          : ""
      }
      onChange={(e) => setTo(endOfDay(new Date(e.target.value)))}
      style={{
        background: T.card,
        color: T.text,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "6px 8px",
      }}
    />
  </div>
</div>
{/* --- Neue Charts (6x) --- */}
<div
  style={{
    display: "grid",
   gridTemplateColumns: stackCharts ? "1fr" : "repeat(12, minmax(0, 1fr))",

    gap: 14,
    marginTop: 14,
  }}
>
  <StatCard
    title="Total P/L"
    value={`${KPIs.totalPL>0?"+":""}${currency}${Math.abs(KPIs.totalPL)}`}
    big
    color={KPIs.totalPL>=0 ? T.good : T.bad}
    T={T}
    colSpan={4}
    isTablet={isTablet}
    isPhone={isPhone}
  />
  <StatCard title="Consistency" value={`${consistencyFromWinrate(winrateSpark)} / 100`} T={T} colSpan={2} isTablet={isTablet} isPhone={isPhone}/>
  <StatCard title="Max Profit"  value={`${currency}${Math.abs(KPIs.maxProfit)}`} T={T} colSpan={2} isTablet={isTablet} isPhone={isPhone}/>
  <StatCard title="Max Loss"    value={`-${currency}${Math.abs(KPIs.maxLoss)}`} T={T} colSpan={2} isTablet={isTablet} isPhone={isPhone}/>
  <StatCard title="Avg Profit"  value={`${currency}${Math.abs(KPIs.avgProfit)}`} T={T} colSpan={1} isTablet={isTablet} isPhone={isPhone}/>
  <StatCard title="Avg Loss"    value={`-${currency}${Math.abs(KPIs.avgLoss)}`} T={T} colSpan={1} isTablet={isTablet} isPhone={isPhone}/>

  <SparkCard title="Winrate"   value={`${KPIs.winRate}%`}            data={winrateSpark} T={T} colSpan={4} isTablet={isTablet} isPhone={isPhone}/>
  <SparkCard title="Avg R:R"   value={KPIs.avgRR.toFixed(2)}         data={rrSpark}      T={T} colSpan={4} isTablet={isTablet} isPhone={isPhone}/>
  <SparkCard title="Avg Hold"  value={formatAvgHold(KPIs.avgHoldMin)} data={holdSpark}   T={T} colSpan={4} isTablet={isTablet} isPhone={isPhone}/>
</div>


      {/* Equity (groß) */}
     <Card title="Equity Curve" T={T}>
  <div style={{ width:"100%", height:260 }}>
    <ResponsiveContainer>
      <AreaChart
        data={equity}
        margin={{ left: 12, right: 28, top: 6, bottom: 18 }}   // mehr Luft
      >
        <defs>
          <linearGradient id="eqFillPink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={T.accent} stopOpacity={0.55}/>
            <stop offset="100%" stopColor={T.accent} stopOpacity={0.06}/>
          </linearGradient>
        </defs>
        <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="x"
          tick={{ fill: T.sub, fontSize: 12 }}
          tickMargin={10}                         // Abstand untere Beschriftungen
          padding={{ left: 6, right: 16 }}        // extra Platz rechts (Treffpunkt-Achsen)
          interval="preserveEnd"
        />
        <YAxis
          tick={{ fill: T.sub, fontSize: 12 }}
          tickMargin={10}                         // Abstand linke Beschriftungen
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={T.accent}                           // pinke Linie
          strokeWidth={2.2}
          fill="url(#eqFillPink)"
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</Card>


      {/* Weitere Beispiele (mit Outline + Verlauf bei Bars) */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:14, marginTop:14 }}>
       <Card title="Trades by Hour" T={T} colSpan={6} isNarrow={stackCharts}>  
  <div style={{ width:"100%", height:260 }}>
    <GradientBarChart
      data={buildByHour(scoped)}
      xKey="hour"
      yKey="count"
      T={T}
      gradId="barHour"
      colorTop={PINK}         // pinke Balken
      radiusTop={4}           // weniger abgerundet
    />
  </div>
</Card>

        <Card title="Profit by Weekday"T={T} colSpan={6} isNarrow={stackCharts}>
          <div style={{ width:"100%", height:260 }}>
            <GradientBarChart data={buildByWeekday(scoped)} xKey="name" yKey="profit" T={T} gradId="barWD" colorTop={KPIs.totalPL>=0 ? T.good : T.bad} />
          </div>
        </Card>
      </div>
      {/* --- Neue Charts (6x) --- */}
<div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:14, marginTop:14 }}>

 <Card title="Outcome Distribution" T={T} colSpan={4} isNarrow={stackCharts}>
    <div style={{ width: "100%", height: 260 }}>
    <ResponsiveContainer>
      <PieChart>
        <defs>
          {buildOutcome(scoped).map((d) => (
            <linearGradient
              key={d.key}
              id={`lg_${d.key}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              {/* Außen kräftig (100%), innen transparent */}
              <stop offset="0%" stopColor={OUTCOME_COLORS[d.key]} stopOpacity={1} />
              <stop offset="90%" stopColor={OUTCOME_COLORS[d.key]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <Tooltip contentStyle={tooltipStyle} />

        <Pie
          data={buildOutcome(scoped)}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={88}
          paddingAngle={3}
        >
          {buildOutcome(scoped).map((e, i) => (
            <Cell
              key={i}
              fill={`url(#lg_${e.key})`}
              stroke={OUTCOME_COLORS[e.key]}
            />
          ))}
        </Pie>

            <Legend
          verticalAlign="bottom"
          height={40}
          content={(props) => (
            <OutcomeLegend
              {...props}
              payload={outcomeData.map((d) => ({
                value: d.name,
                color: OUTCOME_COLORS[d.key],
                percent: outcomeTotal ? Math.round((d.value / outcomeTotal) * 100) : 0,
                key: d.key,
              }))}
              textColor={T.text}
              subColor={T.sub}
              border={T.border}
            />
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
</Card>



{/* 2) Top Symbols P/L (horizontal) */}
   <Card title="Top Symbols  P/L" T={T} colSpan={8} isNarrow={stackCharts}>

  <div style={{ width:"100%", height:260 }}>
    <ResponsiveContainer>
      <BarChart
        data={topSymbolsByPL(scoped, 10)}
        layout="vertical"
        margin={{ left: 190, right: 22, top: 8, bottom: 8 }} // mehr Platz links
      >
        <defs>
          {/* Positiver Verlauf → nach rechts heller */}
          <linearGradient id="gradPLpos" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={T.accent} stopOpacity={1}/>
            <stop offset="100%" stopColor={T.accent} stopOpacity={0.18}/>
          </linearGradient>
          {/* Negativer Verlauf → nach links heller */}
          <linearGradient id="gradPLneg" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%"   stopColor={T.bad} stopOpacity={1}/>
            <stop offset="100%" stopColor={T.bad} stopOpacity={0.18}/>
          </linearGradient>
        </defs>

        <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />

        <XAxis
          type="number"
          tick={{ fill: T.sub }}
          tickFormatter={fmtCurrencyTick(currency)}
          tickMargin={8}
        />

        {/* Breiter, mit zusätzlichem Abstand zwischen Label und Achse/Balken */}
        <YAxis
          type="category"
          dataKey="symbol"
          width={95}                   // mehr Platz für lange Symbole
          tickLine={false}
          axisLine={true}
          tick={({ x, y, payload }) => (
            <text
              x={x}
              y={y}
              dy={4}
              textAnchor="end"
              fill={T.sub}
              style={{ whiteSpace: "nowrap" }}
              // dx < 0 schiebt Text etwas nach links → visuell mehr Luft zum Balken
              dx={-6}
            >
              {payload.value}
            </text>
          )}
        />

        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtCurrencyTick(currency)(v), "P/L"]}
        />

        {/* Null-Linie in Gridfarbe (kein „heller Punkt“ am Start) */}
        <ReferenceLine x={0} stroke={T.grid} strokeWidth={1} />

        <Bar dataKey="pl" isAnimationActive>
          {topSymbolsByPL(scoped, 10).map((row, i) => {
            const isNeg = row.pl < 0;
            return (
              <Cell
                key={`pl-${i}`}
                fill={isNeg ? "url(#gradPLneg)" : "url(#gradPLpos)"}
                stroke={isNeg ? T.bad : T.accent}
                strokeWidth={1.1}
                // WICHTIG:
                // negative Balken: links rund (Außenkante), rechts flach (zur 0 hin)
                // → bei vertical layout funktioniert das mit [0,6,6,0]
                radius={isNeg ? [0, 6, 6, 0] : [0, 6, 6, 0]}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
</Card>


{/* 3) Winrate by Symbol */}
 <Card title="Winrate by Symbol" T={T} colSpan={6} isNarrow={stackCharts}>
  <div style={{ width:"100%", height:330 }}>
    <ResponsiveContainer>
      <BarChart
        data={winrateBySymbol(scoped, 10)}
        margin={{ left: 6, right: 12, top: 8, bottom: 100 }} // mehr Platz unten
      >
        <defs>
          <linearGradient id="gradWRsym" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2c60fa" stopOpacity={1}/>
            <stop offset="100%" stopColor="#2c60fa" stopOpacity={0.18}/>
          </linearGradient>
        </defs>

        <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />

        <XAxis
          dataKey="symbol"
          tick={({ x, y, payload }) => (
            <text
              x={x}
              y={y + 28}        // tiefer gesetzt → mehr Platz
              textAnchor="end"
              transform={`rotate(-35, ${x}, ${y + 28})`} // geneigt
              fill={T.sub}
              style={{ fontSize: 12 }}
            >
              {payload.value}
            </text>
          )}
          interval={0}
        />

        <YAxis
          tick={{ fill:T.sub }}
          tickFormatter={fmtPercentTick}
        />

        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v)=>[fmtPercentTick(v), "Winrate"]}
        />

        <Bar
          dataKey="wr"
          fill="url(#gradWRsym)"
          stroke="#2c60fa"
          strokeWidth={1.2}
          radius={[8,8,0,0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
</Card>

{/* 4) Avg R:R by Symbol */}
 <Card title="Avg R:R by Symbol" T={T} colSpan={6} isNarrow={stackCharts}>
  <div style={{ width:"100%", height:330 }}>
    <ResponsiveContainer>
      <AreaChart
        data={avgRRBySymbol(scoped, 10)}
        margin={{ left: 10, right: 28, top: 8, bottom: 100 }}
      >
        <defs>
          {/* Verlauf von stark oben zu schwach unten */}
          <linearGradient id="gradRRsym" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1cbf73" stopOpacity={0.65}/>
            <stop offset="100%" stopColor="#1cbf73" stopOpacity={0.05}/>
          </linearGradient>
        </defs>

        <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />

        {/* X-Achse mit schrägen Symbolen */}
        <XAxis
          dataKey="symbol"
          interval={0}
          tick={({ x, y, payload }) => (
            <text
              x={x}
              y={y + 28}
              textAnchor="end"
              transform={`rotate(-35, ${x}, ${y + 28})`}
              fill={T.sub}
              style={{ fontSize: 12 }}
            >
              {payload.value}
            </text>
          )}
        />

        {/* Y-Achse mit extra Abstand */}
        <YAxis
          tick={{ fill: T.sub }}
          tickFormatter={(v)=>v.toFixed(2)}
          tickMargin={12}
          width={54}
        />

        <Tooltip
          contentStyle={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.text
          }}
          formatter={(v)=>[Number(v).toFixed(2), "Avg R:R"]}
        />

        {/* Linie + gefüllter Bereich */}
        <Area
          type="monotone"
          dataKey="rr"
          stroke="#1cbf73"
          strokeWidth={2.2}
          fill="url(#gradRRsym)"
          dot={{ r:2 }}
          activeDot={{ r:4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</Card>



{/* 5) Winrate by Weekday (Radar) */}
 <Card title="Winrate by Weekday" T={T} colSpan={6} isNarrow={stackCharts}>

  <div style={{ width:"100%", height:300 }}>
    <ResponsiveContainer>
      <RadarChart data={winrateByWeekday(scoped)}>
        {/* dezentes Polar-Grid beibehalten */}
        <PolarGrid stroke={T.grid} />

        {/* Wochentage (Labels) */}
        <PolarAngleAxis
          dataKey="day"
          tick={{ fill: T.sub, fontSize: 12 }}
        />

        {/* Radius-Achse OHNE Prozent-Ticks/Legende */}
        <PolarRadiusAxis
          tick={false}          // keine % Beschriftung
          axisLine={false}      // keine Achsenlinie
          angle={90}            // Referenzwinkel (optional)
          domain={[0, 100]}     // 0–100% (intern)
        />

        {/* Radialer Verlauf: innen transparent -> außen kräftig */}
        <defs>
          {/* Außen stärker, zur Mitte transparent */}
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            {/* 0% = Mitte; 100% = Außenkante */}
            <stop offset="0%"   stopColor={PINK} stopOpacity={0.00} />
            <stop offset="70%"  stopColor={PINK} stopOpacity={0.18} />
            <stop offset="100%" stopColor={PINK} stopOpacity={0.55} />
          </radialGradient>
          {/* leichte Outline mit denselben Farbton */}
          <linearGradient id="radarStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={PINK} stopOpacity={0.9}/>
            <stop offset="100%" stopColor={PINK} stopOpacity={0.9}/>
          </linearGradient>
        </defs>

        {/* Die „Fläche“ selbst – mit radialem Verlauf gefüllt */}
        <Radar
          dataKey="wr"                // 0…100
          stroke="url(#radarStroke)"  // klare Outline
          strokeWidth={2}
          fill="url(#radarFill)"      // radialer Verlauf
          fillOpacity={1}             // Deckkraft über Gradient geregelt
          isAnimationActive           // sanftes Reinzeichnen
        />

        {/* Tooltip behalten – zeigt Prozentwerte an, wenn man hovert */}
        <Tooltip
          contentStyle={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.text
          }}
          formatter={(v)=>[`${Math.round(v)}%`, "Winrate"]}
          labelFormatter={(label)=>`Day: ${label}`}
        />
        {/* KEINE Legend – damit keine %‑Sätze separat angezeigt werden */}
      </RadarChart>
    </ResponsiveContainer>
  </div>
</Card>



  {/* 6) Hold Time Histogram */}
  <Card title="Hold Time Distribution" T={T} colSpan={6} isNarrow={stackCharts}>
    <div style={{ width:"100%", height:300 }}>
      <ResponsiveContainer>
        <BarChart data={holdHistogram(scoped)} margin={{ left:8, right:12, top:8, bottom:6 }}>
          <defs>
            <linearGradient id="gradHold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={PINK} stopOpacity={1}/>
              <stop offset="100%" stopColor={PINK} stopOpacity={0.18}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
          <XAxis dataKey="bucket" tick={{ fill:T.sub }} />
          <YAxis tick={{ fill:T.sub }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="url(#gradHold)" stroke={PINK} strokeWidth={1.2} radius={[8,8,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Card>



<Card title="Symbol Bubble Map" actions={bubbleActions} T={T} colSpan={12} isNarrow={stackCharts}>
  <div style={{ width:"100%", height: 420, minHeight: 360 }}>
    <BubbleMap
      data={symbolPL(scoped)}   // Aggregator siehe unten
      currency={currency}
      T={T}
      mode={bmMode}             // "winners" | "losers"
      maxN={7}                  // auf 7 capen
    />
  </div>
</Card>


  



<Card title="Performance by Confluence" T={T} colSpan={12} isNarrow={stackCharts}>
  <div style={{ width:"100%", height:340, minWidth:0, display:"flex", flexDirection:"column" }}>
    <div style={{ flex:"1 1 auto", minHeight:0 }}>
      <ResponsiveContainer>
        {(() => {
          const { data, series } = equityByConfluenceOnly(scoped, confMeta, confEnabled);

          // 1) Pro Serie einen individuellen Verlauf definieren
          const gradientDefs = series.map(s => {
            const id = `fill_conf_${s.key}`;
            return (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                {/* oben kräftiger, nach unten transparenter */}
                <stop offset="0%"   stopColor={hexToRgba(s.color, 0.45)} />
                <stop offset="100%" stopColor={hexToRgba(s.color, 0.06)} />
              </linearGradient>
            );
          });

          // 2) Y-Domain mit „Pad“, damit der unterste Tick nicht „klebt“
          const [yMin, yMax] = computeYDomainPadding(
            data,
            series.map(s => s.key)
          );

          return (
            <ComposedChart
              data={data}
              margin={{ left: 16, right: 22, top: 8, bottom: 14 }} // etwas mehr Luft
            >
              <defs>{gradientDefs}</defs>

              <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />

              {/* X: Achsenlinie & Ticklinie weg, mehr Abstand + innen Padding */}
              <XAxis
                dataKey="x"
                axisLine={false}
                tickLine={false}
                tick={{ fill: T.sub }}
                tickMargin={10}
                padding={{ left: 12, right: 12 }}   // seitliche „Luft“
                minTickGap={12}
              />

              {/* Y: Domain mit Pad, Achsenlinie & Ticklinie weg, Tick-Abstand */}
              <YAxis
                domain={[yMin, yMax]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: T.sub }}
                tickMargin={10}
                tickFormatter={fmtCurrencyTick(currency)}
              />

              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, n) => [
                  fmtCurrencyTick(currency)(v),
                  (confMeta.find(m => m.key === n)?.label || n)
                ]}
              />

              {/* Gefüllte Fläche + Linie je Confluence */}
              {series.map(s => (
                <React.Fragment key={s.key}>
                  <Area
                    type="monotone"
                    dataKey={s.key}
                    fill={`url(#fill_conf_${s.key})`}
                    stroke="transparent"
                    isAnimationActive
                  />
                  <Line
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive
                  />
                </React.Fragment>
              ))}
            </ComposedChart>
          );
        })()}
      </ResponsiveContainer>
    </div>

    {/* deine Chip-Leiste bleibt – horizontale Scrollbar schlank */}
    <ConfChips
      meta={confMeta}
      enabledMap={confEnabled}
      onToggle={(key) => setConfEnabled(prev => ({ ...prev, [key]: !prev[key] }))}
      T={T}
    />
  </div>
</Card>





{/* Trade Sequence Waterfall (P/L je Trade + kumulative Equity) */}
<Card title="Trade Sequence Waterfall" T={T} colSpan={6} isNarrow={stackCharts}>
  <div style={{ width:"100%", height: 320, minWidth: 0 }}>
    <ResponsiveContainer>
      {(() => {
        const data = buildWaterfall(scoped);
        const gradPos = "wfPos";
        const gradNeg = "wfNeg";
        const gradEq  = "wfEqFill";
        return (
          <ComposedChart data={data} margin={{ left: 12, right: 20, top: 8, bottom: 12 }}>
            <defs>
              {/* Balken-Gradients */}
              <linearGradient id={gradPos} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.good} stopOpacity={1}/>
                <stop offset="100%" stopColor={T.good} stopOpacity={0.18}/>
              </linearGradient>
              <linearGradient id={gradNeg} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.bad} stopOpacity={1}/>
                <stop offset="100%" stopColor={T.bad} stopOpacity={0.18}/>
              </linearGradient>
              {/* zarte Equity-Unterlegung */}
              <linearGradient id={gradEq} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={T.accent} stopOpacity={0.25}/>
                <stop offset="100%" stopColor={T.accent} stopOpacity={0.05}/>
              </linearGradient>
            </defs>

            <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />

            <XAxis
              dataKey="x"
              tick={{ fill: T.sub, fontSize: 12 }}
              tickMargin={8}
              interval="preserveStartEnd"
              padding={{ left: 8, right: 8 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: T.sub, fontSize: 12 }}
              tickFormatter={fmtCurrencyTick(currency)}
              tickMargin={8}
              axisLine={false}
              tickLine={false}
              padding={{ top: 6, bottom: 6 }}     // mehr Luft oben/unten
            />

            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v, n) => [
                fmtCurrencyTick(currency)(v),
                n === "change" ? "Trade P/L" : "Equity"
              ]}
              labelFormatter={(lab, payload) =>
                payload?.[0]?.payload?.dateFull || lab
              }
            />

            {/* Wasserfall-Balken (Einzel-P/L) */}
            <Bar dataKey="change" name="Trade P/L" barSize={18} radius={[6,6,0,0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.change >= 0 ? `url(#${gradPos})` : `url(#${gradNeg})`}
                  stroke={d.change >= 0 ? T.good : T.bad}
                  strokeWidth={1}
                />
              ))}
            </Bar>

            {/* zarte Area unter der Equity-Linie */}
            <Area
              type="monotone"
              dataKey="total"
              name="Equity"
              stroke={T.accent}
              strokeWidth={2}
              fill={`url(#${gradEq})`}
              dot={false}
              activeDot={{ r: 3 }}
            />

            {/* praktischer Zoom/Scroll bei vielen Trades */}
            <Brush
              dataKey="x"
              travellerWidth={8}
              height={20}
              stroke={T.border}
              fill="transparent"
            />
          </ComposedChart>
        );
      })()}
    </ResponsiveContainer>
  </div>
</Card>


{/* --- Monthly P/L (12 Monate) + 3M MA --- */}
<Card
  title={
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <span>Monthly P/L&nbsp;+&nbsp;3M&nbsp;MA</span>

      {/* Jahr-Buttons nur zeigen, wenn es >1 Jahre gibt */}
      {yearsAvailable.length > 1 && (
        <div style={{ display:"inline-flex", gap:6 }}>
          {yearsAvailable.map(y => (
            <button
              key={y}
              onClick={() => setYearMonthly(y)}
              style={{
                padding:"4px 10px",
                borderRadius:8,
                border:`1px solid ${y === yearMonthly ? T.accent : T.border}`,
                background: y === yearMonthly ? T.accent : "transparent",
                color: y === yearMonthly ? "#fff" : T.text,
                fontWeight:600,
                cursor:"pointer"
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  }
  T={T}
  colSpan={6}
  isNarrow={stackCharts}
>
  <div style={{ width:"100%", height: 300, minWidth: 0 }}>
    <ResponsiveContainer>
      <ComposedChart data={monthlyRows} margin={{ left: 12, right: 20, top: 8, bottom: 12 }}>
        <defs>
          <linearGradient id={gradPosId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.good} stopOpacity={1}/>
            <stop offset="100%" stopColor={T.good} stopOpacity={0.18}/>
          </linearGradient>
          <linearGradient id={gradNegId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.bad} stopOpacity={1}/>
            <stop offset="100%" stopColor={T.bad} stopOpacity={0.18}/>
          </linearGradient>
        </defs>

        <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />

        {/* X: Jan..Dez, etwas „Luft“ + keine Achsenlinie */}
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill:T.sub }}
          tickMargin={10}
          padding={{ left: 10, right: 10 }}
        />

        {/* Y: Währungsformat + etwas Abstand */}
        <YAxis
          tick={{ fill:T.sub }}
          tickMargin={8}
          tickFormatter={fmtCurrencyTick(currency)}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, n) => [fmtCurrencyTick(currency)(v), n === "pl" ? "P/L" : "3M MA"]}
          labelFormatter={(label) => `${label} ${yearMonthly ?? ""}`}
        />

        {/* Bars: immer 12 Stück, 0er werden dünn gezeichnet */}
        <Bar dataKey="pl" name="P/L" barSize={20} radius={[6,6,0,0]}>
          {monthlyRows.map((r, i) => (
            <Cell
              key={i}
              fill={r.pl >= 0 ? `url(#${gradPosId})` : `url(#${gradNegId})`}
              stroke={r.pl >= 0 ? T.good : T.bad}
              strokeWidth={1}
              opacity={r.pl === 0 ? 0.45 : 1}
            />
          ))}
        </Bar>

        {/* 3M Moving Average – Linie über die 12 Monate */}
        <Line
          type="monotone"
          dataKey={(d) => (monthlyMA.find(m => m.monthIdx === d.monthIdx) || {}).ma}
          name="3M MA"
          stroke="#fa67b0"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
</Card>


  {/* D) Max Drawdown (Area, rot) */}
  <Card title="Max Drawdown (%)" T={T} colSpan={12} isNarrow={stackCharts}>
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        {(() => {
          const dd = drawdownFromEquity(equity);
          return (
            <AreaChart data={dd} margin={{ left: 8, right: 18, top: 6, bottom: 6 }}>
              <defs>
                <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.bad} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={T.bad} stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fill: T.sub }} />
              <YAxis tick={{ fill: T.sub }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Drawdown"]} />
              <Area type="monotone" dataKey="dd" stroke={T.bad} strokeWidth={2} fill="url(#ddFill)" />
            </AreaChart>
          );
        })()}
      </ResponsiveContainer>
    </div>
  </Card>



{/* --- Advanced Charts (6) --- */}
<div
  style={{
    display: "grid",
// statt: gridTemplateColumns: stackCharts ? "1fr" : "repeat(12, 1fr)"
gridTemplateColumns: stackCharts ? "1fr" : "repeat(12, minmax(0, 1fr))",

    gap: 14,
    marginTop: 14,
  }}
>




</div>


</div>

    </div>
    
  );
}
// Kürzel der Monate für die X-Achse
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * Baut für ein Jahr genau 12 Zeilen (Jan..Dez) mit P/L.
 * - months ohne Trades bekommen pl=0
 * - monthIdx: 0..11 für Matching mit MA
 */
function buildMonthlyPLForYear(trades, year) {
  // Grundgerüst
  const arr = Array.from({ length: 12 }, (_, i) => ({
    monthIdx: i,
    label: MONTH_ABBR[i],
    pl: 0
  }));

  // Aggregieren
  trades.forEach(t => {
    const d = combine(t.entryDate || t.date, t.time) || parseDDMMYY(t.entryDate || t.date);
    if (!d) return;
    const y = d.getFullYear();
    if (year != null && y !== year) return; // nur das gewünschte Jahr
    const m = d.getMonth(); // 0..11
    const pl = Number(String(t.risk).replace(",", ".")) || 0;
    arr[m].pl += pl;
  });

  // Runde und gib zurück
  return arr.map(r => ({ ...r, pl: Math.round(r.pl) }));
}

function buildWaterfall(trades){
  // chronologisch sortieren
  const rows = (trades || [])
    .map(t => {
      const d = combine(t.entryDate||t.date, t.time) || parseDDMMYY(t.entryDate||t.date);
      return {
        date: d,
        dateFull: d ? d.toLocaleString(undefined, { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "",
        label: d ? d.toLocaleDateString(undefined, { day:"2-digit", month:"short" }) : "",
        change: Number(String(t.risk).replace(",", ".")) || 0
      };
    })
    .filter(r => !!r.date)
    .sort((a,b)=> a.date - b.date);

  let run = 0;
  return rows.map((r, i) => {
    run += r.change;
    return { x: r.label || `#${i+1}`, change: Math.round(r.change), total: Math.round(run), dateFull: r.dateFull };
  });
}

/**
 * Gleitender Durchschnitt N über 'pl' (hier N=3) je Position.
 * Gibt [{monthIdx, ma}] zurück, damit die Linie leicht gemappt werden kann.
 */
function movingAvgN(rows, n = 3) {
  const out = [];
  let run = 0;
  for (let i = 0; i < rows.length; i++) {
    run += rows[i].pl;
    if (i >= n) run -= rows[i - n].pl;
    const denom = Math.min(i + 1, n);
    out.push({ monthIdx: rows[i].monthIdx, ma: Math.round(run / denom) });
  }
  return out;
}


function BubbleMap({ data, currency="$", T, mode="winners", maxN=7 }) {
  // klar getrennte Töne – Gewinner in Blau, Verlierer in Rot
  const BLUES = ["#BFD8FF","#98C2FF","#7AAEFF","#5A9BFF","#3C88FF","#1E76FF","#0A63E5"];
  const REDS  = ["#FFC2C2","#FFA1A1","#FF8383","#FF6969","#FF5252","#EE3D3D","#D72C2C"];

  // Auswahl Top N Winners/Losers
  const rowsAll = (data||[]).filter(d=>d && isFinite(d.pl));
  const rows = (mode==="winners"
      ? rowsAll.filter(r=>r.pl>0).sort((a,b)=>b.pl-a.pl)
      : rowsAll.filter(r=>r.pl<0).sort((a,b)=>a.pl-b.pl)
    ).slice(0, maxN);

  // Containergröße beobachten → volle Breite nutzen
  const wrapRef = React.useRef(null);
  const [size, setSize] = React.useState({ w: 800, h: 360 });
  React.useLayoutEffect(()=>{
    const el = wrapRef.current;
    if(!el) return;
    const ro = new ResizeObserver(()=>{
      const r = el.getBoundingClientRect();
      setSize({ w:r.width, h:r.height });
    });
    ro.observe(el);
    return ()=>ro.disconnect();
  },[]);

  // Layout: linker Zeichenbereich + rechte Legende
  const LEGEND_W = 220; // genügend Platz für Symbol + P/L
  const W = Math.max(240, size.w - LEGEND_W - 12);
  const H = Math.max(240, size.h);

  // Radius ~ Fläche ~ |PL|
  const mags = rows.map(r=>Math.abs(r.pl));
  const minV = Math.min(...mags, 0);
  const maxV = Math.max(...mags, 1);
  const minR = 26, maxR = Math.max(42, Math.min(100, Math.floor(Math.min(W, H)/4)));
  const rFromPL = (pl)=>{
    const t = (Math.abs(pl)-minV)/(maxV-minV || 1);
    const area = (minR*minR) + t*((maxR*maxR)-(minR*minR));
    return Math.sqrt(area);
  };

  // Nodes vorbereiten (Farbe, Startposition)
  const palette = mode==="winners" ? BLUES : REDS;
  const cx0 = W/2, cy0 = H/2;
  const nodes = rows.map((r,i)=>({
    ...r,
    r: rFromPL(r.pl),
    fill: palette[i % palette.length],
    x: cx0, y: cy0
  }));

  // einfache Spiral-Platzierung + kurze Entzerrung
  const place = ()=>{
    const aStep = 0.9, rStep = 8;
    nodes.forEach((n,i)=>{
      if(i===0){ n.x=cx0; n.y=cy0; return; }
      let th=0, rad=0;
      for(let t=0;t<1600;t++){
        th += aStep; rad += rStep/(1+t*0.01);
        n.x = cx0 + Math.cos(th)*rad;
        n.y = cy0 + Math.sin(th)*rad;
        const pad = n.r+4;
        n.x = Math.max(pad, Math.min(W-pad, n.x));
        n.y = Math.max(pad, Math.min(H-pad, n.y));
        let ok = true;
        for(let j=0;j<i;j++){
          const m=nodes[j], dx=n.x-m.x, dy=n.y-m.y, d=Math.hypot(dx,dy);
          if(d < n.r+m.r+8){ ok=false; break; }
        }
        if(ok) break;
      }
    });
  };
  const relax = ()=>{
    for(let it=0; it<3; it++){
      for(let i=0;i<nodes.length;i++){
        for(let j=i+1;j<nodes.length;j++){
          const a=nodes[i], b=nodes[j];
          const dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||0.001;
          const md=a.r+b.r+8;
          if(d<md){
            const k=(md-d)/d*0.5; const ox=dx*k, oy=dy*k;
            b.x+=ox; b.y+=oy; a.x-=ox; a.y-=oy;
          }
        }
      }
    }
  };
  place(); relax();

  // Textfarbe in den Kreisen: Light → schwarz, Dark → weiß
  const isLight = (T.bg === "#f4f6fb"); // gemäß deinem ThemeSet
  const bubbleText = isLight ? "#111" : "#fff";

  // Format P/L für Legende
  const fmtPL = (v)=> `${v<0 ? "-" : ""}${currency}${Math.abs(Math.round(v))}`;

  // Symbol kurz im Kreis
  const shortSymbol = s => (String(s||"—").replace(/[^A-Z0-9]/gi,"").toUpperCase().slice(0,4) || "—");

  return (
    <div ref={wrapRef} style={{ position:"relative", width:"100%", height:"100%", display:"flex", gap:12 }}>
      {/* Zeichenfläche (links) */}
      <div style={{ flex:1, minWidth:0 }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Inner Glow pro Kreis */}
            {nodes.map((n,i)=>(
              <radialGradient key={`g${i}`} id={`glow_${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={n.fill} stopOpacity="0" />
                <stop offset="60%"  stopColor={n.fill} stopOpacity="0.18" />
                <stop offset="100%" stopColor={n.fill} stopOpacity="0.58" />
              </radialGradient>
            ))}
            <filter id="txtShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor={isLight ? "#fff" : "#000"} floodOpacity="0.45"/>
            </filter>
          </defs>

          {nodes.map((n,i)=>(
            <g key={i} transform={`translate(${n.x},${n.y})`}>
              <circle r={n.r} fill={`url(#glow_${i})`} stroke={n.fill} strokeWidth="2.6" />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="900"
                fontSize={Math.max(12, Math.min(22, n.r*0.5))}
                fill={bubbleText}
                filter="url(#txtShadow)"
                style={{ letterSpacing:0.4, pointerEvents:"none" }}
              >
                {shortSymbol(n.symbol)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legende rechts – ohne Titel; schwarzer/weißer Text, farbiger Swatch */}
      <div
        style={{
          width: LEGEND_W, flex:"0 0 auto",
          borderLeft:`1px solid ${T.border}`, paddingLeft:12,
          display:"grid",
          gridTemplateColumns:"20px 1fr",
          rowGap:10, columnGap:10,
          alignContent:"start",
          color: T.text
        }}
      >
        {nodes.map((n,i)=>(
          <React.Fragment key={`lg-${i}`}>
            <div
              style={{
                width:16, height:16, borderRadius:999, marginTop:2,
                background: n.fill,
                boxShadow: `0 0 0 2px ${T.border} inset`
              }}
            />
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:800, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {String(n.symbol || "—").toUpperCase()}
              </div>
              <div style={{ opacity:0.85, fontWeight:700 }}>{fmtPL(n.pl)}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function computeYDomainPadding(rows, keys) {
  let lo = Infinity, hi = -Infinity;
  rows.forEach(r => {
    keys.forEach(k => {
      const v = Number(r[k]);
      if (Number.isFinite(v)) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    });
  });
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, "auto"]; // Fallback
  const spread = Math.max(1, hi - lo);
  const pad = Math.max(1, Math.round(spread * 0.05)); // 5%
  return [lo - pad, hi + pad];
}

function symbolPL(scoped){
  const map = new Map();
  (scoped||[]).forEach(t=>{
    const s = String(t?.symbol || "—").toUpperCase();
    const pl = Number(String(t?.risk ?? 0).replace(",", ".")) || 0;
    map.set(s, (map.get(s)||0) + pl);
  });
  return [...map.entries()].map(([symbol, pl])=>({ symbol, pl }));
}

function useUserConfluences(db, uid) {
  const [state, setState] = React.useState({ list: [], colorByKey: {} });

  React.useEffect(() => {
    if (!db || !uid) return;
    const colRef = collection(db, "users", uid, "confluences");
    const unsub = onSnapshot(colRef, (snap) => {
      const list = [];
      const colorByKey = {};
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        const raw = d.key || d.name || docSnap.id;
        const key = String(raw || "").trim().toUpperCase();
        const color = String(d.color || "#8884d8");
        if (key) {
          list.push({ id: docSnap.id, key, color });
          colorByKey[key] = color;
        }
      });
      setState({ list, colorByKey });
    });
    return () => unsub();
  }, [db, uid]);

  return state;
}


function useMediaMax(px = 980) {
  const [narrow, setNarrow] = useState(() => window.innerWidth <= px);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= px);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [px]);
  return narrow;
}

function topConfluences(scoped, topN = 3) {
  const counts = new Map();
  scoped.forEach(t => {
    normConfluences(t).forEach(c => counts.set(c, (counts.get(c) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key]) => key);
}

function equityByConfluence(scoped, topN = 3) {
  const rows = buildChrono(scoped);
  const all = [];
  const keys = topConfluences(scoped, topN);
  const runs = { ALL: 0 };
  keys.forEach(k => (runs[k] = 0));

  const data = rows.map((r, i) => {
    runs.ALL += r.pl;
    const row = { x: r.label || i, ALL: Math.round(runs.ALL) };
    keys.forEach(k => {
      if (r.confs.includes(k)) runs[k] += r.pl;
      row[k] = Math.round(runs[k]);
    });
    return row;
  });

  return { data, keys };
}

function ConfChips({ meta = [], enabledMap = {}, onToggle, T }) {
  const isLight = T.bg === "#f4f6fb";
  return (
    <>
      {/* super-schlanke, transparente Scrollbar – nur für diesen Container */}
      <style>{`
        .conf-scroll {
          scrollbar-width: thin;          /* Firefox */
        }
        .conf-scroll::-webkit-scrollbar { height: 6px; }               /* WebKit */
        .conf-scroll::-webkit-scrollbar-track { background: transparent; }
        .conf-scroll::-webkit-scrollbar-thumb {
          background: ${T.border};
          border-radius: 999px;
          border: 2px solid transparent;  /* dünn, „luftig“ */
          background-clip: content-box;
        }
      `}</style>

      <div
        className="conf-scroll"
        style={{
          borderTop: `1px solid ${T.border}`,
          paddingTop: 10, marginTop: 10,
          overflowX: "auto",
          whiteSpace: "nowrap",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none", // IE/Edge legacy
          background: "transparent",
        }}
      >
        {meta.map(c => {
          const on = !!enabledMap[c.key];
          return (
            <label
              key={c.key}
              style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"6px 10px", marginRight:8, marginBottom:6,
                borderRadius:12, cursor:"pointer", userSelect:"none",
                border:`1px solid ${c.color}`,
                background:`${c.color}22`,       // leicht eingefärbt, transparent
                color: isLight ? "#111" : "#fff", // Textfarbe
              }}
              title={c.label}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(c.key)}
                style={{ accentColor:c.color, cursor:"pointer" }}
              />
              <span
                style={{
                  width:12, height:12, borderRadius:999, background:c.color,
                  boxShadow:`0 0 0 2px ${T.border} inset`,
                  flex:"0 0 auto"
                }}
              />
              <span style={{ fontWeight:800, letterSpacing:0.2 }}>{c.label}</span>
            </label>
          );
        })}
      </div>
    </>
  );
}


function monthlyPL(scoped) {
  const group = new Map();
  scoped.forEach(t => {
    const d = combine(t.entryDate || t.date, t.time) || parseDDMMYY(t.entryDate || t.date);
    if (!d) return;
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const pl = Number(String(t.risk).replace(",", ".")) || 0;
    group.set(ym, (group.get(ym) || 0) + pl);
  });
  return [...group.entries()]
    .map(([month, pl]) => ({ month, pl: Math.round(pl) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function drawdownFromEquity(equityArr) {
  let peak = -Infinity;
  return equityArr.map(r => {
    peak = Math.max(peak, r.equity);
    const dd = peak > 0 ? ((r.equity - peak) / peak) * 100 : 0; // negative %
    return { x: r.x, dd: Math.round(dd * 10) / 10 };
  });
}

function outcomeCumulative(scoped) {
  const rows = buildChrono(scoped);
  let w = 0, l = 0, b = 0;
  return rows.map((r, i) => {
    if (r.outcome === "win") w++;
    else if (r.outcome === "loss") l++;
    else b++;
    return { x: r.label || i, win: w, loss: l, be: b };
  });
}

function symbolBubbles(scoped) {
  // x: Winrate, y: Avg RR, z: #Trades, color: PL sign
  const map = new Map();
  scoped.forEach(t => {
    const s = (t.symbol || "—").toUpperCase();
    if (!map.has(s)) map.set(s, { symbol: s, n: 0, wins: 0, rrSum: 0, rrN: 0, pl: 0 });
    const row = map.get(s);
    row.n++;
    const pl = Number(String(t.risk).replace(",", ".")) || 0;
    row.pl += pl;
    if (outcomeKey(t.outcome) === "win") row.wins++;
    const rr = parseRR(t.riskReward);
    if (rr != null && isFinite(rr)) { row.rrSum += rr; row.rrN++; }
  });
  return [...map.values()].map(r => ({
    symbol: r.symbol,
    wr: r.n ? Math.round((r.wins / r.n) * 100) : 0,
    rr: r.rrN ? Math.round((r.rrSum / r.rrN) * 100) / 100 : 0,
    n: r.n,
    pl: Math.round(r.pl)
  }));
}

function rrHoldScatter(scoped) {
  // x: Hold (min), y: RR, z: |PL|
  return buildChrono(scoped)
    .filter(r => r.rr != null && r.holdMin != null)
    .map((r, i) => ({ x: r.holdMin, y: Math.max(-5, Math.min(5, r.rr)), z: Math.min(300, Math.abs(r.pl)), outcome: r.outcome }));
}

function OutcomeLegend({ payload = [], textColor = "#fff", subColor = "#999", border = "#333" }) {
  return (
    <div style={{ paddingTop: 6 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {payload.map((p) => (
          <div
            key={p.key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: "transparent",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: p.color,
                display: "inline-block",
              }}
            />
            <span style={{ color: textColor, fontWeight: 700 }}>{p.value}</span>
            <span style={{ color: subColor, fontWeight: 600 }}>{p.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Outcome-Donut (Win/Loss/BE Anteile + Summen)
function buildOutcome(scoped){
  let win=0, loss=0, be=0;
  scoped.forEach(t=>{
    const k = outcomeKey(t.outcome);
    if (k==="win") win++;
    else if (k==="loss") loss++;
    else be++;
  });
  return [
    { name:"Win",  key:"win",  value: win },
    { name:"BE",   key:"be",   value: be  },
    { name:"Loss", key:"loss", value: loss}
  ];
}

// Symbol-Aggregate
function aggregateBySymbol(scoped){
  const map = new Map();
  scoped.forEach(t=>{
    const s = (t.symbol || "—").toUpperCase();
    if (!map.has(s)) map.set(s, { symbol:s, pl:0, n:0, wins:0, rrSum:0, rrN:0 });
    const row = map.get(s);
    const pl = Number(String(t.risk).replace(",", ".")) || 0;
    row.pl += pl;
    row.n += 1;
    if (outcomeKey(t.outcome)==="win") row.wins += 1;
    const rr = parseRR(t.riskReward);
    if (rr!=null && isFinite(rr)){ row.rrSum+=rr; row.rrN+=1; }
  });
  return [...map.values()];
}

function topSymbolsByPL(scoped, topN=8){
  return aggregateBySymbol(scoped)
    .sort((a,b)=>Math.abs(b.pl)-Math.abs(a.pl))
    .slice(0, topN)
    .map(r=>({ symbol:r.symbol, pl: Math.round(r.pl) }));
}

function winrateBySymbol(scoped, topN=8){
  return aggregateBySymbol(scoped)
    .filter(r=>r.n>0)
    .sort((a,b)=>b.n-a.n)         // häufigste zuerst
    .slice(0, topN)
    .map(r=>({ symbol:r.symbol, wr: Math.round((r.wins/r.n)*100) }));
}

function avgRRBySymbol(scoped, topN=8){
  return aggregateBySymbol(scoped)
    .filter(r=>r.rrN>0)
    .sort((a,b)=>b.rrSum/b.rrN - a.rrSum/a.rrN)
    .slice(0, topN)
    .map(r=>({ symbol:r.symbol, rr: Math.round((r.rrSum/r.rrN)*100)/100 }));
}

// Winrate je Wochentag (Radar)
function winrateByWeekday(scoped){
  const names = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const rows = names.map(n=>({ day:n, wins:0, n:0 }));
  scoped.forEach(t=>{
    const d = parseDDMMYY(t.entryDate||t.date);
    if (!d) return;
    const idx = (d.getDay()+6)%7;
    rows[idx].n += 1;
    if (outcomeKey(t.outcome)==="win") rows[idx].wins += 1;
  });
  return rows.map(r=>({ day:r.day, wr: r.n? Math.round((r.wins/r.n)*100) : 0 }));
}

// Histogramm der Haltezeit (Buckets)
function holdHistogram(scoped){
  // Bins: <=15m, 30m, 1h, 2h, 4h, 8h, 1d, >1d
  const bins = [
    { key:"≤15m", max:15,  count:0 },
    { key:"≤30m", max:30,  count:0 },
    { key:"≤1h",  max:60,  count:0 },
    { key:"≤2h",  max:120, count:0 },
    { key:"≤4h",  max:240, count:0 },
    { key:"≤8h",  max:480, count:0 },
    { key:"≤1d",  max:1440,count:0 },
    { key:">1d",  max:Infinity, count:0 },
  ];
  scoped.forEach(t=>{
    const s = combine(t.entryDate||t.date, t.time);
    const e = combine(t.exitDate||t.entryDate||t.date, t.timeZone||t.exitTime||t.time);
    if (!s || !e) return;
    const mins = Math.max(1, Math.round((e-s)/60000));
    const bin = bins.find(b=>mins<=b.max) || bins[bins.length-1];
    bin.count++;
  });
  return bins.map(b=>({ bucket:b.key, count:b.count }));
}

// Kumuliertes P/L je Woche (Label z.B. "2025-W32")
function cumulativeWeeklyPL(scoped){
  const isoWeek = (d)=>{
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay()+6)%7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(),0,4));
    const week = 1 + Math.round(((date - firstThursday)/86400000 - 3 + ((firstThursday.getUTCDay()+6)%7))/7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2,"0")}`;
  };

  const grouped = new Map();
  scoped.forEach(t=>{
    const d = combine(t.entryDate||t.date, t.time) || parseDDMMYY(t.entryDate||t.date);
    if (!d) return;
    const label = isoWeek(d);
    const pl = Number(String(t.risk).replace(",", ".")) || 0;
    grouped.set(label, (grouped.get(label)||0) + pl);
  });

  const rows = [...grouped.entries()]
    .map(([week, pl])=>({ week, pl }))
    .sort((a,b)=> a.week.localeCompare(b.week));

  let run=0;
  return rows.map(r=>({ week:r.week, equity: (run+=r.pl) }));
}

// Winrate je Stunde (statt nur Trades/Hour)
function winrateByHour(scoped){
  const rows = Array.from({length:24}).map((_,h)=>({ hour: `${pad(h)}:00`, wins:0, n:0 }));
  scoped.forEach(t=>{
    const { h } = (t.time ? parseTimeHM(t.time) : {h:0});
    const idx = Math.min(23, Math.max(0, isNaN(h)?0:h));
    rows[idx].n++;
    if (outcomeKey(t.outcome)==="win") rows[idx].wins++;
  });
  return rows.map(r=>({ hour:r.hour, wr: r.n? Math.round((r.wins/r.n)*100) : 0 }));
}



function StatCard({ title, value, big=false, color, T, colSpan=3 }) {
  return (
    <div style={{
      gridColumn:`span ${colSpan}`,
      background:T.card,
      border:`1px solid ${T.border}`,
      borderRadius:14,
      padding:14,
      boxShadow: T.kpiShadow
    }}>
      <div style={{ color:T.sub, fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:.6 }}>{title}</div>
      <div style={{ color: color || T.text, fontWeight:900, fontSize: big?28:22, marginTop:6 }}>{value}</div>
    </div>
  );
}

// Card erweitert: optionale actions rechts neben Titel
// Card mit optionalen Actions (rechts am Titel)
function Card({ title, actions=null, children, T, colSpan = 12, isNarrow = false }) {
  return (
    <div
      style={{
        gridColumn: isNarrow ? "1 / -1" : `span ${colSpan}`,
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: T.kpiShadow,
        minWidth: 0, // wichtig für Recharts/SVG im Grid
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, color: T.text }}>{title}</div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function buildMatchers(metaList = []) {
  // Für jede Confluence: Liste normalisierter Strings (Key, Label, Aliases)
  return metaList.map(m => {
    const variants = [
      m.key,
      m.label,
      ...(m.aliases || []),
    ]
      .filter(Boolean)
      .map(s => String(s).trim().toUpperCase());
    return { key: m.key, label: m.label, color: m.color, variants };
  });
}

function equityByConfluenceDynamic(scoped, confMetaList = []) {
  const rows = buildChrono(scoped);           // chronologisch, {date,label,pl,confs[]}
  const matchers = buildMatchers(confMetaList);

  // Falls keine Confluences in Firebase: automatische Top-N (zur Rückfalllösung)
  const effectiveKeys = matchers.length
    ? matchers.map(m => m.key)
    : (() => {
        const counts = new Map();
        scoped.forEach(t => normConfluences(t).forEach(c => counts.set(c, (counts.get(c)||0)+1)));
        return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k]) => k);
      })();

  const run = { ALL: 0 };
  effectiveKeys.forEach(k => (run[k] = 0));

  const data = rows.map((r, i) => {
    run.ALL += r.pl;
    const row = { x: r.label || i, ALL: Math.round(run.ALL) };

    // Für jede definierte Confluence prüfen, ob der Trade dazugehört
    effectiveKeys.forEach(k => {
      const m = matchers.find(mm => mm.key === k);
      const variants = m ? m.variants : [k]; // Fallback: nur key
      const hit = r.confs.some(c => variants.includes(c)); // r.confs ist bereits UPPERCASE
      if (hit) run[k] += r.pl;
      row[k] = Math.round(run[k]);
    });

    return row;
  });

  return { data, keys: effectiveKeys };
}

function equityByConfluenceOnly(scoped, metaList = [], enabledMap = {}) {
  const rows = buildChrono(scoped); // nutzt normConfluences intern
  const active = metaList.filter(m => enabledMap[m.key] !== false); // nur eingeschaltete Chips

  // laufende Summe je aktiver Confluence
  const run = {};
  active.forEach(m => (run[m.key] = 0));

  const data = rows.map((r, idx) => {
    const row = { x: r.label || idx };

    active.forEach(m => {
      if (r.confs.includes(m.key)) {
        run[m.key] += r.pl; // volle P/L dem Confluence-Run zuschlagen
      }
      row[m.key] = Math.round(run[m.key]); // kumulierter Stand
    });

    return row;
  });

  return { data, series: active }; // series: [{key,label,color}]
}


/* Bars mit Outline + Gradient (oben voll, unten heller) */
function GradientBarChart({ data, xKey, yKey, T, gradId, colorTop, radiusTop = 8 }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ left: 6, right: 6, top: 8, bottom: 6 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={colorTop} stopOpacity={1}/>
            <stop offset="100%" stopColor={colorTop} stopOpacity={0.18}/>
          </linearGradient>
        </defs>
        <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fill: T.sub, fontSize: 12 }} tickMargin={8} />
        <YAxis tick={{ fill: T.sub, fontSize: 12 }} tickMargin={8} />
        <Tooltip contentStyle={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text
        }}/>
        <Bar
          dataKey={yKey}
          fill={`url(#${gradId})`}
          stroke={colorTop}
          strokeWidth={1.2}
          radius={[radiusTop, radiusTop, 0, 0]}  // oben abgerundet, unten gerade
        />
      </BarChart>
    </ResponsiveContainer>
  );
  
}

function hexToRgba(hex, a = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function SparkCard({ title, value, data, T, colSpan = 4, isTablet=false, isPhone=false }) {
  const effectiveCols = isPhone ? 1 : isTablet ? 6 : 12;
  const span = Math.min(colSpan, effectiveCols);
  // 1) Farbe robust anhand des Titels bestimmen
  const norm = String(title || "").toLowerCase();
  let color = T.accent;                 // fallback: blau
  if (norm.includes("avg") && norm.includes("r")) color = "#1cbf73";  // gelb für Avg R:R
  if (norm.includes("hold"))            color = "#FF69B4";            // pink für Avg Hold
  if (norm.includes("win"))             color = "#2c60fa";            // blau für Winrate

  // 2) Gradient-ID sicher machen (keine Leerzeichen/ Sonderzeichen)
  const safeId = `spark_${String(title)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")}`; // z.B. "spark_avgrr", "spark_avghold", "spark_winrate"

  return (
    <div
      style={{
        gridColumn: `span ${colSpan}`,
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: T.kpiShadow,
      }}
    >
      <div
        style={{
          color: T.sub,
          fontWeight: 700,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: T.text,
          fontWeight: 900,
          fontSize: 22,
          margin: "4px 0 10px",
        }}
      >
        {value}
      </div>

      <div style={{ width: "100%", height: 90 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
                {/* oben satt, unten sehr leicht – wie bei Winrate */}
                <stop offset="0%" stopColor={color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={color} stopOpacity={0.06} />
              </linearGradient>
            </defs>

            <Area
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={2.2}
              fill={`url(#${safeId})`}
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


function buildChrono(scoped){
  return scoped
    .map(t => {
      const date = combine(t.entryDate || t.date, t.time) || parseDDMMYY(t.entryDate || t.date);
      return {
        date,
        label: date ? date.toLocaleDateString(undefined, { day:"2-digit", month:"short" }) : "",
        pl: Number(String(t.risk).replace(",", ".")) || 0,
        confs: normConfluences(t),
      };
    })
    .filter(r => !!r.date)
    .sort((a,b) => a.date - b.date);
}

function toFlatStringArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  // CSV/pipe/semicolon tolerant
  return String(v).split(/[,|;]/);
}

function normConfluences(t) {
  // 1) Direkt am Root: confluenceEntries (Array von Strings)
  const a1 = toFlatStringArray(t?.confluenceEntries);

  // 2) Nested unter emotions: confluenceEntries (laut Screenshot)
  const a2 = toFlatStringArray(t?.emotions?.confluenceEntries);

  // 3) Fallbacks: confluences / confluence / tags (Array oder CSV)
  const a3 = toFlatStringArray(t?.confluences);
  const a4 = toFlatStringArray(t?.confluence);
  const a5 = toFlatStringArray(t?.tags);

  // alles zusammenführen, trimmen, uppercasing, Duplikate entfernen
  const all = [...a1, ...a2, ...a3, ...a4, ...a5]
    .map(s => String(s || "").trim())
    .filter(Boolean)
    .map(s => s.toUpperCase());

  return [...new Set(all)];
}

/* --------- data shapers --------- */
function buildByHour(trades){
  const rows = Array.from({length:24}).map((_,h)=>({ hour: `${pad(h)}:00`, count:0 }));
  trades.forEach(t=>{
    const { h } = (t.time ? parseTimeHM(t.time) : {h:0});
    const idx = Math.min(23, Math.max(0, isNaN(h)?0:h));
    rows[idx].count++;
  });
  return rows;
}
function buildByWeekday(trades){
  const names=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const rows = names.map(n=>({ name:n, profit:0 }));
  trades.forEach(t=>{
    const d = parseDDMMYY(t.entryDate||t.date);
    if (!d) return;
    const idx = (d.getDay()+6)%7;
    const pl = Number(String(t.risk).replace(",", ".")) || 0;
    rows[idx].profit += pl;
  });
  return rows;
}

/* einfacher Consistency-Proxy aus Winrate-Sparkline */
function consistencyFromWinrate(spark){
  if (!spark.length) return 0;
  const last = spark[spark.length-1]?.y || 0;
  // skaliere leicht, damit 100 nur bei sehr konstanter hoher WR erreicht wird
  return Math.max(0, Math.min(100, Math.round(last*0.9)));
}
