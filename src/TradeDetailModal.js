// src/components/TradeDetailModal.jsx
import React, { useMemo, useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { FiX, FiTrash2, FiEdit2, FiClock, FiTrendingUp, FiTag, FiPlus, FiImage } from "react-icons/fi";

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
  },
  light: {
    bg: "#edf2fa",
    panel: "#ffffff",
    text: "#23232a",
    sub: "#495060",
    border: "#e3e7ef",
    chip: "#f4f7ff",
    accent: "#2c60fa",
  },
};

const OUTCOME = {
  win: { hex: "#1CBF73" },
  loss: { hex: "#EE4E4E" },
  be: { hex: "#8C96AA" },
};
const pickOutcome = (o = "") =>
  o.toLowerCase() === "win" ? "win" : o.toLowerCase() === "loss" ? "loss" : "be";

const rgba = (hex, a) => {
  const c = (hex || "#2c60fa").replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};
const tint = (dark, hex, a) =>
  dark
    ? `linear-gradient(135deg, ${rgba(hex, 0)} 0%, ${rgba(hex, a)} 100%)`
    : rgba(hex, a * 0.9);

/* ---- Confluence-Palette laden (users/{uid}/confluences) ---- */
function useConfluencePalette() {
  const [list, setList] = useState([]); // [{text,color}, ...]
  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    (async () => {
      try {
        const db = getFirestore();
        const snap = await getDocs(collection(db, "users", uid, "confluences"));
        const rows = [];
        snap.forEach((d) => {
          const { text, color } = d.data() || {};
          if (text && color) rows.push({ text, color });
        });
        setList(rows);
      } catch (e) {
        console.error("load confluences", e);
      }
    })();
  }, []);
  // Map zum schnellen Nachschlagen
  const map = useMemo(() => {
    const m = {};
    list.forEach(({ text, color }) => (m[String(text).toLowerCase()] = color));
    return m;
  }, [list]);
  return { list, map };
}

/* ---- Kleinere UI-Helfer ---- */
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

