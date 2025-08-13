
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BgVignette, ParallaxCandlesBG } from "./ParallaxCandlesBG";
import { FaTwitter, FaYoutube, FaInstagram, FaTiktok, FaFacebook } from "react-icons/fa";

// NAVIGATION
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

 function Navbar() {
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

  // Für Mobile: schließt Menü bei Navigation
  function handleNav(to) {
    setMobileOpen(false);
    setDropdownLocked("");
    setDropdown("");
    if (to === "/login") navigate("/login");
    // optional: handle smooth scrolling for anchors
    else if (to.startsWith("#")) {
      document.querySelector(to)?.scrollIntoView({ behavior: "smooth" });
    }
  }

  // ---------- DESKTOP NAVIGATION ---------- //
  const navContent = (
    <>
      <DropdownNavButton
        label="Features"
        open={dropdown === "features"}
        locked={dropdownLocked === "features"}
        setOpen={v => v ? openDropdown("features") : scheduleDropdownClose()}
        setLocked={() => toggleDropdown("features")}
        blue={dropdown === "features"}
        items={[
          { head: "Trade Sync", desc: "Sync trades automatically from MetaTrader and others." },
          { head: "Emotion Tracking", desc: "Log emotions & context on every trade." },
          { head: "Analytics", desc: "Full win rate, pattern & error analysis." },
        ]}
        onDropdownEnter={() => { cancelClose(); openDropdown("features"); }}
        onDropdownLeave={scheduleDropdownClose}
        popStyle={{ left: "0", marginTop: "16px" }}
      />
      <div
        style={{ position: "relative", minHeight: 46, display: "flex", alignItems: "center" }}
        onMouseEnter={() => openDropdown("pricing")}
        onMouseLeave={scheduleDropdownClose}
        onClick={e => { e.preventDefault(); setDropdownLocked(""); setDropdown(""); window.scrollTo({ top: 9999, behavior: "smooth" }); }}
        tabIndex={0}
      >
        <a
          href="#pricing"
          className={`px-6 py-3 rounded-full text-sm font-medium transition select-none
            ${dropdown === "pricing" ? "text-blue-400" : "text-white"}`}
          style={{
            marginTop: "2px",
            color: dropdown === "pricing" ? "#2c60fa" : undefined,
            transform: dropdown === "pricing" ? "translateY(-1px)" : undefined,
            background: dropdown === "pricing" ? "rgba(44,96,250,0.10)" : "transparent",
            fontWeight: dropdown === "pricing" ? 600 : undefined,
            position: "relative",
            zIndex: 2
          }}
        >
          Pricing
        </a>
        {/* Unsichtbares Hover-Pad für leichteres Hovern */}
        <div
          style={{
            position: "absolute",
            left: 0, right: 0, top: -8, bottom: -8,
            zIndex: 1
          }}
        />
      </div>
      <DropdownNavButton
        label="Resources"
        open={dropdown === "resources"}
        locked={dropdownLocked === "resources"}
        setOpen={v => v ? openDropdown("resources") : scheduleDropdownClose()}
        setLocked={() => toggleDropdown("resources")}
        blue={dropdown === "resources"}
        items={[
          { head: "Help Center", desc: "Find answers and tips for Acardia Journal." },
          { head: "Integrations", desc: "Connect with brokers and platforms." },
          { head: "Community", desc: "Share ideas and feedback with traders." },
        ]}
        onDropdownEnter={() => { cancelClose(); openDropdown("resources"); }}
        onDropdownLeave={scheduleDropdownClose}
        popStyle={{ left: "auto", right: "0", marginTop: "16px" }}
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
            { head: "Help Center", desc: "Find answers and tips for Acardia Journal." },
            { head: "Integrations", desc: "Connect with brokers and platforms." },
            { head: "Community", desc: "Share ideas and feedback with traders." },
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

// --------- Desktop Dropdown --------- //
function DropdownNavButton({
  label, open, locked, setOpen, setLocked, blue, items, onDropdownEnter, onDropdownLeave, popStyle
}) {
  // Erweitert den Hoverbereich oben/unten und um den Button
  return (
    <div
      className="relative"
      onMouseEnter={() => { setOpen(true); onDropdownEnter && onDropdownEnter(); }}
      onMouseLeave={() => { setOpen(false); onDropdownLeave && onDropdownLeave(); }}
      tabIndex={0}
      style={{
        outline: "none",
        minHeight: 46,
        padding: "0 2px"
      }}
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
        onClick={e => { e.stopPropagation(); setLocked(); }}
        tabIndex={0}
      >
        {label}
        <svg
          width={12}
          height={8}
          viewBox="0 0 12 8"
          fill="none"
          className="ml-1 transition"
          style={{ marginBottom: -1, transform: blue ? "rotate(180deg)" : undefined, color: blue ? "#2c60fa" : "#fff" }}
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
        >
          {items.map((item, i) => (
            <button
              key={i}
              className="mb-2 text-left w-full hover:bg-blue-900/10 px-3 py-2 rounded transition"
              style={{ color: "#fff", minHeight: 46 }}
              tabIndex={0}
            >
              <div className="font-bold text-base">{item.head}</div>
              <div className="text-xs text-blue-200/90">{item.desc}</div>
            </button>
          ))}
        </div>
      )}
      {/* Unsichtbarer Hover-Bereich um das Dropdown zu erleichtern */}
      {open && (
        <div style={{
          position: "absolute", left: -12, right: -12, top: -24, height: 36, zIndex: 10
        }} />
      )}
    </div>
  );
}

