import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

export async function addTradeToFirebase(trade) {
  const user = getAuth().currentUser;
  if (!user) return;
  const db = getFirestore();
  const tradeId = trade.id || crypto.randomUUID();
  // Bilder als Base64 speichern oder separat in Firebase Storage hochladen!
  // Hier speichern wir die Strings, NICHT die Files.
  await setDoc(doc(collection(db, "users", user.uid, "trades"), tradeId), {
    ...trade,
    id: tradeId,
    images: [] // Base64 oder URLs falls mit Storage – TODO!
  }, { merge: true });
}
