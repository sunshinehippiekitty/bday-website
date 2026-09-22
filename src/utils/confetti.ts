// Fires a burst of confetti pieces from the top of the screen.
export function popConfetti() {
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
