import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './style.css'
import App from './App.tsx'
import GiftsPage from './pages/GiftsPage.tsx'
import CameraPage from './pages/CameraPage.tsx'
import EnvelopePage from './pages/EnvelopePage.tsx'
import PresentPage from './pages/PresentPage.tsx'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/gifts" element={<GiftsPage />} />
        <Route path="/gifts/camera" element={<CameraPage />} />
        <Route path="/gifts/envelope" element={<EnvelopePage />} />
        <Route path="/gifts/present" element={<PresentPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
