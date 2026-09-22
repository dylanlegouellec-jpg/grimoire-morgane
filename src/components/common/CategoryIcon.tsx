import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { useIconStyle } from "../../contexts/IconStyleContext";

interface CategoryIconProps {
  emoji: string;
  icon?: LucideIcon;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/* ------------------------------------------------------------------ */
/*  ICÔNE DE CATÉGORIE — rend soit l'emoji existant, soit son équivalent   */
/*  vectoriel (lucide-react), selon le réglage "Style des icônes"           */
/*  (Réglages > Apparence). `icon` est le composant lucide déjà résolu       */
/*  par l'appelant (ex. AISLES[i].vectorIcon) — jamais résolu ici, pour        */
/*  garder un seul point de correspondance emoji -> icône par domaine de        */
/*  données (rayons de courses, moments de repas...), au plus près de leur        */
/*  définition (utils/helpers.js, utils/planning.js, pantryUtils.js) plutôt        */
/*  que dispersé dans chaque composant qui les affiche.                              */
/* ------------------------------------------------------------------ */
export default function CategoryIcon({ emoji, icon: Icon, size = 16, className, style }: CategoryIconProps) {
  const iconStyle = useIconStyle();
  if (iconStyle === "vector" && Icon) {
    return <Icon size={size} className={className} style={style} aria-hidden="true" />;
  }
  return (
    <span className={className} style={style} aria-hidden="true">
      {emoji}
    </span>
  );
}
