import { FaHome, FaList, FaLayerGroup, FaClipboardCheck, FaBook, FaChartBar, FaCog, FaBars } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import FancySwitch from "./FancySwitch"; // ggf. Pfad anpassen


const navItems = [
  { label: "Dashboard", icon: <FaHome />, path: "/dashboard" },
  { label: "Sessions", icon: <FaList />, path: "/dashboard/sessions" },
  { label: "Strategies", icon: <FaLayerGroup />, path: "/dashboard/strategies" },
  { label: "Checklists", icon: <FaClipboardCheck />, path: "/dashboard/checklists" },
  { label: "Journal", icon: <FaBook />, path: "/dashboard/journal" },
  { label: "Analytics", icon: <FaChartBar />, path: "/dashboard/analytics" }
];



export default function Sidebar({ dark, setDark }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarMin, setSidebarMin] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Get user email from Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), user => setUserEmail(user?.email || ""));
    return () => unsub();
  }, []);

  // Farben
  const sidebarBg = dark ? "#181818" : "#fff";
  const navText = dark ? "#fff" : "#121316";
  const navActiveBg = dark ? "#23232a" : "#edf2fa";
  const navActiveColor = "#2c60fa";
  const mainText = dark ? "#fff" : "#121316";

  return (
     <aside
    style={{
      background: sidebarBg,
      minHeight: "100vh",+      width: sidebarMin ? 70 : 230,
      transition: "all 0.2s",
      borderRight: "none",
      boxShadow: "none"
    }}
    className="flex flex-col"  // <— KEIN fixed, kein left/top/z-index
  >
      {/* Burger */}
      <div style={{ height: 70 }} className="flex items-center px-2">
        <button
          className="p-2 rounded focus:outline-none"
          onClick={() => setSidebarMin(m => !m)}
          title={sidebarMin ? "Expand" : "Collapse"}
        >
          <FaBars size={22} color={mainText} />
        </button>
      </div>
      {/* Avatar + Mail */}
      {!sidebarMin && (
        <div className="flex flex-col items-center mb-7 mt-3">
          <div
            className="rounded-full w-14 h-14 flex items-center justify-center text-white text-xl font-bold mb-2"
            style={{
              background: "linear-gradient(135deg, #2c60fa 0%, #e82fa6 100%)"
            }}
          >
            {userEmail ? userEmail[0].toUpperCase() : "U"}
          </div>
          <div className="font-semibold text-[15px] break-all max-w-[170px] text-center"
            style={{
              color: dark ? "#fff" : "#121316"
            }}>
            {userEmail || "user@email.com"}
          </div>
        </div>
      )}
      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-1 mt-2">
        {navItems.map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            style={{
              color: location.pathname === item.path ? navActiveColor : navText,
              background: location.pathname === item.path ? navActiveBg : "transparent",
              fontWeight: 600,
              border: "none",
              boxShadow: "none",
              borderRadius: 13,
              transition: "all 0.16s"
            }}
            className={`flex items-center gap-3 px-4 py-2.5 text-[15px] ${
              sidebarMin ? "justify-center" : ""
            } hover:bg-[#ececf3] hover:text-[#121316] dark:hover:bg-[#23232a] dark:hover:text-[#fff]`}
          >
            <span className="text-lg">{item.icon}</span>
            {!sidebarMin && <span>{item.label}</span>}
          </button>
        ))}
        {/* Darkmode Toggle */}
        <div className={`${sidebarMin ? "justify-center" : "justify-start"} flex px-4 py-4`}>
          <FancySwitch checked={dark} onChange={setDark} />

        </div>
      </nav>
      {/* Bottom: Account Settings */}
      <div className="mt-auto mb-7 flex items-center justify-center">
        <button
          onClick={() => navigate("/dashboard/settings")}
          style={{
            color: navText,
            background: "transparent",
            border: "none",
            fontWeight: 800,
            borderRadius: 13,
            padding: sidebarMin ? "12px" : "12px 24px"
          }}
          className="flex items-center gap-2"
        >
          <FaCog className="text-lg" />
          {!sidebarMin && "Account Settings"}
        </button>
      </div>
    </aside>
  );
}
