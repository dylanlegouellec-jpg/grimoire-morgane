import React from 'react'
import ReactDOM from 'react-dom/client'
import GrimoireDeMorgane from './GrimoireDeMorgane.jsx'
// Supprime ou commente cette ligne si le fichier n'existe pas :
// import './index.css'

import { registerSW } from 'virtual:pwa-register'
import { initAudioOnFirstTouch } from './utils/audioUtils'

registerSW({ immediate: true })
// Débloque l'AudioContext au tout premier geste utilisateur et branche le
// clic sonore global — voir utils/audioUtils.js.
initAudioOnFirstTouch()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GrimoireDeMorgane />
  </React.StrictMode>,
)
