import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundMusic from "../components/BackgroundMusic.tsx";
import "../style.css";

//add in the photo

const FOLK_TRACK =
  import.meta.env.BASE_URL + "folk_acoustic-rain-in-the-forest-130822.mp3";

const sentences = [
  'You have seen our memories,',
  'and you have seen me through Kpop',
  'and the times when i want to take photobooth pictures',
  '(now i spend the money on other things haha).',
  'So i wanted this activity to be a combination of both!',
  'I drew a picture of us',
  'and then you are gonna decorate it like decorating photos!',
  'Have funn!!'
]

function PresentPage() {
  const navigate = useNavigate();

  // Intro sentences play first, then the drawing canvas is revealed.
  const [phase, setPhase] = useState<"intro" | "draw">("intro");
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef<number | undefined>(undefined);
  const isLastSentence = index === sentences.length - 1;

  // Confirm popup shown when leaving the drawing screen.
  const [showLeavePopup, setShowLeavePopup] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
 
  const pickerCanvasRef = useRef<HTMLCanvasElement>(null);
  const isPickingRef = useRef(false);
  const [selectedColor, setSelectedColor] = useState("black");
 
  const [isErasing, setIsErasing] = useState(false);
  const isErasingRef = useRef(false);
  const ERASER_SIZE = 20;
 
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const logicalSizeRef = useRef({ width: 0, height: 0 }); // fixed drawing-space size, set once
 
  // Pinch-to-zoom tracking
  const pinchRef = useRef<{
    startDistance: number;
    startZoom: number;
    logicalX: number; // point of the drawing under the fingers when the pinch began
    logicalY: number;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
 
  // Manual pan offset (canvas's left/top within the container), since native
  // scroll can't go negative and pins shrunk content to the top-left corner —
  // that broke centering whenever zoom < 1.
  const panRef = useRef({ x: 0, y: 0 });
 
  // Mouse pan: holding both left + right buttons down and dragging moves
  // (pans) the drawing in any direction, without changing the zoom.
  const mousePinchRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
 
  // Keep refs in sync with state so native (non-React) listeners always see current values
  useEffect(() => {
    isErasingRef.current = isErasing;
  }, [isErasing]);
 
  // Initial canvas setup (runs once the drawing phase mounts the canvas)
  useEffect(() => {
    if (phase !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
 
    logicalSizeRef.current = { width: window.innerWidth, height: window.innerHeight };
 
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    panRef.current = { x: 0, y: 0 };
 
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(2, 2);
    context.lineCap = "round";
    context.strokeStyle = selectedColor;
    context.lineWidth = 5;
    contextRef.current = context;
  }, [phase]);
 
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
    if (isErasingRef.current) {
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
    isDrawingRef.current = true;
  };
 
  const continueStroke = (x: number, y: number) => {
    if (!isDrawingRef.current || !contextRef.current) return;
    const context = contextRef.current;
    if (isErasingRef.current) {
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
    isDrawingRef.current = false;
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
 
  // ---- Zoom helpers ----
  // Zoom/pan are applied straight to the canvas (synchronously) and kept in refs,
  // so rapid pinch events never read stale values. React state is only used
  // for the "100%" label.
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
 
  const applyView = (nextZoom: number, panX: number, panY: number) => {
    const canvas = canvasRef.current;
    const { width, height } = logicalSizeRef.current;
    if (!canvas || !width || !height) return;
    zoomRef.current = nextZoom;
    panRef.current = { x: panX, y: panY };
    canvas.style.width = `${width * nextZoom}px`;
    canvas.style.height = `${height * nextZoom}px`;
    canvas.style.left = `${panX}px`;
    canvas.style.top = `${panY}px`;
    setZoom(nextZoom);
  };
 
  // Zoom to `nextZoom` while keeping whatever is under (clientX, clientY) fixed on screen
  const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const z = clampZoom(nextZoom);
    const logicalX = (clientX - rect.left - panRef.current.x) / zoomRef.current;
    const logicalY = (clientY - rect.top - panRef.current.y) / zoomRef.current;
    applyView(z, clientX - rect.left - logicalX * z, clientY - rect.top - logicalY * z);
  };
 
  const zoomAtCenter = (nextZoom: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextZoom);
  };
 
  const zoomIn = () => zoomAtCenter(zoomRef.current + 0.25);
  const zoomOut = () => zoomAtCenter(zoomRef.current - 0.25);
  const resetZoom = () => zoomAtCenter(1);
 
  // ---- Mouse handlers ----
  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    // buttons: 1 = left, 2 = right, 3 = both held together
    if (nativeEvent.buttons === 3) {
      mousePinchRef.current = {
        startClientX: nativeEvent.clientX,
        startClientY: nativeEvent.clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      };
      return;
    }
    if (nativeEvent.button !== 0) return; // only left-click draws normally
    beginStroke(nativeEvent.offsetX / zoomRef.current, nativeEvent.offsetY / zoomRef.current);
  };
 
  const finishDrawing = () => {
    mousePinchRef.current = null;
    endStroke();
  };
 
  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (mousePinchRef.current) {
      if (nativeEvent.buttons !== 3) {
        // one of the buttons was released outside a mouseup event
        mousePinchRef.current = null;
        return;
      }
      // drag left -> drawing moves left, drag up -> drawing moves up, etc.
      const m = mousePinchRef.current;
      applyView(
        zoomRef.current,
        m.startPanX + (nativeEvent.clientX - m.startClientX),
        m.startPanY + (nativeEvent.clientY - m.startClientY)
      );
      return;
    }
    if (nativeEvent.buttons !== 1) return; // only left-button drag draws
    continueStroke(nativeEvent.offsetX / zoomRef.current, nativeEvent.offsetY / zoomRef.current);
  };
 
  // ---- Touch + wheel handlers: attached natively with { passive: false } so
  // preventDefault() reliably blocks the browser's own pinch-zoom/scroll.
  // They live on the container (not the canvas) so a pinch still works when
  // the canvas is zoomed out and smaller than the screen. ----
  useEffect(() => {
    if (phase !== "draw") return;
    const canvas = canvasRef.current;
    const container = scrollContainerRef.current;
    if (!canvas || !container) return;
 
    const getTouchDistance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
 
    const getTouchPos = (touch: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (touch.clientX - rect.left) / zoomRef.current,
        y: (touch.clientY - rect.top) / zoomRef.current,
      };
    };
 
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        if (isDrawingRef.current) endStroke();
        const a = e.touches[0];
        const b = e.touches[1];
        const rect = container.getBoundingClientRect();
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        // Remember which point of the drawing is under the fingers right now.
        // Every move keeps THAT point under the fingers -> no jumping to a corner.
        pinchRef.current = {
          startDistance: getTouchDistance(a, b) || 1,
          startZoom: zoomRef.current,
          logicalX: (midX - rect.left - panRef.current.x) / zoomRef.current,
          logicalY: (midY - rect.top - panRef.current.y) / zoomRef.current,
        };
        return;
      }
      if (e.touches.length === 1 && !pinchRef.current) {
        const { x, y } = getTouchPos(e.touches[0]);
        beginStroke(x, y);
      }
    };
 
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && pinchRef.current) {
        const p = pinchRef.current;
        const a = e.touches[0];
        const b = e.touches[1];
        const nextZoom = clampZoom((p.startZoom * getTouchDistance(a, b)) / p.startDistance);
        const rect = container.getBoundingClientRect();
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        // Also lets you pan with two fingers while pinching
        applyView(nextZoom, midX - rect.left - p.logicalX * nextZoom, midY - rect.top - p.logicalY * nextZoom);
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;
      const { x, y } = getTouchPos(touch);
      continueStroke(x, y);
    };
 
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length < 2) {
        pinchRef.current = null;
      }
      endStroke();
    };
 
    // Wheel:
    //  - ANY plain wheel scroll = zoom (scroll up = in, scroll down = out),
    //    centered on the cursor. No guessing what device it came from.
    //  - Shift + wheel = move the page sideways, Alt + wheel = move it up/down
    //    (holding either while two-finger sliding a trackpad moves it freely)
    //  - Trackpad pinch (wheel event with ctrlKey) / Ctrl+wheel = zoom too
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
 
      // normalise: line-based wheels (Firefox) report ~3 per notch, pixel ones ~100
      const unit = e.deltaMode === 1 ? 33 : 1;
 
      if (e.shiftKey || e.altKey) {
        // Shift+wheel = sideways (browsers report it as deltaX), Alt+wheel = up/down.
        // A trackpad two-finger slide with Shift/Alt held moves freely in both directions.
        const dx = e.deltaX * unit;
        const dy = e.deltaY * unit;
        if (e.altKey && !e.shiftKey) {
          applyView(zoomRef.current, panRef.current.x - dx, panRef.current.y - (dy || dx));
        } else {
          applyView(zoomRef.current, panRef.current.x - (dx || dy), panRef.current.y - (dx ? dy : 0));
        }
        return;
      }
 
      const raw = e.ctrlKey ? e.deltaY * unit * 2.5 : e.deltaY * unit; // pinch deltas are tiny
      const d = Math.max(-100, Math.min(100, raw));
      if (d === 0) return;
      zoomAt(e.clientX, e.clientY, zoomRef.current * Math.exp(-d * 0.002));
    };
 
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: false });
    container.addEventListener("wheel", handleWheel, { passive: false });
 
    // iOS Safari fires its own proprietary pinch gesture events and zooms the
    // whole page through them regardless of touchmove's preventDefault().
    const preventGestureDefault = (e: Event) => e.preventDefault();
    container.addEventListener("gesturestart", preventGestureDefault, { passive: false });
    container.addEventListener("gesturechange", preventGestureDefault, { passive: false });
    container.addEventListener("gestureend", preventGestureDefault, { passive: false });
 
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("gesturestart", preventGestureDefault);
      container.removeEventListener("gesturechange", preventGestureDefault);
      container.removeEventListener("gestureend", preventGestureDefault);
    };
  }, [phase]);
 
  // ---- Color picker canvas ----
  useEffect(() => {
    if (phase !== "draw") return;
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
  }, [phase]);
 
  // ---- Intro sentence reveal (envelope-style) ----
  useEffect(() => {
    if (phase !== "intro") return;
    setVisible(true);
    setShowHint(false);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setShowHint(true), 2000);
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, [index, phase]);
 
  // ---- Warn on refresh/close so the user knows the page will relock. ----
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
 
  const goToNextSentence = () => {
    if (isLastSentence) return;
    setVisible(false);
    setShowHint(false);
    window.setTimeout(() => setIndex((i) => i + 1), 500);
  };
 
  // ---- Intro phase: sentences one at a time before the drawing canvas ----
  if (phase === "intro") {
    return (
      <main
        className="letter fade-in"
        onClick={!isLastSentence ? goToNextSentence : undefined}
      >
        <BackgroundMusic track={FOLK_TRACK} />
 
        <button
          type="button"
          className="btn letter__back"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/gifts");
          }}
        >
          Back
        </button>
 
        <div className="letter__stage">
          <p className={`letter__sentence${visible ? " is-visible" : ""}`}>
            {sentences[index]}
          </p>
 
          {isLastSentence ? (
            <button
              type="button"
              className={`btn letter__finish${visible ? " is-visible" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setPhase("draw");
              }}
            >
              Start decorating!
            </button>
          ) : (
            <span className={`letter__hint${showHint ? " is-visible" : ""}`}>
              Click anywhere to continue <br /> (Go slow, no back button to go back to previous sentence)
            </span>
          )}
        </div>
      </main>
    );
  }
 
  return (
    <main className="gifts fade-in" style={{ touchAction: "none" }}>
      <BackgroundMusic track={FOLK_TRACK} toggleClassName="music-toggle--bottom-left" />
 
      <div
        ref={scrollContainerRef}
        style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseMove={draw}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none", display: "block" }}
        />
      </div>
 
      <div className="gifts__content present-tools" style={{ position: "absolute", top: 16, right: 16 }}>
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
          <button onClick={toggleEraser} className="btn drawing-button">
            {isErasing ? "Switch to Drawing" : "Switch to Eraser"}
          </button>
          <button onClick={resetCanvas} className="btn drawing-button">Reset</button>
        </div>
 
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={zoomOut} className="btn drawing-button">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="btn drawing-button">+</button>
          <button onClick={resetZoom} className="btn drawing-button">Reset Zoom</button>
        </div>
      </div>

      <button
        type="button"
        className="btn letter__back"
        onClick={() => setShowLeavePopup(true)}
      >
        Back
      </button>

      {showLeavePopup && (
        <div className="modal-overlay" onClick={() => setShowLeavePopup(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">
              Your drawing won't be autosaved. Are you sure you want to leave?
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                className="btn"
                onClick={() => setShowLeavePopup(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn" onClick={() => navigate("/gifts")}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
 
export default PresentPage;