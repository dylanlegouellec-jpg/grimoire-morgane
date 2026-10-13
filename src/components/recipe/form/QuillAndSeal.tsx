import type { CSSProperties } from "react";
import { QUILL_CHAR_MS, QUILL_START_MS } from "./createAnimations";

/* ------------------------------------------------------------------ */
/*  TITRE À LA PLUME + SCEAU DE CIRE (formulaire de recette)            */
/*  Purement visuel : les minutages et la logique sont dans              */
/*  createAnimations.ts, les @keyframes dans styles/createAnimations.css. */
/* ------------------------------------------------------------------ */

/**
 * Titre qui s'écrit lettre par lettre, une pointe de plume dorée devant.
 * Les lettres animées sont aria-hidden : un lecteur d'écran lit le titre
 * entier, d'un bloc, dans le span masqué qui suit.
 */
export function QuillTitle({ text, play }: { text: string; play: boolean }) {
  if (!play) return <>{text}</>;
  const chars = Array.from(text);
  const style = {
    "--quill-start": `${QUILL_START_MS}ms`,
    "--quill-write": `${chars.length * QUILL_CHAR_MS}ms`,
  } as CSSProperties;
  return (
    <>
      <span className="quill-title" aria-hidden="true" style={style}>
        {chars.map((c, i) => (
          <span key={i} className="quill-char" style={{ animationDelay: `${QUILL_START_MS + i * QUILL_CHAR_MS}ms` }}>
            {c}
          </span>
        ))}
        <span className="quill-nib-track">
          <span className="quill-nib" />
        </span>
      </span>
      <span className="quill-sr">{text}</span>
    </>
  );
}

// Contour du cachet : un disque aux bords irréguliers (la cire écrasée
// déborde), calculé une fois. Deux ondulations superposées pour éviter un
// motif trop régulier.
const BLOB_PATH = (() => {
  const pts: string[] = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 52 + 2.6 * Math.sin(a * 7 + 0.6) + 1.6 * Math.sin(a * 11 + 2.1);
    pts.push(`${(60 + r * Math.cos(a)).toFixed(1)} ${(60 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
})();

// Éclats dorés qui s'échappent à l'impact : angle (deg), distance (px),
// taille (px), léger décalage de départ (ms).
const SPARKS: Array<[number, number, number, number]> = [
  [-84, 104, 13, 0], [-50, 86, 9, 20], [-18, 112, 11, 10], [14, 90, 8, 30],
  [44, 108, 12, 0], [78, 84, 9, 25], [112, 104, 11, 10], [146, 88, 8, 35],
  [178, 110, 12, 5], [210, 86, 9, 20], [242, 106, 11, 15], [-118, 92, 8, 30],
];

/**
 * Cachet de cire qui tombe sur la page, s'écrase avec un petit rebond et
 * libère quelques éclats dorés. Positionné en absolu dans la feuille
 * (`top` en px dans son contenu défilant) : il vole avec elle vers la
 * carte ensuite. Décoratif : aria-hidden.
 */
export function WaxSeal({ top }: { top: number }) {
  return (
    <div className="wax-seal-stage" style={{ top }} aria-hidden="true">
      <div className="wax-seal-shadow" />
      <div className="wax-seal-splash" />
      <div className="wax-seal-drop">
        <svg viewBox="0 0 120 120" width="100%" height="100%" focusable="false">
          <defs>
            <radialGradient id="wax-body" cx="38%" cy="32%" r="75%">
              <stop offset="0" className="wax-stop-hi" />
              <stop offset="0.55" className="wax-stop-mid" />
              <stop offset="1" className="wax-stop-deep" />
            </radialGradient>
            <radialGradient id="wax-gloss" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d={BLOB_PATH} fill="url(#wax-body)" />
          {/* Bourrelet : la cire repoussée par la matrice. */}
          <circle cx="60" cy="60" r="40" fill="none" className="wax-rim-dark" strokeWidth="5" />
          <circle cx="59" cy="59" r="40" fill="none" stroke="rgba(255,214,214,0.22)" strokeWidth="1.5" />
          <circle cx="60" cy="60" r="34" fill="none" className="wax-rim-dark" strokeWidth="1.2" strokeDasharray="2 3.2" />
          {/* Initiale en creux : un reflet clair décalé, puis la lettre sombre. */}
          <text x="60" y="75" textAnchor="middle" className="wax-letter-light">M</text>
          <text x="60" y="74" textAnchor="middle" className="wax-letter">M</text>
          <ellipse cx="42" cy="34" rx="20" ry="11" fill="url(#wax-gloss)" transform="rotate(-28 42 34)" />
        </svg>
      </div>
      <div className="wax-sparks">
        {SPARKS.map(([angle, dist, size, delay], i) => (
          <span
            key={i}
            className="wax-spark"
            style={{ "--a": `${angle}deg`, "--d": `${dist}px`, "--s": `${size}px`, "--delay": `${delay}ms` } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
