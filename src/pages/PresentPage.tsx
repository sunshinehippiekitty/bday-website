import { useRef, useEffect, useState } from "react";
import "../style.css";

function PresentPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const pickerCanvasRef = useRef<HTMLCanvasElement>(null);
  const isPickingRef = useRef(false);
  const [selectedColor, setSelectedColor] = useState("black");

  const [isErasing, setIsErasing] = useState(false);
  const ERASER_SIZE = 20;

  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const logicalSizeRef = useRef({ width: 0, height: 0 }); // fixed drawing-space size, set once

  // Pinch-to-zoom tracking
  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    logicalSizeRef.current = { width: window.innerWidth, height: window.innerHeight };

    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`; // fixed: was innerWidth

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(2, 2);
    context.lineCap = "round";
    context.strokeStyle = selectedColor;
    context.lineWidth = 5;
    contextRef.current = context;
  }, []);

  // Resize the on-screen canvas display when zoom changes.
  // The backing pixel buffer stays fixed, so drawing quality doesn't change —
  // only how big the canvas appears. Pointer coords are divided by `zoom`
  // wherever they're read, so drawing still lines up under the cursor/finger.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = logicalSizeRef.current;
    if (!width || !height) return;
    canvas.style.width = `${width * zoom}px`;
    canvas.style.height = `${height * zoom}px`;
  }, [zoom]);

  // Keep the pen color in sync with whatever's picked
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = selectedColor;
    }
  }, [selectedColor]);

  // ---- Shared drawing logic (used by both mouse and touch) ----
  const beginStroke = (x: number, y: number) => {
    if (!contextRef.current) return;
    const context = contextRef.current;
    if (isErasing) {
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(x, y, ERASER_SIZE / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      context.beginPath();
      context.moveTo(x, y);
    }
    setIsDrawing(true);
  };

  const continueStroke = (x: number, y: number) => {
    if (!isDrawing || !contextRef.current) return;
    const context = contextRef.current;
    if (isErasing) {
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(x, y, ERASER_SIZE / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      context.lineTo(x, y);
      context.stroke();
    }
  };

  const endStroke = () => {
    setIsDrawing(false);
  };

  const toggleEraser = () => {
    setIsErasing((prev) => !prev);
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)));
  const resetZoom = () => setZoom(1);

  // ---- Mouse handlers ----
  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    beginStroke(nativeEvent.offsetX / zoom, nativeEvent.offsetY / zoom);
  };

  const finishDrawing = () => {
    endStroke();
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    continueStroke(nativeEvent.offsetX / zoom, nativeEvent.offsetY / zoom);
  };

  // ---- Touch handlers ----
  const getTouchDistance = (a: React.Touch, b: React.Touch) => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] ?? e.changedTouches[0];
    return {
      x: (touch.clientX - rect.left) / zoom,
      y: (touch.clientY - rect.top) / zoom,
    };
  };

  const startTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Two fingers down: begin a pinch-zoom gesture instead of drawing.
      // If a stroke was already in progress from a single finger, stop it.
      if (isDrawing) endStroke();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      pinchRef.current = { startDistance: dist, startZoom: zoom };
      return;
    }
    const { x, y } = getTouchPos(e);
    beginStroke(x, y);
  };

  const touchDraw = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const scaleFactor = dist / pinchRef.current.startDistance;
      const nextZoom = pinchRef.current.startZoom * scaleFactor;
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +nextZoom.toFixed(2))));
      return;
    }
    const { x, y } = getTouchPos(e);
    continueStroke(x, y);
  };

  const finishTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length < 2) {
      pinchRef.current = null;
    }
    endStroke();
  };

  // ---- Color picker canvas ----
  useEffect(() => {
    const canvas = pickerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buildColorPalette = () => {
      let gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "rgb(255,   0,   0)");
      gradient.addColorStop(0.15, "rgb(255,   0, 255)");
      gradient.addColorStop(0.33, "rgb(0,     0, 255)");
      gradient.addColorStop(0.49, "rgb(0,   255, 255)");
      gradient.addColorStop(0.67, "rgb(0,   255,   0)");
      gradient.addColorStop(0.84, "rgb(255, 255,   0)");
      gradient.addColorStop(1, "rgb(255,   0,   0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.5, "rgba(0,     0,   0, 0)");
      gradient.addColorStop(1, "rgba(0,     0,   0, 1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const getColorAt = (x: number, y: number) => {
      const imageData = ctx.getImageData(x, y, 1, 1);
      const [r, g, b] = imageData.data;
      setSelectedColor(`rgb(${r}, ${g}, ${b})`);
    };

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // Mouse support for the picker
    const handleMouseDown = (e: MouseEvent) => {
      isPickingRef.current = true;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      getColorAt(x, y);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPickingRef.current) return;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      getColorAt(x, y);
    };
    const handleMouseUp = () => {
      isPickingRef.current = false;
    };

    // Touch support for the picker
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      isPickingRef.current = true;
      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
      getColorAt(x, y);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPickingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
      getColorAt(x, y);
    };
    const handleTouchEnd = () => {
      isPickingRef.current = false;
    };

    buildColorPalette();

    canvas.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <main className="gifts fade-in">
      <div style={{ position: "absolute", inset: 0, overflow: "auto" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseMove={draw}
          onTouchStart={startTouchDrawing}
          onTouchMove={touchDraw}
          onTouchEnd={finishTouchDrawing}
          style={{ touchAction: "none", display: "block" }}
        />
      </div>

      <div className="gifts__content" style={{ position: "absolute", top: 16, right: 16 }}>
        <canvas
          ref={pickerCanvasRef}
          className="color-palette"
          width={284}
          height={155}
          style={{ touchAction: "none" }}
        />
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              display: "inline-block",
              width: 16,
              height: 16,
              backgroundColor: selectedColor,
              border: "1px solid #ccc",
              verticalAlign: "middle",
              marginRight: 8,
            }}
          />
          {selectedColor}
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button onClick={toggleEraser}>
            {isErasing ? "Switch to Drawing" : "Switch to Eraser"}
          </button>
          <button onClick={resetCanvas}>Reset</button>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={zoomOut}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn}>+</button>
          <button onClick={resetZoom}>Reset Zoom</button>
        </div>
      </div>
    </main>
  );
}

export default PresentPage;