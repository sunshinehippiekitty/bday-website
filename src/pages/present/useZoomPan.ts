import { useRef, useState, type RefObject } from "react";

// Owns zoom + pan state and the math that keeps a chosen point fixed on screen
// while zooming. Zoom/pan are applied straight to the canvas (synchronously)
// and kept in refs, so rapid pinch/wheel events never read stale values. React
// state is only used for the "100%" label.
export function useZoomPan(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  logicalSizeRef: RefObject<{ width: number; height: number }>
) {
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  // Manual pan offset (canvas's left/top within the container), since native
  // scroll can't go negative and pins shrunk content to the top-left corner —
  // that broke centering whenever zoom < 1.
  const panRef = useRef({ x: 0, y: 0 });

  // Pinch-to-zoom tracking
  const pinchRef = useRef<{
    startDistance: number;
    startZoom: number;
    logicalX: number; // point of the drawing under the fingers when the pinch began
    logicalY: number;
  } | null>(null);

  // Mouse pan: holding both left + right buttons down and dragging moves
  // (pans) the drawing in any direction, without changing the zoom.
  const mousePinchRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

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

  return {
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
  };
}
