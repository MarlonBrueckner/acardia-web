// src/components/TradeDetailModal.jsx
import React, { useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";
import {
  FiX,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiXCircle,
  FiClock,
  FiTrendingUp,
  FiTag,
  FiImage,
  FiChevronDown
} from "react-icons/fi";
import SymbolPicker from "./SymbolPicker";
import { CustomSelectRounded } from "./CustomSelectRounded";
import { categories } from "./symbolCategories";
/* ---- Theme ---- */
const palette = {
  dark: {
    bg: "#181818",
    panel: "#181818",
    text: "#ffffff",
    sub: "#bfc4cf",
    border: "#2a2a2f",
    chip: "#23232a",
    accent: "#2c60fa",
    input: "#1f1f1f",
    inputBorder: "#4e4e4e",
  },
  light: {
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
};


const OUTCOME = {
  win: { hex: "#1CBF73" },
  loss: { hex: "#EE4E4E" },
  be: { hex: "#8C96AA" },
};
const pickOutcome = (o = "") =>
  o.toLowerCase() === "win" ? "win" : o.toLowerCase() === "loss" ? "loss" : "be";

const tint = (dark, hex, a) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16),
    g = parseInt(c.slice(2, 4), 16),
    b = parseInt(c.slice(4, 6), 16);
  return dark
    ? `linear-gradient(135deg, rgba(${r},${g},${b},0) 0%, rgba(${r},${g},${b},${a}) 100%)`
    : `rgba(${r},${g},${b},${a * 0.9})`;
};
const rgba = (hex, a) => {
  const c = (hex || "#2c60fa").replace("#", "");
  const r = parseInt(c.slice(0, 2), 16),
    g = parseInt(c.slice(2, 4), 16),
    b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/* ---- Small UI helpers ---- */
const inputBase = (t) => ({
  width: "100%",
  background: t.input,
  color: t.text,
  border: `1px solid ${t.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
  fontSize: 14,
});
const label = (t) => ({
  color: t.sub,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
});
const section = (t) => ({
  background: t.panel,
  border: `1px solid ${t.border}`,
  borderRadius: 14,
  padding: 14,
});

/* ---- Reusable rows / tags ---- */
function Row({ k, v, icon, theme }) {
  if (!v) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "20px 120px 1fr", gap: 8, alignItems: "center" }}>
      <div style={{ color: theme.sub, display: "grid", placeItems: "center" }}>{icon}</div>
      <div style={{ color: theme.sub, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
      <div style={{ fontWeight: 600 }}>{v}</div>
    </div>
  );
}

function Tags({ list, theme }) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {list.map((t, i) => {
        const text = t?.text ?? t;
        const color = t?.color ?? "#2C60FA";
        return (
          <span
            key={`${text}-${i}`}
            title={text}
            style={{
              padding: "6px 10px",
              borderRadius: 10, // weniger rund
              background: rgba(color, 0.16),
              border: `1px solid ${rgba(color, 0.4)}`,
              color,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

/**
 * TradeDetailModal
 * Props:
 * - open, trade, dark
 * - onClose()
 * - onDeleted?()
 */
export default function TradeDetailModal({
  open,
  trade,
  dark,
  onClose,
  onDeleted,
  onSaved
}) {
  const theme = useMemo(() => (dark ? palette.dark : palette.light), [dark]);
  const [imgIdx, setImgIdx] = useState(0);
  const [isEdit, setIsEdit] = useState(false);

// Beispiel-Symbole – später evtl. dynamisch aus DB laden


  // Form-State für Edit
  const [form, setForm] = useState(() => ({
    symbol: trade?.symbol || "",
    position: trade?.position || "",
    outcome: trade?.outcome || "BE",
    riskReward: trade?.riskReward || "",
    risk: trade?.risk ?? 0,
    entryDate: trade?.entryDate || trade?.date || "",
    time: trade?.time || "",
    exitDate: trade?.exitDate || "",
    timeZone: trade?.timeZone || "",
    positiveFeedback: trade?.positiveFeedback || "",
    negativeFeedback: trade?.negativeFeedback || "",
    currencySymbol: trade?.currencySymbol || "",
    confluenceEntries: Array.isArray(trade?.confluenceEntries)
      ? trade.confluenceEntries.map((c) =>
          typeof c === "string" ? { text: c, color: "#2C60FA" } : c
        )
      : [],
    images: Array.isArray(trade?.images) ? trade.images.filter(Boolean) : [],
  }));

  // Wenn Modal neu geöffnet wird, Form mit Trade-Daten resetten
  React.useEffect(() => {
    if (!open || !trade) return;
    setIsEdit(false);
    setImgIdx(0);
    setForm({
      symbol: trade.symbol || "",
      position: trade.position || "",
      outcome: trade.outcome || "BE",
      riskReward: trade.riskReward || "",
      risk: trade.risk ?? 0,
      entryDate: trade.entryDate || trade.date || "",
      time: trade.time || "",
      exitDate: trade.exitDate || "",
      timeZone: trade.timeZone || "",
      positiveFeedback: trade.positiveFeedback || "",
      negativeFeedback: trade.negativeFeedback || "",
      currencySymbol: trade.currencySymbol || "",
      confluenceEntries: Array.isArray(trade.confluenceEntries)
        ? trade.confluenceEntries.map((c) =>
            typeof c === "string" ? { text: c, color: "#2C60FA" } : c
          )
        : [],
      images: Array.isArray(trade.images) ? trade.images.filter(Boolean) : [],
    });
  }, [open, trade]);

  if (!open || !trade) return null;

  const ok = pickOutcome(form.outcome || trade.outcome);
  const okHex = OUTCOME[ok].hex;

  const showGallery = form.images.length > 0;
  const currentImg = showGallery ? form.images[Math.min(imgIdx, form.images.length - 1)] : null;

  const val = Number(form.risk ?? 0);
  const profitColor = val > 0 ? OUTCOME.win.hex : val < 0 ? OUTCOME.loss.hex : theme.sub;
  const sign = val > 0 ? "+" : val < 0 ? "-" : "";
  const abs = Math.trunc(Math.abs(val));

  /* ------- Actions ------- */
  async function handleDeleteTrade() {
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) throw new Error("No user");
      const db = getFirestore();
      await deleteDoc(doc(db, "users", uid, "trades", trade.id));
      onDeleted?.();
      onClose?.();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSave() {
  try {
    const uid = getAuth().currentUser?.uid;
    if (!uid) throw new Error("No user");
    const db = getFirestore();

    // Nur Felder mergen, die wir im Formular führen
    const payload = {
      symbol: form.symbol || "",
      position: form.position || "",
      outcome: form.outcome || "BE",
      riskReward: form.riskReward || "",
      risk: Number(form.risk) || 0,
      entryDate: form.entryDate || "",
      time: form.time || "",
      exitDate: form.exitDate || "",
      timeZone: form.timeZone || "",
      positiveFeedback: form.positiveFeedback || "",
      negativeFeedback: form.negativeFeedback || "",
      currencySymbol: form.currencySymbol || "",
      confluenceEntries: (form.confluenceEntries || []).map((c) => ({
        text: c.text,
        color: c.color || "#2C60FA",
      })),
      images: form.images || [],
    };

    // Speichern und warten
    await updateDoc(doc(db, "users", uid, "trades", trade.id), payload);

    // Erst nach Erfolg UI anpassen
    setIsEdit(false);

    // Optional: Refresh/Callback nur nach Save
    if (typeof onSaved === "function") {
      onSaved(); // z. B. refreshKey erhöhen
    }

  } catch (e) {
    console.error("Fehler beim Speichern:", e);
  }
}

  function removeCurrentImage() {
    if (!showGallery) return;
    const next = [...form.images];
    next.splice(imgIdx, 1);
    setForm((f) => ({ ...f, images: next }));
    setImgIdx((i) => Math.max(0, Math.min(i, next.length - 1)));
  }

  async function uploadImages(files) {
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid || !trade?.id || !files?.length) return;
      const storage = getStorage();

      const urls = [];
      for (const file of files) {
        const path = `users/${uid}/trades/${trade.id}/${Date.now()}_${file.name}`;
        const ref = storageRef(storage, path);
        const task = uploadBytesResumable(ref, file, {
          contentType: file.type || "image/jpeg",
          cacheControl: "public, max-age=31536000",
        });
        await new Promise((res, rej) => {
          task.on(
            "state_changed",
            () => {},
            rej,
            async () => {
              const url = await getDownloadURL(ref);
              urls.push(url);
              res();
            }
          );
        });
      }
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    } catch (e) {
      console.error(e);
    }
  }

  /* ------- Edit helpers ------- */
  function updateField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }
  function addConfluence(text, color) {
    if (!text) return;
    setForm((f) => ({
      ...f,
      confluenceEntries: [...(f.confluenceEntries || []), { text, color: color || "#2C60FA" }],
    }));
  }
  function removeConfluence(idx) {
    setForm((f) => {
      const next = [...(f.confluenceEntries || [])];
      next.splice(idx, 1);
      return { ...f, confluenceEntries: next };
    });
  }

  /* ------- Render ------- */
  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 14,
      }}
    >
      <div
        style={{
          width: "min(1100px,96vw)",
          maxHeight: "92vh",
          background: theme.panel,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          boxShadow: dark ? "0 12px 50px rgba(0,0,0,.45)" : "0 12px 40px rgba(30,36,64,.18)",
        }}
      >
        {/* HEADER: Symbol → Outcome → Profit */}
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${theme.border}`,
            background: tint(dark, okHex, 0.18),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {form.symbol || "—"}
            </div>

            <div
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: tint(dark, okHex, 0.28),
                color: okHex,
                fontWeight: 800,
                fontSize: 12,
                textTransform: "uppercase",
              }}
              title="Outcome"
            >
              {form.outcome}
            </div>

            <div
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: tint(dark, profitColor, 0.22),
                color: profitColor,
                fontSize: 13,
                fontWeight: 800,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              }}
              title="P/L"
            >
              {`${sign}${form.currencySymbol || ""}${abs}`}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isEdit ? (
              <>
                <button
                  onClick={() => setIsEdit(true)}
                  title="Edit trade"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: theme.text,
                    cursor: "pointer",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                  }}
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={handleDeleteTrade}
                  title="Delete trade"
                  style={{
                    border: "none",
                    background: "transparent", // kein roter Hintergrund
                    color: "#EE4E4E",
                    cursor: "pointer",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                  }}
                >
                  <FiTrash2 />
                </button>
                <button
                  onClick={onClose}
                  title="Close"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: theme.sub,
                    cursor: "pointer",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                  }}
                >
                  <FiX size={20} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  title="Save changes"
                  style={{
                    border: `1px solid ${theme.border}`,
                    background: theme.panel,
                    color: theme.text,
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                  }}
                >
                  <FiCheck /> Save
                </button>
                <button
                  onClick={() => setIsEdit(false)}
                  title="Cancel"
                  style={{
                    border: `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.sub,
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                  }}
                >
                  <FiXCircle /> Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* BODY */}
        <div
          style={{
            padding: 16,
            overflow: "auto",
            background: theme.bg,
            display: "grid",
            gap: 12,
            gridTemplateColumns: showGallery ? "1.2fr .8fr" : "1fr",
          }}
        >
          {/* LEFT: Details, Notes, Confluences */}
          <div style={{ display: "grid", gap: 12 }}>
            {/* Details */}
            <section style={section(theme)}>
              <div style={label(theme)}></div>

             {!isEdit ? (
  <div style={{ display: "grid", gap: 10 }}>
    <Row k="Position" v={form.position} icon={<FiTrendingUp size={16} />} theme={theme} />
    <Row k="Outcome" v={form.outcome} icon={<FiTrendingUp size={16} />} theme={theme} />
    <Row k="Risk/Reward" v={form.riskReward} icon={<FiTrendingUp size={16} />} theme={theme} />
    <Row k="Entry" v={[form.entryDate, form.time].filter(Boolean).join(" • ")} icon={<FiClock size={16} />} theme={theme} />
    {form.exitDate || form.timeZone ? (
      <Row k="Exit" v={[form.exitDate, form.timeZone].filter(Boolean).join(" • ")} icon={<FiClock size={16} />} theme={theme} />
    ) : null}
  </div>
) : (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>


<div style={{ gridColumn: "1 / -1" }}>
  <div style={label(theme)}>Symbol</div>
  <SymbolPicker
    value={form.symbol}
    onChange={(v) => updateField("symbol", v)}
    dark={dark}
    theme={theme}
    categories={categories /* optional: dieselbe Liste wie im Form */}
    enableTVSearch={true}
  />
</div>

    {/* Position – Buy/Sell Segment-Picker */}
    <div>
      <div style={label(theme)}>Position</div>
      <div
        role="tablist"
        aria-label="Position"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderRadius: 12,
          background: theme.input,
          border: `1px solid ${theme.inputBorder}`,
          height: 44,
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            left: 4,
            width: "calc(50% - 4px)",
            borderRadius: 8,
            background: `${theme.accent}33`,
            border: `1px solid ${theme.accent}`,
            transform: form.position === "Sell" ? "translateX(100%)" : "translateX(0)",
            transition: "transform .2s ease",
          }}
        />
        <button
          type="button"
          onClick={() => updateField("position", "Buy")}
          style={{
            border: "none",
            background: "transparent",
            color: theme.text,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => updateField("position", "Sell")}
          style={{
            border: "none",
            background: "transparent",
            color: theme.text,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sell
        </button>
      </div>
    </div>

{/* Outcome – Custom Select mit Chevron und rundem Dropdown */}
<div>
  <div style={label(theme)}>Outcome</div>
  <CustomSelectRounded
    theme={theme}
    value={form.outcome}
    options={["Win", "Loss", "BE"]}
    onChange={(val) => updateField("outcome", val)}
    width={undefined} // oder z.B. 240
  />
</div>



    {/* Risk / Reward */}
    <div>
      <div style={label(theme)}>Risk / Reward</div>
      <input
        value={form.riskReward}
        onChange={(e) => updateField("riskReward", e.target.value)}
        placeholder="e.g. 1:3"
        style={inputBase(theme)}
      />
    </div>

    {/* Profit / Loss – ohne Spinner */}
    <div>
      <div style={label(theme)}>Profit / Loss</div>
      <input
        inputMode="decimal"
        pattern="^-?\\d*(\\.\\d+)?$"
        value={String(form.risk ?? "")}
        onChange={(e) => {
          // nur +-Zahlen erlauben
          const v = e.target.value;
          if (/^-?\d*(\.\d+)?$/.test(v) || v === "" || v === "-") {
            updateField("risk", v === "" || v === "-" ? v : Number(v));
          }
        }}
        placeholder="e.g. 250"
        style={{
          ...inputBase(theme),
          // Spinners vermeiden (Cross-Browser best effort)
          MozAppearance: "textfield",
        }}
      />
    </div>

    {/* Entry Date / Time */}
    <div>
      <div style={label(theme)}>Entry Date</div>
      <input
        type="date"
        value={
          // erwartet YYYY-MM-DD im Picker; falls dein gespeichertes Format dd.mm.yy ist, hier konvertieren
          /^\d{4}-\d{2}-\d{2}$/.test(form.entryDate) ? form.entryDate : ""
        }
        onChange={(e) => updateField("entryDate", e.target.value)}
        style={inputBase(theme)}
      />
    </div>
    <div>
      <div style={label(theme)}>Entry Time</div>
      <input
        type="time"
        value={form.time || ""}
        onChange={(e) => updateField("time", e.target.value)}
        style={inputBase(theme)}
      />
    </div>

    {/* Exit Date / Time */}
    <div>
      <div style={label(theme)}>Exit Date</div>
      <input
        type="date"
        value={/^\d{4}-\d{2}-\d{2}$/.test(form.exitDate) ? form.exitDate : ""}
        onChange={(e) => updateField("exitDate", e.target.value)}
        style={inputBase(theme)}
      />
    </div>
    <div>
      <div style={label(theme)}>Exit Time</div>
      <input
        type="time"
        value={form.timeZone || ""} // falls du "exitTime" statt timeZone speicherst, hier anpassen
        onChange={(e) => updateField("timeZone", e.target.value)}
        style={inputBase(theme)}
      />
    </div>
  </div>
)}

                  </section>

            {/* Notes (keine Einfärbung) */}
            {(form.positiveFeedback || isEdit) && (
              <section style={section(theme)}>
                <div style={label(theme)}>Notes (positive)</div>
                {!isEdit ? (
                  <div style={{ lineHeight: 1.6 }}>{form.positiveFeedback}</div>
                ) : (
                  <textarea
                    rows={4}
                    value={form.positiveFeedback}
                    onChange={(e) => updateField("positiveFeedback", e.target.value)}
                    style={{ ...inputBase(theme), resize: "vertical" }}
                  />
                )}
              </section>
            )}

            {(form.negativeFeedback || isEdit) && (
              <section style={section(theme)}>
                <div style={label(theme)}>Room for improvement</div>
                {!isEdit ? (
                  <div style={{ lineHeight: 1.6 }}>{form.negativeFeedback}</div>
                ) : (
                  <textarea
                    rows={4}
                    value={form.negativeFeedback}
                    onChange={(e) => updateField("negativeFeedback", e.target.value)}
                    style={{ ...inputBase(theme), resize: "vertical" }}
                  />
                )}
              </section>
            )}

            {/* Confluences (eingefärbt nach gespeicherter Farbe) */}
            {(form.confluenceEntries.length > 0 || isEdit) && (
              <section style={section(theme)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <FiTag size={16} style={{ color: theme.sub }} />
                  <div style={label(theme)}>Confluences</div>
                </div>

                {!isEdit ? (
                  <Tags list={form.confluenceEntries} theme={theme} />
                ) : (
                  <>
                    {/* Bestehende */}
                    {form.confluenceEntries.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {form.confluenceEntries.map((c, idx) => (
                          <span
                            key={`${c.text}-${idx}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 10px",
                              borderRadius: 10,
                              background: rgba(c.color || "#2C60FA", 0.16),
                              border: `1px solid ${rgba(c.color || "#2C60FA", 0.4)}`,
                              color: c.color || "#2C60FA",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {c.text}
                            <button
                              onClick={() => removeConfluence(idx)}
                              title="Remove"
                              style={{
                                border: "none",
                                background: "transparent",
                                color: theme.sub,
                                cursor: "pointer",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              <FiX size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Hinzufügen */}
                    <AddConfluence onAdd={addConfluence} theme={theme} />
                  </>
                )}
              </section>
            )}
          </div>

          {/* RIGHT: Single image with selector + Edit Controls */}
          {showGallery || isEdit ? (
            <section style={{ display: "grid", gap: 10, alignContent: "start" }}>
              {/* Hauptbild */}
              {showGallery && (
                <div
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    background: theme.panel,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <img
                    src={currentImg}
                    alt=""
                    style={{ width: "100%", height: 320, objectFit: "cover", display: "block" }}
                  />
                </div>
              )}

              {/* Thumbnails */}
              {showGallery && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px,1fr))", gap: 8 }}>
                  {form.images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      style={{
                        border: `2px solid ${i === imgIdx ? palette.light.accent : theme.border}`,
                        borderRadius: 10,
                        padding: 0,
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "transparent",
                        height: 56,
                      }}
                      title={`Image ${i + 1}`}
                    >
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Edit Controls für Bilder */}
{isEdit && (
  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
    {/* Add images */}
    <label
      htmlFor="tradeImages"
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.panel,
        color: theme.text,
        borderRadius: 10,
        padding: "10px 12px",
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        width: "fit-content",
      }}
    >
      <FiImage /> Add images
    </label>

    {/* Hidden file input */}
    <input
      id="tradeImages"
      type="file"
      accept="image/*"
      multiple
      onChange={async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const toDataURL = (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });

        const urls = await Promise.all(files.map(toDataURL));
        const next = [...(form.images || []), ...urls];

        // Bilder in dein Formular-State schreiben
        updateField("images", next);

        // Input leeren, damit dieselbe Datei erneut gewählt werden kann
        e.target.value = "";
      }}
      style={{ display: "none" }}
    />

    {/* Roter Mülleimer (löscht das zuletzt hinzugefügte Bild) */}
    {(form.images?.length || 0) > 0 && (
      <button
        onClick={() => {
          const next = [...form.images];
          next.splice(next.length - 1, 1); // letztes Bild entfernen
          updateField("images", next);
        }}
        title="Delete last image"
        aria-label="Delete last image"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "transparent",
          border: "1px solid #EE4E4E",
          color: "#EE4E4E",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <FiTrash2 size={18} />
      </button>
    )}
  </div>
)}


            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AddConfluence({ onAdd, theme }) {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#2C60FA");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 160px auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Confluence name"
        style={inputBase(theme)}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Runde, voll gefüllte Farbvorschau */}
        <div
          style={{
            position: "relative",
            width: 28,
            height: 28,
            flex: "0 0 28px",
            borderRadius: "50%",
            border: `1px solid ${theme.inputBorder}`,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
          title="Pick color"
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: color,
            }}
          />
          <input
            type="color"
            aria-label="Pick color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              border: "none",
              padding: 0,
              margin: 0,
            }}
          />
        </div>

        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={inputBase(theme)}
          placeholder="#RRGGBB"
        />
      </div>

      <button
        onClick={() => {
          onAdd?.(text.trim(), color);
          setText("");
        }}
        style={{
          border: `1px solid ${theme.border}`,
          background: theme.panel,
          color: theme.text,
          borderRadius: 10,
          padding: "10px 12px",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Add
      </button>
    </div>
  );
}
