// --- CustomSelectRounded.jsx (kann auch im selben File oben stehen) ---
import React, {useEffect, useRef, useState} from "react";
import { FiChevronDown } from "react-icons/fi";
export function CustomSelectRounded({ theme, value, options, onChange, width=undefined }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(() => options.findIndex(o => o === value));
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHover(h => (h + 1) % options.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHover(h => (h - 1 + options.length) % options.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (options[hover]) {
          onChange(options[hover]);
          setOpen(false);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hover, options, onChange]);

  useEffect(() => {
    const i = options.findIndex(o => o === value);
    setHover(i >= 0 ? i : 0);
  }, [value, options]);

  return (
    <div ref={ref} style={{ position: "relative", width }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          background: theme.input,
          color: theme.text,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: 12,
          padding: "7px 32px 7px 10px", // Weniger hoch
          fontSize: 16,                 // Etwas kleinerer Text
          outline: "none",
          cursor: "pointer",
          minHeight: 45                  // Kompakter
        }}
      >
        {value}
        <FiChevronDown
          size={16} // kleinerer Chevron
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: theme.sub,
            pointerEvents: "none"
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: theme.panel,
            color: theme.text,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: theme.shadow,
            zIndex: 50,
            fontSize: 13 // kleinerer Text im Dropdown
          }}
        >
          {options.map((opt, i) => {
            const active = opt === value;
            const hovered = i === hover;
            return (
              <div
                key={opt}
                onMouseEnter={() => setHover(i)}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  padding: "8px 10px", // Weniger Padding
                  cursor: "pointer",
                  background: hovered ? theme.input : "transparent",
                  fontWeight: active ? 700 : 500
                }}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
