 import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* --- falls du diese helper im Navbar brauchst, bring sie in DIESE Datei --- */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
}
 

// --------- Desktop Dropdown --------- //
function DropdownNavButton({
  label,
  open,
  locked,
  setLocked,     // toggleDropdown(...) kommt hier rein
  blue,
  items,
  popStyle,
}) {
  return (
    <div
      className="relative"
      tabIndex={0}
      style={{ outline: "none", minHeight: 46, padding: "0 2px" }}
    >
      <button
        className="px-5 py-3 rounded-full font-medium transition flex items-center gap-1 text-white select-none"
        style={{
          color: blue ? "#2c60fa" : undefined,
          transform: blue ? "translateY(-2px)" : undefined,
          textShadow: blue ? "0 3px 16px #2c60fa2b" : undefined,
          background: blue ? "rgba(44,96,250,0.06)" : undefined,
          fontWeight: blue ? 600 : undefined,
          minWidth: 112,
          minHeight: 44,
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setLocked(); // toggelt auf/zu
        }}
        type="button"
      >
        {label}
        <svg
          width={12}
          height={8}
          viewBox="0 0 12 8"
          fill="none"
          className="ml-1 transition"
          style={{
            marginBottom: -1,
            transform: open ? "rotate(180deg)" : undefined,
            color: blue ? "#2c60fa" : "#fff",
          }}
        >
          <path
            d="M2 2.5L6 6.5L10 2.5"
            stroke={blue ? "#2c60fa" : "#fff"}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute min-w-[340px] bg-[#191e2b] border border-blue-900/60 rounded-2xl shadow-2xl px-7 py-6 z-40 flex flex-col gap-2 animate-fadeIn"
          style={popStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              className="mb-2 text-left w-full hover:bg-blue-900/10 px-3 py-2 rounded transition"
              style={{ color: "#fff", minHeight: 46 }}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick && item.onClick();
              }}
            >
              <div className="font-bold text-base">{item.head}</div>
              <div className="text-xs text-blue-200/90">{item.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



function MobileDropdown({ label, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        className="flex w-full items-center justify-between text-white py-3 px-2 text-base font-bold"
        style={{ borderBottom: "1px solid #23243a", borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
      >
        {label}
        <span
          className={`ml-2 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ fontSize: 22, color: "#fff" }}
        >⌄</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 pl-5 pr-2 py-2" style={{ background: "#181b22", borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}>
     {items.map((item, idx) => (
  <button
    key={idx}
    className="text-left py-2 px-1 rounded text-blue-100 text-sm hover:bg-blue-900/40 transition"
    style={{ fontWeight: 500 }}
    onClick={(e) => { e.stopPropagation(); item.onClick && item.onClick(); }}
  >
    <div>{item.head}</div>
    <div className="text-xs text-blue-300/90">{item.desc}</div>
  </button>
))}

        </div>
      )}
    </div>
  );
}


function MobileNavbar({ open, onClose, handleNav }) {
  return open ? (
    <div
      className="absolute left-0 right-0 mt-[68px] mx-auto max-w-[530px] w-[96vw] rounded-2xl bg-[rgba(18,19,22,0.98)] border border-[#24252f] shadow-2xl z-40"
      style={{
        backdropFilter: "blur(5px)",
        animation: "fadeDown 0.25s cubic-bezier(.61,.13,.37,1.15)",
        minHeight: 320,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Menü-Inhalt */}
      <div className="flex flex-col gap-2 px-4 py-6">
        <MobileDropdown
          label="Features"
          items={[
            { head: "Trade Syc", desc: "Sync trades automatically from MetaTrader and others." },
            { head: "Emotion Tracking", desc: "Log emotions & context on every trade." },
            { head: "Analytics", desc: "Full win rate, pattern & error analysis." },
          ]}
        />
        <button
          className="w-full text-white text-left text-base font-bold py-3 px-2 flex items-center justify-between rounded-xl hover:bg-blue-900/30 transition"
          style={{ marginTop: 8, marginBottom: 8 }}
          onClick={e => { e.stopPropagation(); handleNav("#pricing"); }}
        >
          Pricing <span style={{ fontSize: 22, color: "#fff" }}>→</span>
        </button>
        <MobileDropdown
          label="Resources"
          items={[
            { head: "Help Center", desc: "Find answers and tips for Acardia Journal." },
            { head: "Integrations", desc: "Connect with brokers and platforms." },
            { head: "Community", desc: "Share ideas and feedback with traders." },
          ]}
        />
      </div>
      {/* Close-X Button, oben rechts im Panel */}
      <button
        className="absolute top-4 right-5 text-white text-2xl"
        onClick={onClose}
        style={{ width: 38, height: 38, background: "none" }}
        aria-label="Close"
      >&#10005;</button>
      <style>{`
        @keyframes fadeDown {
          0% { opacity: 0; transform: translateY(-18px) scale(0.98);}
          100% { opacity: 1; transform: translateY(0) scale(1);}
        }
      `}</style>
    </div>
  ) : null;
}




 export function Navbar() {
  const [dropdown, setDropdown] = useState(""); // "features" | "resources" | ""
  const [dropdownLocked, setDropdownLocked] = useState(""); // toggled state
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 900px)");
  const navigate = useNavigate();
  const closeTimeout = useRef(null);

  // Dropdown bleibt offen, solange Mouseover ODER locked
  function openDropdown(name) {
    clearTimeout(closeTimeout.current);
    setDropdown(name);
  }
  function scheduleDropdownClose() {
    closeTimeout.current = setTimeout(() => {
      if (!dropdownLocked) setDropdown("");
    }, 80);
  }
  function cancelClose() {
    clearTimeout(closeTimeout.current);
  }
  function toggleDropdown(name) {
    if (dropdownLocked === name) {
      setDropdownLocked("");
      setDropdown("");
    } else {
      setDropdownLocked(name);
      setDropdown(name);
    }
  }

function handleNav(to) {
  setMobileOpen(false);
  setDropdownLocked("");
  setDropdown("");

  if (to === "/login") {
    navigate("/login");
  } else if (to?.startsWith("#")) {
    document.querySelector(to)?.scrollIntoView({ behavior: "smooth" });
  } else if (typeof to === "string" && to.startsWith("/")) {
    navigate(to); // <— NEU: normale Routen wie /help, /terms, /privacy usw.
  }
}

  // ---------- DESKTOP NAVIGATION ---------- //
  const navContent = (
    <>
<DropdownNavButton
  label="Features"
  open={dropdown === "features"}
  locked={dropdownLocked === "features"}
  setOpen={(v) => (v ? openDropdown("features") : scheduleDropdownClose())}
  setLocked={() => toggleDropdown("features")}
  blue={dropdown === "features"}
  items={[
    { head: "Trade Sync",        desc: "Sync trades automatically from MetaTrader and others.", onClick: () => handleNav("/features/trade-sync") },
    { head: "Emotion Tracking",  desc: "Log emotions & context on every trade.",               onClick: () => handleNav("/features/emotions") },
    { head: "Analytics",         desc: "Win rate, pattern & error analysis.",                  onClick: () => handleNav("/features/analytics") },
  ]}
  onDropdownEnter={() => { cancelClose(); openDropdown("features"); }}
  onDropdownLeave={scheduleDropdownClose}
  popStyle={{ left: 0, marginTop: 16 }} // <— LINKS ausrichten
/>


{/* PRICING – navigiert jetzt zu /pricing */}
<div
  style={{
    position: "relative",
    minHeight: 46,
    display: "flex",
    alignItems: "center",
  }}
  tabIndex={0}
>
  <button
    type="button"
    className="px-6 py-3 rounded-full text-sm font-medium transition select-none text-white"
    style={{
      marginTop: "2px",
      background: "transparent",
      fontWeight: 500,
      position: "relative",
      zIndex: 2,
    }}
    onClick={(e) => {
      e.preventDefault();
      handleNav("/pricing");
    }}
  >
    Pricing
  </button>
</div>


<DropdownNavButton
  label="Resources"
  open={dropdown === "resources"}
  locked={dropdownLocked === "resources"}
  setOpen={(v) => (v ? openDropdown("resources") : scheduleDropdownClose())}
  setLocked={() => toggleDropdown("resources")}
  blue={dropdown === "resources"}
 items={[
  { head: "Help Center",    desc: "Find answers and tips for Acardia Journal.", onClick: () => handleNav("/help") },
  { head: "Privacy Policy", desc: "Learn how we handle your data.",             onClick: () => handleNav("/privacy") },
  { head: "Terms of Use",   desc: "Read the rules for using Acardia.",          onClick: () => handleNav("/terms") },
  { head: "Impressum",      desc: "Legal notice and contact information.",      onClick: () => handleNav("/impressum") },
]}

  onDropdownEnter={() => { cancelClose(); openDropdown("resources"); }}
  onDropdownLeave={scheduleDropdownClose}
  popStyle={{ right: 0, marginTop: 16, transformOrigin: "top right" }} // <— RECHTS ausrichten
/>

    </>
  );

  // ---------- MOBILE NAVIGATION ---------- //
  const mobileMenu = (
    <div
      className="fixed inset-0 bg-[rgba(18,19,22,0.97)] z-50 flex flex-col items-center pt-24"
      style={{ backdropFilter: "blur(7px)" }}
      onClick={() => setMobileOpen(false)}
    >
      <button
        className="text-white text-2xl mb-8"
        onClick={e => { e.stopPropagation(); handleNav("/login"); }}
        style={{
         background: "linear-gradient(45deg, #e82fa6 0%, #2c60fa 100%)",

          padding: "18px 64px",
          borderRadius: 60,
          fontWeight: 700,
          fontSize: 24
        }}
      >
        Try Now
      </button>
      <div className="w-full flex flex-col gap-6 items-center">
        <MobileDropdown
          label="Features"
          items={[
            { head: "Trade Sync", desc: "Sync trades automatically from MetaTrader and others." },
            { head: "Emotion Tracking", desc: "Log emotions & context on every trade." },
            { head: "Analytics", desc: "Full win rate, pattern & error analysis." },
          ]}
        />
        <button
          className="text-white text-lg py-3 px-6 w-[220px] rounded-xl hover:bg-blue-950/30 transition"
          onClick={e => { e.stopPropagation(); handleNav("#pricing"); }}
        >
          Pricing
        </button>
      <MobileDropdown
  label="Resources"
 items={[
  { head: "Help Center",     desc: "Find answers and tips for Acardia Journal.", onClick: () => handleNav("/help") },
  { head: "Privacy Policy",  desc: "Learn how we handle your data.",             onClick: () => handleNav("/privacy") },
  { head: "Terms of Use",    desc: "Read the rules for using Acardia.",          onClick: () => handleNav("/terms") },
  { head: "Impressum",       desc: "Legal notice and contact information.",      onClick: () => handleNav("/impressum") },
]}

/>

      </div>
    </div>
  );

 
  return (
    <>
 <nav
        className="fixed left-1/2 top-4 -translate-x-1/2 z-30 flex items-center border border-white/10 rounded-full px-4 py-2 shadow-lg min-w-[290px] max-w-[920px]"
        style={{
          background: "rgb(18,19,22)",
          backdropFilter: "blur(6px)",
          transition: "background 0.3s",
          border: "1.5px solid #f8f8fa10",
          width: isMobile ? "96vw" : undefined,
          
        }}
      >
        {isMobile ? (
  <>
    {/* Hamburger oder X */}
 <button
  className="flex items-center"
  style={{ minWidth: 44, minHeight: 44, fontWeight: 400, marginTop: "-2px" }}
  onClick={() => setMobileOpen(v => !v)}
  aria-label={mobileOpen ? "Close menu" : "Open menu"}
>
  {mobileOpen ? (
    <span
      className="block text-3xl text-white"
      style={{ fontWeight: 400, lineHeight: "36px", marginTop: "-2px" }}
    >
      &#10005;
    </span>
  ) : (
   <span className="block w-7 h-7 flex flex-col justify-center items-center">
  <span
    style={{ height: 2, marginBottom: 4, background: "#fff" }}
    className="block w-7 rounded"
  />
  <span
    style={{ height: 3, marginBottom: 4, background: "#fff" }}
    className="block w-7 rounded"
  />
  <span
    style={{ height: 2, background: "#fff" }}
    className="block w-7 rounded"
  />
</span>

  )}
</button>

{/* Logo etwas nach rechts */}
<div style={{
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 40 // Logo leicht nach rechts
}}>
  <img
    src="/logo.png"
    alt="Acardia Logo"
    className="h-6"
    style={{ objectFit: "contain", width: 100, minWidth: 60, maxWidth: 130 }}
  />
</div>

    <button
      className="px-6 py-2 text-white font-semibold rounded-full text-sm ml-auto"
      style={{
       background: "linear-gradient(45deg, #e82fa6 0%, #2c60fa 100%)"
,
        boxShadow: "0 0 0 1.5px #e82fa6 inset",
        fontWeight: 700,
      }}
      onClick={() => handleNav("/login")}
    >
      Try Now
    </button>
  </>
) : (
          // Desktop wie gehabt
          <>
            <img src="/logo.png" alt="Acardia Logo" className="h-6" />
            <div className="flex-1 flex gap-2 ml-10">{navContent}</div>
            <div className="flex items-center gap-2 ml-auto pl-3 border-l border-white/10">
              <button
                className="px-5 py-1.5 text-white font-semibold rounded-full bg-[#22253b] hover:bg-[#2c60fa] border border-blue-900/40 transition text-sm"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>
              <button
                className="px-6 py-1.5 text-white font-semibold rounded-full text-sm ml-1"
                style={{
                  background: "linear-gradient(45deg, #e82fa6 0%, #2c60fa 100%)",
                  boxShadow: "0 0 0 1.5px #e82fa6 inset",
                }}
                onClick={() => navigate("/login")}
              >
                Try Now
              </button>
            </div>
          </>
        )}
      </nav>
      {/* Mobile Dropdown als Panel */}
      {isMobile && mobileOpen && (
        <MobileNavbar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          handleNav={handleNav}
        />
      )}
    </>
  );
}
