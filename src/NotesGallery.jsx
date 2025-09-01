// src/notes/NotesGallery.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getFirestore, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, setDoc
} from "firebase/firestore";
import { getStorage, ref as sRef, uploadString, getDownloadURL } from "firebase/storage";
import { useTheme } from "./themeNotes";
import { FaPlus, FaSearch, FaDownload } from "react-icons/fa";

const PREVIEW_H = 180;
const FOOTER_H  = 44;

export default function NotesGallery() {
  const { dark } = useOutletContext();
  const T = useTheme(dark);
  const nav = useNavigate();
  const db = getFirestore();
  const storage = getStorage();
  const uid = getAuth().currentUser?.uid;

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState([]);

  // hidden file input for imports
  const importInputRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "notes"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [db, uid]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return notes;
    return notes.filter((n) => {
      const title = String(n.title || "").toLowerCase();
      const tags = (n.tags || []).join(" ").toLowerCase();
      return title.includes(s) || tags.includes(s);
    });
  }, [notes, search]);

  async function createNote() {
    if (!uid) return;
    try {
      setError("");
      setCreating(true);
      const ref = await addDoc(collection(db, "users", uid, "notes"), {
        title: "New Note",
        bodyHtml: "",
        bodyDelta: null,
        images: [],              // 🔵 store images metadata array here
        coverUrl: null,          // 🔵 first image (or chosen cover) saved by the editor
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      nav(`/dashboard/notes/${ref.id}`);
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

      // Accept single note or array of notes
      const items = Array.isArray(payload) ? payload : [payload];

      for (const item of items) {
        const {
          title = "Imported Note",
          bodyHtml = "",
          bodyDelta = null,
          images = [],      // may contain {name, url} OR {name, dataUrl}
          coverUrl = null,
          createdAt = null,
          updatedAt = null,
        } = item || {};

        // create Firestore doc
        const newRef = doc(collection(db, "users", uid, "notes"));
        const newId  = newRef.id;

        // upload base64 images (if any) and collect URLs
        const uploaded = [];
        for (const img of images) {
          if (img?.url && !img?.dataUrl) {
            // already hosted URL — keep as is
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

        // derive cover
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

        // Navigate to first imported note (optional). Comment if not desired:
        nav(`/dashboard/notes/${newId}`);
        break; // only jump to the first imported note
      }
    } catch (err) {
      console.error(err);
      setError("Import failed. Make sure you select a valid .json export.");
    }
  }

  const noNotes = notes.length === 0;

  return (
    <div style={{ padding: 16, minHeight: "100%", background: T.bg }}>
      {/* Header (only when notes exist) */}
      {!noNotes && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <div
            style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: "10px 12px"
            }}
          >
            <FaSearch color={T.sub} />
            <input
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, background: "transparent", color: T.text, border: "none", outline: "none",
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
              height: 42, width: 42, borderRadius: 12,
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.text,
              display: "grid", placeItems: "center"
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
              height: 42, width: 42, borderRadius: 12,
              background: T.accent, color: "#fff", border: "none",
              display: "grid", placeItems: "center",
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

      {/* Empty-State */}
      {noNotes ? (
        <EmptyState T={T} onCreate={createNote} creating={creating} onImport={() => importInputRef.current?.click()} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
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
