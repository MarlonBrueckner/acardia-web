import {
  FaHome,
  FaList,
  FaLayerGroup,
  FaClipboardCheck,
  FaBook,
  FaChartBar,
  FaCog,
  FaBars
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot  } from "firebase/firestore";
import { useEffect, useState } from "react";


const navItems = [
  { label: "Dashboard", icon: <FaHome />, path: "/dashboard" },
  { label: "Sessions", icon: <FaList />, path: "/dashboard/sessions" },
  { label: "Strategies", icon: <FaLayerGroup />, path: "/dashboard/strategies" },
  { label: "Checklists", icon: <FaClipboardCheck />, path: "/dashboard/checklists" },
  { label: "Journal", icon: <FaBook />, path: "/dashboard/journal" },
  { label: "Analytics", icon: <FaChartBar />, path: "/dashboard/analytics" }
];

export default function Sidebar({ dark, sidebarMin, setSidebarMin }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);


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
  }, [isMobile]);

  // Lade User-Daten inkl. Name und Foto aus Auth + Firestore
  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    let unsubProfile = null; // <- Firestore-Listener später sauber entfernen

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // altes Profil aufräumen
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (!user) {
        setUserEmail("");
        setDisplayName("");
        setPhotoURL("");
        return;
      }

      // Baseline aus Auth
      setUserEmail(user.email || "");
      setDisplayName(user.displayName || "");
      setPhotoURL(user.photoURL || "");

      // 1) einmalige Initialladung (falls kein Realtime-Doc existiert)
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

      // 2) Realtime-Listener -> reagiert sofort auf Änderungen aus Settings
      unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (typeof data.displayName === "string") setDisplayName(data.displayName);
        if (typeof data.photoURL === "string") setPhotoURL(data.photoURL);
      }, (err) => {
        console.error("onSnapshot error:", err);
      });
    });

    // Cleanup
    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Farben
  const sidebarBg = dark ? "#181818" : "#fff";
  const navText = dark ? "#fff" : "#121316";
  const navActiveBg = dark ? "#23232a" : "#edf2fa";
  const navActiveColor = "#2c60fa";
  const borderRight = dark ? "none" : "1.5px solid #e3e7ef";

  const sidebarStyles = {
    background: sidebarBg,
    minHeight: "100vh",
    width: sidebarMin ? 70 : 230,
    transition: "all 0.2s",
    borderRight: borderRight,
    boxShadow: "none",
    zIndex: 40,
    left: sidebarVisible ? 0 : isMobile ? "-250px" : 0,
    position: "fixed",
    top: 0,
    transitionProperty: "width, left, background"
  };

  // Overlay für Mobile
  const overlay =
    isMobile && sidebarVisible ? (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(30,32,42,0.19)",
          zIndex: 30
        }}
        onClick={() => setSidebarVisible(false)}
      />
    ) : null;

  // Mobile Burger
  const mobileBurger =
    isMobile && !sidebarVisible ? (
      <button
        style={{
          position: "fixed",
          top: 16,
          left: 14,
          zIndex: 50,
          background: dark ? "#222" : "#fff",
          color: dark ? "#fff" : "#23232a",
          borderRadius: 8,
          padding: 7,
          border: "none",
          boxShadow: "0 2px 8px 0 rgba(30,30,40,0.09)"
        }}
        onClick={() => setSidebarVisible(true)}
        aria-label="Sidebar öffnen"
      >
        <FaBars size={24} />
      </button>
    ) : null;

  // Avatar-Rendering
  const avatarContent = photoURL ? (
    <img
      src={photoURL}
      alt="avatar"
      className="w-20 h-20 rounded-full object-cover"
    />
  ) : (
    <div
      className="rounded-full w-20 h-20 flex items-center justify-center text-white text-xl font-bold"
      style={{
        background: "linear-gradient(135deg, #2c60fa 0%, #e82fa6 100%)"
      }}
    >
      {(displayName || userEmail || "U")[0].toUpperCase()}
    </div>
  );

  return (
    <>
      {mobileBurger}
      {overlay}
      <aside style={sidebarStyles} className="flex flex-col">
        {/* Sidebar Toggle */}
        <div
          style={{
            height: 70,
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
            borderBottom: !dark ? "1.5px solid #e3e7ef" : "none"
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

        {!sidebarMin && (
          <div className="flex flex-col items-center mb-7 mt-2">
            {avatarContent}
            <div
              className="font-semibold text-[15px] break-all max-w-[170px] text-center mt-2"
              style={{
                color: dark ? "#fff" : "#121316"
              }}
            >
              {displayName || userEmail || "user@email.com"}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-1 mt-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              style={{
                color:
                  location.pathname === item.path ? navActiveColor : navText,
                background:
                  location.pathname === item.path ? navActiveBg : "transparent",
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
        </nav>

        {/* Account Settings */}
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
