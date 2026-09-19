import { useEffect, useRef, useState } from 'react'
import soundOn from '../assets/sound-on.png'
import soundOff from '../assets/sound-off.png'

const TRACK =
  '/fordrums2theobjecthingy-little-do-you-know-beat-cry-sound-effect-325692.mp3'

// Background music for the page it's mounted on. Browsers block autoplay until
// the user interacts, so we try to play on mount and also on the first click/tap.
function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const tryPlay = () => {
      const audio = audioRef.current
      if (!audio) return
      audio
        .play()
        .then(() => setStarted(true))
        .catch(() => {
          // Blocked until a gesture, we'll retry on the next interaction.
        })
    }

    // Attempt right away (works if the user already interacted on a prior page).
    tryPlay()

    window.addEventListener('click', tryPlay)
    window.addEventListener('touchstart', tryPlay)
    window.addEventListener('keydown', tryPlay)
    return () => {
      window.removeEventListener('click', tryPlay)
      window.removeEventListener('touchstart', tryPlay)
      window.removeEventListener('keydown', tryPlay)
      // Stop the music when leaving the page.
      audioRef.current?.pause()
    }
  }, [])

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  return (
    <>
      <audio ref={audioRef} src={TRACK} loop />
      {started && (
        <button
          type="button"
          className="music-toggle"
          onClick={(e) => {
            e.stopPropagation()
            toggleMute()
          }}
          aria-label={muted ? 'Unmute music' : 'Mute music'}
        >
          <img
            src={muted ? soundOff : soundOn}
            alt=""
            className="music-toggle__icon"
          />
        </button>
      )}
    </>
  )
}

export default BackgroundMusic
