import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import cameraImg from '../assets/camera.jpeg'
import memoriesVideo from '../assets/video.mp4'

// YouTube video to embed as the second option.
const YT_EMBED = 'https://www.youtube.com/embed/RdUV9Ms5GM4?si=tY9B3qGAOdCUYgNG'

type View = 'menu' | 'memories' | 'youtube'

function CameraPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('menu')

  // Mark this gift as opened so the Present unlocks once both are visited.
  useEffect(() => {
    sessionStorage.setItem('visited:camera', '1')
  }, [])

  // Back goes to the gifts page from the menu, or back to the menu from a player.
  const handleBack = () => {
    if (view === 'menu') navigate('/gifts')
    else setView('menu')
  }

  return (
    <main className="gifts fade-in">
      <button type="button" className="btn letter__back" onClick={handleBack}>
        Back
      </button>

      <div className="gifts__content">
        {view === 'menu' && (
          <div className="camera-menu">
            <img src={cameraImg} alt="Camera" className="gift-img camera-phone-img" />
            <div className="present-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setView('memories')}
              >
                Memories video
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setView('youtube')}
              >
                YouTube video
              </button>
            </div>
          </div>
        )}

        {view === 'memories' && (
          <div className="camera-player">
            <p className="present-title">sry couldn't show all pics</p>
            <video
              className="camera-video"
              src={memoriesVideo}
              controls
              autoPlay
              playsInline
            />
          </div>
        )}

        {view === 'youtube' && (
          <div className="camera-player">
            <p className="present-title">Turn on subtitles!</p>
            <div className="camera-yt-wrap">
              <iframe
                className="camera-yt"
                src={YT_EMBED}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default CameraPage
