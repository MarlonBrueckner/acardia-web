
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";

import SymbolPicker from "./SymbolPicker"; // Pfad ggf. anpassen

import { FiX, FiChevronDown, FiImage  } from "react-icons/fi";
import { FaSmile, FaMeh, FaFrown } from "react-icons/fa";


/* -------------------- THEME -------------------- */
const palette = {
  dark: {
    bg: "#181818",
    panel: "#1f1f1f",
    text: "#ffffff",
    sub: "#bfc4cf",
    border: "#4e4e4eff ",
    input: "#1f1f1f",
    inputBorder: "#4e4e4eff",
    accent: "#2c60fa",
    shadow: "0 6px 40px rgba(0,0,0,.45)"
  },
  light: {
    bg: "#ffffff",
    panel: "#ffffff",
    text: "#23232a",
    sub: "#495060",
    border: "#e3e7ef",
    input: "#edf2fa",
    inputBorder: "#e3e7ef",
    accent: "#2c60fa",
    shadow: "0 10px 40px rgba(30,36,64,.18)"
  }
};

function useTheme(dark) {
  return useMemo(() => (dark ? palette.dark : palette.light), [dark]);
}

/* -------------------- HELPERS -------------------- */
const pad2 = n => (n < 10 ? `0${n}` : `${n}`);
function formatDateDDMMYY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${pad2(+d)}.${pad2(+m)}.${String(y).slice(2)}`;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function nowHM() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }).toUpperCase();
}

/* TradingView API Suche */
async function fetchTVSymbols(query) {
  if (!query) return [];
  const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(query)}&lang=en`;
  const res = await fetch(url);
  const data = await res.json();
  return (data || []).map(d => ({
    name: d.symbol,
    desc: d.description,
    exchange: d.exchange
  }));
}

/* -------------------- UI Basics -------------------- */
function FieldLabel({ children, theme }) {
  return (
    <div style={{ color: theme.sub, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
      {children}
    </div>
  );
}






function TextInput({ theme, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        background: theme.input,
        border: `1px solid ${theme.inputBorder}`,
        borderRadius: 10,
        padding: "11px 12px",
        color: theme.text,
        fontSize: 15,
        outline: "none"
      }}
    />
  );
}
function CustomSelect({ theme, value, onChange, options }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      {/* Aktuell gewählte Option */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: theme.input,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: 10,
          padding: "11px 36px 11px 12px",
          color: theme.text,
          cursor: "pointer",
          userSelect: "none"
        }}
      >
        {value}
        <FiChevronDown
  size={18}
  style={{
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: theme.sub
  }}
/>

      </div>

      {/* Dropdown-Liste */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: theme.panel, // im Dark Mode dunkel, im Light Mode weiß
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 10,
            boxShadow: theme.shadow,
            zIndex: 10
          }}
        >
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => {
                onChange({ target: { value: opt } });
                setOpen(false);
              }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                color: theme.text
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.input)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TextArea({ theme, ...props }) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        background: theme.input,
        border: `1px solid ${theme.inputBorder}`,
        borderRadius: 10,
        padding: "10px 12px",
        color: theme.text,
        fontSize: 15,
        resize: "vertical",
        minHeight: 110
      }}
    />
  );
}



function PositionSegment({ value, onChange, theme }) {
  const isBuy = value === "Buy";

  return (
    <div
      role="tablist"
      aria-label="Position"
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        borderRadius: 14,
        background: `${theme.input}AA`,              // leicht transparent wie Confluences
        border: `1px solid ${theme.inputBorder}`,
        padding: 0,
        height: 50,
        userSelect: "none",
        overflow: "hidden"
      }}
    >
      {/* Sliding Highlight */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 4,
          width: "calc(50% - 4px)",
          borderRadius: 10,
          background: `${theme.accent}33`,          // Accent mit Transparenz
          border: `1px solid ${theme.accent}`,
          transform: isBuy ? "translateX(0)" : "translateX(100%)",
          transition: "transform .22s cubic-bezier(.25,.8,.25,1)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,.08), 0 6px 18px rgba(0,0,0,.08)"
        }}
      />

      {/* Buy */}
      <button
        role="tab"
        aria-selected={isBuy}
        type="button"
        onClick={() => onChange("Buy")}
        style={{
          zIndex: 1,
          border: "none",
          background: "transparent",
          color: theme.text,
          fontWeight: 600,
          fontSize: 14,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color .15s ease",
          // optionaler Glow beim Hover
          boxShadow: "none",
          cursor: "pointer"
        }}
      >
        Buy
      </button>

      {/* Sell */}
      <button
        role="tab"
        aria-selected={!isBuy}
        type="button"
        onClick={() => onChange("Sell")}
        style={{
          zIndex: 1,
          border: "none",
          background: "transparent",
          color: theme.text,
          fontWeight: 600,
          fontSize: 14,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color .15s ease",
          cursor: "pointer"
        }}
      >
        Sell
      </button>
    </div>
  );
}





