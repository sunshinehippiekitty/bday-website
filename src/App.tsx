import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Pos = { left: number; top: number } | null

function App() {
  const [noPos, setNoPos] = useState<Pos>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const noBtnRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // Load the Tenor embed script so the GIF renders.
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://tenor.com/embed.js"]',
    )
    if (existing) {
      // Script already present, ask it to (re)process embeds.
      ;(window as unknown as { TenorEmbed?: { init?: () => void } }).TenorEmbed?.init?.()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://tenor.com/embed.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  // Move the "No" button to a random spot anywhere on the screen,
  // never overlapping the central content (title, gif, Yes button).
  function dodge() {
    const btn = noBtnRef.current
    if (!btn) return

    const btnW = btn.offsetWidth
    const btnH = btn.offsetHeight
    const margin = 24
    const maxX = window.innerWidth - btnW - margin
    const maxY = window.innerHeight - btnH - margin

    // The protected content area we must not cover.
    const safe = contentRef.current?.getBoundingClientRect()

    // Try random positions until we find one that clears the content box.
    for (let i = 0; i < 40; i++) {
      const left = margin + Math.random() * (maxX - margin)
      const top = margin + Math.random() * (maxY - margin)

      if (!safe) {
        setNoPos({ left, top })
        return
      }

      const overlaps =
        left < safe.right &&
        left + btnW > safe.left &&
        top < safe.bottom &&
        top + btnH > safe.top

      if (!overlaps) {
        setNoPos({ left, top })
        return
      }
    }

    // Fallback: nudge it a little from wherever it is.
    setNoPos({ left: margin, top: margin })
  }

  const handleYes = () => {
    navigate('/gifts')
  }

  return (
    <main className="landing fade-in">
      <div className="landing__content" ref={contentRef}>
        <h1 className="landing__title">
          Hey! Do you want to see your birthday gifts?
        </h1>

        {/* Tenor GIF */}
        <div className="landing__gif">
          <div
            className="tenor-gif-embed"
            data-postid="25406341"
            data-share-method="host"
            data-aspect-ratio="1"
            data-width="220px"
          >
            <a href="https://tenor.com/view/yaseen-gif-25406341">Yaseen Sticker</a>
          </div>
        </div>

        <div className="landing__buttons">
          <button type="button" className="btn" onClick={handleYes}>
            Yes
          </button>
          <button
            ref={noBtnRef}
            type="button"
            className="btn"
            style={
              noPos
                ? { position: 'fixed', left: noPos.left, top: noPos.top, margin: 0 }
                : undefined
            }
            onMouseOver={dodge}
            onTouchStart={(e) => {
              e.preventDefault()
              dodge()
            }}
            onClick={(e) => {
              e.preventDefault()
              dodge()
            }}
          >
            No
          </button>
        </div>
      </div>
    </main>
  )
}

export default App
