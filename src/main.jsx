import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import CultCardSelection from './CultCardSelection.js'
import CultGameInterface from './CultGameInterface.js'
import LoadSampleMode from './LoadSampleMode.js'
import ClearStorage from './ClearStorage.js'
import MagicPrototype from './MagicPrototype.js'
import UIDemo from './UIDemo.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CultCardSelection />} />
        <Route path="/game/:gameId" element={<CultGameInterface />} />
        <Route path="/sample" element={<LoadSampleMode />} />
        <Route path="/clear/:gameId" element={<ClearStorage />} />
        <Route path="/magic" element={<MagicPrototype />} />
        <Route path="/demo" element={<UIDemo />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