/* -------------------- Component -------------------- */
export default function NewTradePanel({ open, onClose, dark = true }) {
  const theme = useTheme(dark);
  const db = getFirestore();
  const uid = getAuth().currentUser?.uid;
// FAVORITES (Firestore)
// RICHTIG
const [favSymbols, setFavSymbols] = useState([]);
const [favIds, setFavIds] = useState({});

// Kategorien (vereinfacht – erweitere mit deiner großen Liste)
const categories = useMemo(() => ({
  Forex: [
      "🇦🇺🇨🇦 AUD/CAD",
            "🇦🇺🇨🇭 AUD/CHF",
            "🇦🇺🇨🇳 AUD/CNH",
            "🇦🇺🇨🇿 AUD/CZK",
            "🇦🇺🇩🇰 AUD/DKK",
            "🇦🇺🇭🇰 AUD/HKD",
            "🇦🇺🇭🇺 AUD/HUF",
            "🇦🇺🇯🇵 AUD/JPY",
            "🇦🇺🇲🇽 AUD/MXN",
            "🇦🇺🇳🇴 AUD/NOK",
            "🇦🇺🇳🇿 AUD/NZD",
            "🇦🇺🇵🇱 AUD/PLN",
            "🇦🇺🇸🇪 AUD/SEK",
            "🇦🇺🇸🇬 AUD/SGD",
            "🇦🇺🇺🇸 AUD/USD",
            "🇦🇺🇿🇦 AUD/ZAR",
            "🇨🇦🇨🇭 CAD/CHF",
            "🇨🇦🇨🇳 CAD/CNH",
            "🇨🇦🇨🇿 CAD/CZK",
            "🇨🇦🇩🇰 CAD/DKK",
            "🇨🇦🇭🇰 CAD/HKD",
            "🇨🇦🇭🇺 CAD/HUF",
            "🇨🇦🇯🇵 CAD/JPY",
            "🇨🇦🇲🇽 CAD/MXN",
            "🇨🇦🇳🇴 CAD/NOK",
            "🇨🇦🇵🇱 CAD/PLN",
            "🇨🇦🇸🇪 CAD/SEK",
            "🇨🇦🇸🇬 CAD/SGD",
            "🇨🇦🇿🇦 CAD/ZAR",
            "🇨🇭🇨🇳 CHF/CNH",
            "🇨🇭🇨🇿 CHF/CZK",
            "🇨🇭🇩🇰 CHF/DKK",
            "🇨🇭🇭🇰 CHF/HKD",
            "🇨🇭🇭🇺 CHF/HUF",
            "🇨🇭🇯🇵 CHF/JPY",
            "🇨🇭🇲🇽 CHF/MXN",
            "🇨🇭🇳🇴 CHF/NOK",
            "🇨🇭🇵🇱 CHF/PLN",
            "🇨🇭🇸🇪 CHF/SEK",
            "🇨🇭🇸🇬 CHF/SGD",
            "🇨🇭🇹🇷 CHF/TRY",
            "🇨🇭🇿🇦 CHF/ZAR",
            "🇩🇰🇨🇿 DKK/CZK",
            "🇩🇰🇭🇰 DKK/HKD",
            "🇩🇰🇭🇺 DKK/HUF",
            "🇩🇰🇲🇽 DKK/MXN",
            "🇩🇰🇳🇴 DKK/NOK",
            "🇩🇰🇵🇱 DKK/PLN",
            "🇩🇰🇸🇪 DKK/SEK",
            "🇩🇰🇸🇬 DKK/SGD",
            "🇩🇰🇿🇦 DKK/ZAR",
            "🇪🇺🇦🇺 EUR/AUD",
            "🇪🇺🇨🇦 EUR/CAD",
            "🇪🇺🇨🇭 EUR/CHF",
            "🇪🇺🇨🇳 EUR/CNH",
            "🇪🇺🇨🇿 EUR/CZK",
            "🇪🇺🇩🇰 EUR/DKK",
            "🇪🇺🇬🇧 EUR/GBP",
            "🇪🇺🇭🇰 EUR/HKD",
            "🇪🇺🇭🇺 EUR/HUF",
            "🇪🇺🇮🇱 EUR/ILS",
            "🇪🇺🇯🇵 EUR/JPY",
            "🇪🇺🇲🇽 EUR/MXN",
            "🇪🇺🇳🇴 EUR/NOK",
            "🇪🇺🇳🇿 EUR/NZD",
            "🇪🇺🇵🇱 EUR/PLN",
            "🇪🇺🇸🇪 EUR/SEK",
            "🇪🇺🇸🇬 EUR/SGD",
            "🇪🇺🇹🇷 EUR/TRY",
            "🇪🇺🇺🇸 EUR/USD",
            "🇪🇺🇿🇦 EUR/ZAR",

            "🇬🇧🇦🇺 GBP/AUD",
            "🇬🇧🇨🇦 GBP/CAD",
            "🇬🇧🇨🇭 GBP/CHF",
            "🇬🇧🇨🇳 GBP/CNH",
            "🇬🇧🇨🇿 GBP/CZK",
            "🇬🇧🇩🇰 GBP/DKK",
            "🇬🇧🇭🇰 GBP/HKD",
            "🇬🇧🇭🇺 GBP/HUF",
            "🇬🇧🇯🇵 GBP/JPY",
            "🇬🇧🇲🇽 GBP/MXN",
            "🇬🇧🇳🇴 GBP/NOK",
            "🇬🇧🇳🇿 GBP/NZD",
            "🇬🇧🇵🇱 GBP/PLN",
            "🇬🇧🇸🇪 GBP/SEK",
            "🇬🇧🇸🇬 GBP/SGD",
            "🇬🇧🇺🇸 GBP/USD",
            "🇬🇧🇿🇦 GBP/ZAR",

            "🇯🇵🇨🇿 JPY/CZK",
            "🇯🇵🇩🇰 JPY/DKK",
            "🇯🇵🇭🇰 JPY/HKD",
            "🇯🇵🇭🇺 JPY/HUF",
            "🇯🇵🇲🇽 JPY/MXN",
            "🇯🇵🇳🇴 JPY/NOK",
            "🇯🇵🇵🇱 JPY/PLN",
            "🇯🇵🇸🇪 JPY/SEK",
            "🇯🇵🇸🇬 JPY/SGD",
            "🇯🇵🇿🇦 JPY/ZAR",

            "🇳🇴🇨🇿 NOK/CZK",
            "🇳🇴🇭🇰 NOK/HKD",
            "🇳🇴🇭🇺 NOK/HUF",
            "🇳🇴🇲🇽 NOK/MXN",
            "🇳🇴🇵🇱 NOK/PLN",
            "🇳🇴🇸🇪 NOK/SEK",
            "🇳🇴🇸🇬 NOK/SGD",
            "🇳🇴🇿🇦 NOK/ZAR",

            "🇳🇿🇨🇦 NZD/CAD",
            "🇳🇿🇨🇭 NZD/CHF",
            "🇳🇿🇨🇿 NZD/CZK",
            "🇳🇿🇩🇰 NZD/DKK",
            "🇳🇿🇭🇰 NZD/HKD",
            "🇳🇿🇭🇺 NZD/HUF",
            "🇳🇿🇯🇵 NZD/JPY",
            "🇳🇿🇲🇽 NZD/MXN",
            "🇳🇿🇳🇴 NZD/NOK",
            "🇳🇿🇵🇱 NZD/PLN",
            "🇳🇿🇸🇪 NZD/SEK",
            "🇳🇿🇸🇬 NZD/SGD",
            "🇳🇿🇺🇸 NZD/USD",
            "🇳🇿🇿🇦 NZD/ZAR",
            "🇺🇸🇨🇦 USD/CAD",
            "🇺🇸🇨🇭 USD/CHF",
            "🇺🇸🇨🇳 USD/CNH",
            "🇺🇸🇨🇿 USD/CZK",
            "🇺🇸🇩🇰 USD/DKK",
            "🇺🇸🇭🇰 USD/HKD",
            "🇺🇸🇭🇺 USD/HUF",
            "🇺🇸🇮🇱 USD/ILS",
            "🇺🇸🇯🇵 USD/JPY",
            "🇺🇸🇲🇽 USD/MXN",
            "🇺🇸🇳🇴 USD/NOK",
            "🇺🇸🇵🇱 USD/PLN",
            "🇺🇸🇸🇪 USD/SEK",
            "🇺🇸🇸🇬 USD/SGD",
            "🇺🇸🇹🇷 USD/TRY",
            "🇺🇸🇿🇦 USD/ZAR",
            "🥇🇺🇸 XAU/USD",
               "🥇🇪🇺 XAU/EUR",
               "🥇🇬🇧 XAU/GBP",
               "🥇🇯🇵 XAU/JPY",
               "🥇🇨🇦 XAU/CAD",
               "🥇🇦🇺 XAU/AUD",
               "🥇🇨🇭 XAU/CHF",
               "🥇🇳🇿 XAU/NZD",
               "🥇🇹🇷 XAU/TRY",

               // Silver vs Major Currencies
               "🥈🇺🇸 XAG/USD",
               "🥈🇪🇺 XAG/EUR",
               "🥈🇬🇧 XAG/GBP",
               "🥈🇯🇵 XAG/JPY",
               "🥈🇨🇦 XAG/CAD",
               "🥈🇦🇺 XAG/AUD",
               "🥈🇨🇭 XAG/CHF",
               "🥈🇳🇿 XAG/NZD",
               "🥈🇹🇷 XAG/TRY",
  ],
  Stocks: [
    "🇺🇸 AAPL – Apple Inc.",
                        "🇺🇸 MSFT – Microsoft Corporation",
                        "🇺🇸 GOOGL – Alphabet Inc. (Class A)",
                        "🇺🇸 GOOG – Alphabet Inc. (Class C)",
                        "🇺🇸 AMZN – Amazon.com, Inc.",
                        "🇺🇸 NVDA – NVIDIA Corporation",
                        "🇺🇸 META – Meta Platforms, Inc.",
                        "🇺🇸 ORCL – Oracle Corporation",
                        "🇺🇸 CRM – Salesforce, Inc.",
                        "🇺🇸 IBM – International Business Machines",

                        // Consumer Electronics & Internet
                        "🇺🇸 TSLA – Tesla, Inc.",
                        "🇺🇸 ADBE – Adobe Inc.",
                        "🇺🇸 INTC – Intel Corporation",
                        "🇺🇸 AMD – Advanced Micro Devices, Inc.",
                        "🇺🇸 CSCO – Cisco Systems, Inc.",
                        "🇺🇸 QCOM – QUALCOMM Incorporated",
                        "🇺🇸 AMAT – Applied Materials, Inc.",
                        "🇺🇸 ADI – Analog Devices, Inc.",
                        "🇺🇸 MU – Micron Technology, Inc.",
                        "🇺🇸 TXN – Texas Instruments Incorporated",

                        // Communication Services
                        "🇺🇸 NFLX – Netflix, Inc.",
                        "🇺🇸 CMCSA – Comcast Corporation",
                        "🇺🇸 DIS – The Walt Disney Company",
                        "🇺🇸 VZ – Verizon Communications Inc.",
                        "🇺🇸 T – AT&T Inc.",
                        "🇺🇸 TMUS – T-Mobile US, Inc.",
                        "🇺🇸 TM – Toyota Motor Corporation ADR",
                        "🇺🇸 BIDU – Baidu, Inc.",
                        "🇺🇸 SPOT – Spotify Technology S.A.",
                        "🇺🇸 TWTR – X Corp. (Twitter)",

                        // Consumer Discretionary
                        "🇺🇸 MCD – McDonald's Corporation",
                        "🇺🇸 NKE – NIKE, Inc.",
                        "🇺🇸 SBUX – Starbucks Corporation",
                        "🇺🇸 HD – The Home Depot, Inc.",
                        "🇺🇸 LOW – Lowe's Companies, Inc.",
                        "🇺🇸 CMG – Chipotle Mexican Grill, Inc.",
                        "🇺🇸 BKNG – Booking Holdings Inc.",
                        "🇺🇸 EBAY – eBay Inc.",
                        "🇺🇸 UBER – Uber Technologies, Inc.",
                        "🇺🇸 LYFT – Lyft, Inc.",

                        // Consumer Staples
                        "🇺🇸 PG – Procter & Gamble Co.",
                        "🇺🇸 KO – The Coca-Cola Company",
                        "🇺🇸 PEP – PepsiCo, Inc.",
                        "🇺🇸 WMT – Walmart Inc.",
                        "🇺🇸 COST – Costco Wholesale Corporation",
                        "🇺🇸 CL – Colgate-Palmolive Company",
                        "🇺🇸 KHC – The Kraft Heinz Company",
                        "🇺🇸 MDLZ – Mondelez International, Inc.",
                        "🇺🇸 GIS – General Mills, Inc.",
                        "🇺🇸 CLX – The Clorox Company",

                        // Healthcare
                        "🇺🇸 UNH – UnitedHealth Group Incorporated",
                        "🇺🇸 JNJ – Johnson & Johnson",
                        "🇺🇸 PFE – Pfizer Inc.",
                        "🇺🇸 MRK – Merck & Co., Inc.",
                        "🇺🇸 LLY – Eli Lilly and Company",
                        "🇺🇸 ABT – Abbott Laboratories",
                        "🇺🇸 AMGN – Amgen Inc.",
                        "🇺🇸 BMY – Bristol-Myers Squibb Company",
                        "🇺🇸 GILD – Gilead Sciences, Inc.",
                        "🇺🇸 ZTS – Zoetis Inc.",

                        // Financials
                        "🇺🇸 JPM – JPMorgan Chase & Co.",
                        "🇺🇸 BAC – Bank of America Corporation",
                        "🇺🇸 WFC – Wells Fargo & Company",
                        "🇺🇸 C – Citigroup Inc.",
                        "🇺🇸 GS – The Goldman Sachs Group, Inc.",
                        "🇺🇸 MS – Morgan Stanley",
                        "🇺🇸 V – Visa Inc.",
                        "🇺🇸 MA – Mastercard Incorporated",
                        "🇺🇸 AXP – American Express Company",
                        "🇺🇸 PYPL – PayPal Holdings, Inc.",

                        // Industrials
                        "🇺🇸 BA – The Boeing Company",
                        "🇺🇸 CAT – Caterpillar Inc.",
                        "🇺🇸 DE – Deere & Company",
                        "🇺🇸 UPS – United Parcel Service, Inc.",
                        "🇺🇸 FDX – FedEx Corporation",
                        "🇺🇸 GE – General Electric Company",
                        "🇺🇸 LMT – Lockheed Martin Corporation",
                        "🇺🇸 RTX – RTX Corporation",
                        "🇺🇸 HON – Honeywell International Inc.",
                        "🇺🇸 MMM – 3M Company",

                        // Energy
                        "🇺🇸 XOM – Exxon Mobil Corporation",
                        "🇺🇸 CVX – Chevron Corporation",
                        "🇺🇸 COP – ConocoPhillips",
                        "🇺🇸 SLB – SLB (Schlumberger Limited)",
                        "🇺🇸 EOG – EOG Resources, Inc.",
                        "🇺🇸 PXD – Pioneer Natural Resources Company",
                        "🇺🇸 PSX – Phillips 66",
                        "🇺🇸 VLO – Valero Energy Corporation",
                        "🇺🇸 OXY – Occidental Petroleum Corporation",
                        "🇺🇸 HAL – Halliburton Company",

                        // Materials
                        "🇺🇸 LIN – Linde plc",
                        "🇺🇸 SHW – The Sherwin-Williams Company",
                        "🇺🇸 FCX – Freeport-McMoRan Inc.",
                        "🇺🇸 DD – DuPont de Nemours, Inc.",
                        "🇺🇸 APD – Air Products & Chemicals, Inc.",
                        "🇺🇸 NUE – Nucor Corporation",
                        "🇺🇸 ECL – Ecolab Inc.",
                        "🇺🇸 MLM – Martin Marietta Materials, Inc.",
                        "🇺🇸 CF – CF Industries Holdings, Inc.",
                        "🇺🇸 MOS – The Mosaic Company",

                        // Utilities
                        "🇺🇸 NEE – NextEra Energy, Inc.",
                        "🇺🇸 D – Dominion Energy, Inc.",
                        "🇺🇸 SO – The Southern Company",
                        "🇺🇸 DUK – Duke Energy Corporation",
                        "🇺🇸 AEP – American Electric Power Company, Inc.",
                        "🇺🇸 EXC – Exelon Corporation",
                        "🇺🇸 XEL – Xcel Energy Inc.",
                        "🇺🇸 ETR – Entergy Corporation",
                        "🇺🇸 PEG – Public Service Enterprise Group Incorporated",
                        "🇺🇸 PCG – PG&E Corporation",

                        // Real Estate
                        "🇺🇸 PLD – Prologis, Inc.",
                        "🇺🇸 SPG – Simon Property Group, Inc.",
                        "🇺🇸 AMT – American Tower Corporation",
                        "🇺🇸 PSA – Public Storage",
                        "🇺🇸 EQIX – Equinix, Inc.",
                        "🇺🇸 VTR – Ventas, Inc.",
                        "🇺🇸 WELL – Welltower Inc.",
                        "🇺🇸 EQR – Equity Residential",
                        "🇺🇸 CCI – Crown Castle International Corp.",
                        "🇺🇸 AVB – AvalonBay Communities, Inc.",

                        // Communications Equipment
                        "🇺🇸 TMO – Thermo Fisher Scientific Inc.",
                        "🇺🇸 ZM – Zoom Video Communications, Inc.",
                        "🇺🇸 DOCU – DocuSign, Inc.",
                        "🇺🇸 SNPS – Synopsys, Inc.",
                        "🇺🇸 FISV – Fiserv, Inc.",
                        "🇨🇳 BABA – Alibaba Group Holding Ltd.",
                         "🇨🇳 TCEHY – Tencent Holdings Ltd.",
                         "🇨🇳 3690.HK – Meituan",
                         "🇨🇳 PDD – Pinduoduo Inc.",
                         "🇨🇳 JD – JD.com, Inc.",
                         "🇨🇳 BIDU – Baidu, Inc.",
                         "🇨🇳 NTES – NetEase, Inc.",
                         "🇨🇳 0981.HK – Xiaomi Corporation",
                         "🇨🇳 0941.HK – China Mobile Ltd.",
                         "🇨🇳 0267.HK – Lenovo Group Ltd.",
                         "🇨🇳 0700.HK – Tencent Holdings Ltd. (HK)",
                         "🇨🇳 NIO – NIO Inc.",
                         "🇨🇳 1211.HK – BYD Company Ltd.",
                         "🇨🇳 LI – Li Auto Inc.",
                         "🇨🇳 XPEV – XPeng Inc.",
                         "🇨🇳 2388.HK – Kingsoft Corp.",
                         "🇨🇳 9988.HK – Alibaba Group Holding Ltd. (HK)",
                         "🇨🇳 1928.HK – Sands China Ltd.",
                         "🇨🇳 2318.HK – Ping An Insurance (Group) Co.",
                         "🇨🇳 1288.HK – Agricultural Bank of China Ltd.",
                         "🇨🇳 0939.HK – China Construction Bank Corp.",
                         "🇨🇳 1398.HK – Industrial & Commercial Bank of China",
                         "🇨🇳 2628.HK – China Life Insurance Co.",
                         "🇨🇳 3988.HK – Bank of China Ltd.",
                         "🇨🇳 0857.HK – PetroChina Co. Ltd.",
                         "🇨🇳 0386.HK – China Petroleum & Chemical Corp. (Sinopec)",
                         "🇨🇳 0883.HK – CNOOC Ltd.",
                         "🇨🇳 0942.HK – China Resources Beer (Holdings) Co.",
                         "🇨🇳 0005.HK – HSBC Holdings plc",
                         "🇨🇳 0011.HK – Hang Seng Bank Ltd.",
                         "🇨🇳 0017.HK – New World Development Co. Ltd.",
                         "🇨🇳 0014.HK – Henderson Land Development Co. Ltd.",
                         "🇨🇳 1113.HK – CK Asset Holdings Ltd.",
                         "🇨🇳 0836.HK – China Overseas Land & Investment Ltd.",
                         "🇨🇳 0388.HK – Hong Kong Exchanges & Clearing Ltd.",
                         "🇨🇳 0175.HK – Geely Automobile Holdings Ltd.",
                         "🇨🇳 2333.HK – Great Wall Motor Co. Ltd.",
                         "🇨🇳 0019.HK – Swire Pacific Ltd.",
                         "🇨🇳 0306.HK – China Petroleum & Chemical Corp.",
                         "🇨🇳 1033.HK – Budweiser Brewing Co. APAC Ltd.",
                         "🇨🇳 0688.HK – China Shenhua Energy Co. Ltd.",
                         "🇨🇳 1177.HK – Sino Biopharmaceutical Ltd.",
                         "🇨🇳 0956.HK – China International Capital Corp. Ltd.",
                         "🇨🇳 0380.HK – Sinopharm Group Co. Ltd.",
                         "🇨🇳 1093.HK – China Evergrande Group",
                         "🇨🇳 1810.HK – Longfor Group Holdings Ltd.",
                         "🇨🇳 1918.HK – 9F Inc.",
                         "🇨🇳 3888.HK – Galaxy Entertainment Group Ltd.",
                         "🇨🇳 2888.HK – Kingboard Laminates Holdings Ltd.",
                         "🇨🇳 0648.HK – China Gas Holdings Ltd.",
                         "🇨🇳 0084.HK – Yue Yuen Industrial (Holdings) Ltd.",
                         "🇨🇳 0322.HK – Sino Biopharm",
                         "🇨🇳 0606.HK – Shougang Fushan Resources Group Ltd.",
                         "🇨🇳 0386.HK – China Minsheng Banking Corp. Ltd.",
                         "🇨🇳 3983.HK – Harvest International Holdings Ltd.",
                         "🇨🇳 2688.HK – China Oilfield Services Ltd.",
                         "🇨🇳 0868.HK – Techtronic Industries Co. Ltd.",
                         "🇨🇳 0238.HK – PICC Property & Casualty Co. Ltd.",
                         "🇨🇳 2600.HK – China Pacific Insurance (Group) Co. Ltd.",
                         "🇨🇳 2883.HK – Bank of China (Hong Kong) Ltd.",
                         "🇨🇳 0916.HK – China Taiping Insurance Holdings Ltd.",
                         "🇨🇳 0992.HK – CONCH Cement Co. Ltd.",
                         "🇨🇳 1038.HK – China Gas Holdings Ltd.",
                         "🇨🇳 1137.HK – Great Eagle Holdings Ltd.",
                         "🇨🇳 1238.HK – BOC Hong Kong (Holdings) Ltd.",
                         "🇨🇳 2708.HK – China Shenhua Energy Co. Ltd.",
                         "🇨🇳 1919.HK – China Resources Logistics Holdings Ltd.",
                         "🇨🇳 1299.HK – AIA Group Ltd.",
                         "🇨🇳 0709.HK – AIA Group Ltd. (HK)",
                         "🇨🇳 2313.HK – China Mengniu Dairy Co. Ltd.",
                         "🇨🇳 2319.HK – China Resources Beer (Holdings) Co. Ltd.",
                         "🇨🇳 2208.HK – Techtronic Industries Co. Ltd.",
                         "🇨🇳 1216.HK – China Unicom (Hong Kong) Ltd.",
                         "🇨🇳 1109.HK – China Resources Power Holdings Co. Ltd.",
                         "🇨🇳 823.HK  – Sino Land Co. Ltd.",
                         "🇨🇳 1997.HK – Link Real Estate Investment Trust",
                         "🇨🇳 2601.HK – China Shenhua Energy Co. Ltd.",
                         "🇨🇳 151.HK  – China Mobile Ltd. (HK)",
                         "🇨🇳 3818.HK – China Vanke Co. Ltd.",
                         "🇨🇳 070.HK  – Cheung Kong (Holdings) Ltd.",
                         "🇨🇳 388.HK  – Hong Kong Exchanges & Clearing Ltd.",
                         "🇨🇳 929.HK  – China Minmetals Corp.",
                         "🇨🇳 268.HK  – China Overseas Land & Investment Ltd.",
                         "🇨🇳 188.HK  – China Resources Cement Holdings Ltd.",
                         "🇨🇳 792.HK  – Lenovo Group Ltd.",
                         "🇨🇳 883.HK  – COSCO Shipping Holdings Co. Ltd.",
                         "🇨🇳 701.HK  – CK Hutchison Holdings Ltd.",
                        "🇨🇳 3988.HK – Bank of China Ltd.",
                        
                        "🇫🇷 RMS.PA – Hermès",
                        "🇫🇷 MC.PA – LVMH",
                        "🇫🇷 OR.PA – L'Oréal",
                        "🇫🇷 SU.PA – Schneider Electric",
                        "🇫🇷 EL.PA – EssilorLuxottica",
                        "🇫🇷 TTE – TotalEnergies",
                        "🇫🇷 SNY – Sanofi",
                        "🇫🇷 SAF.PA – Safran",
                        "🇫🇷 AI.PA – Air Liquide",
                        "🇫🇷 CS.PA – AXA",
                        "🇫🇷 BNP.PA – BNP Paribas",
                        "🇫🇷 CDI.PA – Dior",
                        "🇫🇷 DG.PA – Vinci",
                        "🇫🇷 HO.PA – Thales",
                        "🇫🇷 ACA.PA – Crédit Agricole",
                        "🇫🇷 SGO.PA – Compagnie de Saint-Gobain",
                        "🇫🇷 BN.PA – Danone",
                        "🇫🇷 ENGI.PA – ENGIE",
                        "🇫🇷 DSY.PA – Dassault Systèmes",
                        "🇫🇷 GLE.PA – Société Générale",
                        "🇫🇷 ORA.PA – Orange",
                        "🇫🇷 LR.PA – Legrand",
                        "🇫🇷 CAP.PA – Capgemini",
                        "🇫🇷 AM.PA – Dassault Aviation",
                        "🇫🇷 PUB.PA – Publicis Groupe",
                        "🇫🇷 ML.PA – Michelin",
                        "🇫🇷 RI.PA – Pernod Ricard",
                        "🇫🇷 VIE.PA – Veolia",
                        "🇫🇷 KER.PA – Kering",
                        "🇫🇷 BOL.PA – Bolloré",
                        "🇫🇷 EN.PA – Bouygues",
                        "🇫🇷 AMUN.PA – Amundi",
                        "🇫🇷 BIM.PA – bioMérieux",
                        "🇫🇷 RNO.PA – Renault",
                        "🇫🇷 BVI.PA – Bureau Veritas",
                        "🇫🇷 FGR.PA – Eiffage",
                        "🇫🇷 ADP.PA – Aéroports de Paris",
                        "🇫🇷 AC.PA – Accor",
                        "🇫🇷 URW.PA – Unibail-Rodamco-Westfield",
                        "🇫🇷 LI.PA – Klépierre",
                        "🇫🇷 CA.PA – Carrefour",
                        "🇫🇷 GET.PA – Getlink",
                        "🇫🇷 SW.PA – Sodexo",
                        "🇫🇷 ALO.PA – Alstom",
                        "🇫🇷 IPN.PA – Ipsen",
                        "🇫🇷 SPIE.PA – SPIE",
                        "🇫🇷 AYV.PA – Ayvens",
                        "🇫🇷 RXL.PA – Rexel",
                        "🇫🇷 GFC.PA – Gecina",
                        "🇫🇷 EDEN.PA – Edenred",
                        "🇫🇷 NEOEN.PA – Neoen",
                        "🇫🇷 ODET.PA – Compagnie de l'Odet",
                        "🇫🇷 FDJ.VI – Française des Jeux",
                        "🇫🇷 GTT.PA – Gaztransport & Technigaz",
                        "🇫🇷 CBDG.PA – Compagnie du Cambodge",
                        "🇫🇷 TE.PA – Technip Energies",
                        "🇫🇷 COV.PA – Covivio",
                        "🇫🇷 ELIS.PA – Elis",
                        "🇫🇷 TEP.PA – Teleperformance",
                        "🇫🇷 SCR.PA – Scor",
                        "🇫🇷 AKE.PA – Arkema",
                        "🇫🇷 SK.PA – Groupe SEB",
                        "🇫🇷 RF.PA – Eurazeo",
                        "🇫🇷 NEX.PA – Nexans",
                        "🇫🇷 VK.PA – Vallourec",
                        "🇫🇷 MF.PA – Wendel",
                        "🇫🇷 SOP.PA – Sopra Steria Group",
                        "🇫🇷 COVH.PA – Covivio Hotels",
                        "🇫🇷 VRLA.PA – Verallia",
                        "🇫🇷 TKO.PA – Tikehau Capital",
                        "🇫🇷 DEC.PA – JCDecaux",
                        "🇫🇷 VU.PA – VusionGroup",
                        "🇫🇷 FLY.PA – Société Foncière Lyonnaise",
                        "🇫🇷 RUI.PA – Rubis",
                        "🇫🇷 MMB.PA – Groupe Lagardère",
                        "🇫🇷 LOUP.PA – L.D.C. S.A.",
                        "🇫🇷 VIV.PA – Vivendi",
                        "🇫🇷 PLX.PA – Pluxee",
                        "🇫🇷 IDL.PA – ID Logistics Group",
                        "🇫🇷 COFA.PA – Coface",
                        "🇫🇷 VIRP.PA – Virbac SA",
                        "🇫🇷 ATE.PA – ALTEN",
                        "🇫🇷 TRI.PA – Trigano",
                        "🇫🇷 NK.PA – Imerys",
                        "🇫🇷 CARM.PA – Carmila",
                        "🇫🇷 RCO.PA – Rémy Cointreau",
                        "🇫🇷 UNBL.PA – Unibel S.A.",
                        "🇫🇷 ARTO.PA – Société Industrielle et Financière de l'Artois",
                        "🇫🇷 VCT.PA – Vicat S.A.",
                        "🇫🇷 BB.PA – BIC",
                        "🇫🇷 ALTA.PA – Altarea",
                        "🇫🇷 FR.PA – Valeo",
                        "🇫🇷 AF.PA – Air France-KLM",
                        "🇫🇷 FMONC.PA – Financière Moncey Société anonyme",
                        "🇫🇷 OVH.PA – OVH Groupe",
                        "🇫🇷 PEUG.PA – Peugeot Invest Société anonyme",
                        "🇫🇷 ANTIN.PA – Antin Infrastructure Partners",
                        "🇫🇷 SOI.PA – Soitec",
                        "🇫🇷 TFI.PA – TF1",
                        "🇫🇷 IPS.PA – Ipsos",
                        "🇬🇧 III.L – 3i Group",
                        "🇬🇧 ADM.L – Admiral Group",
                        "🇬🇧 AAF.L – Airtel Africa",
                        "🇬🇧 ALW.L – Alliance Witan",
                        "🇬🇧 AAL.L – Anglo American",
                        "🇬🇧 ANTO.L – Antofagasta",
                        "🇬🇧 AHT.L – Ashtead Group",
                        "🇬🇧 ABF.L – Associated British Foods",
                        "🇬🇧 AZN.L – AstraZeneca",
                        "🇬🇧 AUTO.L – Auto Trader Group",
                        "🇬🇧 AV.L – Aviva",
                        "🇬🇧 BAB.L – Babcock International",
                        "🇬🇧 BA.L – BAE Systems",
                        "🇬🇧 BARC.L – Barclays",
                        "🇬🇧 BTRW.L – Barratt Redrow",
                        "🇬🇧 BEZ.L – Beazley",
                        "🇬🇧 BKG.L – Berkeley Group",
                        "🇬🇧 BP.L – BP",
                        "🇬🇧 BATS.L – British American Tobacco",
                        "🇬🇧 BT-A.L – BT Group",
                        "🇬🇧 BNZL.L – Bunzl",
                        "🇬🇧 CNA.L – Centrica",
                        "🇬🇧 CCEP.L – Coca-Cola Europacific Partners",
                        "🇬🇧 CCH.L – Coca-Cola HBC",
                        "🇬🇧 CPG.L – Compass Group",
                        "🇬🇧 CTEC.L – Convatec",
                        "🇬🇧 CRDA.L – Croda International",
                        "🇬🇧 DCC.L – DCC",
                        "🇬🇧 DGE.L – Diageo",
                        "🇬🇧 DPLM.L – Diploma",
                        "🇬🇧 EDV.L – Endeavour Mining",
                        "🇬🇧 ENT.L – Entain",
                        "🇬🇧 EZJ.L – EasyJet",
                        "🇬🇧 EXPN.L – Experian",
                        "🇬🇧 FCIT.L – F&C Investment Trust",
                        "🇬🇧 FRES.L – Fresnillo",
                        "🇬🇧 GAW.L – Games Workshop",
                        "🇬🇧 GLEN.L – Glencore",
                        "🇬🇧 GSK.L – GSK",
                        "🇬🇧 HLN.L – Haleon",
                        "🇬🇧 HLMA.L – Halma",
                        "🇬🇧 HIK.L – Hikma Pharmaceuticals",
                        "🇬🇧 HSX.L – Hiscox",
                        "🇬🇧 HWDN.L – Howdens Joinery",
                        "🇬🇧 HSBA.L – HSBC",
                        "🇬🇧 IHG.L – IHG Hotels & Resorts",
                        "🇬🇧 IMI.L – IMI",
                        "🇬🇧 IMB.L – Imperial Brands",
                        "🇬🇧 INF.L – Informa",
                        "🇬🇧 ICG.L – Intermediate Capital Group",
                        "🇬🇧 IAG.L – International Airlines Group",
                        "🇬🇧 ITRK.L – Intertek",
                        "🇬🇧 JD.L – JD Sports",
                        "🇬🇧 KGF.L – Kingfisher",
                        "🇬🇧 LAND.L – Land Securities",
                        "🇬🇧 LGEN.L – Legal & General",
                        "🇬🇧 LLOY.L – Lloyds Banking Group",
                        "🇬🇧 LMP.L – LondonMetric Property",
                        "🇬🇧 LSEG.L – London Stock Exchange Group",
                        "🇬🇧 MNG.L – M&G",
                        "🇬🇧 MKS.L – Marks & Spencer",
                        "🇬🇧 MRO.L – Melrose Industries",
                        "🇬🇧 MNDI.L – Mondi",
                        "🇬🇧 NG.L – National Grid",
                        "🇬🇧 NWG.L – NatWest Group",
                        "🇬🇧 NXT.L – Next",
                        "🇬🇧 PSON.L – Pearson",
                        "🇬🇧 PSH.L – Pershing Square Holdings",
                        "🇬🇧 PSN.L – Persimmon",
                        "🇬🇧 PHNX.L – Phoenix Group",
                        "🇬🇧 PCT.L – Polar Capital Technology Trust",
                        "🇬🇧 PRU.L – Prudential",
                        "🇬🇧 RKT.L – Reckitt",
                        "🇬🇧 REL.L – RELX",
                        "🇬🇧 RTO.L – Rentokil Initial",
                        "🇬🇧 RMV.L – Rightmove",
                        "🇬🇧 RIO.L – Rio Tinto",
                        "🇬🇧 RR.L – Rolls-Royce Holdings",
                        "🇬🇧 SGE.L – Sage Group",
                        "🇬🇧 SBRY.L – Sainsbury’s",
                        "🇬🇧 SDR.L – Schroders",
                        "🇬🇧 SMT.L – Scottish Mortgage Investment Trust",
                        "🇬🇧 SGRO.L – Segro",
                        "🇬🇧 SVT.L – Severn Trent",
                        "🇬🇧 SHEL.L – Shell",
                        "🇬🇧 SMIN.L – Smiths Group",
                        "🇬🇧 SN.L – Smith & Nephew",
                        "🇬🇧 SPX.L – Spirax Group",
                        "🇬🇧 SSE.L – SSE",
                        "🇬🇧 STAN.L – Standard Chartered",
                        "🇬🇧 STJ.L – St. James’s Place",
                        "🇬🇧 TW.L – Taylor Wimpey",
                        "🇬🇧 TSCO.L – Tesco",
                        "🇬🇧 ULVR.L – Unilever",
                        "🇬🇧 UU.L – United Utilities",
                        "🇬🇧 UTG.L – Unite Group",
                        "🇬🇧 VOD.L – Vodafone Group",
                        "🇬🇧 WEIR.L – Weir Group",
                        "🇬🇧 WTB.L – Whitbread",
                        "🇬🇧 WPP.L – WPP",
                        "🇪🇸 IDEXY – Inditex",
                        "🇪🇸 SAN – Santander",
                        "🇪🇸 IBE.MC – Iberdrola",
                        "🇪🇸 BBVA – Banco Bilbao Vizcaya Argentaria",
                        "🇪🇸 CABK.MC – CaixaBank",
                        "🇪🇸 AENA.MC – Aena",
                        "🇪🇸 FER.MC – Ferrovial",
                        "🇪🇸 AMS.MC – Amadeus IT Group",
                        "🇪🇸 ELE.MC – Endesa",
                        "🇪🇸 TEF – Telefónica",
                        "🇪🇸 NTGY.MC – Naturgy",
                        "🇪🇸 CLNX.MC – Cellnex Telecom",
                        "🇪🇸 BABWF – International Consolidated Airlines",
                        "🇪🇸 ACS.MC – Grupo ACS",
                        "🇪🇸 SAB.MC – Banco Sabadell",
                        "🇪🇸 REP.MC – Repsol",
                        "🇪🇸 MAP.MC – Mapfre",
                        "🇪🇸 BKT.MC – Bankinter",
                        "🇪🇸 RED.MC – Red Eléctrica",
                        "🇪🇸 PUIG.MC – Puig Brands",
                        "🇪🇸 EDPR.LS – EDP Renováveis",
                        "🇪🇸 ANA.MC – Acciona",
                        "🇪🇸 MRL.MC – Merlin Properties",
                        "🇪🇸 IDR.MC – Indra Sistemas",
                        "🇪🇸 GRFS – Grifols",
                        "🇪🇸 GCO.MC – Grupo Catalana Occidente",
                        "🇪🇸 FCC.MC – Fomento de Construcciones y Contratas",
                        "🇪🇸 ANE.MC – Acciona Energías Renovables",
                        "🇪🇸 ALB.MC – Corporación Financiera Alba",
                        "🇪🇸 UNI.MC – Unicaja Banco",
                        "🇪🇸 FDR.MC – Fluidra",
                        "🇪🇸 LOG.MC – Logista (Compañía de Distribución Integral Logista)",
                        "🇪🇸 COL.MC – Inmobiliaria Colonial",
                        "🇪🇸 ENG.MC – Enagás",
                        "🇪🇸 VID.MC – Vidrala",
                        "🇪🇸 CIE.MC – CIE Automotive",
                        "🇪🇸 VIS.MC – Viscofan",
                        "🇪🇸 SCYR.MC – Sacyr",
                        "🇪🇸 NHH.MC – NH Hotel Group",
                        "🇪🇸 EBRO.MC – Ebro Foods",
                        "🇪🇸 ROVI.MC – Laboratorios Farmacéuticos Rovi",
                        "🇪🇸 ACX.MC – Acerinox",
                        "🇪🇸 ALM.MC – Almirall",
                        "🇪🇸 ENO.MC – Elecnor",
                        "🇪🇸 MVC.MC – Metrovacesa",
                        "🇪🇸 CAF.MC – Construcciones y Auxiliar de Ferrocarriles",
                        "🇪🇸 GEST.MC – Gestamp Automoción",
                        "🇪🇸 GRE.MC – Grenergy Renovables",
                        "🇪🇸 DIA.MC – (DIA) Distribuidora Internacional de Alimentación",
                        "🇪🇸 PHM.MC – Pharma Mar",
                        "🇪🇸 PRO.MC – Proeduca Altus",
                        "🇪🇸 MEL.MC – Meliá Hotels International",
                        "🇪🇸 PSG.MC – Prosegur",
                        "🇪🇸 TRE.MC – Técnicas Reunidas",
                        "🇪🇸 FAE.MC – Faes Farma",
                        "🇪🇸 CASH.MC – Prosegur Cash",
                        "🇪🇸 AEDAS.MC – Aedas Homes",
                        "🇪🇸 HOME.MC – Neinor Homes",
                        "🇪🇸 EDR.MC – eDreams ODIGEO",
                        "🇪🇸 TL5.MC – Mediaset España Comunicación",
                        "🇪🇸 MLMTP.PA – Montepino Logística",
                        "🇪🇸 EAT.MC – AmRest",
                        "🇪🇸 SLR.MC – Solaria Energía",
                        "🇪🇸 RLIA.MC – Realia Business",
                        "🇪🇸 ENC.MC – ENCE Energía y Celulosa",
                        "🇪🇸 ADX.MC – Audax Renovables",
                        "🇪🇸 LRE.MC – Lar España Real Estate",
                        "🇪🇸 R4.MC – Renta 4 Banco",
                        "🇪🇸 MCM.MC – Miquel y Costas & Miquel",
                        "🇪🇸 DOM.MC – Global Dominion Access",
                        "🇪🇸 GSJ.MC – Grupo Empresarial San José",
                        "🇪🇸 OHLA.MC – Obrascón Huarte Lain",
                        "🇪🇸 TLGO.MC – Talgo S.A.",
                        "🇪🇸 ALNT.MC – Alantra Partners",
                        "🇪🇸 ECR.MC – Ercros",
                        "🇪🇸 ENER.MC – Ecoener",
                        "🇪🇸 RJF.MC – Laboratorio Reig Jofre",
                        "🇪🇸 ATRY.MC – Atrys Health",
                        "🇪🇸 IBG.MC – Iberpapel Gestión",
                        "🇪🇸 ORY.MC – Oryzon Genomics",
                        "🇪🇸 SQRL.MC – Squirrel Media",
                        "🇪🇸 ISUR.MC – Inmobiliaria del Sur",
                        "🇪🇸 ARM.MC – Árima Real Estate",
                        "🇪🇸 YORE.MC – Olimpo Real Estate",
                        "🇪🇸 NXT.MC – Nueva Expresión Textil",
                        "🇪🇸 PRM.MC – Prim, S.A.",
                        "🇪🇸 YLFG.MC – Lafinca Global Assets",
                        "🇪🇸 YVIT.MC – Vitruvio Real Estate",
                        "🇪🇸 SOL.MC – Soltec Power Holdings",
                        "🇪🇸 NEA.MC – Nicolás Correa",
                        "🇪🇸 NTH.MC – Naturhouse Health",
                        "🇪🇸 USI.MC – Umbrella Solar Investment",
                        "🇪🇸 SNG.MC – SNGULAR",
                        "🇪🇸 LLYC.MC – Llorente & Cuenca",
                        "🇪🇸 TRG.MC – Tubos Reunidos",
                        "🇪🇸 UBS.MC – Urbas Grupo Financiero",
                        "🇪🇸 VOC.MC – Vocento",
                        "🇪🇸 GIGA.MC – Gigas Hosting",
                        "🇪🇸 WBX – Wallbox",
                        "🇪🇸 AGIL.MC – Agile Content",
                        "🇮🇹 UCG.MI – UniCredit",
                        "🇮🇹 ISP.MI – Intesa Sanpaolo",
                        "🇮🇹 ENEL.MI – Enel",
                        "🇮🇹 RACE – Ferrari",
                        "🇮🇹 G.MI – Generali",
                        "🇮🇹 E – ENI",
                        "🇮🇹 LDO.MI – Leonardo",
                        "🇮🇹 PST.MI – Poste Italiane",
                        "🇮🇹 TRN.MI – Terna",
                        "🇮🇹 SRG.MI – Snam",
                        "🇮🇹 MB.MI – Mediobanca",
                        "🇮🇹 PRY.MI – Prysmian Group",
                        "🇮🇹 BAMI.MI – Banco BPM",
                        "🇮🇹 MONC.MI – Moncler",
                        "🇮🇹 1913.HK – Prada",
                        "🇮🇹 UNI.MI – Unipol Assicurazioni",
                        "🇮🇹 FBK.MI – FinecoBank",
                        "🇮🇹 BPE.MI – BPER Banca",
                        "🇮🇹 BMED.MI – Banca Mediolanum",
                        "🇮🇹 REC.MI – Recordati",
              
                        "🇮🇹 INW.MI – INWIT",
                        "🇮🇹 BMPS.MI – Banca Monte dei Paschi di Siena",
                        "🇮🇹 EDNR.MI – Edison",
                        "🇮🇹 BZU.MI – Buzzi Unicem",
                        "🇮🇹 TIT.MI – Telecom Italia",
                        "🇮🇹 BC.MI – Brunello Cucinelli",
                        "🇮🇹 A2A.MI – A2A",
                        "🇮🇹 CPR.MI – Davide Campari-Milano",
                        "🇮🇹 NEXI.MI – Nexi",
                        "🇮🇹 HER.MI – Hera Group",
                        "🇮🇹 PIRC.MI – Pirelli",
                        "🇮🇹 BGN.MI – Banca Generali",
                        "🇮🇹 LTMC.MI – Lottomatica Group",
                        "🇮🇹 IG.MI – Italgas",
                        "🇮🇹 REY.MI – Reply",
                        "🇮🇹 STVN – Stevanato Group",
                        "🇮🇹 BPSO.MI – Banca Popolare di Sondrio",
                        "🇮🇹 DIA.MI – DiaSorin",
                        "🇮🇹 FCT.MI – Fincantieri",
                        "🇮🇹 ACE.MI – ACEA",
                        
                        "🇮🇹 TPRO.MI – Technoprobe",
                        "🇮🇹 IVG.MI – Iveco Group",
                        "🇮🇹 AMP.MI – Amplifon",
                        "🇮🇹 DLG.MI – De’ Longhi",
                        "🇮🇹 CE.MI – Credito Emiliano",
                        "🇮🇹 SPM.MI – Saipem",
                        "🇮🇹 SOL.MI – SOL S.p.A.",
                        "🇮🇹 AZM.MI – Azimut Holding",
                        "🇮🇹 IP.MI – Interpump Group",
                        "🇮🇹 WBD.MI – Webuild S.p.A.",
                        "🇮🇹 MAIRE.MI – Maire Tecnimont",
                        "🇮🇹 IRE.MI – Iren",
                        "🇮🇹 ERG.MI – ERG",
                        "🇮🇹 BRE.MI – Brembo",
                        "🇮🇹 TGYM.MI – Technogym",
                        "🇮🇹 CRL.MI – Carel Industries",
                        "🇮🇹 DAN.MI – Danieli & C. Officine Meccaniche",
                        "🇮🇹 ENAV.MI – ENAV",
                        "🇮🇹 CEM.MI – Cementir",
                        "🇮🇹 MFEA.MI – MFE-Mediaforeurope",
                  
                        "🇮🇹 ANIM.MI – Anima Holding",
                        "🇮🇹 ZGN – Ermenegildo Zegna",
                        "🇮🇹 MOL.MI – Moltiply Group (Gruppo Mutuionline)",
                        "🇮🇹 BFF.MI – BFF Bank",
                        "🇮🇹 RWAY.MI – Rai Way",
                        "🇮🇹 SRS.MI – Saras S.p.A.",
                        "🇮🇹 ARIS.MI – Ariston Holding",
                        "🇮🇹 ICOS.MI – Intercos",
                        "🇮🇹 JUVE.MI – Juventus Turin",
                        "🇮🇹 SES.MI – SeSa S.p.A.",
                        "🇮🇹 DNR.MI – Industrie De Nora",
                        "🇮🇹 BFG.MI – B.F. S.p.A.",
                        "🇮🇹 BDB.MI – Banco di Desio e della Brianza",
                        "🇮🇹 ITM.MI – Italmobiliare",
                        "🇮🇹 SL.MI – Sanlorenzo",
                        "🇮🇹 SFER.MI – Salvatore Ferragamo",
                        "🇮🇹 CMB.MI – Cembre S.p.A.",
                        "🇮🇹 F3T1.F – Ferretti",
                        "🇮🇹 OVS.MI – OVS S.p.A.",
                        "🇮🇹 COM.MI – Comer Industries",
                
                        "🇮🇹 ELN.MI – EL.En. S.p.A. (Elen Group)",
                        "🇮🇹 GVS.MI – GVS S.p.A.",
                        "🇮🇹 ZV.MI – Zignago Vetro",
                        "🇮🇹 ASC.MI – Ascopiave",
                        "🇮🇹 PVN.MI – Piovan S.p.A.",
                        "🇮🇹 PIA.MI – Piaggio & C. SpA",
                        "🇮🇹 MARR.MI – MARR S.p.A.",
                        "🇮🇹 MN.MI – Arnoldo Mondadori Editore",
                        "🇮🇹 FILA.MI – F.I.L.A. - Fabbrica Italiana Lapis ed Affini",
                        "🇮🇹 RCS.MI – RCS MediaGroup",
                        "🇮🇹 TNXT.MI – Tinexta",
                        "🇮🇹 AVIO.MI – Avio S.p.A.",
                        "🇮🇹 PHN.MI – Pharmanutra",
                        "🇮🇹 TXT.MI – TXT e-solutions",
                        "🇮🇹 CAI.MI – Cairo Communication",
                        "🇮🇹 AC5.MI – Acinque",
                        "🇮🇹 FM.MI – Fiera Milano",
                        "🇮🇹 WIIT.MI – Wiit S.p.A.",
                        "🇮🇹 EGLA.MI – EuroGroup Laminations",
                        "🇮🇹 SFL.MI – Safilo Group",
                        "🇩🇪 SAP – SAP",
                        "🇩🇪 SIE.DE – Siemens",
                        "🇩🇪 DTE.DE – Deutsche Telekom",
                        "🇩🇪 ALV.DE – Allianz SE",
                        "🇩🇪 RHM.F – Rheinmetall",
                        "🇩🇪 MUV2.DE – Munich RE (Münchener Rück)",
                        "🇩🇪 ENR.F – Siemens Energy",
                        "🇩🇪 SHL.DE – Siemens Healthineers",
                        "🇩🇪 DB1.DE – Deutsche Börse",
                        "🇩🇪 MBG.DE – Mercedes-Benz",
                        "🇩🇪 MRK.DE – Merck KGaA",
                        "🇩🇪 VOW3.DE – Volkswagen",
                        "🇩🇪 DB – Deutsche Bank",
                        "🇩🇪 BMW.DE – BMW",
                        "🇩🇪 IFX.DE – Infineon",
                        "🇩🇪 DHL.DE – DHL Group (Deutsche Post)",
                        "🇩🇪 EOAN.DE – E.ON",
                        "🇩🇪 P911.DE – Porsche",
                        "🇩🇪 ADS.DE – Adidas",
                        "🇩🇪 BAS.DE – BASF",
                        "🇩🇪 HNR1.DE – Hannover Rück",
                        "🇩🇪 HEI.DE – HeidelbergCement",
                        "🇩🇪 DTG.F – Daimler Truck",
                        "🇩🇪 CBK.F – Commerzbank",
                        "🇩🇪 TLX.DE – Talanx",
                        "🇩🇪 HLAG.DE – Hapag-Lloyd",
                        "🇩🇪 HEN3.DE – Henkel",
                        "🇩🇪 BEI.DE – Beiersdorf",
                        "🇩🇪 FRE.DE – Fresenius",
                        "🇩🇪 RWE.DE – RWE",
                        "🇩🇪 BAYN.DE – Bayer",
                        "🇩🇪 VNA.DE – Vonovia",
                        "🇩🇪 BNTX – BioNTech",
                        "🇩🇪 EBK.DE – EnBW Energie",
                        "🇩🇪 MTX.DE – MTU Aero Engines",
                        "🇩🇪 UN0.DE – Uniper",
                        "🇩🇪 FMS – Fresenius Medical Care",
                        "🇩🇪 CON.DE – Continental",
                        "🇩🇪 8TRA.DE – Traton",
                        "🇩🇪 SY1.DE – Symrise",
                        "🇩🇪 KBX.DE – Knorr-Bremse",
                        "🇩🇪 SRT.DE – Sartorius",
                        "🇩🇪 NEM.F – Nemetschek",
                        "🇩🇪 HOT.F – Hochtief",
                        "🇩🇪 PAH3.DE – Porsche SE",
                        "🇩🇪 1COV.F – Covestro",
                        "🇩🇪 EVD.F – CTS Eventim",
                        "🇩🇪 DWS.F – DWS Group",
                        "🇩🇪 HLE.F – HELLA",
                        "🇩🇪 G1A.F – GEA Group",
                        "🇩🇪 EVK.DE – Evonik Industries",
                        "🇩🇪 HAG.F – Hensoldt",
                        "🇩🇪 BIRK – Birkenstock",
                        "🇩🇪 DWNI.DE – Deutsche Wohnen",
                        "🇩🇪 BNR.DE – Brenntag",
                        "🇩🇪 G24.F – Scout24 (ImmoScout24)",
                        "🇩🇪 RAA.F – Rational AG",
                        "🇩🇪 LHA.DE – Lufthansa",
                        "🇩🇪 ZAL.DE – Zalando",
                        "🇩🇪 DHER.F – Delivery Hero",
                        "🇩🇪 R3NK.DE – RENK Group",
                        "🇩🇪 FRA.DE – Fraport",
                        "🇩🇪 LEG.DE – LEG Immobilien",
                        "🇩🇪 TKA.F – Thyssenkrupp",
                        "🇩🇪 AG1.F – AUTO1",
                        "🇩🇪 KGX.DE – KION Group",
                        "🇩🇪 AFXA.F – Carl Zeiss Meditec",
                        "🇩🇪 FPE.F – Fuchs Petrolub",
                        "🇩🇪 IOS.DE – IONOS Group",
                        "🇩🇪 MLHK.PA – H&K AG (Heckler & Koch)",
                        "🇩🇪 BC8.F – Bechtle",
                        "🇩🇪 FIE.F – Fielmann",
                        "🇩🇪 KRN.F – Krones",
                        "🇩🇪 1SXP.DE – SCHOTT Pharma",
                        "🇩🇪 NDX1.F – Nordex",
                        "🇩🇪 SPG.DE – Springer Nature AG",
                        "🇩🇪 SHA0.DE – Schaeffler",
                        "🇩🇪 UTDI.F – United Internet",
                        "🇩🇪 GIL.F – DMG Mori Aktiengesellschaft",
                        "🇩🇪 TUI1.F – TUI",
                        "🇩🇪 FNTN.F – Freenet",
                        "🇩🇪 JUN3.F – Jungheinrich",
                        "🇩🇪 SIX2.F – Sixt",
                        "🇩🇪 NDA.F – Aurubis",
                        "🇩🇪 PUM.DE – PUMA",
                        "🇩🇪 1U1.DE – 1&1",
                        "🇩🇪 WCH.F – Wacker Chemie",
                        "🇩🇪 GBF.F – Bilfinger",
                        "🇩🇪 SDF.F – K+S",
                        "🇩🇪 SAX.F – Ströer",
                        "🇩🇪 SYAB.VI – SYNLAB",
                        "🇩🇪 FTK.DE – flatexDEGIRO AG",
                        "🇩🇪 BOSS.DE – HUGO BOSS",
                        "🇩🇪 LEC.F – LEW (Lechwerke)",
                        "🇩🇪 TEG.F – TAG Immobilien",
                        "🇩🇪 LXS.F – Lanxess",
                        "🇩🇪 SZU.F – Südzucker",
                        "🇩🇪 T2G.F – Tradegate Exchange",
                        "🇩🇪 MNV6.F – Mainova",
                        "🇩🇪 GXI.F – Gerresheimer",
                        "🇷🇺 GAZP – Gazprom",
                        "🇷🇺 ROSN – Rosneft Oil Company",
                        "🇷🇺 SBER – Sberbank of Russia",
                        "🇷🇺 NVTK – PAO NOVATEK",
                        "🇷🇺 GMKN – Mining and Metallurgical Company Norilsk Nickel",
                        "🇷🇺 LKOH – PJSC LUKOIL",
                        "🇷🇺 SIBN – Gazprom Neft",
                        "🇷🇺 PLZL – Polyus",
                        "🇷🇺 PHOR – PhosAgro",
                        "🇷🇺 SNGS – Surgutneftegas Public Joint Stock Company",
                        "🇷🇺 TATN – PJSC Tatneft",
                        "🇷🇺 NLMK – Novolipetsk Steel",
                        "🇷🇺 CHMF – Severstal",
                        "🇷🇺 AKRN – Acron",
                        "🇷🇺 VSMO – VSMPO-AVISMA Corporation",
                        "🇷🇺 RUAL – United Company RUSAL",
                        "🇷🇺 PIKK – PIK Group",
                        "🇷🇺 ALRS – ALROSA",
                        "🇷🇺 MTSS – Mobile TeleSystems",
                        "🇷🇺 MGNT – Magnit",
                        "🇷🇺 TCSG – TCS Group",
                        "🇷🇺 MAGN – Magnitogorsk Iron & Steel Works",
                        "🇷🇺 HYDR – RusHydro",
                        "🇷🇺 IRKT – Yakovlev",
                        "🇷🇺 UNAC – United Aircraft Corporation",
                        "🇷🇺 IRAO – Inter RAO UES",
                        "🇷🇺 VTBR – VTB Bank",
                        "🇷🇺 RTKM – Rostelecom",
                        "🇷🇺 RASP – Raspadskaya",
                        "🇷🇺 MOEX – Moscow Exchange MICEX-RTS",
                        "🇷🇺 BANE – Bashneft",
                        "🇷🇺 SMLT – Samolet Group",
                        "🇷🇺 CBOM – Credit Bank of Moscow",
                        "🇷🇺 NKNC – Nizhnekamskneftekhim",
                        "🇷🇺 AFKS – Sistema",
                        "🇷🇺 SGZH – Segezha Group",
                        "🇷🇺 KZOS – Kazan Organichesky Sintez",
                        "🇷🇺 MGTS – Moscow City Telephone Network",
                        "🇷🇺 FEES – Federal Grid Company of Unified Energy System",
                        "🇷🇺 GCHE – Cherkizovo Group",
                        "🇷🇺 NMTP – Novorossiysk Commercial Sea Port",
                        "🇷🇺 APTK – Pharmacy Chain 36.6",
                        "🇷🇺 UPRO – Unipro",
                        "🇷🇺 FLOT – Sovcomflot",
                        "🇷🇺 YAKG – Yakutsk Fuel and Energy Company",
                        "🇷🇺 FESH – Far-Eastern Shipping Company",
                        "🇷🇺 MSNG – Mosenergo",
                        "🇷🇺 LSNG – Rosseti Lenenergo",
                        "🇷🇺 AVAN – AVANGARD Bank",
                        "🇷🇺 KAZT – KuibyshevAzot",
                        "🇷🇺 IRGZ – Irkutskenergo",
                        "🇷🇺 LENT – Lenta International",
                        "🇷🇺 AFLT – Aeroflot",
                        "🇷🇺 OGKB – OGK-2",
                        "🇷🇺 KMAZ – KAMAZ",
                        "🇷🇺 TRMK – TMK",
                        "🇷🇺 RGSS – Rosgosstrakh",
                        "🇷🇺 GAZS – Gaz-service",
                        "🇷🇺 GAZC – Gazkon",
                        "🇷🇺 POSI – Positive Group",
                        "🇷🇺 LSRG – LSR Group",
                        "🇷🇺 INGR – INGRAD",
                        "🇷🇺 MTLR – Mechel",
                        "🇷🇺 AQUA – Inarctica",
                        "🇷🇺 MSRS – Rosseti Moscow Region",
                        "🇷🇺 GAZT – GAZ-Tek",
                        "🇷🇺 SELG – Seligdar",
                        "🇷🇺 UKUZ – Southern Kuzbass Coal",
                        "🇷🇺 MVID – M.video",
                        "🇷🇺 BSPB – Bank Saint-Petersburg",
                        "🇷🇺 MFGS – Slavneft-Megionneftegas",
                        "🇷🇺 TGKA – TGC-1 ",
                        "🇷🇺 BELU – NovaBev Group",
                        "🇷🇺 SFIN – SFI",
                        "🇷🇺 UTAR – UTair Aviation",
                        "🇷🇺 RENI – Renaissance Insurance Group",
                        "🇷🇺 RNFT – RussNeft",
                        "🇷🇺 MRKS – Rosseti Siberia",
                        "🇷🇺 IDVP – INVEST-DEVELOPMENT",
                        "🇷🇺 TGKD – Quadra Power Generation",
                        "🇷🇺 USBN – Bank Uralsib",
                        "🇷🇺 VJGZ – Varyoganneftegaz",
                        "🇷🇺 MSTT – Mostotrest",
                        "🇷🇺 NKHP – Novorossyisk Grain Plant",
                        "🇷🇺 MRKP – Rosseti Centre & Volga",
                        "🇷🇺 ROLO – Rusolovo",
                        "🇷🇺 SPBE – SPB Exchange",
                        "🇷🇺 ABRD – Abrau-Durso",
                        "🇷🇺 ELFV – EL5-Energo",
                        "🇷🇺 UCSS – United Credit Systems",
                        "🇷🇺 JNOS – Slavneft-Yaroslavnefteorgsintez",
                        "🇷🇺 DVEC – Far-Eastern Energy Company",
                        "🇷🇺 MRKU – Rosseti Urals",
                        "🇷🇺 MRKK – Rosseti Northern Caucasus",
                        "🇷🇺 BLNG – Belon",
                        "🇷🇺 RKKE – Energia (Korolev Rocket & Space)",
                        "🇷🇺 CHMK – Chelyabinsk Metallurgical Plant",
                        "🇷🇺 AMEZ – Ashinskiy Metallurgical Works",
                        "🇷🇺 MRKC – Rosseti Centre",
                        "🇷🇺 TTLK – Tattelecom",
                       ],
  Crypto:  ["🪙 BTC – Bitcoin",
                        "🪙 ETH – Ethereum",
                        "🪙 USDT – Tether USDt",
                        "🪙 XRP – XRP",
                        "🪙 BNB – BNB",
                        "🪙 SOL – Solana",
                        "🪙 USDC – USDC",
                        "🪙 DOGE – Dogecoin",
                        "🪙 ADA – Cardano",
                        "🪙 TRX – TRON",
                        "🪙 SUI – Sui",
                        "🪙 LINK – Chainlink",
                        "🪙 AVAX – Avalanche",
                        "🪙 XLM – Stellar",
                        "🪙 HYPE – Hyperliquid",
                        "🪙 SHIB – Shiba Inu",
                        "🪙 HBAR – Hedera",
                        "🪙 LEO – UNUS SED LEO",
                        "🪙 BCH – Bitcoin Cash",
                        "🪙 TON – Toncoin",
                        "🪙 DOT – Polkadot",
                        "🪙 LTC – Litecoin",
                        "🪙 XMR – Monero",
                        "🪙 BGB – Bitget Token",
                        "🪙 PEPE – Pepe",
                        "🪙 PI – Pi",
                        "🪙 DAI – Dai",
                        "🪙 USDE – Ethena USDe",
                        "🪙 AAVE – Aave",
                        "🪙 UNI – Uniswap"],
  Futures:  ["📈 ES – E-mini S&P 500",
                        "📈 NQ – E-mini NASDAQ-100",
                        "📈 YM – E-mini Dow Jones Average",
                        "📈 RTY – E-mini Russell 2000",
                        "📈 CL – Crude Oil (WTI)",
                        "📈 BRN – Brent Crude Oil",
                        "📈 NG – Natural Gas",
                        "📈 HO – Heating Oil",
                        "📈 RB – RBOB Gasoline",
                        "📈 GC – Gold",
                        "📈 SI – Silver",
                        "📈 HG – Copper",
                        "📈 PL – Platinum",
                        "📈 PA – Palladium",
                        "📈 ZC – Corn",
                        "📈 ZS – Soybeans",
                        "📈 ZW – Wheat",
                        "📈 ZL – Soybean Oil",
                        "📈 ZM – Soybean Meal",
                        "📈 ZR – Rough Rice",
                        "📈 ZO – Oats",
                        "📈 LE – Live Cattle",
                        "📈 HE – Lean Hogs",

                        "📈 FC – Feeder Cattle",
                        "📈 SB – Sugar #11",
                        "📈 CT – Cotton",
                        "📈 KC – Coffee (Arabica)",
                        "📈 CC – Cocoa",
                        "📈 OJ – Frozen  Orange Juice",
                        "📈 ED – Eurodollar",
                        "📈 ZN – 10-Year U.S. Treasury Note",
                        "📈 ZB – 30-Year U.S. Treasury Bond",
                        "📈 FV – 5-Year U.S. Treasury Note",
                        "📈 TU – 2-Year U.S. Treasury Note",
                        "📈 FF – CME Fed Funds",
                        "📈 DAX – DAX Index (FDAX)",
                        "📈 FESX – EURO STOXX 50",
                        "📈 NKD – Nikkei 225",
                        "📈 FTSE – FTSE 100 Index",
                        "📈 SPI – S&P/ASX 200",
                        "📈 FGBL – Euro Bund 10-Year",
                        "📈 FGBM – Euro Bobl 5-Year",
                        "📈 FGBS – Euro Schatz 2-Year",
                        "📈 6E – Euro FX",
                        "📈 6J – Japanese Yen",
                        "📈 6B – British Pound",
                        "📈 6A – Australian Dollar",
                        "📈 6C – Canadian Dollar",
                        "📈 6S – Swiss Franc",
                        "📈 6M – Mexican Peso",
                        "📈 6N – New Zealand Dollar",
                        "📈 6R – Russian Ruble",
                        "📈 6L – Brazilian Real",
                        "📈 VX – CBOE Volatility Index",
                        "📈 BTC – Bitcoin Futures",
                        "📈 ETH – Ether Futures",
                        "📈 CARB – EU Carbon Emissions",
                        "📈 GCM – Gold-Mini (COMEX)",
                        "📈 CN – Gold-Micro (COMEX)",
                        "📈 LBS – Lumber",
                        "📈 NXF – NYSE Arca Gold Miners Index",
                        "📈 SL – Silver-Mini (COMEX)",
                        "📈 DG – Dow Jones-Mini (CBOT)",
                        "📈 L – Soybean Oil-Mini (CBOT)",
                        "📈 MGC – Micro Gold (COMEX)",
                        "📈 M2K – Micro E-mini Russell 2000",
                        "📈 MES – Micro E-mini S&P 500",
                        "📈 MNQ – Micro E-mini NASDAQ-100",
                        "📈 MGC – duplicate",
                        "📈 MHI – Micro Lean Hogs",
                        "📈 MZ – Micro Silver",
                        "📈 ME – Micro Energy Crude Oil",
                        "📈 MW – Micro Wheat",
                        "📈 MC – Micro Corn",
                        "📈 MF – Micro Bitcoin",
                        "📈 LCO – Low Sulphur Gasoil (ICE)",
                        "📈 FEI – Feeder Cattle Micro",
                        "📈 G – Soybean Meal Micro",
                        "📈 H – Soybeans Micro",
                        "📈 ZT – 2-Year T-Note Micro",
                        "📈 ZF – 5-Year T-Note Micro",
                        "📈 XS – Copper High Grade Micro",
                        "📈 QM – Micro Crude Oil",
                        "📈 QO – Micro Gold",
                        "📈 QS – Micro Silver",
                        "📈 QB – Micro Bitcoin",
                        "📈 QZ – Micro Ethereum",
                        "📈 US – U.S. Dollar Index",
                        "📈 DX – U.S. Dollar Index (ICE)",
                        "📈 ZF – duplicate",
                        "📈 ZT – duplicate",
                        "📈 UB – Ultra U.S. 30-Year Bond",
                        "📈 UX – Ultra U.S. 10-Year Note",
                        "📈 EDH – Eurodollar High",
                        "📈 EDJ – Eurodollar June",
                        "📈 SD – 3-Month Sterling",
                        "📈 DB – Deutsche BUND",
                        "📈 BL – Black Sea Wheat",
                        "📈 LX – Lumber High Grade",
                        "📈 VELA – Venezuelan Crude (ICE)",
                        "📈 JY – JPY Micro",
                        "📈 PO – Palladium-Mini",
                        "📈 YU – Yen-Mini",
                        "📈 AN – Animal Proteins Index",
                        "📈 EG – Cocoa Micro",
                        "📈 CW – Cotton-Micro",
                        "📈 FS – ESG Futures Basket",
                        "📈 IR – Iron Ore",
                        "📈 AU – Gold-Asia",
                        "📈 PT – Platinum-Asia",
                        "📈 ZY – Brazilian Soybean",
                        "📈 ZF – duplicate",
                        "📈 ZX – Zinc",
                        "📈 NT – Nickel",
                        "📈 AL – Aluminum",
                        "📈 LE – duplicate",
                        "📈 CK – Carbon Credits (California)"],
  Commodities: ["📦 CL – Crude Oil (WTI)",
                        "📦 BRN – Brent Crude Oil",
                        "📦 NG – Natural Gas",
                        "📦 HO – Heating Oil",
                        "📦 RB – RBOB Gasoline",
                        "📦 GC – Gold",
                        "📦 SI – Silver",
                        "📦 PL – Platinum",
                        "📦 PA – Palladium",
                        "📦 AL – Aluminium",
                        "📦 CU – Copper (HG)",
                        "📦 PB – Lead",
                        "📦 ZN – Zinc",
                        "📦 NI – Nickel",
                        "📦 COB – Cobalt",
                        "📦 IRON – Iron Ore",
                        "📦 COAL – Thermal Coal",
                        "📦 UR – Uranium",
                        "📦 ZC – Corn",
                        "📦 ZW – Wheat",
                        "📦 ZS – Soybeans",
                        "📦 CT – Cotton",
                        "📦 SB – Sugar #11",
                        "📦 KC – Coffee (Arabica)",
                        "📦 CC – Cocoa",
                        "📦 OJ – Frozen Orange Juice",
                        "📦 OATS – Oats",
                        "📦 RICE – Rough Rice",
                        "📦 LE – Live Cattle",
                        "📦 HE – Lean Hogs",
                        "📦 RUB – Rubber"]
}), []);

  /* Form state */
  
  const [symbol, setSymbol] = useState("");
  const [riskReward, setRiskReward] = useState("1:3");
  const [risk, setRisk] = useState("100"); 
  const [position, setPosition] = useState("Buy");
  const [outcome, setOutcome] = useState("Win");
  const [entryDateISO, setEntryDateISO] = useState(todayISO());
  const [exitDateISO, setExitDateISO] = useState(todayISO());
  const [entryTime, setEntryTime] = useState(nowHM());
  const [exitTime, setExitTime] = useState(nowHM());
  const [selectedEmotion, setSelectedEmotion] = useState("");
  const [positiveFeedback, setPositiveFeedback] = useState("");
  const [negativeFeedback, setNegativeFeedback] = useState("");
  /* Confluences from Firestore */
  const [masterConfluences, setMasterConfluences] = useState([]);
  const [checkedConfs, setCheckedConfs] = useState([]);
  const [newConfText, setNewConfText] = useState("");
  const [newConfColor, setNewConfColor] = useState("#2c60fa");

  /* Images */
  const [imagePreviews, setImagePreviews] = useState([]);

  /* Symbol Search */
  const [symQuery] = useState("");
  const [setFilteredSyms] = useState([]);


  /* Load confluences on open */
  useEffect(() => {
    if (open && uid) {
      getDocs(collection(db, "users", uid, "confluences")).then(snapshot => {
        setMasterConfluences(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [open, uid, db]);
useEffect(() => {
  if (!open || !uid) return;
  (async () => {
    const snap = await getDocs(collection(db, "users", uid, "symbolFavorites"));
    const items = snap.docs.map(d => ({ id: d.id, label: d.data().label }));
    setFavSymbols(items.map(it => it.label));
   setFavIds(items.reduce((acc, it) => ({ ...acc, [it.label]: it.id }), {}));

  })();
}, [open, uid, db]);

  /* Live symbol search */
useEffect(() => {
  if (!open || !uid) return;
  (async () => {
    const snap = await getDocs(collection(db, "users", uid, "symbolFavorites"));
    const items = snap.docs.map(d => ({ id: d.id, label: d.data().label }));
    setFavSymbols(items.map(it => it.label));
    setFavIds(items.reduce((acc, it) => ({ ...acc, [it.label]: it.id }), {}));
  })();
}, [open, uid, db, setFavSymbols, setFavIds]);



  if (!open) return null;

  const addConfluence = async () => {
    if (!newConfText.trim() || !uid) return;
    const newId = uuid();
    await setDoc(doc(db, "users", uid, "confluences", newId), {
      text: newConfText.trim(),
      color: newConfColor
    });
    setMasterConfluences(prev => [...prev, { id: newId, text: newConfText.trim(), color: newConfColor }]);
    setNewConfText("");
  };

  const removeConfluence = async (id) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "confluences", id));
    setMasterConfluences(prev => prev.filter(c => c.id !== id));
    setCheckedConfs(prev => prev.filter(x => x !== id));
  };


const handleSaveTrade = async () => {
  if (!uid) return;

  // --- Normalisierung ---
  const normalizedRisk = (risk || "").replace(/,/g, "."); 
  const normalizedRiskReward = (riskReward || "").replace(/,/g, ".");

  const selectedTexts = masterConfluences
    .filter(c => checkedConfs.includes(c.id))
    .map(c => c.text);

  const tradeId = uuid();
  const trade = {
    date: formatDateDDMMYY(entryDateISO),
    emotions: {
      selectedEmotion,
      positiveFeedback,
      negativeFeedback,
      confluenceEntries: selectedTexts
    },
    confluenceEntries: selectedTexts,
    negativeFeedback,
    positiveFeedback,
    selectedEmotion,
    entryDate: formatDateDDMMYY(entryDateISO),
    exitDate: formatDateDDMMYY(exitDateISO),
    id: tradeId,
    images: imagePreviews,
    outcome,
    position,
    risk: normalizedRisk,          // hier mit Punkt gespeichert
    riskReward: normalizedRiskReward,
    symbol,
    time: entryTime,
    timeZone: exitTime
  };

  await setDoc(doc(db, "users", uid, "trades", tradeId), trade);
  onClose();
};

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
  <style>{`
  ::-webkit-scrollbar {
    display: none; /* für Chrome, Safari, Edge */
  }
  * {
    -ms-overflow-style: none;  /* für IE und Edge */
    scrollbar-width: none;     /* für Firefox */
  }
`}</style>

      <div
        style={{
          width: "min(980px, 92vw)",
          maxHeight: "92vh",
          background: theme.panel,
          color: theme.text,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ fontWeight: 800 }}>New Trade</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: theme.sub, cursor: "pointer" }}>
            <FiX size={22} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "18px", background: theme.bg }}>
          {/* Symbol */}



