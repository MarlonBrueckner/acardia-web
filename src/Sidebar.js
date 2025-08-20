import {
  FaHome,
  FaBook,
  FaChartBar,
  FaCog,
  FaBars,
  FaTools,
  FaCalendarAlt,
  FaCalculator,
  FaPercentage,
  FaRegStickyNote,
  FaChevronDown,
  FaChevronRight
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

/* ------- Primäre Seiten ------- */
const primaryItems = [
  { label: "Analytics", icon: <FaChartBar />, path: "/dashboard/analytics" },
  { label: "Journal",   icon: <FaBook />, path: "/dashboard/journal" },

  { label: "Notes",     icon: <FaRegStickyNote />, path: "/dashboard/notes" }
];

/* ------- Tools (Dropdown) ------- */
const toolItems = [
  { label: "Economic Calendar",   icon: <FaCalendarAlt />, path: "/tools/EconomicCalendar"},
  { label: "Lot Size Calculator", icon: <FaCalculator />,  path: "/dashboard/tools/lot-size" },
  { label: "Winrate Calculator",  icon: <FaPercentage />,  path: "/dashboard/tools/winrate" }
];

export default function Sidebar({ dark, sidebarMin, setSidebarMin }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  // Tools-Dropdown State
  const [toolsOpen, setToolsOpen] = useState(() => {
    // aufklappen, wenn aktuelle URL unter /dashboard/tools/... liegt
    return location.pathname.startsWith("/dashboard/tools");
  });

  // Responsiveness
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900);
      if (window.innerWidth >= 900) {
        setSidebarVisible(true);
        setSidebarMin(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarMin(false);
      setSidebarVisible(true);
    }
  }, [isMobile, setSidebarMin]);

  // Lade User-Daten
  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (!user) {
        setUserEmail(""); setDisplayName(""); setPhotoURL("");
        return;
      }
      setUserEmail(user.email || "");
      setDisplayName(user.displayName || "");
      setPhotoURL(user.photoURL || "");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.displayName) setDisplayName(data.displayName);
          if (data.photoURL) setPhotoURL(data.photoURL);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }

      unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (typeof data.displayName === "string") setDisplayName(data.displayName);
        if (typeof data.photoURL === "string") setPhotoURL(data.photoURL);
      }, (err) => console.error("onSnapshot error:", err));
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Farben
  const sidebarBg = dark ? "#181818" : "#fff";
  const navText   = dark ? "#fff"    : "#121316";
  const subText   = dark ? "#BFC4CF" : "#495060";
  const navActiveBg   = dark ? "#23232a" : "#edf2fa";
  const navActiveColor= "#2c60fa";
  const borderRight   = dark ? "none" : "1.5px solid #e3e7ef";

  const sidebarStyles = {
    background: sidebarBg,
    minHeight: "100vh",
    width: sidebarMin ? 70 : 230,
    borderRight,
    zIndex: 40,
    left: sidebarVisible ? 0 : isMobile ? "-250px" : 0,
    position: "fixed",
    top: 0,
    transition: "width .2s, left .2s, background .2s"
  };

  // Overlay für Mobile
  const overlay = (isMobile && sidebarVisible) ? (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(30,32,42,0.19)", zIndex: 30
      }}
      onClick={() => setSidebarVisible(false)}
    />
  ) : null;

  // Mobile Burger
  const mobileBurger = (isMobile && !sidebarVisible) ? (
    <button
      style={{
        position: "fixed", top: 16, left: 14, zIndex: 50,
        background: dark ? "#222" : "#fff",
        color: navText, borderRadius: 8, padding: 7,
        border: "none", boxShadow: "0 2px 8px rgba(30,30,40,.09)"
      }}
      onClick={() => setSidebarVisible(true)}
      aria-label="Sidebar öffnen"
    >
      <FaBars size={24} />
    </button>
  ) : null;

  // Avatar
  const avatarContent = photoURL ? (
    <img src={photoURL} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
  ) : (
    <div
      className="rounded-full w-20 h-20 flex items-center justify-center text-white text-xl font-bold"
      style={{ background: "linear-gradient(135deg, #2c60fa 0%, #e82fa6 100%)" }}
    >
      {(displayName || userEmail || "U")[0].toUpperCase()}
    </div>
  );

  // Helfer: Button Style
  const baseBtnStyle = (active: boolean) => ({
    color: active ? navActiveColor : navText,
    background: active ? navActiveBg : "transparent",
    fontWeight: 600,
    border: "none",
    borderRadius: 13,
    transition: "all .16s",
  });

  // Aktiver Pfad auch für Tools-Subroutes
  const isActive = (path: string) => {
    if (path.startsWith("/dashboard/tools")) {
      return location.pathname.startsWith(path);
    }
    return location.pathname === path;
  };

  return (
    <>
      {mobileBurger}
      {overlay}

      <aside style={sidebarStyles} className="flex flex-col">
        {/* Header + Toggle */}
        <div
          style={{
            height: 70, display: "flex", alignItems: "center",
            paddingLeft: 8, borderBottom: !dark ? "1.5px solid #e3e7ef" : "none"
          }}
        >
          <button
            className="p-2 rounded focus:outline-none"
            onClick={() => {
              if (isMobile) setSidebarVisible(false);
              else setSidebarMin((m) => !m);
            }}
            title={isMobile ? "Schließen" : sidebarMin ? "Erweitern" : "Minimieren"}
          >
            <FaBars size={22} color={navText} />
          </button>
        </div>

        {/* Profil */}
        {!sidebarMin && (
          <div className="flex flex-col items-center mb-7 mt-2">
            {avatarContent}
            <div
              className="font-semibold text-[15px] break-all max-w-[170px] text-center mt-2"
              style={{ color: navText }}
            >
              {displayName || userEmail || "user@email.com"}
            </div>
          </div>
        )}

        {/* Navigation */}
       <nav className="flex flex-col gap-1 px-1 mt-2">
  {/* primäre Seiten */}
  {primaryItems.map((item) => (
    <button
      key={item.label}
      onClick={() => navigate(item.path)}
      style={baseBtnStyle(isActive(item.path))}
      className={`flex items-center gap-3 px-4 py-2.5 text-[15px] ${
        sidebarMin ? "justify-center" : ""
      } hover:bg-[#ececf3] hover:text-[#121316] dark:hover:bg-[#23232a] dark:hover:text-[#fff]`}
    >
      <span className="text-lg">{item.icon}</span>
      {!sidebarMin && <span>{item.label}</span>}
    </button>
  ))}

  {/* Tools (Dropdown) */}
  <div style={{ marginTop: 2 }}> {/* Abstand kleiner gemacht */}
    <button
      onClick={() => setToolsOpen((v) => !v)}
      style={{
        ...baseBtnStyle(location.pathname.startsWith("/dashboard/tools")),
        width: "100%"
      }}
      className={`flex items-center ${sidebarMin ? "justify-center" : "justify-between"} px-4 py-2.5`}
    >
      <div className={`flex items-center gap-3 ${sidebarMin ? "justify-center" : ""}`}>
        <span className="text-lg"><FaTools /></span>
        {!sidebarMin && <span>Tools</span>}
      </div>
      {!sidebarMin && (
        <span className="text-sm" style={{ color: subText }}>
          {toolsOpen ? <FaChevronRight /> : <FaChevronDown />} {/* Default nach unten */}
        </span>
      )}
    </button>

    {/* Dropdown-Content */}
    <div
      style={{
        maxHeight: toolsOpen ? 400 : 0,
        overflow: "hidden",
        transition: "max-height .22s ease"
      }}
    >
      {toolItems.map((t) => {
        const active = isActive(t.path);
        return (
          <button
            key={t.label}
            onClick={() => navigate(t.path)}
            style={{
              ...baseBtnStyle(active),
              marginLeft: sidebarMin ? 0 : 25,  // weiter eingerückt
              marginTop: 6,
              width: sidebarMin ? "100%" : "calc(100% - 48px)"
            }}
            className={`flex items-center gap-3 px-3 py-2 text-[14px] ${
              sidebarMin ? "justify-center" : ""
            } hover:bg-[#ececf3] hover:text-[#121316] dark:hover:bg-[#23232a] dark:hover:text-[#fff]`}
          >
            <span className="text-base">{t.icon}</span>
            {!sidebarMin && <span>{t.label}</span>}
          </button>
        );
      })}
    </div>
  </div>
</nav>


        {/* Settings */}
        <div className="mt-auto mb-7 flex items-center justify-center">
          <button
            onClick={() => navigate("/dashboard/settings")}
            style={{
              color: navText,
              background: "transparent",
              border: "none",
              fontWeight: 600,
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
    </>
  );
}
