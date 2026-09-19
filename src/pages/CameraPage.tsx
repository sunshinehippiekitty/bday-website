import cameraImg from '../assets/camera.jpeg'

function CameraPage() {
  return (
    <main className="gifts fade-in">
      <div className="gifts__content">
        <img src={cameraImg} alt="Camera" className="gift-img" />
      </div>
    </main>
  )
}

export default CameraPage
