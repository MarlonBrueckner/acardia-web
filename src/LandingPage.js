
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BgVignette, ParallaxCandlesBG } from "./ParallaxCandlesBG";
import { FaTwitter, FaYoutube, FaInstagram, FaTiktok, FaFacebook } from "react-icons/fa";
import { Navbar } from "./helpers/Navbar";
import { LandingFooter } from "./helpers/LandingFooter";
// Bild-Assets als Module importieren (lege sie ins src/assets/…)
// NEU: drei Kartenbilder + dein Foto + dein Video
import featureImg1 from "./assets/feature-1.jpg";
import featureImg2 from "./assets/feature-2.jpg";
import featureImg3 from "./assets/feature-3.jpg";
import myPhoto      from "./assets/my-photo.jpg";
import screenshotDashboard from "./assets/screenshot-dashboard.png";

import myVideo from "./assets/my-video.mov";




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



// --------- Mobile Dropdown --------- //



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
    <section className="flex flex-col items-center justify-center pt-20 md:pt-44 pb-24 min-h-[430px] relative z-10">

<h1
  className="text-center mb-7 text-white"
  style={{
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: "clamp(2.8rem, 6.2vw, 4.8rem)", // 🔥 größer
    lineHeight: 1.03,                        // straff & modern
    letterSpacing: "-0.035em",               // hochwertig
    fontWeight: 800,
  }}
>
  The Trading Journal
  <br />
  that Makes You Better
</h1>



<p
  className="text-blue-100/90 text-lg md:text-xl text-center mb-7 max-w-2xl mx-auto"
  style={{
    fontFamily: "'Inter Tight', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fontWeight: 450,
  }}
>
  Acardia Journal is a trading journal that helps you track trades, emotions and performance analytics
</p>


      <button
        className="px-7 py-2 text-white text-base font-semibold rounded-full shadow-xl transition hover:scale-[1.03]"
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
      img: featureImg1,
    },
    {
      title: "Understand your trading behaviors",
      desc: "Gain insight into your trading habits and psychology. Discover your strengths and weaknesses with clarity. Mauris pharetra, dui ut efficitur consequat, neque enim tincidunt arcu.",
    img: featureImg2,
    },
    {
      title: "Get a summary of what's working for you",
      desc: "Curated dashboards help you track your progress and make data-driven trading decisions. Aenean euismod erat nec justo dictum, at facilisis urna sagittis.",
      img: featureImg3,
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
  <img
    src={img}
    alt=""
    style={{
      objectFit: "contain",
      maxHeight: "100px",   // Höhe fast so hoch wie das Feld
      maxWidth: "85%",      // nutzt viel Breite
      borderRadius: "12px", // abgerundete Ecken
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)", // optional: sanfter Schatten
    }}
  />
</div>

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
       <h3
  className="text-white mb-2"
  style={{
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    fontSize: "1.15rem",
    lineHeight: 1.2,
  }}
>
  {title}
</h3>

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
    <span
  className="text-3xl md:text-4xl text-white mb-2"
  style={{
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  }}
>
  {count}
</span>

<span
  className="text-blue-200 mt-2 text-base"
  style={{
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    fontWeight: 600,
    letterSpacing: "-0.01em",
  }}
>
  {label}
</span>

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

      <div className="w-full flex items-center justify-center px-4">
        <video
          src={myVideo}
          controls
          className="rounded-3xl w-full max-w-5xl"
          style={{
              width: "100%",
            maxWidth: "820px",            // 🔥 deutlich kleiner
            borderRadius: "22px",
            background: "transparent",
            boxShadow:
              "0 0 22px rgba(44,96,250,0.55), 0 0 44px rgba(44,96,250,0.35)",
            filter: "drop-shadow(0 0 20px rgba(44,96,250,0.6))",
          }}
        />
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
         <h2
  className="text-3xl md:text-4xl font-extrabold text-[#fff] mb-5"
  style={{
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.05
  }}
>
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
      {/* Right: Screenshot (jetzt 100% der Hälfte) */}
{/* Right: Screenshot (links anfangen, rechts bei Bedarf abschneiden) */}
<div className="flex-1 bg-gradient-to-tr from-[#e82fa6]/10 to-[#2c60fa]/10 flex items-center justify-center min-h-[340px] overflow-hidden">
  <img
    src={screenshotDashboard}
    alt="Acardia Journal Screenshot"
    className="rounded-r-2xl w-full h-full object-cover"
    style={{ objectPosition: "left center" }}   // ⭐️ WICHTIG: linksbündig, rechts cut
  />
</div>


      </div>
    </section>
  );
}



export default function LandingPage() {
  const isMobile = useMediaQuery("(max-width: 900px)");

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
    <div
      className="relative w-full min-h-screen"
      style={{ background: "#181b2a" }}
    >
      {/* Hintergrund-Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <BgVignette scrollColorT={scrollT} />
        {!isMobile && <ParallaxCandlesBG scrollColorT={scrollT} />}
      </div>

      {/* Content-Layer + LandingFooter */}
      <div
        className="relative flex flex-col min-h-screen"
        style={{ zIndex: 10 }}
      >
        <Navbar />
        <div style={{ height: "200px" }} />

        {/* deine Sections */}
        <HeroSection />
        <FeatureCards />
        <AcardiaFeatureSplitSection />
        <DemoVideoSection />
        <ScoreSection />

        {/* Landing-spezifischer Footer */}
        <LandingFooter />
      </div>
    </div>
  );
}