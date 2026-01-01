import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import CultCardSelection from './CultCardSelection.js'
import CultGameInterface from './CultGameInterface.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CultCardSelection />} />
        <Route path="/game" element={<CultGameInterface />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
