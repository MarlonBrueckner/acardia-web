// src/lib/tradesLimit.ts
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, getCountFromServer } from "firebase/firestore";

// ISO-Woche Montag 00:00 -> nächste Woche Montag 00:00
export function getWeekBounds(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mo=0..So=6
  const start = new Date(date); start.setHours(0,0,0,0); start.setDate(start.getDate() - day);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return { start, end };
}

// Ermittelt Limit je Plan
export function limitForPlan(plan: "free" | "adv" | "pro"): number | null {
  if (plan === "pro") return null;     // unbegrenzt
  if (plan === "adv") return 15;
  return 7; // free
}

// Zählt Trades dieser Woche. Erwartet, dass du ein Timestamp-Feld "createdAt" (Firestore Timestamp) hast.
// Falls du statt Timestamp ein "entryDate" als YYYY-MM-DD speicherst, siehe Kommentar unten.
export async function countTradesThisWeek() {
  const uid = getAuth().currentUser?.uid;
  if (!uid) return 0;
  const db = getFirestore();

  const { start, end } = getWeekBounds();
  const col = collection(db, "users", uid, "trades");

  // Variante mit Timestamp-Feld "createdAt"
  const q = query(col,
    where("createdAt", ">=", start),
    where("createdAt", "<", end)
  );

  // // Alternative: wenn du "entryDate" als "YYYY-MM-DD" (string) speicherst:
  // const iso = (d: Date) => d.toISOString().slice(0,10); // YYYY-MM-DD
  // const q = query(col,
  //   where("entryDate", ">=", iso(start)),
  //   where("entryDate", "<",  iso(end))
  // );

  const snap = await getCountFromServer(q);
  return snap.data().count || 0;
}

// true = darf öffnen, false = Block + Grund
export async function canOpenTradeModal(plan: "free" | "adv" | "pro") {
  const weeklyCount = await countTradesThisWeek();
  const lim = limitForPlan(plan);
  if (lim == null) return { allowed: true, weeklyCount, limit: lim }; // pro
  const allowed = weeklyCount < lim;
  return { allowed, weeklyCount, limit: lim };
}
