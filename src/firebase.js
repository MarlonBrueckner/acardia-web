// src/firebase.js
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA8CjkK6BuSp2EwU4X1lhWXDqFCSkvt-rw",
  authDomain: "acardia-journal.firebaseapp.com",
  projectId: "acardia-journal",
  storageBucket: "acardia-journal.firebasestorage.app",
  messagingSenderId: "597004037226",
  appId: "1:597004037226:web:cd671e1de40928e8f8ae13",
  measurementId: "G-PPDB7BET8F"
};

// nur einmal initialisieren
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
