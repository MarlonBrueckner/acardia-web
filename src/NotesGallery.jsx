// src/notes/NotesGallery.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { getStorage, ref as sRef, uploadString, getDownloadURL } from "firebase/storage";
import { useTheme } from "./themeNotes";
import { FaPlus, FaSearch, FaDownload } from "react-icons/fa";
import { FiAlertCircle } from "react-icons/fi";

const PREVIEW_H = 180;
const FOOTER_H  = 44;

/* ---- Plan → Limit (Notes) ---- */
function planToNotesLimit(plan) {
  const p = String(plan || "").toLowerCase();
  if (p === "pro") return Infinity;
  if (p === "advanced" || p === "adv") return 50;
  return 5; // free
}

/* ---- kleines Upgrade-Popup (englisch, pink→blau Button) ---- */
function UpgradePopup({ open, dark, onClose, onUpgrade, limit }) {
  if (!open) return null;
  const theme = dark
    ? { panel: "#181818", text: "#fff", sub: "#bfc4cf", border: "#2a2a2f", shadow: "0 10px 40px rgba(0,0,0,.45)" }
    : { panel: "#fff", text: "#23232a", sub: "#495060", border: "#e3e7ef", shadow: "0 12px 40px rgba(30,36,64,.12)" };

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        zIndex: 3000,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          background: theme.panel,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          boxShadow: theme.shadow,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
          <FiAlertCircle style={{ color: "#2c60fa" }} />
          Limit reached
        </div>

        <div style={{ color: theme.sub, lineHeight: 1.5 }}>
          You’ve hit your notes limit of <b>{limit === Infinity ? "∞" : limit}</b>.
          Upgrade to <b>Advanced</b> (up to 50) or <b>Pro</b> (unlimited) to keep creating notes.
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Later
          </button>
          <button
            onClick={onUpgrade}
            style={{
              background: "linear-gradient(135deg, #ff4ecd 0%, #2c60fa 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Upgrade now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesGallery() {
  const { dark } = useOutletContext();
  const T = useTheme(dark);
  const nav = useNavigate();

  const db = getFirestore();
  const storage = getStorage();
  const auth = getAuth();

  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [userDoc, setUserDoc] = useState(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState([]);

  // popup for upgrade
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitText, setLimitText] = useState(5);

  // hidden file input for imports
  const importInputRef = useRef(null);

  /* --- Auth + UserDoc laden (für Plan) --- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid || null);
      if (u?.uid) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setUserDoc(snap.exists() ? snap.data() : {});
      } else {
        setUserDoc(null);
      }
    });
    return () => unsub();
  }, [auth, db]);

  /* --- Notes stream --- */
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "notes"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [db, uid]);

  /* --- Plan + Limit --- */
const plan = useMemo(() => {
  if (!userDoc) return "free";

  // ✅ 1) App/Apple (Firebase field)
  // e.g. users/{uid}.subscriptionStatus = "Advanced" | "Pro" | "Free"
  const appStatus = String(userDoc.subscriptionStatus || "").trim().toLowerCase();
  if (appStatus === "pro") return "pro";
  if (appStatus === "advanced" || appStatus === "adv") return "advanced";

  // (optional legacy flag)
  if (userDoc.isPro === true) return "pro";

  // ✅ 2) Stripe role fields (web)
  const role = String(
    userDoc.stripeRole ||
    userDoc.plan ||
    userDoc.tier ||
    ""
  )
    .trim()
    .toLowerCase();

  if (role === "pro") return "pro";
  if (role === "advanced" || role === "adv") return "advanced";

  // ✅ 3) Stripe subscription object status (web)
  const sub = userDoc.subscription || userDoc.stripeSubscription || {};
  const status = String(sub.status || "").trim().toLowerCase();
  const isActive = status === "active" || status === "trialing";

  if (isActive) {
    const subRole = String(sub.role || "").trim().toLowerCase();
    if (subRole === "pro") return "pro";
    if (subRole === "advanced" || subRole === "adv") return "advanced";

    // fallback: active subscription but no role stored
    return "advanced";
  }

  return "free";
}, [userDoc]);


  const notesLimit = useMemo(() => planToNotesLimit(plan), [plan]);

  /* --- Create Note (mit Limit-Gate) --- */
  async function createNote() {
    if (!uid) return;

    const total = notes.length;
    const limit = notesLimit;

    // Gate
    if (Number.isFinite(limit) && total >= limit) {
      setLimitText(limit);
      setShowUpgrade(true);
      return;
    }

    try {
      setError("");
      setCreating(true);
      const ref = await addDoc(collection(db, "users", uid, "notes"), {
        title: "New Note",
        bodyHtml: "",
        bodyDelta: null,
        images: [],              // store images metadata
        coverUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      nav(`/dashboard/notes/${ref.id}?edit=1`);
    } catch (e) {
      console.error(e);
      setError("Could not create note (permissions?).");
    } finally {
      setCreating(false);
    }
  }

  // IMPORT .json (previously exported note)
  async function importNotesFromFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be chosen again later
    if (!file || !uid) return;

    try {
      setError("");
      const text = await file.text();
      const payload = JSON.parse(text);

      const items = Array.isArray(payload) ? payload : [payload];

      for (const item of items) {
        // Optional: auch hier Limit prüfen (Import zählt als neue Notiz)
        if (Number.isFinite(notesLimit) && notes.length >= notesLimit) {
          setLimitText(notesLimit);
          setShowUpgrade(true);
          break;
        }

        const {
          title = "Imported Note",
          bodyHtml = "",
          bodyDelta = null,
          images = [],
          coverUrl = null,
          createdAt = null,
          updatedAt = null,
        } = item || {};

        const newRef = doc(collection(db, "users", uid, "notes"));
        const newId  = newRef.id;

        const uploaded = [];
        for (const img of images) {
          if (img?.url && !img?.dataUrl) {
            uploaded.push({ name: img.name || "image", url: img.url, createdAt: Date.now() });
            continue;
          }
          if (!img?.dataUrl) continue;

          const path = `users/${uid}/notes/${newId}/images/${Date.now()}_${(img.name || "image").replace(/\s+/g,"_")}.png`;
          const r = sRef(storage, path);
          await uploadString(r, img.dataUrl, "data_url");
          const dl = await getDownloadURL(r);
          uploaded.push({ name: img.name || "image", url: dl, createdAt: Date.now(), path });
        }

        const finalCover = coverUrl || uploaded[0]?.url || null;

        await setDoc(newRef, {
          title,
          bodyHtml,
          bodyDelta: bodyDelta ? JSON.parse(JSON.stringify(bodyDelta)) : null,
          images: uploaded,
          coverUrl: finalCover,
          createdAt: createdAt || serverTimestamp(),
          updatedAt: updatedAt || serverTimestamp(),
        });

        nav(`/dashboard/notes/${newId}`);
        break; // only jump to the first imported note
      }
    } catch (err) {
      console.error(err);
      setError("Import failed. Make sure you select a valid .json export.");
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return notes;
    return notes.filter((n) => {
      const title = String(n.title || "").toLowerCase();
      const tags = (n.tags || []).join(" ").toLowerCase();
      return title.includes(s) || tags.includes(s);
    });
  }, [notes, search]);

  const noNotes = notes.length === 0;

  return (
  <div
    style={{
      padding: "8px 5px",
      minHeight: "100%",
      background: T.bg
    }}
  >
    {/* Überschrift */}
    <h1
      style={{
        margin: "-4px 0 12px 0",
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: 0.3,
        color: T.text
      }}
    >
      Notes
    </h1>

    {/* Header (nur wenn Notes existieren) */}
    {!noNotes && (
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 12
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "8px 10px"
          }}
        >
          <FaSearch color={T.sub} />
          <input
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              color: T.text,
              border: "none",
              outline: "none",
              fontWeight: 600
            }}
          />
        </div>

        {/* Import (.json) */}
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          onChange={importNotesFromFile}
          style={{ display: "none" }}
        />
        <button
          onClick={() => importInputRef.current?.click()}
          title="Import notes (.json)"
          aria-label="Import notes"
          style={{
            height: 40,
            width: 40,
            borderRadius: 12,
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.text,
            display: "grid",
            placeItems: "center"
          }}
        >
          <FaDownload />
        </button>

        {/* Create (icon-only) */}
        <button
          onClick={createNote}
          title="Create note"
          aria-label="Create note"
          style={{
            height: 40,
            width: 40,
            borderRadius: 12,
            background: T.accent,
            color: "#fff",
            border: "none",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 4px 16px rgba(44,96,250,.25)"
          }}
        >
          <FaPlus />
        </button>
      </div>
    )}

    {!!error && (
      <div style={{ color: T.bad, fontWeight: 700, marginBottom: 10 }}>
        {error}
      </div>
    )}

    {/* Empty-State oder Notes-Grid */}
    {noNotes ? (
      <EmptyState
        T={T}
        onCreate={createNote}
        creating={creating}
        onImport={() => importInputRef.current?.click()}
      />
    ) : (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {filtered.map((n) => (
          <NoteTile
            key={n.id}
            T={T}
            note={n}
            onClick={() => nav(`/dashboard/notes/${n.id}`)}
          />
        ))}
      </div>
    )}

    {/* Upgrade-Popup */}
    <UpgradePopup
      open={showUpgrade}
      dark={dark}
      limit={limitText}
      onClose={() => setShowUpgrade(false)}
      onUpgrade={() => {
        setShowUpgrade(false);
        nav("/dashboard/settings?tab=subscription");
      }}
    />
  </div>
  );
}

