import { useEffect, type RefObject } from "react";

type Phase = "intro" | "draw" | "redeem" | "final";

type GestureDeps = {
  phase: Phase;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  isDrawingRef: RefObject<boolean>;
  zoomRef: RefObject<number>;
  panRef: RefObject<{ x: number; y: number }>;
  pinchRef: RefObject<{
    startDistance: number;
    startZoom: number;
    logicalX: number;
    logicalY: number;
  } | null>;
  clampZoom: (z: number) => number;
  applyView: (nextZoom: number, panX: number, panY: number) => void;
  zoomAt: (clientX: number, clientY: number, nextZoom: number) => void;
  beginStroke: (x: number, y: number) => void;
  continueStroke: (x: number, y: number) => void;
  endStroke: () => void;
};

// Touch + wheel gestures, attached natively with { passive: false } so
// preventDefault() reliably blocks the browser's own pinch-zoom/scroll. They
// live on the container (not the canvas) so a pinch still works when the canvas
// is zoomed out and smaller than the screen.
export function useCanvasGestures({
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
}: GestureDeps) {
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
}
