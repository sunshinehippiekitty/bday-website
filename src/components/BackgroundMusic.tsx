import { useEffect, useRef, useState } from 'react'
import soundOn from '../assets/sound-on.png'
import soundOff from '../assets/sound-off.png'

const DEFAULT_TRACK =
  import.meta.env.BASE_URL +
  'fordrums2theobjecthingy-little-do-you-know-beat-cry-sound-effect-325692.mp3'

type Props = {
  // Path to the audio file to play (defaults to the envelope beat track).
  track?: string
  // Extra class on the toggle button to reposition it (e.g. bottom-left).
  toggleClassName?: string
}

// Background music for the page it's mounted on. Browsers block autoplay until
// the user interacts, so we try to play on mount and also on the first click/tap.
function BackgroundMusic({ track = DEFAULT_TRACK, toggleClassName = '' }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const tryPlay = () => {
      audio.play().then(
        () => {
          // Playing now, no need to keep listening for a gesture.
          window.removeEventListener('pointerdown', tryPlay)
          window.removeEventListener('keydown', tryPlay)
        },
        () => {
          // Still blocked; we'll retry on the next interaction.
        },
      )
    }

    // Attempt right away (works if the user already interacted on a prior page).
    tryPlay()

    // pointerdown covers both mouse and touch in one event.
    window.addEventListener('pointerdown', tryPlay)
    window.addEventListener('keydown', tryPlay)
    return () => {
      window.removeEventListener('pointerdown', tryPlay)
      window.removeEventListener('keydown', tryPlay)
      // Stop the music when leaving the page.
      audio.pause()
    }
  }, [track])

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    // Make sure the audio is actually playing (handles the blocked-autoplay case).
    if (audio.paused) audio.play().catch(() => {})
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  return (
    <>
      <audio ref={audioRef} src={track} loop />
      <button
        type="button"
        className={`music-toggle${toggleClassName ? ` ${toggleClassName}` : ''}`}
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
    </>
  )
}

export default BackgroundMusic