<FieldLabel theme={theme}>Symbol</FieldLabel>
<SymbolPicker
  value={symbol}
  onChange={setSymbol}
  dark={dark}
  theme={theme}
  categories={categories}      // falls du deine Kategorien-Liste behalten willst
  enableTVSearch={true}        // optional (kannst du auch weglassen/auf false setzen)
/>
<div style={{ height: 8 }} />
          {/* Dates & Times */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel theme={theme}>Entry Date</FieldLabel>
              <TextInput type="date" theme={theme} value={entryDateISO} onChange={e => setEntryDateISO(e.target.value)} />
            </div>
            <div>
              <FieldLabel theme={theme}>Exit Date</FieldLabel>
              <TextInput type="date" theme={theme} value={exitDateISO} onChange={e => setExitDateISO(e.target.value)} />
            </div>
            <div>
              <FieldLabel theme={theme}>Entry Time</FieldLabel>
              <TextInput type="time" theme={theme} value={entryTime} onChange={e => setEntryTime(e.target.value)} />
            </div>
            <div>
              <FieldLabel theme={theme}>Exit Time</FieldLabel>
              <TextInput type="time" theme={theme} value={exitTime} onChange={e => setExitTime(e.target.value)} />
            </div>
          </div>

          {/* Position */}
<div style={{ marginTop: 8 }}>
  <FieldLabel theme={theme}>Position</FieldLabel>
  <PositionSegment value={position} onChange={setPosition} theme={theme} />
</div>

    {/* Risk/Reward & Profit */}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
  <div>
    <FieldLabel theme={theme}>Risk/Reward</FieldLabel>
    <TextInput theme={theme} value={riskReward} onChange={e => setRiskReward(e.target.value)} />
  </div>
  <div>
    <FieldLabel theme={theme}>Profit</FieldLabel>
    <TextInput theme={theme} value={risk} onChange={e => setRisk(e.target.value)} />
  </div>
</div>


 <div style={{ marginTop: 6 }}>
  <FieldLabel theme={theme}>Outcome</FieldLabel>
  <CustomSelect
    theme={theme}
    value={outcome}
    onChange={e => setOutcome(e.target.value)}
    options={["Win", "Break-even", "Loss"]}
  />
</div>



{/* Emotions */}
<div style={{ marginTop: 28 }}>
  <h3
    style={{
      fontSize: 18,
      fontWeight: 700,
      color: theme.text, // Weiß im Dark Mode, Dunkel im Light Mode
      marginBottom: 10
    }}
  >
    Emotion
  </h3>
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      gap: 20
    }}
  >
    {[{ v: "😊", Icon: FaSmile }, { v: "😐", Icon: FaMeh }, { v: "😞", Icon: FaFrown }].map(({ v, Icon }) => (
      <button
        key={v}
        onClick={() => setSelectedEmotion(v)}
        style={{
          fontSize: 28,
          color: selectedEmotion === v ? theme.accent : theme.sub
        }}
      >
        <Icon />
      </button>
    ))}
  </div>
