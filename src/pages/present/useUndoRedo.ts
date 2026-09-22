import { useRef, useState, type RefObject } from "react";

// Undo / redo history for the drawing canvas. Each entry is a full-resolution
// snapshot of the canvas pixels. We snapshot the canvas right before a stroke
// changes it (the "before" state), so undo can put that back. Redo replays
// states that were undone.
export function useUndoRedo(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  contextRef: RefObject<CanvasRenderingContext2D | null>,
  setHasDrawn: (v: boolean) => void
) {
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryButtons = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  // Cheap check for a fully transparent snapshot (used to hide Save after undo).
  const isBlank = (data: ImageData) => {
    const px = data.data;
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] !== 0) return false;
    }
    return true;
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

  // Empty the history (called when the canvas is freshly initialized).
  const resetHistory = () => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryButtons();
  };

  return { canUndo, canRedo, pushUndoSnapshot, undo, redo, resetHistory };
}
