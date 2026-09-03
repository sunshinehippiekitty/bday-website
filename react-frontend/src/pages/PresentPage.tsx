import presentImg from '../assets/present.jpeg'

function PresentPage() {
  return (
    <main className="gifts fade-in">
      <div className="gifts__content">
        <img src={presentImg} alt="Present" className="gift-img" />
      </div>
    </main>
  )
}

export default PresentPage
