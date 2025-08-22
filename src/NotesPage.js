// src/notes/NotesPage.jsx
import { useParams } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import NotesGallery from "./NotesGallery";
import NoteEditor from "./NoteEditor";

export default function NotesPage() {
  const { id } = useParams();
  const ctx = useOutletContext?.() || {};
  // ctx.dark / ctx.T sind in deinem Dashboard bereits vorhanden
  return id ? <NoteEditor /> : <NotesGallery />;
}
