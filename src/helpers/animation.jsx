// === helpers/animation.tsx (oder oben in der Datei einfügen) ===
import React from "react";

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

export function useCountUp(target = 0, { duration = 1000, startOnMount = true, deps = [] } = {}) {
  const [val, setVal] = React.useState(0);
  const rafRef = React.useRef(0);

  const start = React.useCallback(() => {
    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const loop = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      setVal(target * easeOutCubic(p));
      if (p < 1) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [target, duration]);

  React.useEffect(() => {
    if (startOnMount) start();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps.length ? deps : [startOnMount, target, duration]);

  return val;
}

// passt die Schrift runter, bis sie einzeilig in den Container passt
export function useAutoFitText(minPx = 14, maxPx = 28) {
  const ref = React.useRef(null);
  const [fontSize, setFontSize] = React.useState(maxPx);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    // Start groß, dann schrumpfen bis es passt (oder minPx erreicht)
    let size = maxPx;
    el.style.fontSize = `${size}px`;
    el.style.whiteSpace = "nowrap";

    const fits = () => el.scrollWidth <= parent.clientWidth && el.scrollHeight <= parent.clientHeight;

    while (!fits() && size > minPx) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  });

  return { ref, fontSize };
}
