import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import {
  ResponsiveContainer,
  AreaChart, Area,
  CartesianGrid, XAxis, YAxis, Tooltip,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { FaInfoCircle } from "react-icons/fa";

/* ---------- Theme (Fallback, falls via Outlet keine Theme-Props kommen) ---------- */
const themeSet = {
  dark: {
    bg: "#181818",
    text: "#ffffff",
    sub: "#BFC4CF",
    card: "#181818",
    border: "#313131",
    grid: "#262b33",
    accent: "#2c60fa",
    good: "#1cbf73",
    mid: "#f0a040",
    bad: "#ee4e4e",
    kpiShadow: "none",
  },
  light: {
    bg: "#f4f6fb",
    text: "#23232a",
    sub: "#495060",
    card: "#ffffff",
    border: "#e3e7ef",
    grid: "#e9edf5",
    accent: "#2c60fa",
    good: "#1cbf73",
    mid: "#e89a2d",
    bad: "#ee4e4e",
    kpiShadow: "0 14px 24px rgba(30,36,64,.12)",
  },
};

/* ---------- kleine Helfer ---------- */
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
const outcomeKey = (o) => {
  const k = String(o || "").toLowerCase();
  return k === "win" ? "win" : k === "loss" ? "loss" : "be";
};
const fmtMoney = (v, currency = "$") =>
  `${v < 0 ? "-" : ""}${currency}${Math.abs(v).toLocaleString()}`;

/* ---------- Responsive Hook: „stack“ bei maxBreite ---------- */
function useMediaMax(px = 720) {
  const [stack, setStack] = useState(() => window.innerWidth <= px);
  useEffect(() => {
    const onResize = () => setStack(window.innerWidth <= px);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [px]);
  return stack;
}

/* ---------- Info-Tooltip (echter Hover-Content) ---------- */
function InfoTooltip({ color, text }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <FaInfoCircle size={16} color={color} style={{ cursor: "help" }} />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            zIndex: 20,
            width: 260,
            padding: 10,
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.35,
            background: "rgba(0,0,0,.85)",
            color: "#fff",
            boxShadow: "0 8px 18px rgba(0,0,0,.25)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

// replace your getTradeDate() with this:
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



/* ---------- Card ---------- */
function Card({ T, title, right, children, colSpan = 12, stack = false }) {
  return (
    <div
      style={{
        gridColumn: stack ? "1 / -1" : `span ${colSpan}`,
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: T.kpiShadow,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 800, color: T.text }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ===================================================================== */

export default function DashboardHome() {
  const outlet = useOutletContext() || {};
  const dark = !!outlet.dark;
  const T = outlet.T || (dark ? themeSet.dark : themeSet.light);

  const stack = useMediaMax(720); // iPhone → alles untereinander

  const db = getFirestore();
  const uid = getAuth().currentUser?.uid;

  const [trades, setTrades] = useState([]);
  const [currency] = useState("$");

  /* --- Live Trades laden --- */
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "trades"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrades(items);
    });
    return unsub;
  }, [db, uid]);

  /* --- Re-Shape --- */
  const rows = useMemo(() => {
    return trades
      .map((t) => {
        const dt = combine(t.entryDate || t.date, t.time) || parseDDMMYY(t.entryDate || t.date);
        const pl = Number(String(t.risk).replace(",", ".")) || 0;
        return {
          ...t,
          _date: dt,
          _dayKey: dt ? `${pad(dt.getDate())} ${dt.toLocaleString(undefined, { month: "short" })}` : "",
          _ymd: dt ? dt.toISOString().slice(0, 10) : "",
          _pl: pl,
          _outcome: outcomeKey(t.outcome),
        };
      })
      .filter((r) => !!r._date)
      .sort((a, b) => a._date - b._date);
  }, [trades]);

  /* --- Equity Curve --- */
  const equity = useMemo(() => {
    let run = 0;
    return rows.map((r) => {
      run += r._pl;
      return {
        x: r._date.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        equity: Math.round(run),
      };
    });
  }, [rows]);

  /* --- Statistics (ohne „Lots“) --- */
  const stats = useMemo(() => {
    if (!rows.length) {
      return {
        equity: 0, winRate: 0, avgProfit: 0, avgLoss: 0, trades: 0,
        avgRRR: 0, expectancy: 0, profitFactor: 0, maxDD: 0, maxWin: 0, maxLoss: 0,
      };
    }
    let wins = 0, profits = [], losses = [], rrSum = 0, rrN = 0;
    let peak = -Infinity, maxDD = 0, run = 0, maxWin = -Infinity, maxLoss = Infinity;

    rows.forEach((t) => {
      run += t._pl;
      peak = Math.max(peak, run);
      const dd = peak > 0 ? ((run - peak) / peak) * 100 : 0;
      maxDD = Math.min(maxDD, dd);

      if (t._pl > 0) { profits.push(t._pl); maxWin = Math.max(maxWin, t._pl); }
      if (t._pl < 0) { losses.push(-t._pl); maxLoss = Math.min(maxLoss, t._pl); }
      if (t._outcome === "win") wins++;

      const rrStr = String(t.riskReward || "").replace(",", ".");
      const rr = rrStr.includes(":")
        ? (() => {
            const [a, b] = rrStr.split(":").map(parseFloat);
            return a ? b / a : NaN;
          })()
        : parseFloat(rrStr);
      if (isFinite(rr)) { rrSum += rr; rrN++; }
    });

    const avgProfit = profits.length ? (profits.reduce((a,b)=>a+b,0) / profits.length) : 0;
    const avgLoss   = losses.length ? (losses.reduce((a,b)=>a+b,0) / losses.length) : 0;
    const wr = (wins / rows.length) * 100;
    const expectancy = (wins / rows.length) * avgProfit - (1 - wins / rows.length) * avgLoss;
    const profitFactor = avgLoss ? (avgProfit / avgLoss) : (avgProfit ? Infinity : 0);

    return {
      equity: equity.length ? equity[equity.length - 1].equity : 0,
      winRate: wr,
      avgProfit,
      avgLoss,
      trades: rows.length,
      avgRRR: rrN ? rrSum / rrN : 0,
      expectancy,
      profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
      maxDD: Math.round(maxDD * 10) / 10,
      maxWin: isFinite(maxWin) ? maxWin : 0,
      maxLoss: isFinite(maxLoss) ? maxLoss : 0,
    };
  }, [rows, equity]);

  /* --- Consistency Score & Gauge-Daten --- */
  const consistencyScore = useMemo(() => {
    const wr = stats.winRate; // 0–100
    // Volatilität des Tages-PL als Penalty (sanft)
    const byDay = new Map();
    rows.forEach((r) => {
      const k = r._ymd;
      byDay.set(k, (byDay.get(k) || 0) + r._pl);
    });
    const pls = [...byDay.values()];
    const mean = pls.length ? pls.reduce((a,b)=>a+b,0)/pls.length : 0;
    const std  = pls.length > 1
      ? Math.sqrt(pls.reduce((s,v)=>s + Math.pow(v-mean,2),0)/(pls.length-1))
      : 0;
    const volPenalty = Math.min(40, Math.log10(std + 10) * 10);
    return Math.max(0, Math.min(100, Math.round(wr - volPenalty)));
  }, [rows, stats.winRate]);

  // Hintergrund-Bänder (0–30 rot, 30–80 orange = 50 Punkte, 80–100 grün = 20 Punkte)
  const gaugeBands = [
    { name: "bad",  value: 30, fill: T.bad },
    { name: "mid",  value: 50, fill: T.mid },
    { name: "good", value: 20, fill: T.good },
  ];
  const gaugeValue = [{ name: "score", value: consistencyScore, fill: T.accent }];

  /* --- Daily Summary: alle Tage (absteigend) --- */
  const daily = useMemo(() => {
    const map = new Map();
    rows.forEach((t) => {
      const key = t._ymd;
      const o = map.get(key) || { trades: 0, pl: 0, date: new Date(key) };
      o.trades += 1;
      o.pl += t._pl;
      map.set(key, o);
    });
    return [...map.values()]
      .map((v) => ({
        ...v,
        label: `${pad(v.date.getDate())} ${v.date.toLocaleString(undefined, { month: "short" })}`,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rows]);

  /* ---------- UI-Bausteine ---------- */
  const statTile = (label, value, color) => (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          color: T.sub,
          fontWeight: 700,
          fontSize: 12,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: color || T.text,
          fontWeight: 900,
          fontSize: 18,
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  );

  /* ========================= Render ========================= */
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: -1, background: T.bg }} />

      <h1
        style={{
          margin: 0,
          color: T.text,
          fontSize: 34,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: stack ? "1fr" : "repeat(12, minmax(0, 1fr))",
          gap: 14,
        }}
      >
        {/* Consistency Score (halbkreis, farbige Bänder, echte Info beim Hover) */}
        <Card
          T={T}
          stack={stack}
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              Consistency Score
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <InfoTooltip
                  color={T.sub}
                  text={
                    <>
                      <b>Was ist das?</b>
                      <br />
                      Ein heuristischer Score aus Winrate und Stabilität (Volatilität der Tages-P/L).
                      Hohe Winrate + konstantere Tage → höherer Score.
                      <br />
                      <br />
                      <b>Bänder:</b> 0–30 (rot), 30–80 (orange), 80–100 (grün).
                    </>
                  }
                />
              </span>
            </span>
          }
          colSpan={4}
        >
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <RadialBarChart
                data={gaugeBands}
                startAngle={180}
                endAngle={0}
                innerRadius="62%"
                outerRadius="96%"
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                {/* Band-Hintergrund */}
                <RadialBar
                  dataKey="value"
                  clockWise
                  cornerRadius={0}
                  background={false}
                  fillOpacity={0.35}
                />
                {/* Score-Overlay */}
                <RadialBar
                  data={gaugeValue}
                  dataKey="value"
                  clockWise
                  cornerRadius={18}
                  innerRadius="68%"
                  outerRadius="100%"
                  background={false}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          {/* Prozent + Label in der Mitte */}
          <div style={{ textAlign: "center", marginTop: -36 }}>
            <div style={{ color: T.text, fontSize: 28, fontWeight: 900 }}>
              {consistencyScore}%
            </div>
            <div style={{ color: T.sub, fontWeight: 700, marginTop: 4 }}>
              {consistencyScore >= 80 ? "Excellent" : consistencyScore >= 60 ? "Good" : consistencyScore >= 30 ? "Average" : "Low"}
            </div>
          </div>

          {/* Segment-Legende wie auf dem Bild */}
          <div style={{ display: "flex", gap: 14, marginTop: 12, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: T.bad }} />
              <span style={{ color: T.sub, fontWeight: 700 }}>0 – 30%</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: T.mid }} />
              <span style={{ color: T.sub, fontWeight: 700 }}>30 – 80%</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: T.good }} />
              <span style={{ color: T.sub, fontWeight: 700 }}>80 – 100%</span>
            </span>
          </div>
        </Card>

        {/* Equity Curve */}
        <Card T={T} stack={stack} title="Equity Curve" colSpan={8}>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={equity} margin={{ left: 12, right: 28, top: 6, bottom: 18 }}>
                <defs>
                  <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.accent} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={T.accent} stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  tick={{ fill: T.sub, fontSize: 12 }}
                  tickMargin={10}
                  padding={{ left: 6, right: 16 }}
                  interval="preserveEnd"
                />
                <YAxis tick={{ fill: T.sub, fontSize: 12 }} tickMargin={10} />
                <Tooltip
                  contentStyle={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    color: T.text,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke={T.accent}
                  strokeWidth={2.2}
                  fill="url(#eqFill)"
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Statistics (angepasst; keine Lots/Sharpe) */}
        <Card T={T} stack={stack} title="Statistics" colSpan={6}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: stack ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {statTile("Equity", fmtMoney(stats.equity, currency))}
            {statTile("Win rate", `${stats.winRate.toFixed(2)}%`, stats.winRate >= 50 ? T.good : T.bad)}
            {statTile("Number of trades", `${stats.trades}`)}

            {statTile("Average profit", fmtMoney(stats.avgProfit, currency), T.good)}
            {statTile("Average loss", fmtMoney(-stats.avgLoss, currency), T.bad)}
            {statTile("Average RRR", stats.avgRRR.toFixed(2))}

            {statTile("Expectancy", fmtMoney(stats.expectancy, currency), stats.expectancy >= 0 ? T.good : T.bad)}
            {statTile("Profit factor", stats.profitFactor.toFixed(2))}
            {statTile("Max drawdown", `${stats.maxDD}%`, T.bad)}

            {statTile("Max win", fmtMoney(stats.maxWin, currency), T.good)}
            {statTile("Max loss", fmtMoney(stats.maxLoss, currency), T.bad)}
          </div>
        </Card>

        {/* Daily Summary – alle Tage, ohne „i“-Icon */}
        <Card T={T} stack={stack} title="Daily Summary" colSpan={6}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                background: dark ? "#1d1f25" : "#f7f9ff",
                color: T.sub,
                fontWeight: 700,
                padding: "10px 12px",
              }}
            >
              <div>Date</div>
              <div>Trades</div>
              <div>Result</div>
            </div>

            {daily.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "12px",
                  borderTop: `1px solid ${T.border}`,
                  alignItems: "center",
                }}
              >
                <div style={{ color: T.accent, fontWeight: 800 }}>{d.label}</div>
                <div style={{ color: T.text, fontWeight: 700 }}>{d.trades}</div>
                <div style={{ color: d.pl >= 0 ? T.good : T.bad, fontWeight: 900 }}>
                  {fmtMoney(d.pl, currency)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
