import { useRef, type RefObject } from "react";

type StrokeDeps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  contextRef: RefObject<CanvasRenderingContext2D | null>;
  isErasingRef: RefObject<boolean>;
  eraserSizeRef: RefObject<number>;
  pushUndoSnapshot: () => void;
  setHasDrawn: (v: boolean) => void;
};

// The actual pen/eraser drawing onto the canvas, shared by both the mouse and
// touch handlers. Uses midpoint smoothing so quick movements draw rounded lines
// instead of hard corners, and persists an in-progress draft on stroke end.
export function useStrokes({
  canvasRef,
  contextRef,
  isErasingRef,
  eraserSizeRef,
  pushUndoSnapshot,
  setHasDrawn,
}: StrokeDeps) {
  const isDrawingRef = useRef(false);
  // Last pointer position in a stroke, used to smooth the line with quadratic
  // curves (midpoint smoothing) instead of hard straight segments.
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

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

  return { isDrawingRef, beginStroke, continueStroke, endStroke };
}
