import { useRef, useEffect, useState } from "react";

type Phase = "intro" | "draw" | "redeem" | "final";

// Owns the color palette: the picked pen color, the live hover preview, and the
// palette canvas effect (build gradient + mouse/touch picking). Re-runs when the
// tools panel opens, since the picker canvas only mounts then.
export function useColorPicker(phase: Phase, menuOpen: boolean) {
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

  return {
    pickerCanvasRef,
    selectedColor,
    hoverColor,
    setHoverColor,
    previewPaletteAt,
  };
}