</div>





          {/* Notes */}
          <FieldLabel theme={theme}>Notes</FieldLabel>
          <TextArea theme={theme} value={positiveFeedback} onChange={e => setPositiveFeedback(e.target.value)} />
          <FieldLabel theme={theme}>Room for Improvement</FieldLabel>
          <TextArea theme={theme} value={negativeFeedback} onChange={e => setNegativeFeedback(e.target.value)} />





{/* Confluences */}
<div style={{ marginTop: 28 }}>
  <h3
    style={{
      fontSize: 18,
      fontWeight: 700,
      color: theme.text,
      marginBottom: 12
    }}
  >
    Confluences
  </h3>

  {/* Helper: Hex -> RGBA mit Alpha */}
  {(() => {
    const hexToRgba = (hex, alpha = 0.22) => {
      const h = hex.replace("#", "");
      const bigint = parseInt(h.length === 3
        ? h.split("").map(c => c + c).join("")
        : h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    // wir hängen die Function an window, damit wir sie unten verwenden können
    window.__hexToRgba = hexToRgba;
    return null;
  })()}

  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
    <TextInput
      theme={theme}
      value={newConfText}
      onChange={e => setNewConfText(e.target.value)}
      placeholder="Add new…"
    />

    {/* Runder Farbwähler – echter Kreis, gefüllt, leicht nach unten versetzt */}
    <div
      style={{
        position: "relative",
        width: 28,
        height: 28,
        borderRadius: "50%",
        overflow: "hidden",
        border: `1px solid ${theme.border}`,
        marginTop: 9, // etwas nach unten
        flex: "0 0 28px"
      }}
      title="Pick color"
    >
      {/* Sichtbarer Farbkreis */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: newConfColor
        }}
      />
      {/* Unsichtbares Color-Input darüber, damit klickbar */}
      <input
        type="color"
        value={newConfColor}
        onChange={e => setNewConfColor(e.target.value)}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          cursor: "pointer",
          border: "none",
          padding: 0,
          margin: 0
        }}
      />
    </div>

    <button
      onClick={addConfluence}
      style={{
        background: theme.accent,
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "0 12px",
        fontWeight: 600,
        height: 32,
        alignSelf: "center"
      }}
    >
      Add
    </button>
  </div>

  {masterConfluences.map(c => {
    const bg = window.__hexToRgba ? window.__hexToRgba(c.color, 0.22) : c.color;
    const borderCol = window.__hexToRgba ? window.__hexToRgba(c.color, 0.45) : c.color;
    const isChecked = checkedConfs.includes(c.id);
    return (
      <div
        key={c.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8
        }}
      >
        {/* Runde Checkbox */}
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() =>
            setCheckedConfs(prev =>
              prev.includes(c.id)
                ? prev.filter(x => x !== c.id)
                : [...prev, c.id]
            )
          }
          style={{
            appearance: "none",
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `2px solid ${theme.sub}`,
            background: isChecked ? theme.accent : "transparent",
            cursor: "pointer"
          }}
        />

        {/* Chip mit transparenter Einfärbung und Kreuz IM Chip */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: bg,
            color: theme.text,
            padding: "6px 10px",
            borderRadius: 14,
            border: `1px solid ${borderCol}`,
            fontSize: 14,
            fontWeight: 600
          }}
        >
          {/* kleiner Farbpukt links */}
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: c.color,
              display: "inline-block"
            }}
          />
          <span style={{ lineHeight: 1 }}>{c.text}</span>
          {/* kleines Kreuz im Chip */}
          <button
            onClick={() => removeConfluence(c.id)}
            style={{
              background: "transparent",
              border: "none",
              color: theme.text,
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
              marginLeft: 2
            }}
            aria-label="Remove confluence"
            title="Remove"
          >
            ✕
          </button>
        </div>
      </div>
    );
  })}
