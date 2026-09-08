import React from 'react'
import ReactDOM from 'react-dom/client'
import GrimoireDeMorgane from './GrimoireDeMorgane.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
// Supprime ou commente cette ligne si le fichier n'existe pas :
// import './index.css'

import { registerSW } from 'virtual:pwa-register'
import { initAudioOnFirstTouch } from './utils/audioUtils'

// `registerType: "autoUpdate"` (vite.config.js) ne fait qu'une partie du
// travail : un nouveau service worker prend bien le contrôle en silence
// dès qu'il est prêt (skipWaiting + clientsClaim, activés par ce mode),
// mais ça ne recharge jamais l'onglet déjà ouvert — le JS déjà chargé en
// mémoire continue de tourner tel quel jusqu'à la prochaine navigation/
// fermeture manuelle. Concrètement observé cette session : après un
// déploiement, un onglet resté ouvert continuait de réclamer les anciens
// fichiers (hash de build précédent, supprimés du serveur) au moindre
// rechargement lazy, avec des 404 à la clé — précisément le scénario visé
// par une PWA gardée ouverte en fond de poche sur un téléphone.
//
// `controllerchange` se déclenche quand le service worker qui contrôle
// CET onglet change. Ne recharger que si un contrôleur existait DÉJÀ au
// démarrage (donc que ce changement correspond à une vraie mise à jour en
// cours de session) : sur la toute première visite, aucun service worker
// ne contrôle encore la page au moment où elle se charge — le premier
// controllerchange à ce moment-là est juste la prise de contrôle
// initiale (clientsClaim), pas une mise à jour, et n'a donc rien à
// recharger.
if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

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
