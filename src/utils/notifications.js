/* ------------------------------------------------------------------ */
/*  NOTIFICATIONS LOCALES (minuteur du mode cuisine)                   */
/* ------------------------------------------------------------------ */

// À appeler depuis un geste utilisateur direct (ex. clic sur "Lancer") :
// iOS n'autorise la demande de permission de notification que si elle est
// synchrone avec un tel geste. Ne redemande jamais si déjà accordée/refusée
// ("default" = jamais demandé) — redemander sans arrêt agacerait pour rien
// un utilisateur qui a déjà refusé une fois.
export function requestNotificationPermission() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

// Sur iOS (PWA installée, 16.4+), le constructeur `new Notification()`
// direct est ignoré silencieusement : seul l'enregistrement du service
// worker (ServiceWorkerRegistration.showNotification()) peut réellement
// afficher une notification système. On tente donc d'abord cette voie,
// avec repli sur le constructeur direct pour les environnements qui le
// supportent (ex. en dev, où le service worker n'est pas toujours actif).
export async function showLocalNotification(title, options) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return;
      }
    }
  } catch {
    /* repli sur le constructeur direct ci-dessous */
  }
  try {
    new Notification(title, options);
  } catch {
    /* aucune voie disponible dans cet environnement : rien d'autre à tenter */
  }
}
