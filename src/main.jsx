import React from 'react'
import ReactDOM from 'react-dom/client'
import GrimoireDeMorgane from './GrimoireDeMorgane.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
// Supprime ou commente cette ligne si le fichier n'existe pas :
// import './index.css'

import { registerSW } from 'virtual:pwa-register'
import { initAudioOnFirstTouch } from './utils/audioUtils'

registerSW({ immediate: true })
// Débloque l'AudioContext au tout premier geste utilisateur et branche le
// clic sonore global — voir utils/audioUtils.js.
initAudioOnFirstTouch()

// Filet de sécurité de dernier recours : sans lui, une erreur JS
// inattendue n'importe où dans l'arbre React (avant même l'affichage des
// onglets — écran de connexion, chargement initial...) faisait planter
// TOUTE l'app sur un écran blanc, sans aucun message ni moyen de
// récupérer sans fermer/rouvrir l'app. Voir ErrorBoundary.jsx pour le
// filet plus ciblé, par onglet, posé à l'intérieur d'AppShell.jsx.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GrimoireDeMorgane />
    </ErrorBoundary>
  </React.StrictMode>,
)
