
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
    "🇪🇺🇺🇸 EUR/USD",
    "🇬🇧🇺🇸 GBP/USD",
    "🇯🇵🇺🇸 USD/JPY",
    "🇦🇺🇺🇸 AUD/USD",
  ],
  Stocks: [
    "🇺🇸 AAPL – Apple Inc.",
    "🇺🇸 MSFT – Microsoft Corporation",
    "🇺🇸 NVDA – NVIDIA Corporation",
    "🇺🇸 AMZN – Amazon.com, Inc.",
  ],
  Crypto: [
    "🪙 BTC – Bitcoin",
    "🪙 ETH – Ethereum",
    "🪙 SOL – Solana",
  ],
  Futures: [
    "📈 ES – E-mini S&P 500",
    "📈 NQ – E-mini NASDAQ-100",
  ],
  Commodities: [
    "📦 CL – Crude Oil (WTI)",
    "📦 GC – Gold",
    "📦 SI – goon",
  ]
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