</div>


       
         {/* Images */}
<FieldLabel theme={theme}>Images</FieldLabel>

{/* Add Image Button */}
<div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
  <label
    htmlFor="imageUpload"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 44,
      height: 44,
      borderRadius: "50%",
      background: theme.accent,
      color: "#fff",
      cursor: "pointer",
      
    }}
    title="Add images"
  >
    <FiImage size={20} />
  </label>
  <input
    id="imageUpload"
    type="file"
    accept="image/*"
    multiple
    style={{ display: "none" }}
    onChange={e => {
      const files = Array.from(e.target.files);
      files.forEach(f => {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(f);
      });
    }}
  />
</div>

{/* Preview Grid */}
<div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
  {imagePreviews.map((src, i) => (
    <div key={i} style={{ position: "relative" }}>
      <img
        src={src}
        alt=""
        style={{
          width: 120,
          height: 80,
          objectFit: "cover",
          borderRadius: 6,
          boxShadow: "0 2px 0px rgba(0,0,0,0.15)"
        }}
      />
      <button
        onClick={() =>
          setImagePreviews(prev => prev.filter((_, j) => j !== i))
        }
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          background: "rgba(0,0,0,0.5)",
          border: "none",
          color: "#fff",
          borderRadius: "50%",
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}
        title="Remove image"
      >
        <FiX size={12} />
      </button>
    </div>
  ))}
</div>

        </div>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "10px 18px", border: "none", background: theme.input, borderRadius: 8, color: theme.text }}>Cancel</button>
          <button onClick={handleSaveTrade} style={{ padding: "10px 18px", border: "none", background: theme.accent, borderRadius: 8, color: "#fff", fontWeight: 700 }}>Save Trade</button>
        </div>
      </div>
    </div>
  );
}

