import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./firebase";   // nur importieren, nicht nochmal initialisieren
import "./index.css";  // globales CSS/Tailwind

const root = createRoot(document.getElementById("root"));
root.render(<App />);
