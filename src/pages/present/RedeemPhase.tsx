import BackgroundMusic from "../../components/BackgroundMusic.tsx";
import { FOLK_TRACK } from "./session";

type RedeemPhaseProps = {
  savedComposite: string | null;
  onGoBack: () => void;
  onDownload: () => void;
};

// Redeem preview: shows the saved drawing with go-back / download controls.
function RedeemPhase({ savedComposite, onGoBack, onDownload }: RedeemPhaseProps) {
  return (
    <main className="gifts fade-in">
      <BackgroundMusic track={FOLK_TRACK} />

      <div className="gifts__content present-screen">
        <h1 className="present-title">
          Yay! Now download the drawing to redeem your present!
        </h1>

        {savedComposite && (
          <img
            src={savedComposite}
            alt="Your drawing"
            className="present-preview"
          />
        )}

        <div className="present-actions">
          <button
            type="button"
            className="btn"
            onClick={onGoBack}
          >
            Go back
          </button>
          <button type="button" className="btn" onClick={onDownload}>
            Download drawing
          </button>
        </div>
      </div>
    </main>
  );
}

export default RedeemPhase;
