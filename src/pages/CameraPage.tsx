import { useEffect } from 'react'
import cameraImg from '../assets/camera.jpeg'

function CameraPage() {
  // Mark this gift as opened so the Present unlocks once both are visited.
  useEffect(() => {
    sessionStorage.setItem('visited:camera', '1')
  }, [])

  return (
    <main className="gifts fade-in">
      <div className="gifts__content">
        <img src={cameraImg} alt="Camera" className="gift-img" />
      </div>
    </main>
  )
}

export default CameraPage
