import { useRef, useEffect, useState } from "react";
import { readSession } from "./session";
import { useCanvasSetup } from "./useCanvasSetup";
import { useZoomPan } from "./useZoomPan";
import { useColorPicker } from "./useColorPicker";
import { useCanvasGestures } from "./useCanvasGestures";
import { useUndoRedo } from "./useUndoRedo";
import { useStrokes } from "./useStrokes";

type Phase = "intro" | "draw" | "redeem" | "final";

// Orchestrates the draw phase: canvas init, strokes, eraser, undo/redo, and the
// save/download flow. Zoom/pan lives in useZoomPan and the palette in
// useColorPicker; this hook wires them into the shared canvas + gesture effect.
export function useDrawingCanvas(
  phase: Phase,
  setPhase: (phase: Phase) => void,
  menuOpen: boolean
) {
  // True once the user has actually drawn a stroke, so the Save button shows.
  const [hasDrawn, setHasDrawn] = useState(false);

  // Strokes only (transparent bg) — used to keep editing when going back.
  const [savedDrawing, setSavedDrawing] = useState<string | null>(
    readSession("present:drawing")
  );

  // The picture + strokes flattened together — shown on the redeem screen and
  // downloaded. Persisted so a reload restores the preview.
  const [savedComposite, setSavedComposite] = useState<string | null>(
    readSession("present:composite")
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  // The decorated line drawing, loaded once so we can paint it under the user's
  // strokes when saving.
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const logicalSizeRef = useRef({ width: 0, height: 0 }); // fixed drawing-space size, set once

  // Zoom/pan state + math (keeps a point fixed on screen while zooming).
  const {
    zoom,
    setZoom,
    zoomRef,
    panRef,
    pinchRef,
    mousePinchRef,
    clampZoom,
    applyView,
    zoomAt,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useZoomPan(canvasRef, scrollContainerRef, logicalSizeRef);

  // Color palette (picked pen color + hover preview).
  const { pickerCanvasRef, selectedColor, hoverColor, setHoverColor, previewPaletteAt } =
    useColorPicker(phase, menuOpen);

  const [isErasing, setIsErasing] = useState(false);
  const isErasingRef = useRef(false);

  // Adjustable pen + eraser sizes. Refs mirror the state so the native touch
  // handlers (which close over the effect) always read the current values.
  const [penSize, setPenSize] = useState(5);
  const penSizeRef = useRef(5);
  const [eraserSize, setEraserSize] = useState(20);
  const eraserSizeRef = useRef(20);

  // Undo / redo history (snapshots the canvas before each stroke).
  const { canUndo, canRedo, pushUndoSnapshot, undo, redo, resetHistory } =
    useUndoRedo(canvasRef, contextRef, setHasDrawn);

  // Pen/eraser drawing onto the canvas (shared by mouse + touch).
  const { isDrawingRef, beginStroke, continueStroke, endStroke } = useStrokes({
    canvasRef,
    contextRef,
    isErasingRef,
    eraserSizeRef,
    pushUndoSnapshot,
    setHasDrawn,
  });

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

  // Size + position the canvas over the picture and restore any prior strokes.
  useCanvasSetup({
    phase,
    canvasRef,
    contextRef,
    scrollContainerRef,
    logicalSizeRef,
    bgImageRef,
    zoomRef,
    penSizeRef,
    selectedColor,
    savedDrawing,
    setZoom,
    applyView,
    resetHistory,
    setHasDrawn,
  });

  // Keep the pen color in sync with whatever's picked
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = selectedColor;
    }
  }, [selectedColor]);

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

  // Touch + wheel gestures (pinch-zoom, pan, wheel-zoom) attached natively.
  useCanvasGestures({
    phase,
    canvasRef,
    scrollContainerRef,
    isDrawingRef,
    zoomRef,
    panRef,
    pinchRef,
    clampZoom,
    applyView,
    zoomAt,
    beginStroke,
    continueStroke,
    endStroke,
  });

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

  return {
    // refs the draw UI binds to
    canvasRef,
    scrollContainerRef,
    pickerCanvasRef,
    // save flow / preview state
    hasDrawn,
    savedComposite,
    handleSave,
    downloadDrawing,
    // color
    selectedColor,
    hoverColor,
    setHoverColor,
    previewPaletteAt,
    // eraser + sizes
    isErasing,
    toggleEraser,
    resetCanvas,
    penSize,
    setPenSize,
    eraserSize,
    setEraserSize,
    // undo / redo
    undo,
    redo,
    canUndo,
    canRedo,
    // zoom
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    // mouse handlers
    startDrawing,
    finishDrawing,
    draw,
  };
}
