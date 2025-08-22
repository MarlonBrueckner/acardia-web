// src/notes/NoteEditor.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp, onSnapshot, deleteDoc
} from "firebase/firestore";
import { useTheme } from "./themeNotes";

import { FaArrowLeft, FaTrash, FaSave, FaTag } from "react-icons/fa";
import CanvasBoard from "./CanvasBoard.jsx";

// HINWEIS: Wenn du KEIN Next.js nutzt, importiere react-quill normal:
// import ReactQuill from "react-quill";
// import "react-quill/dist/quill.snow.css";

 import ReactQuill from "react-quill";
 import "react-quill/dist/quill.snow.css";


export default function NoteEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { dark } = useOutletContext();
  const T = useTheme(dark);

  const db = getFirestore();
  const uid = getAuth().currentUser?.uid;
const [note, setNote] = useState(null);
 const [title, setTitle] = useState("Lade…");
 const [bodyHtml, setBodyHtml] = useState("");  // IMMER String
const [loading, setLoading] = useState(true);
  const [body, setBody] = useState(null); // Quill Delta
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // live laden
  useEffect(() => {
    if (!uid || !id) return;
    const ref = doc(db, "users", uid, "notes", id);
    const unsub = onSnapshot(ref, (snap) => {
     

if (!snap.exists()) { setLoading(false); return; }
     const data = snap.data();
     setNote(data);
     setTitle(data.title || "Unbenannt");
     // Falls ältere Notes bodyDelta (Delta/HTML) benutzt haben
     // bevorzugt bodyHtml, fallback: leerer String
     setBodyHtml(typeof data.bodyHtml === "string" ? data.bodyHtml : "");
     setLoading(false);

    });
    return unsub;
  }, [db, uid, id]);

  // debounced save
  const saveTimer = useRef(null);
  function scheduleSave(patch) {
    if (!uid || !id) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const ref = doc(db, "users", uid, "notes", id);
      await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      setSaving(false);
      setLastSaved(new Date());
    }, 600);
  }

  function onTitleChange(v) {
    setTitle(v);
    scheduleSave({ title: v });
  }

 function onBodyChange(contentHtml, _delta, _source, editor) {
   setBodyHtml(contentHtml || "");
   // Optional auch Delta speichern (z. B. für spätere Analysen)
   const delta = editor?.getContents?.();
   scheduleSave({ bodyHtml: contentHtml || "", bodyDelta: delta || null });
 }


  async function onDelete() {
    if (!uid || !id) return;
   if (!window.confirm("Diese Note wirklich löschen?")) return;
    await deleteDoc(doc(db, "users", uid, "notes", id));
    nav("/dashboard/notes");
  }

  // Canvas speichert über Callback preview + json
  async function onCanvasChange({ json, previewPng, hasObjects }) {
    if (!uid || !id) return;
    scheduleSave({
      canvasJSON: json,
      previewPng: previewPng || null,
      hasCanvas: !!hasObjects,
    });
  }

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }, { font: [] }, { size: [] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }, { align: [] }],
        ["link", "blockquote", "code-block"],
        ["clean"],
      ],
    }),
    []
  );

  const quillFormats = [
    "header", "font", "size",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "list", "bullet", "align",
    "link", "blockquote", "code-block",
  ];

  return (
    <div style={{ padding: 12, background: T.bg, minHeight: "100%" }}>
       {loading && (
       <div style={{ color: T.sub, fontWeight: 700, padding: 12 }}>
         Note lädt…
       </div>
     )}
      {/* Header */}
      <div
        style={{
          display: "flex", gap: 10, alignItems: "center",
          marginBottom: 12
        }}
      >
        <button
          onClick={() => nav("/dashboard/notes")}
          style={{
            height: 42, width: 42, borderRadius: 12,
            background: T.card, border: `1px solid ${T.border}`, color: T.text
          }}
          title="Zurück zur Galerie"
        >
          <FaArrowLeft />
        </button>

        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          style={{
            flex: 1, height: 42, borderRadius: 12,
            border: `1px solid ${T.border}`, background: T.card, color: T.text,
            padding: "0 12px", fontWeight: 900, fontSize: 16
          }}
        />

        <button
          onClick={onDelete}
          style={{
            height: 42, padding: "0 14px", borderRadius: 12,
            background: T.bad, color: "#fff", border: "none", fontWeight: 800
          }}
          title="Note löschen"
        >
          <FaTrash /> &nbsp; Delete
        </button>

        <div style={{ color: T.sub, fontSize: 12, minWidth: 120, textAlign: "right" }}>
          {saving ? "Speichern…" : lastSaved ? `Gespeichert ${lastSaved.toLocaleTimeString()}` : ""}
        </div>
      </div>

      {/* Layout: links Editor, rechts Canvas (stacked auf iPhone) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {/* Texteditor */}
        <div
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, overflow: "hidden", minHeight: 420
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, color: T.sub, fontWeight: 800, fontSize: 12 }}>
            Text Notes
          </div>
          <div style={{ padding: 8 }}>
            {ReactQuill ? (
              <ReactQuill
                theme="snow"
                value={bodyHtml}
                onChange={onBodyChange}
                modules={quillModules}
                formats={quillFormats}
                style={{
                  height: 420,
                  color: T.text
                }}
              />
            ) : (
              <div style={{ color: T.sub, padding: 12 }}>Editor lädt…</div>
            )}
          </div>
        </div>

        {/* Canvas Board */}
        <div
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, overflow: "hidden"
          }}
        >
          <CanvasBoard
            dark={!!dark}
            theme={T}
            noteId={id}
            initialJSON={note?.canvasJSON || null}
            onChange={onCanvasChange}
          />
        </div>
      </div>

      {/* Mobile: stacken */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 1fr"]{ grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
