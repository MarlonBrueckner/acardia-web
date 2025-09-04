import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

/** ---- Theme (liest Darkmode aus Context oder Prop) ---- */
const theme = (dark = false) => ({
  dark,
  bg: dark ? "#1f1f1f" : "#f6f8fc",
  card: dark ? "#181818" : "#ffffff",
  text: dark ? "#ffffff" : "#121316",
  sub: dark ? "#BFC4CF" : "#495060",
  border: dark ? "#2a2a2f" : "#e3e7ef",
  accent: "#2c60fa",
  good: "#1cbf73",
  bad: "#ee4e4e",
});

/** ---- Utils ---- */
function defaultPipSize(symbol) {
  const s = String(symbol || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (/JPY$/.test(s)) return 0.01;
  if (s.startsWith("XAU")) return 0.1;
  if (s.startsWith("XAG")) return 0.01;
  return 0.0001;
}
function defaultContractSize(symbol) {
  const s = String(symbol || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (s.startsWith("XAU")) return 100;
  if (s.startsWith("XAG")) return 5000;
  return 100000;
}
function pipValuePerLot({ symbol, accountCcy, price, pipSize, contractSize, quoteToAccount = 1 }) {
  const s = String(symbol || "").toUpperCase().replace(/[^A-Z]/g, "");
  const base = s.slice(0, 3);
  const quote = s.slice(3);
  if (quote === accountCcy) return pipSize * contractSize;
  if (base === accountCcy) return price ? (pipSize * contractSize) / price : NaN;
  return price ? ((pipSize * contractSize) / price) * quoteToAccount : NaN;
}
function estimateMargin({ symbol, accountCcy, price, baseToAccount, units, leverage }) {
  const s = String(symbol || "").toUpperCase().replace(/[^A-Z]/g, "");
  const base = s.slice(0, 3);
  const quote = s.slice(3);
  let pxBaseAccount = NaN;
  if (accountCcy === base) pxBaseAccount = 1;
  else if (accountCcy === quote) pxBaseAccount = price || NaN;
  else pxBaseAccount = baseToAccount || NaN;
  if (!leverage || leverage <= 0 || !units || units <= 0) return NaN;
  if (!pxBaseAccount || Number.isNaN(pxBaseAccount)) return NaN;
  return (units * pxBaseAccount) / leverage;
}
function fmtMoney(v, ccy) {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  const dp = abs >= 100 ? 0 : abs >= 10 ? 2 : 3;
  return `${ccy} ${v.toFixed(dp)}`;
}
function fmtInt(v) {
  if (!Number.isFinite(v)) return "—";
  return Math.round(v).toLocaleString();
}
function buildNotes({ symbol, accountCcy, price, quoteToAccount, pipSize, contractSize }) {
  const s = symbol.toUpperCase();
  const base = s.slice(0, 3);
  const quote = s.slice(3);
  const out = [];
  out.push(`Symbol ${s}: base=${base}, quote=${quote}, pipSize=${pipSize}, contractSize=${contractSize}.`);
  if (quote === accountCcy) out.push(`Quote equals account (${accountCcy}) → pipValuePerLot = pipSize × contractSize.`);
  else if (base === accountCcy) out.push(`Base equals account (${accountCcy}) → pipValuePerLot = (pipSize × contractSize) / price.`);
  else out.push(`Cross: pipValuePerLot = ((pipSize × contractSize) / price) × (Quote→Account).`);
  if (!price) out.push("Enter current Base/Quote price for accurate pip value.");
  if (quote !== accountCcy && !quoteToAccount) out.push("Quote→Account rate missing (only needed for crosses).");
  return out;
}

/** ---- Hauptkomponente ---- */
export default function LotSizeCalculator(props) {
  const ctx = useOutletContext?.() || {};
  const dark = props.dark ?? ctx.dark ?? false;   // ← kommt vom Layout
  const T = theme(dark);

  // Eingaben
  const [accountCcy, setAccountCcy] = useState("USD");
  const [balance, setBalance] = useState(10000);
  const [riskMode, setRiskMode] = useState("percent");
  const [riskPercent, setRiskPercent] = useState(1);
  const [riskAmount, setRiskAmount] = useState(100);

  const [symbol, setSymbol] = useState("EURUSD");
  const [price, setPrice] = useState(1.09);
  const [stopPips, setStopPips] = useState(20);
  const [pipSize, setPipSize] = useState(defaultPipSize("EURUSD"));
  const [contractSize, setContractSize] = useState(defaultContractSize("EURUSD"));

  // Cross Conversion (einklappbar)
  const [quoteToAccount, setQuoteToAccount] = useState(1);
  const [baseToAccount, setBaseToAccount] = useState("");
  const [showCross, setShowCross] = useState(false);

  // Anzeige
  const [leverage, setLeverage] = useState(30);
  const [roundTo, setRoundTo] = useState(0.01);

  function onSymbolChange(v) {
    const vv = v.toUpperCase();
    setSymbol(vv);
    setPipSize(defaultPipSize(vv));
    setContractSize(defaultContractSize(vv));
  }

  const calc = useMemo(() => {
    const b = Number(balance) || 0;
    const p = Number(price) || 0;
    const ps = Number(pipSize) || 0;
    const cs = Number(contractSize) || 0;
    const sl = Number(stopPips) || 0;
    const q2a = Number(quoteToAccount) || 0;
    const lvg = Number(leverage) || 0;
    const b2a = baseToAccount !== "" ? Number(baseToAccount) : undefined;

    const riskA = riskMode === "percent"
      ? Math.max(0, b * (Number(riskPercent) / 100))
      : Math.max(0, Number(riskAmount));

    const pvLot = pipValuePerLot({
      symbol, accountCcy, price: p, pipSize: ps, contractSize: cs, quoteToAccount: q2a || 1,
    });

    let lots = (pvLot > 0 && sl > 0) ? (riskA / (pvLot * sl)) : NaN;
    if (!Number.isNaN(lots) && lots > 0 && roundTo > 0) {
      const inv = 1 / roundTo;
      lots = Math.floor(lots * inv + 0.5) / inv;
    }
    const units = !Number.isNaN(lots) ? lots * cs : NaN;
    const margin = estimateMargin({ symbol, accountCcy, price: p, baseToAccount: b2a, units, leverage: lvg });

    return {
      riskA, pvLot, lots, units, margin,
      notes: buildNotes({ symbol, accountCcy, price: p, quoteToAccount: q2a, pipSize: ps, contractSize: cs }),
    };
  }, [
    accountCcy, balance, riskMode, riskPercent, riskAmount,
    symbol, price, stopPips, pipSize, contractSize,
    quoteToAccount, baseToAccount, leverage, roundTo
  ]);

  return (
<div style={{ background: T.bg, minHeight: "100%", color: T.text }}>
  {/* Volle Breite + großzügiges Padding */}
  <div style={{ width: "100%", margin: 0, padding: "0px 5px" }}>
    <h1
      style={{
        marginTop: 0,          // kein unnötiger Abstand oben
        marginBottom: 10,      // nur unten etwas Abstand
        fontSize: 34,          // größere Schrift
        fontWeight: 700,       // extra fett
        letterSpacing: 0.3,    // leichte Spreizung
      }}
    >
      Lot Size Calculator
    </h1>

  

        <div style={{ display: "grid", gap: 14 }}>
          {/* Account & Risk */}
          <Card T={T} title="Account & Risk">
            <Row>
              <Field label="Account currency">
                <Select value={accountCcy} onChange={setAccountCcy} T={T} options={["USD","EUR","GBP","JPY","CHF","AUD","CAD","NZD"]}/>
              </Field>
              <Field label="Account balance">
                <InputNumber value={balance} onChange={setBalance} T={T} suffix={accountCcy}/>
              </Field>
              <Field label="Round lots to">
                <Select
                  value={roundTo}
                  onChange={(v)=>setRoundTo(Number(v))}
                  T={T}
                  options={[1,0.5,0.1,0.05,0.02,0.01,0.001]}
                />
              </Field>
            </Row>

            <Row>
              <Field label="Risk mode">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Chip T={T} active={riskMode==="percent"} onClick={()=>setRiskMode("percent")}>Percent</Chip>
                  <Chip T={T} active={riskMode==="amount"}  onClick={()=>setRiskMode("amount")}>Fixed amount</Chip>
                </div>
              </Field>

              {riskMode === "percent" ? (
                <>
                  <Field label="Risk %">
                    <InputNumber value={riskPercent} onChange={setRiskPercent} T={T} suffix="%"/>
                  </Field>
                  <Field label="= Risk amount (auto)">
                    <ReadOnly T={T} value={fmtMoney(calc.riskA, accountCcy)} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Risk amount">
                    <InputNumber value={riskAmount} onChange={setRiskAmount} T={T} suffix={accountCcy}/>
                  </Field>
                  <Field label="= Risk % (auto)">
                    <ReadOnly
                      T={T}
                      value={
                        Number(balance) > 0
                          ? `${((calc.riskA / Number(balance)) * 100).toFixed(2)} %`
                          : "—"
                      }
                    />
                  </Field>
                </>
              )}
            </Row>
          </Card>

          {/* Symbol & Stops */}
          <Card T={T} title="Symbol & Stops">
            <Row>
              <Field label="Symbol">
                <Input value={symbol} onChange={onSymbolChange} T={T} placeholder="e.g. EURUSD"/>
              </Field>
              <Field label="Current price (Base/Quote)">
                <InputNumber value={price} onChange={setPrice} T={T}/>
              </Field>
              <Field label="Stop-loss (pips)">
                <InputNumber value={stopPips} onChange={setStopPips} T={T}/>
              </Field>
            </Row>
            <Row>
              <Field label="Pip size">
                <InputNumber value={pipSize} onChange={setPipSize} T={T}/>
              </Field>
              <Field label="Contract size (units per 1.0 lot)">
                <InputNumber value={contractSize} onChange={setContractSize} T={T}/>
              </Field>
              <Field label="Leverage (for margin estimate)">
                <InputNumber value={leverage} onChange={setLeverage} T={T}/>
              </Field>
            </Row>
          </Card>

          {/* Cross conversion – einklappbar */}
          <CardHeaderToggle
            T={T}
            title="Cross conversion (optional)"
            open={showCross}
            onToggle={() => setShowCross((v) => !v)}
          />
          {showCross && (
            <Card T={T} noTitle>
              <Row>
                <Field label="Quote → Account rate">
                  <InputNumber value={quoteToAccount} onChange={setQuoteToAccount} T={T}/>
                  <Small color={T.sub}>Needed when Quote currency ≠ Account currency (e.g., Account=EUR, Symbol=GBPJPY → need JPY→EUR).</Small>
                </Field>
                <Field label="Base → Account (for margin)">
                  <InputNumber value={baseToAccount} onChange={setBaseToAccount} T={T} allowEmpty />
                  <Small color={T.sub}>Only for margin estimate when Account isn’t Base/Quote.</Small>
                </Field>
                <div />
              </Row>
            </Card>
          )}

          {/* Ergebnisse – mit blauem Rahmen + Glow */}
          <Card T={T} title="Results">
            <Row>
              <Field label="Pip value per 1.0 lot">
                <ResultBox
                  T={T}
                  value={
                    Number.isFinite(calc.pvLot)
                      ? `${fmtMoney(calc.pvLot, accountCcy)} / pip`
                      : "Need price / conversion"
                  }
                />
              </Field>
              <Field label="Position size">
                <ResultBox
                  T={T}
                  value={
                    Number.isFinite(calc.lots)
                      ? `${calc.lots.toFixed(3)} lots  (${fmtInt(calc.units)} units)`
                      : "—"
                  }
                />
              </Field>
              <Field label="Estimated margin">
                <ResultBox
                  T={T}
                  value={Number.isFinite(calc.margin) ? fmtMoney(calc.margin, accountCcy) : "—"}
                />
              </Field>
            </Row>

            <div style={{ marginTop: 10, color: T.sub, fontSize: 13 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Notes</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {calc.notes.map((n, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{n}</li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** ---- UI-Bausteine ---- */
function Card({ T, title, noTitle, children }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 14,
      }}
    >
      {!noTitle && (
        <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 15 }}>{title}</div>
      )}
      {children}
    </div>
  );
}
function CardHeaderToggle({ T, title, open, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 12,
        cursor: "pointer",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
      title={open ? "Collapse" : "Expand"}
    >
      <span
        style={{
          display: "inline-block",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform .15s",
          fontWeight: 900,
          color: T.text,
        }}
      >
        ›
      </span>
      <div style={{ fontWeight: 800 }}>{title}</div>
    </div>
  );
}
function Row({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        // breiter: auf großen Screens 3 Spalten
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        alignItems: "start",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.85 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, T, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      placeholder={placeholder}
      style={baseInputStyle(T)}
    />
  );
}
function InputNumber({ value, onChange, T, suffix, allowEmpty=false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        value={allowEmpty && value === "" ? "" : String(value)}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (allowEmpty && v === "") return onChange("");
          const n = Number(v);
          if (Number.isFinite(n) || v === "" || v === "-" || v === "." || v === "-.") {
            onChange(v === "" ? "" : n);
          }
        }}
        style={baseInputStyle(T)}
        inputMode="decimal"
      />
      {suffix && <span style={{ color: T.sub, fontWeight: 700 }}>{suffix}</span>}
    </div>
  );
}
function Select({ value, onChange, T, options }) {
  return (
    <select
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      style={{ ...baseInputStyle(T), appearance: "menulist" }}
    >
      {options.map((o)=>(
        <option key={String(o)} value={o}>{String(o)}</option>
      ))}
    </select>
  );
}
function ReadOnly({ T, value }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${T.border}`,
        background: T.dark ? "#151922" : "#f2f5fb",
        fontWeight: 800,
      }}
    >
      {value}
    </div>
  );
}
/** Ergebnisbox mit blauem Rahmen + Glow */
function ResultBox({ T, value }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: `2px solid ${T.accent}`,
        background: T.dark ? "#111521" : "#f7faff",
        fontWeight: 900,
        boxShadow:
          `0 0 0 3px rgba(44,96,250,.12),
           0 10px 24px rgba(44,96,250,.18),
           inset 0 1px 0 rgba(255,255,255,.05)`,
      }}
    >
      {value}
    </div>
  );
}

const baseInputStyle = (T) => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${T.border}`,
  background: T.card,
  color: T.text,
  fontWeight: 700,
  outline: "none",
});
function Chip({ T, active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: `1px solid ${active ? T.accent : T.border}`,
        background: active ? T.accent : "transparent",
        color: active ? "#fff" : T.text,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
function Small({ children, color }) {
  return <div style={{ marginTop: 6, color, fontSize: 12 }}>{children}</div>;
}
