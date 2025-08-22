// src/notes/CanvasBoard.jsx
import { useEffect, useRef, useState } from "react";
import {
Canvas,
   PencilBrush,
   Circle,
   Polyline,
   Line,
   Triangle,
   Rect,
   Ellipse,
   IText,
   Group
 } from "fabric";
import { FaMousePointer, FaPencilAlt, FaMinus, FaSlash, FaSquareFull, FaCircle, FaFont, FaEraser, FaUndo, FaRedo, FaSearchPlus, FaSearchMinus, FaBezierCurve } from "react-icons/fa";

export default function CanvasBoard({ dark, theme, initialJSON, onChange }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasId = useRef(`trader-canvas-${Math.random().toString(36).slice(2)}`);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState(theme.accent);
  const [fill, setFill] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const pointsRef = useRef([]); // für Points-Tool
  const isPointsActive = tool === "points";

  // Init Canvas
  useEffect(() => {
    const canvas = new Canvas(canvasId.current, {
      backgroundColor: dark ? "#14161a" : "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });
    canvasRef.current = canvas;

    resize();
    window.addEventListener("resize", resize);

    // Keyboard Delete
    const onKey = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const sel = canvas.getActiveObjects();
        sel.forEach((o) => canvas.remove(o));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        pushHistory();
        emitChange();
      }
    };
    window.addEventListener("keydown", onKey);

    // Load initial
    if (initialJSON) {
      canvas.loadFromJSON(initialJSON, () => {
        canvas.renderAll();
        emitChange();
      });
    }

    // Record changes
    canvas.on("object:added", record);
    canvas.on("object:modified", record);
    canvas.on("object:removed", record);

    function record() {
      pushHistoryDebounced();
      emitChange();
    }

    function emitChange() {
      const json = canvas.toJSON();
      let previewPng = null;
      try {
        previewPng = canvas.toDataURL({ format: "png", quality: 0.6 });
      } catch {}
      onChange?.({
        json,
        previewPng,
        hasObjects: canvas.getObjects().length > 0,
      });
    }

    function resize() {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = Math.max(420, Math.round(w * 0.6));
      canvas.setWidth(w);
      canvas.setHeight(h);
      canvas.calcOffset();
      canvas.requestRenderAll();
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme wechseln → Hintergrund neu
  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.setBackgroundColor(dark ? "#14161a" : "#ffffff", () => {
      canvasRef.current.requestRenderAll();
    });
  }, [dark]);

  // Tool-Logik
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

  c.isDrawingMode = tool === "brush";
    c.freeDrawingBrush = new PencilBrush(c);
    c.freeDrawingBrush.color = color;
    c.freeDrawingBrush.width = strokeWidth;

    // Cursor
    if (tool === "select") c.defaultCursor = "default";
    else if (tool === "brush") c.defaultCursor = "crosshair";
    else if (tool === "points") c.defaultCursor = "crosshair";
    else c.defaultCursor = "crosshair";

    // Points-Tool Klicks
    const handleClick = (opt) => {
      if (tool !== "points") return;
      const p = c.getPointer(opt.e);
      // kleiner Marker
      const dot = new Circle({
        left: p.x, top: p.y, radius: 3,
        fill: color, stroke: color, strokeWidth: 1, selectable: false, evented: false
      });
      c.add(dot);
      pointsRef.current.push({ x: p.x, y: p.y, dot });
      c.requestRenderAll();
    };

    c.on("mouse:down", handleClick);
    return () => {
      c.off("mouse:down", handleClick);
    };
  }, [tool, color, strokeWidth]);

  // Wenn Points-Tool deaktiviert → Polyline bauen
  useEffect(() => {
    if (!canvasRef.current) return;
    if (tool === "points") return;
    if (!pointsRef.current.length) return;

    const c = canvasRef.current;
    // vorhandene Marker einsammeln
    const pts = pointsRef.current.map((p) => ({ x: p.x, y: p.y }));
    pointsRef.current.forEach((p) => c.remove(p.dot));
    pointsRef.current = [];

    if (pts.length >= 2) {
      const poly = new Polyline(pts, {
        fill: "rgba(0,0,0,0)",
        stroke: color,
        strokeWidth,
        objectCaching: false,
      });
      c.add(poly);
      c.setActiveObject(poly);
      c.requestRenderAll();
      pushHistory();
      emitChange();
    }

    function emitChange() {
      const json = c.toJSON();
      let previewPng = null;
      try {
        previewPng = c.toDataURL({ format: "png", quality: 0.6 });
      } catch {}
      onChange?.({
        json,
        previewPng,
        hasObjects: c.getObjects().length > 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  function addLine() {
    const c = canvasRef.current;
    const line = new Line([60, 60, 240, 60], {
      stroke: color, strokeWidth, selectable: true
    });
    c.add(line);
    c.setActiveObject(line);
    c.requestRenderAll();
    pushHistory(); emit();
  }
  function addArrow() {
    const c = canvasRef.current;
     const line = new Line([60, 60, 240, 60], {
      stroke: color, strokeWidth
    });
    const tri = new Triangle({
      width: 10 + strokeWidth*2, height: 10 + strokeWidth*2, fill: color,
      left: 240, top: 60, angle: 90
    });
    const g = new Group([line, tri], { selectable: true });
    c.add(g); c.setActiveObject(g); c.requestRenderAll(); pushHistory(); emit();
  }
  function addRect() {
    const c = canvasRef.current;
     const r = new Rect({
      left: 80, top: 80, width: 220, height: 120,
      stroke: color, strokeWidth,
      fill: fill === "transparent" ? "rgba(0,0,0,0)" : fill,
    });
    c.add(r); c.setActiveObject(r); c.requestRenderAll(); pushHistory(); emit();
  }
  function addEllipse() {
    const c = canvasRef.current;
     const el = new Ellipse({
      left: 120, top: 100, rx: 120, ry: 70,
      stroke: color, strokeWidth,
      fill: fill === "transparent" ? "rgba(0,0,0,0)" : fill,
    });
    c.add(el); c.setActiveObject(el); c.requestRenderAll(); pushHistory(); emit();
  }
  function addText() {
    const c = canvasRef.current;
    const t = new IText("Text", {
      left: 100, top: 100, fill: color, fontSize: 20, fontWeight: 700
    });
    c.add(t); c.setActiveObject(t); c.requestRenderAll(); pushHistory(); emit();
  }
  function eraseSelected() {
    const c = canvasRef.current;
    c.getActiveObjects().forEach((o) => c.remove(o));
    c.discardActiveObject();
    c.requestRenderAll();
    pushHistory(); emit();
  }
  function zoomIn() {
    const c = canvasRef.current;
    c.setZoom(c.getZoom() * 1.1); c.requestRenderAll();
  }
  function zoomOut() {
    const c = canvasRef.current;
    c.setZoom(c.getZoom() / 1.1); c.requestRenderAll();
  }

  function emit() {
    const c = canvasRef.current;
    const json = c.toJSON();
    let previewPng = null;
    try { previewPng = c.toDataURL({ format: "png", quality: 0.6 }); } catch {}
    onChange?.({ json, previewPng, hasObjects: c.getObjects().length > 0 });
  }

  // Undo/Redo
  const pushHistory = () => {
    const c = canvasRef.current;
    if (!c) return;
    const snapshot = c.toJSON();
    undoStack.current.push(snapshot);
    redoStack.current = [];
  };
  const pushHistoryDebounced = debounce(pushHistory, 400);

  function undo() {
    const c = canvasRef.current;
    if (!c || !undoStack.current.length) return;
    const cur = c.toJSON();
    const prev = undoStack.current.pop();
    redoStack.current.push(cur);
    c.loadFromJSON(prev, () => { c.renderAll(); emit(); });
  }
  function redo() {
    const c = canvasRef.current;
    if (!c || !redoStack.current.length) return;
    const cur = c.toJSON();
    const next = redoStack.current.pop();
    undoStack.current.push(cur);
    c.loadFromJSON(next, () => { c.renderAll(); emit(); });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "48px 1fr" }}>
      {/* Toolbar */}
      <div style={{
        borderRight: `1px solid ${theme.border}`,
        background: theme.card, display: "flex", flexDirection: "column", gap: 8, padding: 6
      }}>
        <ToolButton active={tool==="select"} onClick={()=>setTool("select")} title="Select"><FaMousePointer/></ToolButton>
        <ToolButton active={tool==="brush"} onClick={()=>setTool("brush")} title="Brush"><FaPencilAlt/></ToolButton>
        <ToolButton onClick={addLine} title="Line"><FaMinus/></ToolButton>
        <ToolButton onClick={addArrow} title="Arrow"><FaSlash/></ToolButton>
        <ToolButton onClick={addRect} title="Rectangle"><FaSquareFull/></ToolButton>
        <ToolButton onClick={addEllipse} title="Ellipse"><FaCircle/></ToolButton>
        <ToolButton onClick={addText} title="Text"><FaFont/></ToolButton>
        <ToolButton active={tool==="points"} onClick={()=>setTool(tool==="points"?"select":"points")} title="Points → Polyline"><FaBezierCurve/></ToolButton>

        <div style={{ height: 8 }} />
        <ToolButton onClick={eraseSelected} title="Delete"><FaEraser/></ToolButton>
        <ToolButton onClick={undo} title="Undo"><FaUndo/></ToolButton>
        <ToolButton onClick={redo} title="Redo"><FaRedo/></ToolButton>
        <ToolButton onClick={zoomIn} title="Zoom In"><FaSearchPlus/></ToolButton>
        <ToolButton onClick={zoomOut} title="Zoom Out"><FaSearchMinus/></ToolButton>

        {/* Color/Width */}
        <div style={{ marginTop: 6 }}>
          <input
            type="color"
            value={color}
            onChange={(e)=>setColor(e.target.value)}
            title="Stroke Color"
            style={{ width: "100%", height: 28, border: "none", background: "transparent" }}
          />
        </div>
        <div style={{ padding: "2px 4px", color: theme.sub, fontSize: 11, fontWeight: 800 }}>W</div>
        <input
          type="range" min={1} max={12} value={strokeWidth}
          onChange={(e)=>setStrokeWidth(parseInt(e.target.value))}
          style={{ writingMode: "horizontal-tb", width: "100%" }}
        />
        <div style={{ padding: "2px 4px", color: theme.sub, fontSize: 11, fontWeight: 800 }}>Fill</div>
        <input
          type="color"
          value={fill==="transparent" ? "#000000" : fill}
          onChange={(e)=>setFill(e.target.value)}
          disabled={tool==="brush"}
          style={{ width: "100%", height: 28, border: "none", background: "transparent" }}
          title="Fill (Objekte)"
        />
        <button
          onClick={()=>setFill("transparent")}
          style={{
            marginTop: 6, fontSize: 11, fontWeight: 800,
            border: `1px solid ${theme.border}`, color: theme.text,
            background: theme.card, borderRadius: 8, padding: "4px 6px"
          }}
          title="Kein Fill"
        >
          none
        </button>
      </div>

      {/* Canvas */}
      <div ref={wrapRef} style={{ minHeight: 420, position: "relative" }}>
       <canvas id={canvasId.current} />
      </div>

      {/* Mobile stack */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 48px 1fr"]{ grid-template-columns: 1fr !important; }
          div[style*="border-right"]{ border-right: none !important; border-bottom: 1px solid ${theme.border}; flex-direction: row !important; overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}

function ToolButton({ active, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36,
        borderRadius: 8,
        border: `1px solid ${active ? "transparent" : "rgba(0,0,0,0)"}`,
        background: active ? "rgba(44,96,250,.18)" : "transparent",
        color: "inherit"
      }}
    >
      {children}
    </button>
  );
}

// kleines debounce ohne Abhängigkeit
function debounce(fn, ms=300){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}
