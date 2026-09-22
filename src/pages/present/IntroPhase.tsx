import { useRef, useEffect, useState } from "react";
import BackgroundMusic from "../../components/BackgroundMusic.tsx";
import { FOLK_TRACK } from "./session";
import { sentences } from "./sentences";

type IntroPhaseProps = {
  onBack: () => void;
  onStartDrawing: () => void;
};

// Intro sentences shown one at a time before the drawing canvas.
function IntroPhase({ onBack, onStartDrawing }: IntroPhaseProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef<number | undefined>(undefined);
  const isLastSentence = index === sentences.length - 1;

  // ---- Intro sentence reveal (envelope-style) ----
  useEffect(() => {
    setVisible(true);
    setShowHint(false);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setShowHint(true), 2000);
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, [index]);

  const goToNextSentence = () => {
    if (isLastSentence) return;
    setVisible(false);
    setShowHint(false);
    window.setTimeout(() => setIndex((i) => i + 1), 500);
  };

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
            onBack();
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
              onStartDrawing();
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
              onStartDrawing();
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

export default IntroPhase;
