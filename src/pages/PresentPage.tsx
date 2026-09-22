import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style.css";
import { readSession } from "./present/session";
import { useDrawingCanvas } from "./present/useDrawingCanvas";
import IntroPhase from "./present/IntroPhase";
import DrawingPhase from "./present/DrawingPhase";
import RedeemPhase from "./present/RedeemPhase";
import FinalPhase from "./present/FinalPhase";

function PresentPage() {
  const navigate = useNavigate();

  // Once a drawing is saved we persist the screen we're on so that a reload on
  // the redeem/final/draw pages restores everything instead of resetting.
  const storedPhase = readSession("present:phase");

  // Intro sentences play first, then the drawing canvas is revealed, then the
  // "redeem" preview screen, then the final gifts screen. On reload we restore
  // whichever of draw/redeem/final we were on (so a refresh on the drawing
  // screen comes back to the drawing, not the intro).
  const [phase, setPhase] = useState<"intro" | "draw" | "redeem" | "final">(
    storedPhase === "draw" || storedPhase === "redeem" || storedPhase === "final"
      ? (storedPhase as "draw" | "redeem" | "final")
      : "intro"
  );

  // Whether the tools panel is expanded (collapsed by default behind the menu).
  const [menuOpen, setMenuOpen] = useState(false);

  // Confirm popup shown when leaving the drawing screen.
  const [showLeavePopup, setShowLeavePopup] = useState(false);

  // All drawing state/refs/effects + the save/download flow.
  const drawing = useDrawingCanvas(phase, setPhase, menuOpen);

  // Persist the current screen so a reload comes back to it (including the
  // drawing screen). Intro isn't persisted.
  useEffect(() => {
    if (phase === "draw" || phase === "redeem" || phase === "final") {
      sessionStorage.setItem("present:phase", phase);
    }
  }, [phase]);

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

  if (phase === "intro") {
    return (
      <IntroPhase
        onBack={() => navigate("/gifts")}
        onStartDrawing={() => setPhase("draw")}
      />
    );
  }

  if (phase === "redeem") {
    return (
      <RedeemPhase
        savedComposite={drawing.savedComposite}
        onGoBack={() => setPhase("draw")}
        onDownload={drawing.downloadDrawing}
      />
    );
  }

  if (phase === "final") {
    return <FinalPhase onReset={resetEverything} />;
  }

  return (
    <DrawingPhase
      drawing={drawing}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      showLeavePopup={showLeavePopup}
      setShowLeavePopup={setShowLeavePopup}
      onLeave={leaveToGifts}
    />
  );
}

export default PresentPage;
