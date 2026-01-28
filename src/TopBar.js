import { useEffect, useState } from "react";
import { FiMaximize, FiMinimize } from "react-icons/fi";
import { FaMoon, FaSun } from "react-icons/fa";

const TOPBAR_H = 70;         // sichtbare Höhe OHNE Safe-Area
const THEME_KEY = "theme";

export default function TopBar({ dark, setDark, addSpacer = true }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1) Beim ersten Mount: falls kein gespeichertes Theme -> DARK als Default
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    if (!saved) {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
      try { localStorage.setItem(THEME_KEY, "dark"); } catch {}
      if (typeof setDark === "function") setDark(true);
    }
  }, [setDark]);

  // 2) Jede Änderung von `dark` global spiegeln + persistieren
  useEffect(() => {
    if (typeof dark !== "boolean") return;
    const val = dark ? "dark" : "light";
    document.documentElement.dataset.theme = val;
    document.documentElement.style.colorScheme = val;
    try { localStorage.setItem(THEME_KEY, val); } catch {}
  }, [dark]);

  function handleFullscreen() {
    if (!isFullscreen) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen((fs) => !fs);
  }

  const isDark = typeof dark === "boolean" ? dark : true;
  const iconColor = isDark ? "#fff" : "#000";

  const bg = isDark ? "#181818" : "#ffffff";
  const border = isDark ? "none" : "1.5px solid #e3e7ef";

  // Strings, damit calc()/env() in inline styles funktionieren
  const headerHeight = `calc(${TOPBAR_H}px + env(safe-area-inset-top))`;
  const padTop       = `env(safe-area-inset-top)`;
  const padSideLeft  = `env(safe-area-inset-left)`;
  const padSideRight = `env(safe-area-inset-right)`;

  return (
    <>
      <header
        style={{
          height: headerHeight,                 // → deckt Safe-Area oben mit ab
          paddingTop: padTop,                   // → Inhalt unter die Statusbar schieben
          paddingLeft: `max(36px, ${padSideLeft})`,   // → links Safe-Area respektieren
          paddingRight: `max(36px, ${padSideRight})`, // → rechts Safe-Area respektieren
          background: bg,
          borderBottom: border,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
            src={isDark ? "/logo.png" : "/logo1.png"}
            alt="Acardia Logo"
            style={{ height: 35, objectFit: "contain", margin: "0 auto" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setDark?.((d) => !d)}
            style={{ background: "none", border: "none", color: iconColor, cursor: "pointer" }}
            title={isDark ? "Light Mode" : "Dark Mode"}
          >
            {isDark ? <FaSun size={21} /> : <FaMoon size={17} style={{ marginTop: 2 }} />}
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

      {/* Spacer exakt so hoch wie die Topbar inkl. Safe-Area */}
      {addSpacer && (
        <div
          style={{
            height: headerHeight,
          }}
        />
      )}
    </>
  );
}