function Tags({ list, theme, paletteMap }) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {list.map((t, i) => {
        const text = t?.text ?? t;
        const lower = String(text).toLowerCase();
        const color = t?.color ?? paletteMap[lower] ?? "#2C60FA";
        return (
          <span
            key={`${text}-${i}`}
            title={text}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              background: rgba(color, 0.16),
              border: `1px solid ${rgba(color, 0.4)}`,
              color,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

/* ---- Hauptkomponente ---- */
export default function TradeDetailModal({
  open,
  trade,
  dark,
  onClose,
  onDeleted,
}) {
  const theme = useMemo(() => (dark ? palette.dark : palette.light), [dark]);
  const { list: confList, map: confMap } = useConfluencePalette();

  const [imgIdx, setImgIdx] = useState(0);
  const [isEdit, setIsEdit] = useState(false);
  const [busy, setBusy] = useState(false);

  // Edit-Form State
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (open && trade) {
      setIsEdit(false);
      setImgIdx(0);
      setForm({
        symbol: trade.symbol || "",
        position: trade.position || "",
        outcome: trade.outcome || "",
        riskReward: trade.riskReward || "",
        risk: trade.risk ?? "",
        entryDate: trade.entryDate || trade.date || "",
        time: trade.time || "",
        exitDate: trade.exitDate || "",
        timeZone: trade.timeZone || "",
        positiveFeedback: trade.positiveFeedback || "",
        negativeFeedback: trade.negativeFeedback || "",
        images: Array.isArray(trade.images) ? trade.images.filter(Boolean) : [],
        confluenceEntries: Array.isArray(trade.confluenceEntries)
          ? trade.confluenceEntries.map((c) =>
              typeof c === "string" ? { text: c, color: confMap[String(c).toLowerCase()] || "#2C60FA" } : c
            )
          : [],
        currencySymbol: trade.currencySymbol || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trade, confMap]);

  if (!open || !trade || !form) return null;

  const ok = pickOutcome(trade.outcome);
  const okHex = OUTCOME[ok].hex;

  const imgs = form.images;
  const showGallery = imgs.length > 0;
  const currentImg = showGallery ? imgs[Math.min(imgIdx, imgs.length - 1)] : null;

  const val = Number(trade.risk ?? 0);
  const profitColor = val > 0 ? OUTCOME.win.hex : val < 0 ? OUTCOME.loss.hex : theme.sub;
  const sign = val > 0 ? "+" : val < 0 ? "-" : "";
  const abs = Math.trunc(Math.abs(val));
  const currency = trade.currencySymbol || form.currencySymbol || "";

  async function handleDelete() {
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

  async function handleUploadFiles(files) {
    const uid = getAuth().currentUser?.uid;
    if (!uid || !trade?.id || !files?.length) return;
    const storage = getStorage();
    setBusy(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const path = `users/${uid}/trade_images/${trade.id}/${Date.now()}_${file.name}`;
        const ref = storageRef(storage, path);
        const task = uploadBytesResumable(ref, file, {
          contentType: file.type,
          cacheControl: "public,max-age=31536000",
        });
        await new Promise((res, rej) => {
          task.on(
            "state_changed",
            () => {},
            rej,
            async () => {
              const url = await getDownloadURL(ref);
              newUrls.push(url);
              res();
            }
          );
        });
      }
      setForm((f) => ({ ...f, images: [...f.images, ...newUrls] }));
      setImgIdx((i) => (showGallery ? i : 0));
    } catch (e) {
      console.error("upload error", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    try {
      setBusy(true);
      const uid = getAuth().currentUser?.uid;
      if (!uid) throw new Error("No user");
      const db = getFirestore();

      // Speichere Confluences als {text,color}
      const cleanConfs = (form.confluenceEntries || [])
        .filter((c) => c?.text)
        .map((c) => ({
          text: c.text,
          color: c.color || confMap[String(c.text).toLowerCase()] || "#2C60FA",
        }));

      await updateDoc(doc(db, "users", uid, "trades", trade.id), {
        symbol: form.symbol,
        position: form.position,
        outcome: form.outcome,
        riskReward: form.riskReward,
        risk: form.risk === "" ? null : Number(form.risk),
        entryDate: form.entryDate,
        time: form.time,
        exitDate: form.exitDate,
        timeZone: form.timeZone,
        positiveFeedback: form.positiveFeedback || "",
        negativeFeedback: form.negativeFeedback || "",
        images: form.images,
        confluenceEntries: cleanConfs,
        currencySymbol: form.currencySymbol || "",
      });

      setIsEdit(false);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const hasDetails =
    form.position ||
    form.entryDate ||
    form.exitDate ||
    form.time ||
    form.timeZone ||
    form.riskReward;

  const hasPos = !!(form.positiveFeedback && form.positiveFeedback.trim());
  const hasNeg = !!(form.negativeFeedback && form.negativeFeedback.trim());
  const hasTags = Array.isArray(form.confluenceEntries) && form.confluenceEntries.length > 0;

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
            background: tint(dark, OUTCOME[pickOutcome(form.outcome)].hex, 0.18),
          }}
        >
          {/* left cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title="Symbol"
            >
              {form.symbol || "—"}
            </div>

            {form.outcome && (
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: tint(dark, OUTCOME[pickOutcome(form.outcome)].hex, 0.28),
                  color: OUTCOME[pickOutcome(form.outcome)].hex,
                  fontWeight: 800,
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
                title="Outcome"
              >
                {form.outcome}
              </div>
            )}

            {(trade.risk ?? trade.risk === 0) && (
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
                {`${sign}${currency}${abs}`}
              </div>
            )}
          </div>

          {/* right cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isEdit ? (
              <>
                <button
                  onClick={() => setIsEdit(true)}
                  title="Edit trade"
                  style={{
                    border: `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.text,
                    cursor: "pointer",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={handleDelete}
                  title="Delete trade"
                  style={{
                    border: `1px solid ${rgba("#EE4E4E", 0.55)}`,
                    background: "transparent",
                    color: "#EE4E4E",
                    cursor: "pointer",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
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
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <FiX size={20} />
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={handleSave}
                  title="Save"
                  style={{
                    border: "none",
                    background: theme.accent,
                    color: "#fff",
                    cursor: "pointer",
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  {busy ? "Saving…" : "Save"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    setIsEdit(false);
                    // Reset zurück auf Original (ohne persistente Änderungen)
                    setForm((f) => ({
                      ...f,
                      symbol: trade.symbol || "",
                      position: trade.position || "",
                      outcome: trade.outcome || "",
                      riskReward: trade.riskReward || "",
                      risk: trade.risk ?? "",
                      entryDate: trade.entryDate || trade.date || "",
                      time: trade.time || "",
                      exitDate: trade.exitDate || "",
                      timeZone: trade.timeZone || "",
                      positiveFeedback: trade.positiveFeedback || "",
                      negativeFeedback: trade.negativeFeedback || "",
                      images: Array.isArray(trade.images) ? trade.images.filter(Boolean) : [],
                      confluenceEntries: Array.isArray(trade.confluenceEntries)
                        ? trade.confluenceEntries.map((c) =>
                            typeof c === "string" ? { text: c, color: confMap[String(c).toLowerCase()] || "#2C60FA" } : c
                          )
                        : [],
                      currencySymbol: trade.currencySymbol || "",
                    }));
                  }}
                  title="Cancel"
                  style={{
                    border: `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.text,
                    cursor: "pointer",
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  Cancel
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
          {/* LEFT: Info / Edit */}
          <div style={{ display: "grid", gap: 12 }}>
            {/* Details */}
            {(hasDetails || isEdit) && (
              <section
                style={{
                  background: theme.panel,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: theme.sub,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  Trade Details
                </div>

                {!isEdit ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <Row k="Position" v={form.position} icon={<FiTrendingUp size={16} />} theme={theme} />
                    <Row k="Outcome" v={form.outcome} icon={<FiTrendingUp size={16} />} theme={theme} />
                    <Row k="Risk/Reward" v={form.riskReward} icon={<FiTrendingUp size={16} />} theme={theme} />
                    <Row k="Profit" v={form.risk === "" ? "" : String(form.risk)} icon={<FiTrendingUp size={16} />} theme={theme} />
                    <Row k="Entry" v={[form.entryDate, form.time].filter(Boolean).join(" • ")} icon={<FiClock size={16} />} theme={theme} />
                    <Row k="Exit" v={[form.exitDate, form.timeZone].filter(Boolean).join(" • ")} icon={<FiClock size={16} />} theme={theme} />
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    <GridField label="Symbol">
                      <input
                        value={form.symbol}
                        onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                        style={inputStyle(theme)}
                        placeholder="e.g. EURUSD"
                      />
                    </GridField>
                    <GridField label="Position">
                      <select
                        value={form.position}
                        onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                        style={inputStyle(theme)}
                      >
                        <option value="">—</option>
                        <option>Buy</option>
                        <option>Sell</option>
                      </select>
                    </GridField>
                    <GridField label="Outcome">
                      <select
                        value={form.outcome}
                        onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}
                        style={inputStyle(theme)}
                      >
                        <option value="">—</option>
                        <option>Win</option>
                        <option>Loss</option>
                        <option value="BE">BE</option>
                      </select>
                    </GridField>
                    <GridField label="Risk/Reward">
                      <input
                        value={form.riskReward}
                        onChange={(e) => setForm((f) => ({ ...f, riskReward: e.target.value }))}
                        style={inputStyle(theme)}
                        placeholder="e.g. 1:2"
                      />
                    </GridField>
                    <GridField label="Profit (P/L)">
                      <input
                        type="number"
                        value={form.risk}
                        onChange={(e) => setForm((f) => ({ ...f, risk: e.target.value }))}
                        style={inputStyle(theme)}
                        placeholder="e.g. 250"
                      />
                    </GridField>
                    <GridField label="Currency symbol">
                      <input
                        value={form.currencySymbol}
                        onChange={(e) => setForm((f) => ({ ...f, currencySymbol: e.target.value }))}
                        style={inputStyle(theme)}
                        placeholder="$, €, £, CHF, ¥"
                      />
                    </GridField>
                    <GridField label="Entry date">
                      <input
                        value={form.entryDate}
                        onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
                        style={inputStyle(theme)}
                        placeholder="DD.MM.YY"
                      />
                    </GridField>
                    <GridField label="Entry time">
                      <input
                        value={form.time}
                        onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                        style={inputStyle(theme)}
                        placeholder="HH:MM"
                      />
                    </GridField>
                    <GridField label="Exit date">
                      <input
                        value={form.exitDate}
                        onChange={(e) => setForm((f) => ({ ...f, exitDate: e.target.value }))}
                        style={inputStyle(theme)}
                        placeholder="DD.MM.YY"
                      />
                    </GridField>
                    <GridField label="Time zone">
                      <input
                        value={form.timeZone}
                        onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value }))}
                        style={inputStyle(theme)}
                        placeholder="e.g. UTC+1"
                      />
                    </GridField>
                  </div>
                )}
              </section>
            )}

            {/* Notes / Room for Improvement (NEUTRAL, ohne Farbhintergründe) */}
            {(hasPos || isEdit || hasNeg) && (
              <section style={{ display: "grid", gap: 12 }}>
                {(hasPos || isEdit) && (
                  <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14 }}>
                    <div
                      style={{
                        padding: "10px 14px",
                        color: theme.sub,
                        fontWeight: 900,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      Notes (positive)
                    </div>
                    <div style={{ padding: 14, lineHeight: 1.6 }}>
                      {isEdit ? (
                        <textarea
                          value={form.positiveFeedback}
                          onChange={(e) => setForm((f) => ({ ...f, positiveFeedback: e.target.value }))}
                          style={{ ...inputStyle(theme), minHeight: 90, resize: "vertical" }}
                          placeholder="What went well…"
                        />
                      ) : (
                        form.positiveFeedback
                      )}
                    </div>
                  </div>
                )}

                {(hasNeg || isEdit) && (
                  <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14 }}>
                    <div
                      style={{
                        padding: "10px 14px",
                        color: theme.sub,
                        fontWeight: 900,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${theme.border}`,
                      }}
                    >
                      Room for improvement
                    </div>
                    <div style={{ padding: 14, lineHeight: 1.6 }}>
                      {isEdit ? (
                        <textarea
                          value={form.negativeFeedback}
                          onChange={(e) => setForm((f) => ({ ...f, negativeFeedback: e.target.value }))}
                          style={{ ...inputStyle(theme), minHeight: 90, resize: "vertical" }}
                          placeholder="What to improve next time…"
                        />
                      ) : (
                        form.negativeFeedback
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Confluences */}
            {(hasTags || isEdit) && (
              <section style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FiTag size={16} style={{ color: theme.sub }} />
                  <div
                    style={{
                      color: theme.sub,
                      fontWeight: 900,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Confluences
                  </div>
                </div>

                {!isEdit ? (
                  <div style={{ marginTop: 10 }}>
                    <Tags list={form.confluenceEntries} theme={theme} paletteMap={confMap} />
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {/* Auswahl aus Palette */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {confList.map(({ text, color }) => {
                        const active = form.confluenceEntries.some((c) => String(c.text).toLowerCase() === String(text).toLowerCase());
                        return (
                          <button
                            key={text}
                            onClick={() =>
                              setForm((f) => {
                                const exists = f.confluenceEntries.find(
                                  (c) => String(c.text).toLowerCase() === String(text).toLowerCase()
                                );
                                return exists
                                  ? { ...f, confluenceEntries: f.confluenceEntries.filter((c) => String(c.text).toLowerCase() !== String(text).toLowerCase()) }
                                  : { ...f, confluenceEntries: [...f.confluenceEntries, { text, color }] };
                              })
                            }
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              background: rgba(color, active ? 0.22 : 0.12),
                              border: `1px solid ${rgba(color, active ? 0.55 : 0.4)}`,
                              color,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title={text}
                          >
                            {active ? "✓ " : ""}{text}
                          </button>
                        );
                      })}
                    </div>

                    {/* Aktuelle Auswahl */}
                    {form.confluenceEntries.length > 0 && (
                      <div>
                        <div style={{ color: theme.sub, fontSize: 12, marginBottom: 6 }}>Selected</div>
                        <Tags list={form.confluenceEntries} theme={theme} paletteMap={confMap} />
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* RIGHT: Bildbereich (ein Bild groß, wählbar) + Edit-Tools */}
          {showGallery || isEdit ? (
            <section style={{ display: "grid", gap: 10, alignContent: "start" }}>
              {/* Hauptbild oder Platzhalter */}
              <div
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  background: theme.panel,
                  border: `1px solid ${theme.border}`,
                  minHeight: 220,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {currentImg ? (
                  <img src={currentImg} alt="" style={{ width: "100%", height: 320, objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ color: theme.sub, display: "grid", placeItems: "center", gap: 8, padding: 20 }}>
                    <FiImage size={32} />
                    <div style={{ fontSize: 13 }}>No image</div>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {imgs.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px,1fr))", gap: 8 }}>
                  {imgs.map((src, i) => (
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
                        position: "relative",
                      }}
                      title={`Image ${i + 1}`}
                    >
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      {isEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
                            if (imgIdx >= i && imgIdx > 0) setImgIdx(imgIdx - 1);
                          }}
                          title="Remove image"
                          style={{
                            position: "absolute",
                            right: 4,
                            top: 4,
                            border: "none",
                            background: "rgba(0,0,0,.5)",
                            color: "#fff",
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            lineHeight: "20px",
                          }}
                        >
                          ×
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Upload (nur Edit) */}
              {isEdit && (
                <label
                  style={{
                    border: `1px dashed ${theme.border}`,
                    background: theme.panel,
                    color: theme.sub,
                    borderRadius: 12,
                    padding: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: busy ? "default" : "pointer",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  <FiPlus />
                  {busy ? "Uploading…" : "Add images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleUploadFiles([...e.target.files])}
                    style={{ display: "none" }}
                    disabled={busy}
                  />
                </label>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---- kleine UI-Bausteine ---- */
function GridField({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ color: "#8c93a7", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
function inputStyle(theme) {
  return {
    width: "100%",
    background: theme.panel,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: "10px 12px",
    outline: "none",
    fontSize: 14,
  };
}
