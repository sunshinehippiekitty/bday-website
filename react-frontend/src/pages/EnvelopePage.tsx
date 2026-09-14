import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// The letter, split at every full stop and comma. Each entry shows one at a time.
const sentences = [
  'Hello to my best friend!',
  'Surprising our friendship has lasted from all the way erm 2017,',
  '2018,',
  '2019,',
  '2020,',
  '2021,',
  '2022,',
  '2023,',
  '2024,',
  '2025,',
  'and now 2026!',
  'Almost 1 decade of friendship!',
  "Honestly I've shared quite a lot already from all of the previous birthday letters that I have given you.",
  'But I guess I have more to share about our strong bonds.',
  'I am very protective of my friends as you know already & my siblings too.',
  'And I take care of those I love dearly and are close to me.',
  'So if anyone hurts you,',
  'tell me and I will protect you in a heartbeat.',
  "I honestly didn't know how much of a friend you are that I can rely on you and talk to you through.",
  "And I'm glad to have grown with you through the hard times and good times.",
  'From PSLE,',
  'O levels,',
  'EAE,',
  'part time jobs,',
  'and now gonna go through more projects and internships.',
  'Even when we were studying different subjects and now studying about totally different industries.',
  "And even when we don't talk a lot to each other during exam week or busy periods,",
  'we can still pick off from where we left and continue to chat.',
  'I am so glad to have such a friend like you that I can rely on.',
  'I know that throughout the years,',
  'we will get more busy.',
  'And we will be talking even less.',
  'But I know that we will still be able to contact each other about stupid stuff.',
  'And you also just text me whenever you want.',
  'Continue to persevere in all the challenges that you will face.',
  'Everything is within reach if you try.',
  'You have come so far,',
  'so continue to chase whatever goals you have.',
  'All I can say is,',
  "let's continue to see where life takes us.",
]

function EnvelopePage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true) // sentence fade in/out state
  const [showHint, setShowHint] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const hintTimer = useRef<number | undefined>(undefined)

  const isLast = index === sentences.length - 1

  // Each time a new sentence appears, fade it in and start a timer for the hint.
  useEffect(() => {
    setVisible(true)
    setShowHint(false)
    if (hintTimer.current) window.clearTimeout(hintTimer.current)
    // After the sentence has been up for a bit, fade in the hint.
    hintTimer.current = window.setTimeout(() => setShowHint(true), 2000)
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current)
    }
  }, [index])

  const goToNext = () => {
    if (isLast) return
    // Fade the current sentence out, then swap to the next one.
    setVisible(false)
    setShowHint(false)
    window.setTimeout(() => setIndex((i) => i + 1), 500)
  }

  const goHome = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => navigate('/gifts/'), 700)
  }

  return (
    <main
      className={`letter fade-in${leaving ? ' page-leaving' : ''}`}
      onClick={!isLast ? goToNext : undefined}
    >
      <button
        type="button"
        className="btn letter__back"
        onClick={(e) => {
          e.stopPropagation()
          goHome()
        }}
      >
        ← Back
      </button>

      <div className="letter__stage">
        <p className={`letter__sentence${visible ? ' is-visible' : ''}`}>
          {sentences[index]}
        </p>

        {isLast ? (
          <button
            type="button"
            className={`btn letter__finish${visible ? ' is-visible' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              goHome()
            }}
          >
            Finish
          </button>
        ) : (
          <span className={`letter__hint${showHint ? ' is-visible' : ''}`}>
            Click anywhere to continue
          </span>
        )}
      </div>
    </main>
  )
}

export default EnvelopePage
