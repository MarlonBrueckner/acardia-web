// src/notes/NotesGallery.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getFirestore, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp
} from "firebase/firestore";
import { useTheme } from "./themeNotes";
import { FaPlus, FaSearch } from "react-icons/fa";

export default function NotesGallery() {
  const { dark } = useOutletContext();
  const T = useTheme(dark);
  const nav = useNavigate();
  const db = getFirestore();
  const uid = getAuth().currentUser?.uid;;
 const [creating, setCreating] = useState(false);
 const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "notes"),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotes(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
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
       title: "Neue Note",
       bodyHtml: "",            // ⚠️ Editor erhält String, kein null/Delta
       bodyDelta: null,         // optional zusätzlich die Delta-Struktur
       canvasJSON: null,
       previewPng: null,
       hasCanvas: false,
       tags: [],
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp(),
     });
     nav(`/dashboard/notes/${ref.id}`);
   } catch (e) {
     console.error(e);
     setError("Note konnte nicht angelegt werden (Permissions?).");
   } finally {
     setCreating(false);
   }
  }

  return (
    <div style={{ padding: 16, minHeight: "100%", background: T.bg }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: "10px 12px"
        }}>
          <FaSearch color={T.sub} />
          <input
            placeholder="Notizen durchsuchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, background: "transparent", color: T.text, border: "none", outline: "none",
              fontWeight: 600
            }}
          />
        </div>
        <button
          onClick={createNote}
          style={{
            height: 42, padding: "0 14px", borderRadius: 12,
            background: T.accent, color: "#fff", border: "none", fontWeight: 800
          }}
          title="Note anlegen"
        >
          <FaPlus /> &nbsp; Neue Note
        </button>
      </div>

     {!!error && (
       <div style={{ color: T.bad, fontWeight: 700, marginBottom: 10 }}>
         {error}
       </div>
     )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((n) => (
          <NoteTile key={n.id} T={T} note={n} onClick={() => nav(`/dashboard/notes/${n.id}`)} />
        ))}
      </div>
    </div>
  );
}

function NoteTile({ T, note, onClick }) {
  const hasPreview = !!note.previewPng;
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
      }}
    >
      <div style={{ height: 160, background: hasPreview
        ? `url(${note.previewPng}) center/cover no-repeat`
        : `linear-gradient(135deg, ${T.tileGradFrom} 0%, ${T.tileGradTo} 100%)`
      }} />
      <div style={{ padding: 10 }}>
        <div style={{ color: T.text, fontWeight: 900, fontSize: 14, lineHeight: 1.2 }}>
          {note.title || "Unbenannt"}
        </div>
        {!!(note.tags || []).length && (
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(note.tags || []).slice(0, 4).map((t, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 800, color: T.sub,
                border: `1px solid ${T.border}`, borderRadius: 8, padding: "2px 6px"
              }}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
