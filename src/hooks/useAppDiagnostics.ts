import { useCallback, useEffect, useState } from "react";
import {
  getBuildInfo,
  getDeviceInfo,
  getDisplayMode,
  getPageLoadInfo,
  getServiceWorkerInfo,
  type BuildInfo,
  type DeviceInfo,
  type DisplayMode,
  type PageLoadInfo,
  type ServiceWorkerInfo,
} from "../utils/diagnostics";

/* ------------------------------------------------------------------ */
/*  Réunit ce que le Panneau de Diagnostics sait de l'app elle-même :     */
/*  version, mode, service worker, appareil, chargement. L'appareil se      */
/*  remet à jour tout seul (rotation, redimensionnement, perte/retour du      */
/*  réseau) ; le service worker se relit à la demande (`refreshServiceWorker`),    */
/*  par exemple après une vérification de mise à jour.                              */
/* ------------------------------------------------------------------ */

export interface AppDiagnostics {
  build: BuildInfo;
  mode: DisplayMode;
  address: string;
  device: DeviceInfo;
  load: PageLoadInfo;
  serviceWorker: ServiceWorkerInfo | null;
  refreshServiceWorker: () => Promise<void>;
}

export default function useAppDiagnostics(): AppDiagnostics {
  const [device, setDevice] = useState<DeviceInfo>(() => getDeviceInfo());
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerInfo | null>(null);
  // Le chargement de la page ne change plus une fois terminé : lu une seule fois.
  const [load] = useState<PageLoadInfo>(() => getPageLoadInfo());

  const refreshServiceWorker = useCallback(async () => {
    setServiceWorker(await getServiceWorkerInfo());
  }, []);

  useEffect(() => {
    void refreshServiceWorker();
  }, [refreshServiceWorker]);

  useEffect(() => {
    const update = () => setDevice(getDeviceInfo());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return {
    build: getBuildInfo(),
    mode: getDisplayMode(),
    address: typeof window !== "undefined" ? window.location.origin : "—",
    device,
    load,
    serviceWorker,
    refreshServiceWorker,
  };
}
