// TopBar.jsx
import { useState } from "react";
import { FiMaximize, FiMinimize } from "react-icons/fi";
import { FaMoon, FaSun } from "react-icons/fa";

const TOPBAR_H = 70; // gleiche Höhe wie dein Header

export default function TopBar({ dark, setDark, addSpacer = true }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  function handleFullscreen() {
    if (!isFullscreen) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen((fs) => !fs);
  }

  const iconColor = dark ? "#fff" : "#000";

  return (
    <>
      <header
        style={{
          height: TOPBAR_H,
          background: dark ? "#181818" : "#fff",
          borderBottom: dark ? "none" : "1.5px solid #e3e7ef",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 36px",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: 48 }} />

        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <img
            src={dark ? "/logo.png" : "/logo1.png"}
            alt="Acardia Logo"
            style={{ height: 35, objectFit: "contain", margin: "0 auto" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setDark((d) => !d)}
            style={{ background: "none", border: "none", color: iconColor, cursor: "pointer" }}
            title={dark ? "Light Mode" : "Dark Mode"}
          >
            {dark ? <FaSun size={21} /> : <FaMoon size={17} style={{ marginTop: 2 }} />}
          </button>
          <button
            onClick={handleFullscreen}
            style={{ background: "none", border: "none", color: iconColor, cursor: "pointer" }}
            title={isFullscreen ? "Fullscreen beenden" : "Fullscreen aktivieren"}
          >
            {isFullscreen ? <FiMinimize size={21} /> : <FiMaximize size={21} />}
          </button>
        </div>
      </header>

      {/* Spacer verhindert „Verschlucken“ des oberen Inhalts */}
      {addSpacer && <div style={{ height: 60 }} />}
    </>
  );
}
