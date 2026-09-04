import { useRef, useState } from "react";
import { ILLUSTRATIONS, resolveIllustrationKey } from "./illustrations";

let dishArtCounter = 0;

export default function DishArt({ recipe }) {
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = `dish-${dishArtCounter++}`;
  const artUid = idRef.current;

  const rawUrl = recipe && recipe.imageUrl;

  // Une image cassée (Pollinations en retard, upload Supabase Storage
  // interrompu, réseau capricieux...) ne doit jamais laisser l'icône [?]
  // du navigateur affichée indéfiniment sur une carte de recette. On
  // retente une fois avec un paramètre anti-cache (un aller-retour raté
  // n'est pas forcément définitif), puis on retombe sur l'illustration
  // vectorielle du Grimoire déjà prévue pour les recettes sans photo —
  // c'est déjà le "placeholder élégant aux couleurs du Grimoire", pas
  // besoin d'en construire un second.
  const [imgSrc, setImgSrc] = useState(rawUrl);
  const [imgFailed, setImgFailed] = useState(false);
  const retriedRef = useRef(false);
  const lastUrlRef = useRef(rawUrl);
  if (lastUrlRef.current !== rawUrl) {
    lastUrlRef.current = rawUrl;
    setImgSrc(rawUrl);
    setImgFailed(false);
    retriedRef.current = false;
  }
  const handleImgError = () => {
    if (!retriedRef.current) {
      retriedRef.current = true;
      const sep = rawUrl.includes("?") ? "&" : "?";
      setImgSrc(`${rawUrl}${sep}retry=${Date.now()}`);
    } else {
      setImgFailed(true);
    }
  };

  const hasImage = Boolean(rawUrl) && !imgFailed;

  if (hasImage) {
    // Photo personnelle ou illustration IA : rendu net, sans masque ni
    // fusion avec le parchemin — l'image s'affiche telle quelle, dans
    // un cadre rectangulaire classique.
    //
    // Le menu contextuel natif iOS (Copier / Partager / Enregistrer dans
    // Photos) se déclenche sur l'appui long d'un <img> : on neutralise
    // onContextMenu, ET on place un <div> transparent par-dessus l'image
    // (pointer-events actif sur ce calque, désactivé sur l'<img> elle-même)
    // pour que le doigt touche toujours le calque, jamais l'image.
    //
    // crossOrigin="anonymous" : sans lui, cet <img> (affiché à CHAQUE vue
    // d'une recette illustrée, donc bien plus souvent qu'un export) fait
    // une requête "no-cors" — le service worker (voir la règle
    // "pollinations-images"/"supabase-storage-images" dans vite.config.js)
    // met alors en cache une réponse OPAQUE pour cette URL. Un cache
    // opaque est ensuite systématiquement resservi, MÊME à une requête
    // CORS ultérieure (ex. le fetch() de recipeCardCanvas.js pour l'export
    // carte) — rendant l'image illisible pour le canvas à chaque fois,
    // quelle que soit la méthode de chargement utilisée côté export.
    // Pollinations.ai et le bucket Supabase Storage envoient tous deux
    // Access-Control-Allow-Origin: * (vérifié), donc ce mode CORS ne change
    // rien à l'affichage — il garantit juste que la réponse mise en cache
    // reste exploitable partout, y compris par le canvas.
    return (
      <div
        className="illus illus-art illus-photo-frame"
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          src={imgSrc}
          alt={recipe.title || "Illustration de la recette"}
          className="illus-photo"
          draggable="false"
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
          onError={handleImgError}
        />
        <div className="illus-photo-guard" aria-hidden="true" />
      </div>
    );
  }

  // --- Pas d'image : illustration vectorielle d'origine, inchangée ---
  const key = resolveIllustrationKey(recipe);
  const config = ILLUSTRATIONS[key];
  const Render = config.render;
  const [light, mid, dark] = config.palette;
  return (
    <div className="illus illus-art">
      <svg viewBox="0 0 200 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Dégradé de fond doux — n'affecte que l'arrière-plan, jamais
              le dessin vectoriel lui-même (dessiné par <Render> par-dessus). */}
          <radialGradient id={`bg-${artUid}`} cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor={light} stopOpacity="0.55" />
            <stop offset="100%" stopColor={dark} stopOpacity="0.35" />
          </radialGradient>
          <linearGradient id={`main-${artUid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={light} />
            <stop offset="60%" stopColor={mid} />
            <stop offset="100%" stopColor={dark} />
          </linearGradient>
          <filter id={`shadow-${artUid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2a2013" floodOpacity="0.35" />
          </filter>
        </defs>
        <rect width="200" height="150" fill="var(--parchment)" />
        <rect width="200" height="150" fill={`url(#bg-${artUid})`} />
        <Render uid={artUid} />
      </svg>
    </div>
  );
}