// --------- Mobile Dropdown --------- //
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
              onClick={e => { e.stopPropagation(); /* Hier Navigation falls gewünscht */ }}
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


function MobileMenuItem({ label, onClick }) {
  return (
    <button
      className="text-xl font-bold text-white w-[230px] py-3 rounded-lg hover:bg-[#232a44] transition"
      style={{
        fontWeight: 500,
        letterSpacing: "0.04em",
        marginBottom: 6,
        background: "rgba(36,43,65,0.86)",
        border: "1px solid #232a44",
        boxShadow: "0 2px 10px #232a4425"
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}






// HERO SECTION

function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="flex flex-col items-center justify-center pt-44 pb-24 min-h-[430px] relative z-10">
      <h1
        className="text-5xl md:text-6xl font-semibold text-white text-center mb-5 tracking-tight drop-shadow-2xl"
        style={{
         fontFamily: "Inter, Arial, sans-serif",

          fontWeight: 800,                // Weniger bold als extrabold (700/800)
          letterSpacing: "-0.01em",
        }}
      >
        Trade with confidence
        <br className="hidden md:block" />
        use Acardia
      </h1>
      <p
        className="text-blue-100/90 text-lg md:text-xl text-center mb-7 max-w-2xl mx-auto"
        style={{
          fontFamily: "'Satoshi', Arial, sans-serif",
          fontWeight: 400
        }}
      >
        Unlock your full trading potential: analyze, reflect, and improve your performance with the smartest trading journal.
      </p>
<button
  className="px-7 py-2 text-white text-base font-semibold rounded-full shadow-xl transition"
  style={{
    background: "linear-gradient(45deg, #e82fa6 0%, #2c60fa 100%)",
    boxShadow: "0 0 0 1.5px #e82fa699 inset"
  }}
  onClick={() => navigate("/login")}
>
  Get Started for Free
</button>



    </section>
  );
}



function FeatureCards() {
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  // Verschieden gerichtete pink-blaue Verläufe
  const gradients = [
    "linear-gradient(102deg, #e82fa6 8%, #2c60fa 98%)",
    "linear-gradient(238deg, #e82fa6 0%, #2c60fa 100%)",
    "linear-gradient(27deg, #e82fa6 0%, #2c60fa 100%)"
  ];

  const cards = [
    {
      title: "Dive deeper into your strategy",
      desc: "Over 50 reports help you visualize your trading performance. Identify opportunities and see your true edge. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque nec euismod erat. Suspendisse potenti.",
      img: "/placeholder.png",
    },
    {
      title: "Understand your trading behaviors",
      desc: "Gain insight into your trading habits and psychology. Discover your strengths and weaknesses with clarity. Mauris pharetra, dui ut efficitur consequat, neque enim tincidunt arcu.",
      img: "/placeholder.png",
    },
    {
      title: "Get a summary of what's working for you",
      desc: "Curated dashboards help you track your progress and make data-driven trading decisions. Aenean euismod erat nec justo dictum, at facilisis urna sagittis.",
      img: "/placeholder.png",
    }
  ];

  return (
    <section className="w-full py-12 flex flex-col items-center relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {cards.map((card, i) => (
          <FeatureCard
            key={i}
            {...card}
            gradient={gradients[i]}
            hovered={hoveredIndex === i}
            onHover={() => setHoveredIndex(i)}
            onUnhover={() => setHoveredIndex(-1)}
          />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ title, desc, img, gradient, hovered, onHover, onUnhover }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden relative shadow-xl group cursor-pointer transition-all`}
      style={{
        minHeight: hovered ? 380 : 265,
        maxHeight: hovered ? 600 : 285,
        border: hovered
          ? "2px solid #2c60fa"
          : "0px solid rgba(44,96,250,0.11)",
        boxShadow: hovered
          ? "0 0 0 px #181b2a, 0 12px 40px 0 #2c60fa"
          : "0 0px 0px 0 #181b2a",
        background: "#181b2a",
        outline: "none",
        transition: "border 0.2s, box-shadow 0.2s, min-height 0.4s"
      }}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
      tabIndex={0}
    >
      {/* Oben: Bild mit buntem Verlauf */}
      <div
        style={{
          width: "100%",
          height: 130,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <img src={img} alt="" style={{ objectFit: "contain", height: 72 }} />
      </div>
      {/* Gerade Trennlinie */}
      <div
        style={{
          height: 3,
          width: "100%",
          background: hovered ? "#181b2a" : "#181b2a",
          marginBottom: "-1px"
        }}
      />
      {/* Unten: Abgedunkelt/smoky */}
      <div
        className="p-6"
        style={{
          background: "#181b2a   ",
          minHeight: hovered ? 180 : 110,
          maxHeight: hovered ? 900 : 130,
          overflow: "hidden",
          transition: "all 0.4s cubic-bezier(.7,.13,.28,.96)"
        }}
      >
        <h3 className="text-white text-lg font-bold mb-2">{title}</h3>
        <p
          className={`text-blue-100/90 text-base transition-all duration-500 ${
            hovered ? "" : "line-clamp-2"
          }`}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}




// Score Section
function ScoreSection() {
   const stats = [
    { value: 3120, label: "Active Traders" },
    { value: 85400, label: "Trades Logged" },
    { value: 19500, label: "Performance Reviews" },
    { value: 468, label: "Symbols Traded" },
  ];
  return (
    <section className="w-full py-14 flex flex-col items-center relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-7 max-w-6xl w-full">
        {stats.map((stat, i) => (
          <ScoreCard key={i} end={stat.value} label={stat.label} />
        ))}
      </div>
    </section>
  );
}
function ScoreCard({ end, label }) {
  const ref = useRef();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame, start;
    function animate(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / 1700, 1);
      // Format Zahl: B, M, K
      let val = end;
      if (end >= 1e9) val = (progress * end / 1e9).toFixed(1) + "B+";
      else if (end >= 1e6) val = (progress * end / 1e6).toFixed(1) + "M+";
      else if (end >= 1e3) val = (progress * end / 1e3).toFixed(1) + "K+";
      else val = Math.floor(progress * end);
      setCount(val);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else {
        // Finale Zahl hübsch
        if (end >= 1e9) setCount((end / 1e9).toFixed(1) + "B+");
        else if (end >= 1e6) setCount((end / 1e6).toFixed(1) + "M+");
        else if (end >= 1e3) setCount((end / 1e3).toFixed(1) + "K+");
        else setCount(end);
      }
    }
    // Sichtbarkeit checken
    const io = new window.IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        frame = requestAnimationFrame(animate);
        io.disconnect();
      }
    });
    if (ref.current) io.observe(ref.current);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [end]);
  return (
    <div ref={ref} className="flex flex-col items-center justify-center px-6 py-9 bg-[#181b2a] rounded-2xl shadow-xl border border-blue-900/30 min-w-[170px]">
      <span className="text-3xl md:text-4xl font-extrabold text-white mb-2">{count}</span>
      <span className="text-blue-200 mt-2 font-semibold text-base">{label}</span>
    </div>
  );
}


function DemoVideoSection() {
  return (
    <section className="w-full flex flex-col items-center justify-center py-24 relative z-10">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-7 text-center">
        See Acardia Journal in Action
      </h2>
      <p className="text-blue-200 text-lg mb-10 text-center max-w-xl">
        Discover how effortless and insightful journaling can be. Take a quick look at our platform and its key features!
      </p>
     <div className="w-full flex items-center justify-center px-0">
  <video src="https://www.w3schools.com/html/mov_bbb.mp4" controls className="w-full max-w-5xl rounded-3xl bg-black" />

</div>


    </section>
  );
}
function AcardiaFeatureSplitSection() {
  return (
    <section className="w-full flex flex-col items-center py-16 px-2 relative z-10">
      <div className="flex flex-col md:flex-row rounded-3xl max-w-6xl w-full overflow-hidden bg-[#181b2a]">
        {/* Left: Text + Features */}
        <div className="flex-1 px-8 py-12 flex flex-col justify-center">
          <div className="flex items-center mb-2">
            <svg width="32" height="32" fill="none" className="mr-2">
              <circle cx="16" cy="16" r="15" fill="#2c60fa" opacity="0.1"/>
              <path d="M12 17l4 4 7-7" stroke="#2c60fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="uppercase text-blue-600 text-sm font-bold tracking-wider">Key Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#fff] mb-5" style={{fontFamily:"Poppins, Arial"}}>
            Track. Analyze. Improve.
          </h2>
          <p className="text-blue-100/90 text-lg mb-6 max-w-xl">
            Acardia Journal gives you clarity on your trading process.<br />
            Log your trades automatically, review your emotions, and get deep analytics to level up your edge.
          </p>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              "Advanced performance analytics & custom tags",
              "Winrate, expectancy, and streak stats",
              "Personal journal and image upload",
              "Fully secure & cloud-based – accessible everywhere",
            ].map((feat, i) => (
              <div key={i} className="flex items-center bg-[#eef3ff] px-4 py-2 rounded-full text-[#2c60fa] text-base font-medium gap-2 shadow-sm">
                <svg width="22" height="22" fill="none"><circle cx="11" cy="11" r="10" fill="#2c60fa" opacity="0.13"/><path d="M7 12l3 3 5-5" stroke="#2c60fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {feat}
              </div>
            ))}
          </div>
          <button
            className="mt-2 px-7 py-3 rounded-full font-bold bg-gradient-to-r from-[#e82fa6] to-[#2c60fa] text-white transition hover:scale-[1.035]"
            onClick={() => window.scrollTo({top:0, behavior:'smooth'})}
          >
            Learn More
          </button>
        </div>
        {/* Right: Screenshot (jetzt 100% der Hälfte) */}
        <div className="flex-1 bg-gradient-to-tr from-[#e82fa6]/10 to-[#2c60fa]/10 flex items-center justify-center min-h-[340px]">
         <img
  src="/screenshot-dashboard.png"
  alt="Acardia Journal Screenshot"
  className="rounded-r-2xl w-full h-full object-cover"
/>

        </div>
      </div>
    </section>
  );
}


// FOOTER im FXReplay Stil
function Footer() {
  return (
    <footer className="relative w-full bg-[#1f1f1f] border-t border-white/5 z-40">
      <div className="max-w-7xl mx-auto py-12 px-4 flex flex-col md:flex-row md:items-start gap-12">
        {/* Logo und Socials */}
        <div className="flex-1 flex flex-col items-start gap-5 min-w-[170px]">
          <img src="/logo.png" alt="Acardia Logo" className="h-8 mb-2" />
          <div className="flex gap-4 text-xl text-white/60 mt-3">
            <FaTwitter className="hover:text-blue-500 transition" />
            <FaYoutube className="hover:text-red-500 transition" />
            <FaInstagram className="hover:text-pink-400 transition" />
            <FaTiktok className="hover:text-pink-400 transition" />
            <FaFacebook className="hover:text-blue-600 transition" />
          </div>
        </div>
        {/* Links */}
        <div className="flex-[3] grid grid-cols-2 md:grid-cols-4 gap-10 text-white/90 text-sm font-medium">
          <div>
            <div className="mb-3 font-semibold">Acardia</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Execute</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Optimize</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Grow</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Community</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Pricing</div>
          </div>
          <div>
            <div className="mb-3 font-semibold">Company</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">About</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Blog</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Affiliate Program</div>
          </div>
          <div>
            <div className="mb-3 font-semibold">Help Center</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">FAQs</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Support</div>
          </div>
          <div>
            <div className="mb-3 font-semibold">Legal & Regulatory</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Privacy Policy</div>
            <div className="mb-1 hover:text-blue-300 cursor-pointer">Terms & Conditions</div>
          </div>
        </div>
     

</div> <div className="text-center py-4 text-xs text-white/40 border-t border-white/5 bg-[#111729]"> &copy;2025 Acardia. All rights reserved. </div> </footer> ); }
// FINAL LANDINGPAGE EXPORT
export default function LandingPage() {
const [scrollT, setScrollT] = useState(0);
useEffect(() => {
function onScroll() {
const maxScroll = 420;
const y = Math.min(window.scrollY, maxScroll);
setScrollT(y / maxScroll);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
return () => window.removeEventListener("scroll", onScroll);
}, []);

return (
<div className="relative w-full min-h-screen bg-[#181b2a]">
<BgVignette scrollColorT={scrollT} />
<ParallaxCandlesBG scrollColorT={scrollT} />
<Navbar />
<div style={{ height: "200px" }} />
<HeroSection />
<FeatureCards />
<AcardiaFeatureSplitSection />
 <DemoVideoSection /> 
<ScoreSection />


<Footer />
</div>
);
}