function EmptyState({ T, onCreate, creating, onImport }) {
  return (
    <div
      style={{
        minHeight: "48vh",
        border: `1.5px dashed ${T.border}`,
        background: T.card,
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        gap: 16
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onCreate}
          disabled={creating}
          title="Create your first note"
          aria-label="Create your first note"
          style={{
            width: 90, height: 90, borderRadius: 18,
            background: T.accent, color: "#fff",
            border: "none", display: "grid", placeItems: "center",
            fontSize: 28, fontWeight: 900,
            boxShadow: "0 10px 30px rgba(44,96,250,.35)",
            opacity: creating ? 0.7 : 1,
            cursor: creating ? "default" : "pointer"
          }}
        >
          <FaPlus />
        </button>

        <button
          onClick={onImport}
          title="Import notes (.json)"
          aria-label="Import notes (.json)"
          style={{
            width: 90, height: 90, borderRadius: 18,
            background: "transparent",
            color: T.text,
            border: `2px dashed ${T.border}`,
            display: "grid", placeItems: "center",
            fontSize: 26, fontWeight: 900
          }}
        >
          <FaDownload />
        </button>
      </div>
    </div>
  );
}

// Card: prefer image preview (from images[] or coverUrl) over canvas preview
function NoteTile({ T, note, onClick }) {
  const title = note.title || "Untitled";

  // pick cover
  const cover =
    note.coverUrl ||
    (Array.isArray(note.images) && note.images[0]?.url) ||
    note.previewPng || // old field fallback
    null;

  const hasCover = !!cover;

  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${T.border}`,
        background: T.card,
        padding: 0,
        textAlign: "left",
        boxShadow: T.kpiShadow,
        cursor: "pointer"
      }}
    >
      {hasCover ? (
        <>
          <div
            style={{
              height: PREVIEW_H - FOOTER_H,
              background: `url(${cover}) center/cover no-repeat`
            }}
          />
          <div
            style={{
              height: FOOTER_H,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              background: T.card,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                color: T.text,
                fontWeight: 900,
                fontSize: 14,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%",
              }}
            >
              {title}
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            height: PREVIEW_H,
            background: `linear-gradient(135deg, ${T.tileGradFrom} 0%, ${T.tileGradTo} 100%)`,
            display: "grid",
            placeItems: "center",
            padding: "0 12px"
          }}
        >
          <div
            style={{
              color: T.text,
              fontWeight: 900,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 1.2,
              wordBreak: "break-word"
            }}
          >
            {title}
          </div>
        </div>
      )}
    </button>
  );
}
