import React from 'react'
import ReactDOM from 'react-dom/client'
import GrimoireDeMorgane from './GrimoireDeMorgane.jsx'
// Supprime ou commente cette ligne si le fichier n'existe pas :
// import './index.css'

import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GrimoireDeMorgane />
  </React.StrictMode>,
)
