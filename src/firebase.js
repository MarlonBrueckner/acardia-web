// Importiere die benötigten Funktionen aus dem Firebase-Paket
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Hier kommt deine eigene Firebase-Konfiguration rein
const firebaseConfig = {
  apiKey: "AIzaSyA8CjkK6BuSp2EwU4X1lhWXDqFCSkvt-rw",
  authDomain: "acardia-journal.firebaseapp.com",
  projectId: "acardia-journal",
  storageBucket: "acardia-journal.firebasestorage.app",
  messagingSenderId: "597004037226",
  appId: "1:597004037226:web:cd671e1de40928e8f8ae13",
  measurementId: "G-PPDB7BET8F"
};
// Initialisiere Firebase
const app = initializeApp(firebaseConfig);

// Exportiere die Dienste, damit du sie in anderen Dateien nutzen kannst
export const db = getFirestore(app);
export const auth = getAuth(app);
