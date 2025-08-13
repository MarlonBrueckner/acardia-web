import React, { useRef, useEffect } from "react";

// Hilfsfunktion für Farbinterpolation (HEX -> RGB -> zurück)
function lerpColor(a, b, t) {
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.substring(0, 2), 16);
  const ag = parseInt(ah.substring(2, 4), 16);
  const ab = parseInt(ah.substring(4, 6), 16);
  const br = parseInt(bh.substring(0, 2), 16);
  const bg = parseInt(bh.substring(2, 4), 16);
  const bb = parseInt(bh.substring(4, 6), 16);
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1);
}


export function BgVignette({ scrollColorT = 0 }) {
  // 0 = blau, 1 = pink
  const topColor = lerpColor("#2c60fa", "#e82fa6", scrollColorT);

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: "#181818",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(
              to bottom,
              ${topColor}66 0%,
              ${topColor}33 18%,
              transparent 32%
            )`,
            animation: "pulseHue 8s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes pulseHue {
          0%, 100% { opacity: 0.75; }
          50%      { opacity: 0.38; }
        }
      `}</style>
    </>
  );
}


export function ParallaxCandlesBG({ scrollColorT }) {
  const canvasRef = useRef();
  const lastWidth = useRef(window.innerWidth);
  const candlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Chart-Parameter
    const candleWidth = 48;
    const candleGap = 10;
    const chartHeight = Math.min(h * 0.65, 780);
    const yBottom = h * 0.75;
    // immer die maximal mögliche Candle-Zahl bauen, dann später einfach "abschneiden"
    const maxCandles = 500;

    // **Nur wenn sich die Breite gravierend ändert, Candle-Array neu bauen**
    if (
      candlesRef.current.length === 0 ||
      Math.abs(lastWidth.current - w) > candleWidth + candleGap
    ) {
      let last = chartHeight * 0.7;
      const candles = [];
      for (let i = 0; i < maxCandles; i++) {
        const minBody = 34;
        const maxBody = 120;
        const bodyHeight = minBody + Math.random() * (maxBody - minBody);
        let direction = Math.random() > 0.5 ? 1 : -1;
        if (last < bodyHeight) direction = 1;
        if (last > chartHeight - bodyHeight) direction = -1;
        const open = last;
        const close = open + direction * bodyHeight;
        const wickUp = Math.min(24 + Math.random() * 24, chartHeight - Math.max(open, close));
        const wickDown = 8 + Math.random() * 26;
        const high = Math.max(open, close) + wickUp;
        const low = Math.max(0, Math.min(open, close) - wickDown);
        candles.push({ open, close, high, low });
        last = Math.max(0, Math.min(close + (Math.random() - 0.5) * 18, chartHeight - minBody));
      }
      candlesRef.current = candles;
      lastWidth.current = w;
    }
    const candleCount = Math.ceil(w / (candleWidth + candleGap)) + 12;
    const candles = candlesRef.current.slice(0, candleCount);

    function draw(scrollY = 0, colorT = 0) {
      ctx.clearRect(0, 0, w, h);

      const colorTop = lerpColor("#2c60fa", "#e82fa6", colorT);
      const colorBot = lerpColor("#41a4fb", "#ff88e6", colorT);

      const wickDark = lerpColor("#2651ca", "#b70ea9", colorT);
      const wickLight = lerpColor("#41a4fb", "#ff88e6", colorT);

     const xOffset = scrollY * 0.13;


      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const x = i * (candleWidth + candleGap) - xOffset;
        const yOpen = yBottom - c.open;
        const yClose = yBottom - c.close;
        const yHigh = yBottom - c.high;
        const yLow = yBottom - c.low;

        const grad = ctx.createLinearGradient(x, Math.min(yOpen, yClose), x, Math.max(yOpen, yClose) + candleWidth);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(1, colorBot);
        
        ctx.fillStyle = grad;

       // ... Innerhalb deiner draw()-Schleife für jede Kerze:
const yBody = Math.min(yOpen, yClose);
const bodyHeight = Math.abs(yOpen - yClose) || 14;

// --- GLOW EFFEKT --- //
ctx.save();
ctx.globalAlpha = 0.75; // Glow halb transparent
ctx.shadowColor = colorTop + "cc"; // Glow-Farbe, z.B. #2c60facc
ctx.shadowBlur = 30; // Glow-Radius
ctx.beginPath();
ctx.moveTo(x + 5, yBody);
ctx.lineTo(x + candleWidth - 5, yBody);
ctx.quadraticCurveTo(x + candleWidth, yBody, x + candleWidth, yBody + 5);
ctx.lineTo(x + candleWidth, yBody + bodyHeight - 5);
ctx.quadraticCurveTo(x + candleWidth, yBody + bodyHeight, x + candleWidth - 5, yBody + bodyHeight);
ctx.lineTo(x + 5, yBody + bodyHeight);
ctx.quadraticCurveTo(x, yBody + bodyHeight, x, yBody + bodyHeight - 5);
ctx.lineTo(x, yBody + 5);
ctx.quadraticCurveTo(x, yBody, x + 5, yBody);
ctx.closePath();
ctx.fillStyle = colorTop + "44"; // Heller, halbtransparenter Glow
ctx.fill();
ctx.restore();

// --- Normale Kerze wie bisher ---
ctx.beginPath();
        ctx.moveTo(x + 5, yBody);
        ctx.lineTo(x + candleWidth - 5, yBody);
        ctx.quadraticCurveTo(x + candleWidth, yBody, x + candleWidth, yBody + 5);
        ctx.lineTo(x + candleWidth, yBody + bodyHeight - 5);
        ctx.quadraticCurveTo(x + candleWidth, yBody + bodyHeight, x + candleWidth - 5, yBody + bodyHeight);
        ctx.lineTo(x + 5, yBody + bodyHeight);
        ctx.quadraticCurveTo(x, yBody + bodyHeight, x, yBody + bodyHeight - 5);
        ctx.lineTo(x, yBody + 5);
        ctx.quadraticCurveTo(x, yBody, x + 5, yBody);
        ctx.closePath();
        ctx.fill();
        // Wick oben (dunkel)
      // Wick oben (dunkel, glühend)
// WICK OBEN (dunkel, glühend, oben abgerundet)
// Wick oben (dunkel, glühend, mit Rundung oben)
ctx.save();
ctx.strokeStyle = wickDark;
ctx.shadowBlur = 80;
ctx.shadowColor = wickDark;
ctx.beginPath();
ctx.moveTo(x + candleWidth / 2, yHigh);
ctx.lineTo(x + candleWidth / 2, yBody);
ctx.lineWidth = 5;
ctx.stroke();
// Abrundung oben
ctx.beginPath();
ctx.arc(x + candleWidth / 2, yHigh, 2.7, 0, Math.PI * 2, false);
ctx.fillStyle = wickDark;
ctx.shadowBlur = 80;
ctx.shadowColor = wickDark;
ctx.globalAlpha = 0.85;
ctx.fill();
ctx.restore();

// Wick unten (hell, glühend, mit Rundung unten)
ctx.save();
ctx.strokeStyle = wickLight;
ctx.shadowBlur = 80;
ctx.shadowColor = wickLight;
ctx.beginPath();
ctx.moveTo(x + candleWidth / 2, yBody + bodyHeight);
ctx.lineTo(x + candleWidth / 2, yLow);
ctx.lineWidth = 5;
ctx.stroke();
// Abrundung unten
ctx.beginPath();
ctx.arc(x + candleWidth / 2, yLow, 2.7, 0, Math.PI * 2, false);
ctx.fillStyle = wickLight;
ctx.shadowBlur = 80;
ctx.shadowColor = wickLight;
ctx.globalAlpha = 0.85;
ctx.fill();
ctx.restore();



      }
    }

    function handleScroll() {
      const maxScroll = 1200;
      const y = Math.min(window.scrollY, maxScroll);
      const t = y / maxScroll;
      draw(window.scrollY, t);
    }
    function handleResize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      // Candle-Array nur neu bauen, wenn sich die Breite deutlich geändert hat (siehe oben)
      if (Math.abs(lastWidth.current - w) > candleWidth + candleGap) {
        candlesRef.current = [];
      }
      handleScroll();
    }

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}