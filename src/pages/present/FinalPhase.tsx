import { useEffect } from "react";
import BackgroundMusic from "../../components/BackgroundMusic.tsx";
// TEMP placeholder for the final gifts photo. Replace this import with your own
// image once you add it, e.g. `import giftsImg from "../../assets/gifts.jpeg";`
import giftsImg from "../../assets/present.jpeg";
import { FOLK_TRACK } from "./session";
import { popConfetti } from "../../utils/confetti";

type FinalPhaseProps = {
  onReset: () => void;
};

// Final phase: gifts reveal with confetti.
function FinalPhase({ onReset }: FinalPhaseProps) {
  // Pop confetti when the final gifts screen appears.
  useEffect(() => {
    popConfetti();
  }, []);

  return (
    <main className="gifts fade-in">
      <BackgroundMusic track={FOLK_TRACK} />

      <div className="gifts__content present-screen">
        <h1 className="present-title">
          Here are ure gifts! I will pass it to u in school or if we meet up again (Dont forget my shirt)! Happy bday!
        </h1>

        <img src={giftsImg} alt="Your gifts" className="present-gifts-img" />

        <div className="present-actions">
          <button type="button" className="btn" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </main>
  );
}

export default FinalPhase;
