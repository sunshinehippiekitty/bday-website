import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import cameraImg from '../assets/camera.jpeg'
import envelopeImg from '../assets/envelope.jpeg'
import presentImg from '../assets/present.jpeg'

// Fires a burst of confetti pieces from the top of the screen.
function popConfetti() {
  const colors = ['#ff8fb1', '#ffd6e5', '#c13d6e', '#b9e1ff', '#c5fff6', '#de89fa']
  const count = 80
  const container = document.createElement('div')
  container.className = 'confetti-container'
  document.body.appendChild(container)

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span')
    piece.className = 'confetti-piece'
    piece.style.left = `${Math.random() * 100}vw`
    piece.style.background = colors[Math.floor(Math.random() * colors.length)]
    piece.style.animationDelay = `${Math.random() * 0.5}s`
    piece.style.animationDuration = `${2 + Math.random() * 1.5}s`
    piece.style.transform = `rotate(${Math.random() * 360}deg)`
    container.appendChild(piece)
  }

  // Clean up after the animation finishes.
  window.setTimeout(() => container.remove(), 4500)
}

const gifts = [
  { img: cameraImg, label: 'Camera', to: '/gifts/camera' },
  { img: envelopeImg, label: 'Envelope', to: '/gifts/envelope' },
  { img: presentImg, label: 'Present', to: '/gifts/present' },
]

function GiftsPage() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)

  useEffect(() => {
    popConfetti()

    // Tenor's embed.js only converts .tenor-gif-embed divs into iframes when the
    // script first executes. In a single-page app the script may already be loaded
    // (so re-adding it does nothing) and the embed never renders. To force it to
    // reprocess our embed, remove any existing copy and add a fresh one.
    document
      .querySelectorAll('script[src="https://tenor.com/embed.js"]')
      .forEach((s) => s.remove())

    const script = document.createElement('script')
    script.src = 'https://tenor.com/embed.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const handleChoose = (to: string) => {
    if (leaving) return
    // First rotate the chosen image so it's clearly visible...
    setChosen(to)
    // ...then start fading the page out after the spin has begun.
    window.setTimeout(() => setLeaving(true), 350)
    // Navigate once both the spin and fade have played.
    window.setTimeout(() => navigate(to), 1000)
  }

  return (
    <main className={`gifts fade-in${leaving ? ' page-leaving' : ''}`}>
      <div className="gifts__content">
        <h1 className="gifts__title">Yay! Now choose your gift!</h1>

        {/* Tenor GIF between the title and the gift images */}
        <div className="gifts__gif">
          <div
            className="tenor-gif-embed"
            data-postid="3993825760034290342"
            data-share-method="host"
            data-aspect-ratio="1"
            data-width="220px"
          >
            <a href="https://tenor.com/view/christmas-birthday-xmas-surprise-gift-gif-3993825760034290342">
              Christmas Birthday Sticker
            </a>
          </div>
        </div>

        <div className="gifts__buttons">
          {gifts.map((gift) => (
            <button
              key={gift.to}
              type="button"
              aria-label={gift.label}
              className={`gift-emoji${chosen === gift.to ? ' gift-emoji--chosen' : ''}`}
              onClick={() => handleChoose(gift.to)}
            >
              <img src={gift.img} alt={gift.label} className="gift-img" />
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

export default GiftsPage
