import { useState } from "react";
import { FiMaximize, FiMinimize } from "react-icons/fi";
import { FaMoon, FaSun } from "react-icons/fa";

export default function TopBar({ dark, setDark }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  function handleFullscreen() {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(fs => !fs);
  }

  // Farben für die Icons
  const iconColor = dark ? "#fff" : "#000";
  const iconSize = 21;

  return (
    <header
      style={{
        height: 70,
        background: dark ? "#181818" : "#fff",
        borderBottom: dark ? "none" : "1.5px solid #e3e7ef",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 36px",
        position: "sticky",
        top: 0,
        zIndex: 20,
        minWidth: 0
      }}
    >
      {/* Platzhalter links, damit das Logo wirklich zentriert bleibt */}
      <div style={{ width: 48 }} />
      
      {/* Logo zentriert */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <img
          src={dark ? "/logo.png" : "/logo1.png"}
          alt="Acardia Logo"
          style={{
            height: 35,
            objectFit: "contain",
            margin: "0 auto",
            transition: "filter 0.2s"
          }}
        />
      </div>

      {/* Buttons rechts */}
     <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
  <button
    onClick={() => setDark(d => !d)}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      marginRight: 4,
      color: iconColor,
      display: "flex",
      alignItems: "center"
    }}
    title={dark ? "Light Mode" : "Dark Mode"}
  >
    {dark
      ? <FaSun size={21} />
      : <FaMoon size={17} style={{ marginTop: 2 }} />}
  </button>
  <button
    onClick={handleFullscreen}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      color: iconColor,
      display: "flex",
      alignItems: "center"
    }}
    title={isFullscreen ? "Fullscreen beenden" : "Fullscreen aktivieren"}
  >
    {isFullscreen
      ? <FiMinimize size={21} />
      : <FiMaximize size={21} />}
  </button>
</div>

    </header>
  );
}
