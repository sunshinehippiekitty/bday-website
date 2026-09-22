import BackgroundMusic from "../../components/BackgroundMusic.tsx";
import undoIcon from "../../assets/undo.png";
import redoIcon from "../../assets/redo.png";
import menuIcon from "../../assets/menu.png";
import { FOLK_TRACK } from "./session";
import type { useDrawingCanvas } from "./useDrawingCanvas";

type DrawingApi = ReturnType<typeof useDrawingCanvas>;

type DrawingPhaseProps = {
  drawing: DrawingApi;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showLeavePopup: boolean;
  setShowLeavePopup: React.Dispatch<React.SetStateAction<boolean>>;
  onLeave: () => void;
};

function DrawingPhase({
  drawing,
  menuOpen,
  setMenuOpen,
  showLeavePopup,
  setShowLeavePopup,
  onLeave,
}: DrawingPhaseProps) {
  const {
    canvasRef,
    scrollContainerRef,
    pickerCanvasRef,
    hasDrawn,
    handleSave,
    selectedColor,
    hoverColor,
    setHoverColor,
    previewPaletteAt,
    isErasing,
    toggleEraser,
    resetCanvas,
    penSize,
    setPenSize,
    eraserSize,
    setEraserSize,
    undo,
    redo,
    canUndo,
    canRedo,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    startDrawing,
    finishDrawing,
    draw,
  } = drawing;

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
              <button type="button" className="btn" onClick={onLeave}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default DrawingPhase;
