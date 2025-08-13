import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import TradeFormModal from "./TradeFormModal";

export default function DashboardLayout() {
  const [dark, setDark] = useState(true);
  const [showTradeForm, setShowTradeForm] = useState(false);
const accent = "#2c60fa";

  const [sidebarMin, setSidebarMin] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const WIDTH_EXPANDED = 230;
  const WIDTH_MIN = 90; // <- gleich wie in Sidebar!
  const sidebarWidth = isMobile ? 0 : (sidebarMin ? WIDTH_MIN : WIDTH_EXPANDED);

  return (
    <div style={{ minHeight: "100vh", background: dark ? "#1f1f1f" : "#ffffffff" }}>
      <Sidebar dark={dark} sidebarMin={sidebarMin} setSidebarMin={setSidebarMin} />

      {/* Schiebt TopBar + Inhalt gemeinsam */}
      <div
        style={{
          marginLeft: sidebarWidth,
          transition: "margin-left .22s ease",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <TopBar dark={dark} setDark={setDark} />
        <div style={{ flex: 1, padding: "32px 28px 28px" }}>
          <Outlet context={{ dark }} />
        </div>
      </div>

      {/* FAB & Modal */}
      <TradeFormModal open={showTradeForm} onClose={() => setShowTradeForm(false)} dark={dark} />

      <button
        onClick={() => setShowTradeForm(true)}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          background: accent,
          borderRadius: "50%",
          width: 58,
          height: 58,
          boxShadow: "0 2px 18px 0 #21347a3a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          border: "none",
          fontSize: 32,
          zIndex: 1000,
          cursor: "pointer",
          transition: "background .2s"
        }}
        aria-label="New Trade"
      >
        <FiPlus />
      </button>
    </div>
  );
}
