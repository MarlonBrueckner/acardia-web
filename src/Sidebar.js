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
  FaChevronRight,
  FaStar
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FaLink } from "react-icons/fa";

/* ------- Primäre Seiten ------- */
const primaryItems = [
  { label: "Analytics", icon: <FaChartBar />, path: "/dashboard/analytics" },
  { label: "Journal",   icon: <FaBook />, path: "/dashboard/journal" },

  { label: "Notes",     icon: <FaRegStickyNote />, path: "/dashboard/notes" }
];

/* ------- Tools (Dropdown) ------- */
const toolItems = [
  { label: "Lot Size Calculator", icon: <FaCalculator />,  path: "/tools/LotSizeCalculator" },
  { label: "Winrate Calculator",  icon: <FaPercentage />,  path: "/tools/WinrateCalculator" },

  // 
 { label: "Broker synchronization",  icon: <FaPercentage />,  path: "/tools/MetaTraderSyncPage" },


];


export default function Sidebar({ dark, sidebarMin, setSidebarMin }) {
  const LS = { visible: "sb:visible", min: "sb:min" };
  const navigate = useNavigate();
  const location = useLocation();
const [sidebarVisible, setSidebarVisible] = useState(() => {
  try {
    const saved = localStorage.getItem(LS.visible);
    if (saved != null) return saved === "true";
  } catch {}
  return window.innerWidth >= 900; // default
});
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [planTier, setPlanTier] = useState("free");   // "free" | "advanced" | "pro" | "paid"
  const [planLabel, setPlanLabel] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  // Tools-Dropdown State
 const [toolsOpen, setToolsOpen] = useState(() => {
  return location.pathname.startsWith("/tools");
});


  useEffect(() => {
  const onResize = () => setIsMobile(window.innerWidth < 900);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

// --- Beim ersten Wechsel auf Mobile: nur dann schließen, wenn kein gespeicherter Wert existiert
useEffect(() => {
  if (!isMobile) return;
  try {
    const saved = localStorage.getItem(LS.visible);
    if (saved == null) setSidebarVisible(false); // Mobile default: zu
  } catch {}
}, [isMobile]);

// --- Persistenz
useEffect(() => {
  try { localStorage.setItem(LS.visible, String(sidebarVisible)); } catch {}
}, [sidebarVisible]);

// Falls du `sidebarMin` auch persistieren möchtest:
useEffect(() => {
  try { localStorage.setItem(LS.min, String(sidebarMin)); } catch {}
}, [sidebarMin]);

  // Responsiveness
 useEffect(() => {
  function handleResize() {
    const mobile = window.innerWidth < 900;
    setIsMobile(mobile);

    if (mobile) {
      // mobil: standardmäßig zu & minimiert
      setSidebarVisible(false);
      setSidebarMin(true);
    } else {
      // desktop: sichtbar, Breite via toggle
      setSidebarVisible(true);
    }
  }

  // direkt initial auch korrekt setzen:
  handleResize();

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, [setSidebarMin]);

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
         setPlanTier("free");
       setPlanLabel("");
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
        const rawRole = String(
  data.subscriptionStatus ||   // ✅ Apple/Firebase
  data.stripeRole ||
  data.plan ||
  data.tier ||
  ""
).toLowerCase();

         let tier = "free";
         let label = "";
         if (rawRole.includes("pro")) {
           tier = "pro";
           label = "Pro";
         } else if (rawRole.includes("advanced")) {
           tier = "advanced";
           label = "Advanced";
         } else if (rawRole && rawRole !== "free") {
           tier = "paid";
           label = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
       } else {
  const st = String(
    data?.subscription?.status ||
    data?.stripeSubscription?.status ||
    ""
  ).toLowerCase();

  const isActive = st === "active" || st === "trialing";

  if (isActive) {
    tier = "paid";
    label = "Active plan";
  }
}

         setPlanTier(tier);
         setPlanLabel(label);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }

      unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (typeof data.displayName === "string") setDisplayName(data.displayName);
        if (typeof data.photoURL === "string") setPhotoURL(data.photoURL);
         // auch bei Live-Updates Plan mitschieben
        const rawRole = String(
  data.subscriptionStatus ||   // ✅ Apple/Firebase
  data.stripeRole ||
  data.plan ||
  data.tier ||
  ""
).toLowerCase();

         let tier = "free";
         let label = "";
         if (rawRole.includes("pro")) {
           tier = "pro";
           label = "Pro";
         } else if (rawRole.includes("advanced")) {
           tier = "advanced";
           label = "Advanced";
         } else if (rawRole && rawRole !== "free") {
           tier = "paid";
           label = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
         } else if (
           String(data?.subscription?.status || data?.stripeSubscription?.status || "")
             .toLowerCase() === "active"
         ) {
           tier = "paid";
           label = "Active plan";
         }
         setPlanTier(tier);
         setPlanLabel(label);
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
  // ⚡️ dynamische Viewport-Höhe für iOS Safari + Fallback
  height: "100dvh",
  minHeight: "100vh",
  width: sidebarMin ? 70 : 230,
  borderRight,
  zIndex: 40,
  left: sidebarVisible ? 0 : isMobile ? "-250px" : 0,
  position: "fixed",
  top: 0,
  transition: "width .2s, left .2s, background .2s",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden", // wir scrollen in einer inneren Area
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
const baseBtnStyle = (active) => ({
  color: active ? navActiveColor : navText,
  background: active ? navActiveBg : "transparent",
  fontWeight: 600,
  fontSize: 15,
  border: "none",
  borderRadius: 13,
  transition: "all .16s",
});


  // Aktiver Pfad auch für Tools-Subroutes
  const isActive = (path) => {
  // ✅ Tools: aktiv, wenn URL mit /tools/... startet
  if (path.startsWith("/tools")) {
    return location.pathname.startsWith(path);
  }
  return location.pathname === path;
};

 return (
  <>
    {/* Mobile Burger */}
    {isMobile && !sidebarVisible && (
      <button
        style={{
          position: "fixed",
          top: 16,
          left: 14,
          zIndex: 50,
          background: dark ? "#222" : "#fff",
          color: navText,
          borderRadius: 8,
          padding: 7,
          border: "none",
          boxShadow: "0 2px 8px rgba(30,30,40,.09)",
        }}
        onClick={() => setSidebarVisible(true)}
        aria-label="Sidebar öffnen"
      >
        <FaBars size={24} />
      </button>
    )}

    {/* Overlay für Mobile */}
    {isMobile && sidebarVisible && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(30,32,42,0.19)",
          zIndex: 30,
        }}
        onClick={() => setSidebarVisible(false)}
      />
    )}

    {/* Sidebar */}
    <aside
      style={{
        background: sidebarBg,
        height: "100dvh",
        minHeight: "100vh",
        width: sidebarMin ? 70 : 230,
        borderRight,
        zIndex: 40,
        left: sidebarVisible ? 0 : isMobile ? "-250px" : 0,
        position: "fixed",
        top: 0,
        transition: "width .2s, left .2s, background .2s",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      className="flex flex-col"
    >
      {/* Header + Toggle */}
      <div
        style={{
          height: 70,
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
          borderBottom: !dark ? "1.5px solid #e3e7ef" : "none",
          flexShrink: 0,
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

      {/* Scrollbarer Inhalt */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}>
        {/* Profil */}
        {!sidebarMin && (
           <ProfileCard
            avatarContent={avatarContent}
            displayName={displayName}
            userEmail={userEmail}
            navText={navText}
            dark={dark}
            planTier={planTier}
            planLabel={planLabel}
          />
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
          <div style={{ marginTop: 2 }}>
            <button
              onClick={() => setToolsOpen((v) => !v)}
              style={{
                ...baseBtnStyle(location.pathname.startsWith("/dashboard/tools")),
                width: "100%",
              }}
              className={`flex items-center ${
                sidebarMin ? "justify-center" : "justify-between"
              } px-4 py-2.5`}
            >
              <div
                className={`flex items-center gap-3 ${
                  sidebarMin ? "justify-center" : ""
                }`}
              >
                <span className="text-lg">
                  <FaTools />
                </span>
                {!sidebarMin && <span>Tools</span>}
              </div>
              {!sidebarMin && (
                <span className="text-sm" style={{ color: subText }}>
                  {toolsOpen ? <FaChevronRight /> : <FaChevronDown />}
                </span>
              )}
            </button>

            {/* Dropdown-Content */}
            <div
              style={{
                maxHeight: toolsOpen ? 400 : 0,
                overflow: "hidden",
                transition: "max-height .22s ease",
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
                      marginLeft: sidebarMin ? 0 : 25,
                      marginTop: 6,
                      width: sidebarMin ? "100%" : "calc(100% - 48px)",
                    }}
                    className={`flex items-center gap-3 px-3 py-2 text-[14px] ${
                      sidebarMin ? "justify-center" : ""
                    } hover:bg-[#ececf3] hover:text-[#121316] dark:hover:bg-[#23232a] dark:hover:text-[#fff]`}
                  >
                    <span className="text-base w-5 flex justify-center">{t.icon}</span>

{!sidebarMin && (
  <span
    className="leading-[1.05]"
    style={{
      display: "-webkit-box",
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: 2,     // max 2 Zeilen
      overflow: "hidden",
      whiteSpace: "normal",
    }}
  >
    {t.label}
  </span>
)}

                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Sticky Settings Footer */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: sidebarBg,
          borderTop: !dark ? "1.5px solid #e3e7ef" : "1px solid #2b2b2b",
          padding: 10,
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate("/dashboard/settings")}
          style={{
            color: navText,
            background: "transparent",
            border: "none",
            fontWeight: 600,
            borderRadius: 13,
            padding: sidebarMin ? "12px" : "12px 24px",
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
return (
  <>
    {/* Mobile Burger */}
    {isMobile && !sidebarVisible && (
      <button
        style={{
          position: "fixed",
          top: 16,
          left: 14,
          zIndex: 50,
          background: dark ? "#222" : "#fff",
          color: navText,
          borderRadius: 8,
          padding: 7,
          border: "none",
          boxShadow: "0 2px 8px rgba(30,30,40,.09)",
        }}
        onClick={() => setSidebarVisible(true)}
        aria-label="Sidebar öffnen"
      >
        <FaBars size={24} />
      </button>
    )}

    {/* Overlay für Mobile */}
    {isMobile && sidebarVisible && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(30,32,42,0.19)",
          zIndex: 30,
        }}
        onClick={() => setSidebarVisible(false)}
      />
    )}

    {/* Sidebar */}
    <aside
      style={{
        background: sidebarBg,
        height: "100dvh",
        minHeight: "100vh",
        width: sidebarMin ? 70 : 230,
        borderRight,
        zIndex: 40,
        left: sidebarVisible ? 0 : isMobile ? "-250px" : 0,
        position: "fixed",
        top: 0,
        transition: "width .2s, left .2s, background .2s",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      className="flex flex-col"
    >
      {/* Header + Toggle */}
      <div
        style={{
          height: 70,
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
          borderBottom: !dark ? "1.5px solid #e3e7ef" : "none",
          flexShrink: 0,
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

      {/* Scrollbarer Inhalt */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}>
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
          <div style={{ marginTop: 2 }}>
            <button
              onClick={() => setToolsOpen((v) => !v)}
              style={{
                ...baseBtnStyle(location.pathname.startsWith("/dashboard/tools")),
                width: "100%",
              }}
              className={`flex items-center ${
                sidebarMin ? "justify-center" : "justify-between"
              } px-4 py-2.5`}
            >
              <div
                className={`flex items-center gap-3 ${
                  sidebarMin ? "justify-center" : ""
                }`}
              >
                <span className="text-lg">
                  <FaTools />
                </span>
                {!sidebarMin && <span>Tools</span>}
              </div>
              {!sidebarMin && (
                <span className="text-sm" style={{ color: subText }}>
                  {toolsOpen ? <FaChevronRight /> : <FaChevronDown />}
                </span>
              )}
            </button>

            {/* Dropdown-Content */}
            <div
              style={{
                maxHeight: toolsOpen ? 400 : 0,
                overflow: "hidden",
                transition: "max-height .22s ease",
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
                      marginLeft: sidebarMin ? 0 : 25,
                      marginTop: 6,
                      width: sidebarMin ? "100%" : "calc(100% - 48px)",
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
      </div>

      {/* Sticky Settings Footer */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: sidebarBg,
          borderTop: !dark ? "1.5px solid #e3e7ef" : "1px solid #2b2b2b",
          padding: 10,
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate("/dashboard/settings")}
          style={{
            color: navText,
            background: "transparent",
            border: "none",
            fontWeight: 600,
            borderRadius: 13,
            padding: sidebarMin ? "12px" : "12px 24px",
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
function ProfileCard({
  avatarContent,
  displayName,
  userEmail,
  navText,
  dark,
  planTier,   // z.B. "pro" | "advanced" | "free"
  planLabel,  // z.B. "Pro", "Advanced", "Free"
}) {
  const name = displayName || userEmail || "User";

  const tierNorm = (planTier || "").toLowerCase();
  const labelNorm = (planLabel || "").toLowerCase();

  // Robust erkennen (falls du nur ein Label speicherst)
  const isPro =
    tierNorm === "pro" || labelNorm.includes("pro");
  const isAdvanced =
    tierNorm === "advanced" || labelNorm.includes("advanced");

  const isPaid = isPro || isAdvanced;

  /* ---------- Styles abhängig von Theme + Plan ---------- */

  // Hintergrund
  const freeBg = dark ? "#181818" : "#f5f6ff";

  const paidBgDark =
    "linear-gradient(135deg, rgba(44,96,250,0.45) 0%, rgba(232,47,166,0.30) 40%, rgba(10,10,16,0.98) 100%)";

  const paidBgLight =
    "linear-gradient(135deg, rgba(44,96,250,0.08) 0%, rgba(232,47,166,0.06) 50%, #ffffff 100%)";

  const cardBg = isPaid
    ? (dark ? paidBgDark : paidBgLight)
    : freeBg;

  // Rahmen: nur bei Advanced/Pro – in Light Mode dezenter
  const cardBorder = isPaid
    ? (dark
        ? "1.5px solid rgba(232,47,166,0.7)"
        : "1.5px solid rgba(44,96,250,0.45)")
    : "none";

  // Schatten: nur im Dark Mode stark, im Light Mode sehr soft oder gar nicht
  const cardShadow = isPaid
    ? (dark
        ? "0 18px 40px rgba(0,0,0,.48)"
        : "0 8px 18px rgba(15,23,42,.08)")
    : "none";

  // Badge-Farben je nach Plan
  const badgeBg = isPro
    ? "rgba(232,47,166,0.85)"
    : "rgba(44,96,250,0.9)"; // Advanced → blau

  const badgeLabel =
    isPro
      ? (planLabel || "Pro Member")
      : isAdvanced
        ? (planLabel || "Advanced Member")
        : "";

  return (
    <div
      style={{
        padding: "14px 12px 18px",
        margin: "10px 10px 22px",
        borderRadius: 18,
        border: cardBorder,  // ✅ nur bei Advanced/Pro
        background: cardBg,  // ✅ Light Mode viel cleaner
        boxShadow: cardShadow,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>{avatarContent}</div>

      {/* Name */}
      <div
        style={{
          color: navText,
          fontWeight: 700,
          fontSize: 15,
          textAlign: "center",
          marginTop: 8,
          maxWidth: 170,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={name}
      >
        {name}
      </div>

      {/* E-Mail */}
      <div
        style={{
          fontSize: 11,
          opacity: 0.8,
          color: navText,
          textAlign: "center",
          maxWidth: 170,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
        title={userEmail}
      >
        {userEmail}
      </div>

      {/* Abo-Status (Badge) – für Advanced UND Pro */}
      {isPaid && (
        <div
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 11px",
            borderRadius: 999,
            background: badgeBg,
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
          }}
        >
          <FaStar size={11} />
          <span>{badgeLabel}</span>
        </div>
      )}
    </div>
  );
}

}