import { useCallback, useEffect, useRef, useState } from "react";
import { loadCropSourceFromFile, loadCropSourceFromUrl, PhotoSourceError, type CropSource, type PhotoSourceErrorKind } from "../utils/photoCropSource";

/* ------------------------------------------------------------------ */
/*  PHOTO EN COURS DE RECADRAGE — partagé par les écrans qui ouvrent     */
/*  l'éditeur (RecipeOptionsModal, CookPhotoPrompt) : décode la photo     */
/*  (fichier choisi ou photo déjà en place), garde la source tant que      */
/*  l'éditeur est ouvert et libère son URL locale à la fermeture.          */
/*  open*() renvoie null si l'éditeur s'ouvre, sinon le type d'erreur      */
/*  ("decode" : fichier illisible ; "remote" : photo en ligne illisible).  */
/* ------------------------------------------------------------------ */
export default function usePhotoCropSource() {
  const [source, setSource] = useState<CropSource | null>(null);
  const [preparing, setPreparing] = useState(false);
  const sourceRef = useRef<CropSource | null>(null);
  const mountedRef = useRef(true);

  const replace = useCallback((next: CropSource | null) => {
    const prev = sourceRef.current;
    // Libérée un peu plus tard : l'éditeur affiche encore la photo pendant
    // son animation de sortie.
    if (prev && prev !== next) setTimeout(prev.release, 800);
    sourceRef.current = next;
    setSource(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (sourceRef.current) sourceRef.current.release();
      sourceRef.current = null;
    };
  }, []);

  const load = useCallback(async (loader: () => Promise<CropSource>, fallbackKind: PhotoSourceErrorKind): Promise<PhotoSourceErrorKind | null> => {
    setPreparing(true);
    try {
      const next = await loader();
      if (!mountedRef.current) {
        next.release();
        return null;
      }
      replace(next);
      return null;
    } catch (err) {
      console.error("[photo] lecture impossible avant recadrage :", err);
      return err instanceof PhotoSourceError ? err.kind : fallbackKind;
    } finally {
      if (mountedRef.current) setPreparing(false);
    }
  }, [replace]);

  const openFile = useCallback((file: Blob) => load(() => loadCropSourceFromFile(file), "decode"), [load]);
  const openUrl = useCallback((url: string) => load(() => loadCropSourceFromUrl(url), "remote"), [load]);
  const close = useCallback(() => replace(null), [replace]);

  return { source, preparing, openFile, openUrl, close };
}
