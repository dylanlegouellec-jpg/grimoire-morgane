import { useRef } from "react";
import { ILLUSTRATIONS, resolveIllustrationKey } from "./illustrations";

let dishArtCounter = 0;

export default function DishArt({ recipe }) {
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = `dish-${dishArtCounter++}`;
  const artUid = idRef.current;

  const hasImage = Boolean(recipe && recipe.imageUrl);

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
    return (
      <div
        className="illus illus-art illus-photo-frame"
        onContextMenu={(e) => e.preventDefault()}
      >
        <img
          src={recipe.imageUrl}
          alt={recipe.title || "Illustration de la recette"}
          className="illus-photo"
          draggable="false"
          loading="lazy"
          decoding="async"
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
