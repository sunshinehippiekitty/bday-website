import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundMusic from "../components/BackgroundMusic.tsx";
// TEMP placeholder for the final gifts photo. Replace this import with your own
// image once you add it, e.g. `import giftsImg from "../assets/gifts.jpeg";`
import giftsImg from "../assets/present.jpeg";
import undoIcon from "../assets/undo.png";
import redoIcon from "../assets/redo.png";
import menuIcon from "../assets/menu.png";
// The line drawing the user decorates. Drawing is constrained to this picture.
import canvasBgImg from "../assets/drawing-to-decorate.jpeg";
import "../style.css";

const FOLK_TRACK =
  import.meta.env.BASE_URL + "folk_acoustic-rain-in-the-forest-130822.mp3";

// Fires a burst of confetti pieces from the top of the screen.
function popConfetti() {
  const colors = ["#ff8fb1", "#ffd6e5", "#c13d6e", "#b9e1ff", "#c5fff6", "#de89fa"];
  const count = 80;
  const container = document.createElement("div");
  container.className = "confetti-container";
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
  }

  // Clean up after the animation finishes.
  window.setTimeout(() => container.remove(), 4500);
}

const sentences = [
  'You have seen our memories,',
  'and you have seen me through Kpop',
  'and the times when i want to take photobooth pictures',
  '(now i spend the money on other things haha).',
  'So i wanted this activity to be a combination of both!',
  'I drew a picture of us',
  'and then you are gonna decorate it in the empty spaces',
  'or you can also colour in my drawing!',
  'Have funn!!'
]

