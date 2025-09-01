// src/notes/NoteEditor.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getFirestore, doc, setDoc, serverTimestamp, onSnapshot, deleteDoc, updateDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "firebase/storage";
import { useTheme } from "./themeNotes";

import { FaArrowLeft, FaTrash, FaSave, FaDownload, FaPen, FaImage, FaPlus, FaTimes, FaExpand } from "react-icons/fa";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function NoteEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { dark } = useOutletContext();
  const T = useTheme(dark);

  const db = getFirestore();
  const storage = getStorage();
  const uid = getAuth().currentUser?.uid;

  const [note, setNote] = useState(null);
  const [title, setTitle] = useState("New Note");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [imgError, setImgError] = useState("");
  const [fsImg, setFsImg] = useState(null); // Fullscreen Bild (URL)

  const quillRef = useRef(null);
  const inlineImgInputRef = useRef(null);
  const galleryImgInputRef = useRef(null);

  const images = note?.images || [];

  // Live laden
  useEffect(() => {
    if (!uid || !id) return;
    const ref = doc(db, "users", uid, "notes", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.data();
      setNote(data);
      setTitle(data.title || "New Note");
      setBodyHtml(typeof data.bodyHtml === "string" ? data.bodyHtml : "");
      setLoading(false);
    });
    return unsub;
  }, [db, uid, id]);

  // Speichern
  async function saveNote() {
    if (!uid || !id) return;
    setSaving(true);
    const ref = doc(db, "users", uid, "notes", id);
    await setDoc(ref, {
      title: title ?? "New Note",
      bodyHtml: typeof bodyHtml === "string" ? bodyHtml : String(bodyHtml || ""),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setSaving(false);
    setLastSaved(new Date());
    setEditing(false);
  }

  // Löschen (ohne Confirm)
  async function onDelete() {
    if (!uid || !id) return;
    await deleteDoc(doc(db, "users", uid, "notes", id));
    nav("/dashboard/notes");
  }

  // Export als JSON (Titel, Text, Images-Metadaten)
  function exportNote() {
    const payload = {
      title: title ?? "New Note",
      bodyHtml: bodyHtml ?? "",
      images: (images || []).map(i => ({ url: i.url, path: i.path, name: i.name, createdAt: i.createdAt || null })),
      exportedAt: Date.now()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `${(title || "note").replace(/[^\w\-]+/g, "_")}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Titel & Body
  function onTitleChange(v) { setTitle(v); }
  function onBodyChange(html) { setBodyHtml(typeof html === "string" ? html : ""); }

  // Inline-Upload in den Text (nur Edit)
  function triggerInlineImagePicker() {
    setImgError("");
    inlineImgInputRef.current?.click();
  }
  async function handleInlineImagePicked(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uid || !id) return;
    try {
      const MAX = 8 * 1024 * 1024;
      if (file.size > MAX) throw new Error("File too large (max 8MB).");
      if (!/^image\//.test(file.type)) throw new Error("Only images are allowed.");

      const path = `users/${uid}/notes/${id}/images/${Date.now()}_${file.name}`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, file, { contentType: file.type });
      const url = await getDownloadURL(sref);

      const quill = quillRef.current?.getEditor?.();
      if (!quill) throw new Error("Editor not ready.");
      const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
      quill.insertEmbed(range.index, "image", url, "user");
      quill.setSelection(range.index + 1, 0, "user");

      const ref = doc(db, "users", uid, "notes", id);
      await updateDoc(ref, {
        images: arrayUnion({ url, path, name: file.name, createdAt: Date.now() }),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      setImgError(err?.message || "Image upload failed.");
    }
  }

  // Galerie-Upload (zweites Panel im Edit-Modus)
  function triggerGalleryUpload() {
    setImgError("");
    galleryImgInputRef.current?.click();
  }
  async function handleGalleryPicked(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uid || !id) return;
    try {
      const MAX = 12 * 1024 * 1024;
      if (file.size > MAX) throw new Error("File too large (max 12MB).");
      if (!/^image\//.test(file.type)) throw new Error("Only images are allowed.");

      const path = `users/${uid}/notes/${id}/images/${Date.now()}_${file.name}`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, file, { contentType: file.type });
      const url = await getDownloadURL(sref);

      const ref = doc(db, "users", uid, "notes", id);
      await updateDoc(ref, {
        images: arrayUnion({ url, path, name: file.name, createdAt: Date.now() }),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      setImgError(err?.message || "Image upload failed.");
    }
  }

  async function insertFromGallery(url) {
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;
    const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
    quill.insertEmbed(range.index, "image", url, "user");
    quill.setSelection(range.index + 1, 0, "user");
  }

  async function removeFromGallery(img) {
    try { await deleteObject(storageRef(storage, img.path)); } catch {}
    const ref = doc(db, "users", uid, "notes", id);
    await updateDoc(ref, {
      images: arrayRemove(img),
      updatedAt: serverTimestamp()
    });
  }

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }, { font: [] }, { size: [] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }, { align: [] }],
      ["link", "blockquote", "code-block"],
      ["clean"],
    ],
  }), []);

  const quillFormats = [
    "header","font","size",
    "bold","italic","underline","strike",
    "color","background",
    "list","bullet","align",
    "link","blockquote","code-block",
    "image"
  ];

  return (
    <div
      className={`note-editor ${editing ? "is-edit" : "is-view"}`}
      style={{
        padding: 12,
        background: T.bg,
        minHeight: "100%",
        "--note-bg": T.card,
        "--note-fg": T.text,
        "--toolbar-bg": dark ? "#1e1e1e" : "#f7f8fb",
        "--note-fs": "16px",
        "--note-lh": 1.6,
      }}
    >
      {loading && <div style={{ color: T.sub, fontWeight: 700, padding: 12 }}>Loading…</div>}

      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={() => nav("/dashboard/notes")}
          style={{
            height: 42, width: 42, borderRadius: 12,
            background: T.card, border: `1px solid ${T.border}`, color: T.text,
            display: "grid", placeItems: "center"
          }}
          title="Back to gallery"
        >
          <FaArrowLeft />
        </button>

        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          style={{
            flex: 1, minHeight: 42, borderRadius: 12,
            border: `1px solid ${T.border}`, background: T.card, color: T.text,
            padding: "0 12px", fontWeight: 900, fontSize: 16
          }}
        />

        {/* Export (immer sichtbar) */}
        <button
          onClick={exportNote}
          style={{
            height: 42, width: 42, borderRadius: 12,
            background: "transparent",
            border: `1px solid ${T.border}`,
            color: T.text,
            display: "grid", placeItems: "center"
          }}
          title="Export note as JSON"
        >
          {/* kleines Disketten-Icon wäre möglich; wir bleiben beim Save-Icon */}
          <FaDownload />
        </button>

        {/* Löschen (nur Icon) */}
        <button
          onClick={onDelete}
          style={{
            height: 42, width: 42, borderRadius: 12,
            background: T.bad, color: "#fff", border: "none",
            display: "grid", placeItems: "center"
          }}
          title="Delete note"
        >
          <FaTrash />
        </button>

        {/* Edit ↔ Save */}
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            style={{
              height: 42, width: 42, borderRadius: 12,
              background: T.accent, color: "#fff", border: "none",
              display: "grid", placeItems: "center"
            }}
            title="Edit"
          >
            <FaPen />
          </button>
        ) : (
          <button
            onClick={saveNote}
            disabled={saving}
            style={{
              height: 42, width: 42, borderRadius: 12,
              background: T.accent, color: "#fff", border: "none",
              display: "grid", placeItems: "center",
              opacity: saving ? 0.6 : 1
            }}
            title="Save"
          >
            <FaSave />
          </button>
        )}
      </div>

      {/* Textfläche */}
      <div className="note-surface" style={{
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        overflow: "hidden"
      }}>
        {editing ? (
          <>
            {/* Toolbar + Editor */}
            <div style={{ padding: 0 }}>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={bodyHtml}
                onChange={onBodyChange}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Write your note…"
                style={{ minHeight: 420, border: "none" }}
              />
            </div>
            {/* Inline-Upload nur im Edit-Modus */}
          
          </>
        ) : (
          <div
            className="note-read"
            dangerouslySetInnerHTML={{ __html: bodyHtml || "<p><em>No content</em></p>" }}
            style={{ padding: 14 }}
          />
        )}
      </div>

      {/* Bilderbereich */}
      {editing ? (
        // EDIT: kleine Kacheln + Insert + X
        <div className="note-surface" style={{
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          marginTop: 12,
          padding: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ fontWeight: 900, color: T.text }}>Images</div>
            <button
              onClick={triggerGalleryUpload}
              style={{
                height: 34, borderRadius: 10,
                background: T.accent, color: "#fff", border: "none",
                display: "flex", alignItems: "center", gap: 8, padding: "0 10px", fontWeight: 800
              }}
            >
              <FaPlus /> Upload
            </button>
            <input
              ref={galleryImgInputRef}
              type="file"
              accept="image/*"
              onChange={handleGalleryPicked}
              style={{ display: "none" }}
            />
            {!!imgError && <div style={{ color: T.bad, fontWeight: 700, marginLeft: 12 }}>{imgError}</div>}
          </div>

          {images.length === 0 ? (
            <div style={{ color: T.sub, fontStyle: "italic" }}>No images uploaded yet.</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10
              }}
            >
              {images
                .slice()
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .map((img) => (
                <div key={img.path} style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: T.card
                }}>
                  <div style={{ aspectRatio: "4 / 3", background: "#0f1115", position: "relative" }}>
                    <img
                      src={img.url}
                      alt={img.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                    {/* kleines X (nur Edit) */}
                    <button
                      onClick={() => removeFromGallery(img)}
                      title="Remove"
                      style={{
                        position: "absolute", top: 6, right: 6,
                        background: "rgba(0,0,0,.55)", color: "#fff",
                        border: "none", borderRadius: 10, width: 28, height: 28,
                        display: "grid", placeItems: "center"
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px"
                  }}>
                    <button
                      onClick={() => insertFromGallery(img.url)}
                      style={{ background: "transparent", border: "none", color: T.accent, fontWeight: 800 }}
                      title="Insert into text"
                    >
                      Insert
                    </button>
                    <span style={{ color: T.sub, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                      {img.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // VIEW: große Bilder untereinander + Fullscreen-Button
        images.length > 0 && (
          <div className="note-surface" style={{
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            marginTop: 12,
            padding: 0
          }}>
            {images
              .slice()
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .map((img) => (
              <div key={img.path} style={{ position: "relative" }}>
                <button
                  onClick={() => setFsImg(img.url)}
                  title="Fullscreen"
                  style={{
                    position: "absolute",
                    top: 10, right: 10,
                    zIndex: 2,
                    background: "rgba(0,0,0,.55)",
                    color: "#fff",
                    border: "none", borderRadius: 10,
                    width: 34, height: 34,
                    display: "grid", placeItems: "center"
                  }}
                >
                  <FaExpand />
                </button>
                <img
                  src={img.url}
                  alt={img.name}
                  style={{ width: "100%", display: "block", objectFit: "contain", background: dark ? "#0f1115" : "#f2f5ff" }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )
      )}

      {/* Fullscreen Modal */}
      {fsImg && (
        <div
          onClick={() => setFsImg(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,.85)",
            display: "grid", placeItems: "center",
            zIndex: 1000
          }}
        >
          <img
            src={fsImg}
            alt="fullscreen"
            style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain" }}
          />
        </div>
      )}

      {/* Styles */}
      <style>{`
.note-editor .note-surface { background: var(--note-bg); color: var(--note-fg); }
.note-editor .ql-editor, .note-editor .note-read { font-size: var(--note-fs); line-height: var(--note-lh); color: var(--note-fg); }
.note-editor .ql-container.ql-snow { border: none !important; background: var(--note-bg) !important; color: var(--note-fg) !important; }
.note-editor.is-view .ql-toolbar { display: none !important; }
.note-editor.is-edit .ql-toolbar  { display: block !important; background: var(--toolbar-bg) !important; border: none !important; color: var(--note-fg) !important; }

.note-editor .ql-snow .ql-picker       { color: var(--note-fg) !important; }
.note-editor .ql-snow .ql-picker-label { border: none !important; }
.note-editor .ql-snow .ql-picker-options { background: var(--note-bg) !important; border: none !important; }
.note-editor .ql-snow .ql-picker-options .ql-picker-item { color: var(--note-fg) !important; }
.note-editor .ql-snow .ql-picker-options .ql-picker-item:hover,
.note-editor .ql-snow .ql-picker-options .ql-picker-item.ql-selected { background: #2c60fa !important; color: #fff !important; }

/* Responsives Verhalten der Bilder im Content */
.note-editor .ql-editor img, .note-editor .note-read img { max-width: 100%; height: auto; display: block; margin: .5rem 0; }
      `}</style>
    </div>
  );
}
