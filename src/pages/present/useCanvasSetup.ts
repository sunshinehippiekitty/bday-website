import { useEffect, type RefObject } from "react";
// The line drawing the user decorates. Drawing is constrained to this picture.
import canvasBgImg from "../../assets/drawing-to-decorate.jpeg";

type Phase = "intro" | "draw" | "redeem" | "final";

type SetupDeps = {
  phase: Phase;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  contextRef: RefObject<CanvasRenderingContext2D | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  logicalSizeRef: RefObject<{ width: number; height: number }>;
  bgImageRef: RefObject<HTMLImageElement | null>;
  zoomRef: RefObject<number>;
  penSizeRef: RefObject<number>;
  selectedColor: string;
  savedDrawing: string | null;
  setZoom: (z: number) => void;
  applyView: (nextZoom: number, panX: number, panY: number) => void;
  resetHistory: () => void;
  setHasDrawn: (v: boolean) => void;
};

// Initial canvas setup (runs once the drawing phase mounts the canvas). The
// canvas is sized and positioned to exactly cover the reference picture, so the
// user can only draw within that image. The picture itself is shown as the
// canvas background; strokes land on the transparent canvas above it.
export function useCanvasSetup({
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
}: SetupDeps) {
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
      resetHistory();

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
}
