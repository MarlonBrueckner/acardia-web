// src/hooks/useSymbolFavorites.js
import { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default function useSymbolFavorites(open = true) {
  const uid = getAuth().currentUser?.uid;
  const db = getFirestore();
  const [favorites, setFavorites] = useState([]);        // ["AAPL – Apple Inc.", ...]
  const [favIds, setFavIds] = useState({});              // { "AAPL – Apple Inc.": "docId" }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !uid) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "users", uid, "symbolFavorites"));
        const items = snap.docs.map(d => ({ id: d.id, label: d.data().label }));
        setFavorites(items.map(i => i.label));
        setFavIds(items.reduce((acc, it) => (acc[it.label] = it.id, acc), {}));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, uid, db]);

  const toggleFavorite = async (label) => {
    if (!uid) return;
    if (favIds[label]) {
      await deleteDoc(doc(db, "users", uid, "symbolFavorites", favIds[label]));
      setFavorites(prev => prev.filter(x => x !== label));
      setFavIds(prev => {
        const { [label]: _rm, ...rest } = prev;
        return rest;
      });
    } else {
      const ref = await addDoc(collection(db, "users", uid, "symbolFavorites"), {
        label,
        createdAt: Date.now()
      });
      setFavorites(prev => [label, ...prev]);
      setFavIds(prev => ({ ...prev, [label]: ref.id }));
    }
  };

  return { favorites, favIds, toggleFavorite, loading };
}
