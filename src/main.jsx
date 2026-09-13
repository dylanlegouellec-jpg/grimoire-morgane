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

// Détecte l'app installée sur l'écran d'accueil pour le CSS (voir
// .bottom-nav/.fab/.grimoire-app) : le média CSS "display-mode: standalone"
// existe, mais s'est avéré peu fiable sous iOS Safari selon la manière dont
// l'app a été ajoutée à l'écran d'accueil — signalé comme "aucune
// différence" alors que le CSS ciblait très exactement ce média.
// window.navigator.standalone (propriété non standard, propre à iOS) est
// la détection fiable documentée sur cette plateforme ; matchMedia reste le
// bon repli pour Android/desktop, où il fonctionne correctement. Posé en
// attribut sur <html>, comme data-theme/data-text-size (voir
// utils/theme.js, utils/localSettings.js) : un simple sélecteur CSS suffit
// alors, sans dépendre du support du média par le moteur de rendu.
if (window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches) {
  document.documentElement.setAttribute("data-standalone", "true");
}

// Détecte Android pour le CSS (voir .bottom-nav, modalsBase.css.js) : le
// dock flottant du bas est descendu un peu plus près du bord sur cette
// plateforme précise, à la demande — parfait tel quel sur iPhone, un peu
// trop haut sur Android où env(safe-area-inset-bottom) vaut généralement 0
// (pas de zone de sécurité équivalente à la barre d'accueil iOS). Simple
// recherche de "Android" dans le user-agent : contrairement à iOS (qui n'a
// aucune façon fiable de s'auto-identifier ainsi, d'où data-standalone
// ci-dessus qui s'appuie sur autre chose), Android s'annonce toujours sans
// ambiguïté de cette manière.
if (/Android/i.test(navigator.userAgent)) {
  document.documentElement.setAttribute("data-platform", "android");
}

// Hauteur/décalage RÉELS de la zone visible (--app-vvh/--app-vv-offset),
// utilisés par .modal-backdrop (modalsBase.css.js) à la place de
// "height: 100dvh" seul. Corrige un bug précis sur iOS : nos modales sont
// en "position: fixed" ET s'ouvrent pendant que le <body> est LUI AUSSI
// figé en "position: fixed" (voir useBodyScrollLock.js, nécessaire par
// ailleurs pour empêcher le fond de défiler sous la modale). Sur ce
// terrain, quand un champ à l'intérieur reçoit le clavier (ex. la
// recherche de AddMealModal.jsx, autoFocus), Safari tente de faire défiler
// la page pour amener ce champ au-dessus du clavier — mais ne peut pas
// vraiment scroller un <body> figé, et finit par décaler toute la couche
// "fixed" au lieu du seul contenu, faisant sortir le haut de la modale
// (avec la barre de recherche) au-dessus du haut de l'écran. "100dvh" ne
// suit que le rétractement de la barre d'adresse, jamais le clavier :
// resynchroniser en continu sur window.visualViewport (hauteur ET
// décalage réels) permet à la modale de rester correctement cadrée dans
// l'espace effectivement visible au-dessus du clavier.
if (window.visualViewport) {
  const vv = window.visualViewport;
  // Écart au-delà duquel on considère qu'un clavier est réellement ouvert,
  // pas juste la barre d'adresse de Safari qui se rétracte/réapparaît (ce
  // qu'un simple tirage tactile prolongé déclenche déjà, même sans aucun
  // champ focus — repéré en tirant longuement une modale : tout le bloc
  // Réglages/sous-vue dérivait vers le bas puis "sautait" en remontant à
  // la fin, sans rapport avec le geste de fermeture lui-même). La barre
  // d'adresse ne fait varier la hauteur visible que d'environ 50-100px sur
  // iOS ; le clavier, lui, en prend 250-350px — marge large entre les deux
  // pour ne jamais confondre l'un avec l'autre.
  const KEYBOARD_GAP_THRESHOLD_PX = 150;
  const syncViewportVars = () => {
    const gap = window.innerHeight - vv.height;
    if (gap > KEYBOARD_GAP_THRESHOLD_PX) {
      document.documentElement.style.setProperty("--app-vvh", `${vv.height}px`);
      document.documentElement.style.setProperty("--app-vv-offset", `${vv.offsetTop}px`);
    } else {
      // Pas de clavier : on retire nos variables plutôt que de les figer à
      // une valeur — le repli CSS ("100dvh"/"0px", voir modalsBase.css.js)
      // reprend la main. "dvh" suit déjà nativement, en douceur, le
      // rétractement de la barre d'adresse (c'est tout son rôle) ; le
      // resynchroniser nous-mêmes ici en JS, avec le décalage d'une frame
      // que ça implique, ne faisait que réintroduire un à-coup visible sur
      // la modale pendant cette même animation, pour un cas déjà correct
      // sans notre intervention.
      document.documentElement.style.removeProperty("--app-vvh");
      document.documentElement.style.removeProperty("--app-vv-offset");
    }
  };
  syncViewportVars();
  vv.addEventListener("resize", syncViewportVars);
  vv.addEventListener("scroll", syncViewportVars);
}

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