function PresentPage() {
  const navigate = useNavigate();

  // Once a drawing is saved we persist it (and the screen we're on) so that a
  // reload on the redeem/final pages restores everything instead of resetting.
  const storedDrawing =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("present:drawing")
      : null;
  const storedPhase =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("present:phase")
      : null;

  // Intro sentences play first, then the drawing canvas is revealed, then the
  // "redeem" preview screen, then the final gifts screen. On reload we restore
  // whichever of draw/redeem/final we were on (so a refresh on the drawing
  // screen comes back to the drawing, not the intro).
  const [phase, setPhase] = useState<"intro" | "draw" | "redeem" | "final">(
    storedPhase === "draw" || storedPhase === "redeem" || storedPhase === "final"
      ? (storedPhase as "draw" | "redeem" | "final")
      : "intro"
  );

  // True once the user has actually drawn a stroke, so the Save button shows.
  const [hasDrawn, setHasDrawn] = useState(false);

  // Strokes only (transparent bg) — used to keep editing when going back.
  const [savedDrawing, setSavedDrawing] = useState<string | null>(storedDrawing);

  // The picture + strokes flattened together — shown on the redeem screen and
  // downloaded. Persisted so a reload restores the preview.
  const storedComposite =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("present:composite")
      : null;
  const [savedComposite, setSavedComposite] = useState<string | null>(storedComposite);
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
  // Last pointer position in a stroke, used to smooth the line with quadratic
  // curves (midpoint smoothing) instead of hard straight segments.
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  // The decorated line drawing, loaded once so we can paint it under the user's
  // strokes when saving.
  const bgImageRef = useRef<HTMLImageElement | null>(null);
 
  const pickerCanvasRef = useRef<HTMLCanvasElement>(null);
  const isPickingRef = useRef(false);
  const [selectedColor, setSelectedColor] = useState("black");

  // Live preview of the color under the cursor/finger on the palette.
  const [hoverColor, setHoverColor] = useState<string | null>(null);

  // Read the palette color at a screen position and update the preview bar.
  // Used by React hover handlers on the palette (reliable on desktop).
  const previewPaletteAt = (clientX: number, clientY: number) => {
    const canvas = pickerCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width - 1, (clientX - rect.left) * (canvas.width / rect.width)));
    const y = Math.max(0, Math.min(canvas.height - 1, (clientY - rect.top) * (canvas.height / rect.height)));
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    setHoverColor(`rgb(${r}, ${g}, ${b})`);
  };
 
  const [isErasing, setIsErasing] = useState(false);
  const isErasingRef = useRef(false);

  // Adjustable pen + eraser sizes. Refs mirror the state so the native touch
  // handlers (which close over the effect) always read the current values.
  const [penSize, setPenSize] = useState(5);
  const penSizeRef = useRef(5);
  const [eraserSize, setEraserSize] = useState(20);
  const eraserSizeRef = useRef(20);

  // Whether the tools panel is expanded (collapsed by default behind the menu).
  const [menuOpen, setMenuOpen] = useState(false);
 
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;
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
 
  // ---- Undo / redo history ----
  // Each entry is a full-resolution snapshot of the canvas. We snapshot the
  // canvas right before a stroke changes it (the "before" state), so undo can
  // put that back. Redo replays states that were undone.
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryButtons = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  // Save the current canvas pixels so a following stroke can be undone.
  const pushUndoSnapshot = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    undoStackRef.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    // A fresh action invalidates any redo history.
    redoStackRef.current = [];
    syncHistoryButtons();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || undoStackRef.current.length === 0) return;
    // Current state goes onto the redo stack, previous state is restored.
    redoStackRef.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    const previous = undoStackRef.current.pop()!;
    context.putImageData(previous, 0, 0);
    setHasDrawn(undoStackRef.current.length > 0 || !isBlank(previous));
    syncHistoryButtons();
  };

  const redo = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || redoStackRef.current.length === 0) return;
    undoStackRef.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    const next = redoStackRef.current.pop()!;
    context.putImageData(next, 0, 0);
    setHasDrawn(true);
    syncHistoryButtons();
  };

  // Cheap check for a fully transparent snapshot (used to hide Save after undo).
  const isBlank = (data: ImageData) => {
    const px = data.data;
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] !== 0) return false;
    }
    return true;
  };

  // Keep refs in sync with state so native (non-React) listeners always see current values
  useEffect(() => {
    isErasingRef.current = isErasing;
  }, [isErasing]);

  // Pen size drives the stroke width; eraser size only affects erasing.
  useEffect(() => {
    penSizeRef.current = penSize;
    if (contextRef.current) contextRef.current.lineWidth = penSize;
  }, [penSize]);

  useEffect(() => {
    eraserSizeRef.current = eraserSize;
  }, [eraserSize]);
 
  // Initial canvas setup (runs once the drawing phase mounts the canvas).
  // The canvas is sized and positioned to exactly cover the reference picture,
  // so the user can only draw within that image. The picture itself is shown as
  // the canvas background; strokes land on the transparent canvas above it.
  useEffect(() => {
    if (phase !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bg = new Image();
    bg.onload = () => {
      bgImageRef.current = bg;

      // Fit the picture inside the viewport, leaving a margin so the tools panel
      // and buttons don't overlap it.
      const marginX = 32;
      const marginY = 32;
      const availW = window.innerWidth - marginX * 2;
      const availH = window.innerHeight - marginY * 2;
      const scale = Math.min(availW / bg.width, availH / bg.height);
      const boxW = Math.round(bg.width * scale);
      const boxH = Math.round(bg.height * scale);

      logicalSizeRef.current = { width: boxW, height: boxH };

      // Backing store at 2x for crisp strokes.
      canvas.width = boxW * 2;
      canvas.height = boxH * 2;
      canvas.style.position = "absolute";
      canvas.style.width = `${boxW}px`;
      canvas.style.height = `${boxH}px`;

      // Show the picture behind the (transparent) drawing surface.
      canvas.style.backgroundImage = `url(${canvasBgImg})`;
      canvas.style.backgroundSize = "100% 100%";
      canvas.style.backgroundRepeat = "no-repeat";

      // Center the picture in the container.
      const container = scrollContainerRef.current;
      const cw = container?.clientWidth ?? window.innerWidth;
      const ch = container?.clientHeight ?? window.innerHeight;

      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(2, 2);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.imageSmoothingEnabled = true;
      context.strokeStyle = selectedColor;
      context.lineWidth = penSizeRef.current;
      contextRef.current = context;

      // Reset zoom to 100% and center via the pan offset.
      zoomRef.current = 1;
      setZoom(1);
      applyView(1, (cw - boxW) / 2, (ch - boxH) / 2);

      // Fresh canvas -> start with empty history.
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryButtons();

      // Restore prior strokes: prefer the in-progress draft (survives a reload
      // on the drawing screen), otherwise the last saved drawing (used when
      // coming back from the redeem screen). Both are strokes only, sized to the
      // logical box.
      const draft = sessionStorage.getItem("present:draft");
      const toRestore = draft ?? savedDrawing;
      if (toRestore) {
        const img = new Image();
        img.onload = () => {
          context.drawImage(img, 0, 0, boxW, boxH);
        };
        img.src = toRestore;
        setHasDrawn(true);
      }
    };
    bg.src = canvasBgImg;
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
    // Snapshot the canvas before this stroke changes it, so it can be undone.
    pushUndoSnapshot();
    if (isErasingRef.current) {
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(x, y, eraserSizeRef.current / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      context.beginPath();
      context.moveTo(x, y);
      // Start smoothing from this point.
      lastPointRef.current = { x, y };
      // A pen stroke started -> there's now something on the canvas, reveal Save.
      setHasDrawn(true);
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
      context.arc(x, y, eraserSizeRef.current / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      // Midpoint smoothing: curve from the last midpoint through the previous
      // raw point (used as the control) to the new midpoint. This rounds the
      // line so quick mouse movements don't create hard, sharp corners. Each
      // segment is its own sub-path so repeated strokes don't over-darken.
      const last = lastPointRef.current ?? { x, y };
      const midX = (last.x + x) / 2;
      const midY = (last.y + y) / 2;
      context.quadraticCurveTo(last.x, last.y, midX, midY);
      context.stroke();
      context.beginPath();
      context.moveTo(midX, midY);
      lastPointRef.current = { x, y };
    }
  };
 
  const endStroke = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    // Persist the in-progress drawing so a reload on the drawing screen restores
    // it (not just the last saved version).
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        sessionStorage.setItem("present:draft", canvas.toDataURL("image/png"));
      } catch {
        // Ignore quota / serialization errors — persistence is best-effort.
      }
    }
  };
 
  const toggleEraser = () => {
    setIsErasing((prev) => !prev);
  };
 
  const resetCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    // Let Reset be undone: snapshot the current pixels first.
    pushUndoSnapshot();
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    sessionStorage.removeItem("present:draft");
  };

  // Leave the drawing screen back to the gifts page. The drawing itself is kept
  // (draft persists), but we reset the stored screen to the intro so coming back
  // replays the messages. A "Go to drawing" button then jumps straight back in.
  const leaveToGifts = () => {
    sessionStorage.setItem("present:phase", "intro");
    navigate("/gifts");
  };

  // Reset the whole experience: clear the saved drawing and the visited flags so
  // the Present relocks (gifts must be reopened), then go back to the home page.
  const resetEverything = () => {
    sessionStorage.removeItem("present:drawing");
    sessionStorage.removeItem("present:draft");
    sessionStorage.removeItem("present:composite");
    sessionStorage.removeItem("present:phase");
    sessionStorage.removeItem("visited:camera");
    sessionStorage.removeItem("visited:envelope");
    navigate("/");
  };

  // Snapshot the canvas and move to the redeem preview screen. We keep two
  // images: the strokes alone (to keep editing on "Go back") and a flattened
  // picture+strokes composite (shown on the redeem screen and downloaded).
  const handleSave = () => {
    const canvas = canvasRef.current;
    const bg = bgImageRef.current;
    if (!canvas) return;

    // Strokes only, at the logical box size, for re-editing later.
    const strokes = canvas.toDataURL("image/png");

    // Flatten the picture under the strokes onto a white background.
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    let composite = strokes;
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, out.width, out.height);
      if (bg) ctx.drawImage(bg, 0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0);
      composite = out.toDataURL("image/png");
    }

    setSavedDrawing(strokes);
    setSavedComposite(composite);
    sessionStorage.setItem("present:drawing", strokes);
    sessionStorage.setItem("present:draft", strokes);
    sessionStorage.setItem("present:composite", composite);
    sessionStorage.setItem("present:phase", "redeem");
    setPhase("redeem");
  };

  // Download the flattened picture+strokes PNG, then move to the final screen.
  const downloadDrawing = () => {
    if (!savedComposite) return;
    const link = document.createElement("a");
    link.href = savedComposite;
    link.download = "our-drawing.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setPhase("final");
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
 
    // Read the palette color at a canvas pixel (returns "rgb(...)").
    const readColor = (x: number, y: number) => {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      return `rgb(${r}, ${g}, ${b})`;
    };

    const getColorAt = (x: number, y: number) => {
      setSelectedColor(readColor(x, y));
    };

    // Update the preview swatch to the color under the cursor/finger.
    const updateHover = (clientX: number, clientY: number) => {
      const { x, y } = getCanvasCoords(clientX, clientY);
      setHoverColor(readColor(x, y));
    };
 
    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      // Map from the displayed (CSS) size to the canvas's internal pixel size,
      // so the picked color matches where you actually clicked even when the
      // palette is displayed at a different size (mobile width / panel scale).
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      // Clamp so a click on the very edge still reads a valid pixel.
      return {
        x: Math.max(0, Math.min(canvas.width - 1, x)),
        y: Math.max(0, Math.min(canvas.height - 1, y)),
      };
    };
 
    const handleMouseDown = (e: MouseEvent) => {
      isPickingRef.current = true;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      getColorAt(x, y);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isPickingRef.current) {
        const { x, y } = getCanvasCoords(e.clientX, e.clientY);
        getColorAt(x, y);
      }
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
      updateHover(touch.clientX, touch.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPickingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
      getColorAt(x, y);
      updateHover(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => {
      isPickingRef.current = false;
      setHoverColor(null);
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
    // Re-run when the panel opens, since the picker canvas mounts only then.
  }, [phase, menuOpen]);
 
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
 
  // ---- Warn on refresh/close only while drawing (before the drawing is saved),
  // since that work isn't persisted. Once saved, reloading is fine. ----
  useEffect(() => {
    if (phase !== "draw") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase]);
 
  // Pop confetti when the final gifts screen appears.
  useEffect(() => {
    if (phase === "final") popConfetti();
  }, [phase]);

  // Persist the current screen so a reload comes back to it (including the
  // drawing screen). Intro isn't persisted.
  useEffect(() => {
    if (phase === "draw" || phase === "redeem" || phase === "final") {
      sessionStorage.setItem("present:phase", phase);
    }
  }, [phase]);

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
 
        <div className="letter__top-buttons">
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

          {sessionStorage.getItem("present:draft") && (
            <button
              type="button"
              className="btn letter__back letter__resume"
              onClick={(e) => {
                e.stopPropagation();
                setPhase("draw");
              }}
            >
              Go to drawing
            </button>
          )}
        </div>
 
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
 
  // ---- Redeem phase: show the saved drawing with go-back / download ----
  if (phase === "redeem") {
    return (
      <main className="gifts fade-in">
        <BackgroundMusic track={FOLK_TRACK} />

        <div className="gifts__content present-screen">
          <h1 className="present-title">
            Yay! Now download the drawing to redeem your present!
          </h1>

          {savedComposite && (
            <img
              src={savedComposite}
              alt="Your drawing"
              className="present-preview"
            />
          )}

          <div className="present-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setPhase("draw")}
            >
              Go back
            </button>
            <button type="button" className="btn" onClick={downloadDrawing}>
              Download drawing
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---- Final phase: gifts reveal with confetti ----
  if (phase === "final") {
    return (
      <main className="gifts fade-in">
        <BackgroundMusic track={FOLK_TRACK} />

        <div className="gifts__content present-screen">
          <h1 className="present-title">
            Here are ure gifts! I will pass it to u in school or if we meet up again (Dont forget my shirt)! Happy bday!
          </h1>

          <img src={giftsImg} alt="Your gifts" className="present-gifts-img" />

          <div className="present-actions">
            <button type="button" className="btn" onClick={resetEverything}>
              Reset
            </button>
          </div>
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
 
      {/* Hamburger toggle: opens/closes the tools panel. */}
      <button
        type="button"
        className="btn drawing-menu-toggle"
        aria-label={menuOpen ? "Close tools" : "Open tools"}
        title="Tools"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <img src={menuIcon} alt="Tools" className="drawing-menu-icon" />
      </button>

      {/* Tools panel (below the menu button). It floats above the canvas and
          doesn't block drawing on the rest of the picture. */}
      {menuOpen && (
        <div className="gifts__content present-tools">
            {/* Preview of the color under the cursor/finger, shown above the
                palette so it's never clipped by the panel. */}
            <div
              className="color-hover-preview"
              style={{ backgroundColor: hoverColor ?? selectedColor }}
            />

            <div className="color-palette-wrap">
              <canvas
                ref={pickerCanvasRef}
                className="color-palette"
                width={284}
                height={155}
                style={{ touchAction: "none" }}
                onMouseMove={(e) => previewPaletteAt(e.clientX, e.clientY)}
                onMouseLeave={() => setHoverColor(null)}
              />
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button onClick={toggleEraser} className="btn drawing-button">
                {isErasing ? "Switch to Drawing" : "Switch to Eraser"}
              </button>
              <button onClick={resetCanvas} className="btn drawing-button">Reset</button>
            </div>

            {/* Size slider: pen size while drawing, eraser size while erasing. */}
            {isErasing ? (
              <div className="tools-slider">
                <label htmlFor="eraser-size" className="tools-text-blur">
                  Eraser size: {eraserSize}
                </label>
                <input
                  id="eraser-size"
                  type="range"
                  min={5}
                  max={80}
                  value={eraserSize}
                  onChange={(e) => setEraserSize(Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="tools-slider">
                <label htmlFor="pen-size" className="tools-text-blur">
                  Pen size: {penSize}
                </label>
                <input
                  id="pen-size"
                  type="range"
                  min={1}
                  max={40}
                  value={penSize}
                  onChange={(e) => setPenSize(Number(e.target.value))}
                />
              </div>
            )}

            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                onClick={undo}
                disabled={!canUndo}
                className="btn drawing-button drawing-icon-button"
                aria-label="Undo"
                title="Undo"
              >
                <img src={undoIcon} alt="Undo" className="drawing-icon" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="btn drawing-button drawing-icon-button"
                aria-label="Redo"
                title="Redo"
              >
                <img src={redoIcon} alt="Redo" className="drawing-icon" />
              </button>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={zoomOut} className="btn drawing-button">−</button>
              <span className="tools-text-blur">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn} className="btn drawing-button">+</button>
              <button onClick={resetZoom} className="btn drawing-button">Reset Zoom</button>
            </div>
        </div>
      )}

      <button
        type="button"
        className="btn letter__back"
        onClick={() => setShowLeavePopup(true)}
      >
        Back
      </button>

      {hasDrawn && (
        <button
          type="button"
          className="btn present-save"
          onClick={handleSave}
        >
          Save
        </button>
      )}

      {showLeavePopup && (
        <div className="modal-overlay" onClick={() => setShowLeavePopup(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">
              Your drawing is kept, but you'll see the intro again. You can jump
              straight back to it with "Go to drawing". Leave now?
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                className="btn"
                onClick={() => setShowLeavePopup(false)}
              >
                Cancel
              </button>
              <button type="button" className="btn" onClick={leaveToGifts}>
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