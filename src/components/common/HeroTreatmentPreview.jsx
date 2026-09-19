import { HERO_TREATMENTS } from "../../constants";
import { useTranslation } from "../../contexts/LanguageContext";
import DishArt from "../art/DishArt";
import HeroTreatment, { heroTreatmentClassName, isLegendTreatment } from "../recipe/HeroTreatment";

// Recette factice, sans photo (aucun `imageUrl`) : DishArt retombe alors
// sur l'illustration vectorielle du Grimoire, déjà pensée pour ce cas
// (voir DishArt.jsx) — garantit un aperçu identique pour tout le monde,
// sans dépendre d'une photo personnelle ni du réseau.
const PREVIEW_RECIPE = { title: "Bûche pâtissière", category: "Sucré", illustrationKey: "chocolat" };

// Un seul rendu du habillage (voir HeroTreatment.jsx) réutilisé ici pour
// l'aperçu ET par RecipeDetail.jsx pour la vraie fiche — jamais deux
// implémentations à maintenir en parallèle qui pourraient diverger.
function HeroTreatmentCard({ treatment, mini }) {
  return (
    <div className={`hero-preview-frame ${mini ? "hero-preview-mini" : ""}`}>
      <div className={`detail-hero hero-preview-hero ${heroTreatmentClassName(treatment)}`}>
        <div className="detail-hero-parallax">
          <DishArt recipe={PREVIEW_RECIPE} />
        </div>
        <HeroTreatment treatment={treatment} />
        {isLegendTreatment(treatment) && (
          <div className="hero-legende-caption">
            <span className="chip chip-sucre">Sucré</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HeroTreatmentPreview({ value, onChange }) {
  const { dict } = useTranslation();
  return (
    <>
      <div className="ios-group hero-preview-big">
        <HeroTreatmentCard treatment={value} />
      </div>
      <div className="hero-swatch-row">
        {HERO_TREATMENTS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`hero-swatch ${value === opt.key ? "active" : ""}`}
            onClick={() => onChange(opt.key)}
            aria-pressed={value === opt.key}
          >
            <HeroTreatmentCard treatment={opt.key} mini />
            <span className="hero-swatch-label">{dict.labels[opt.label] || opt.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
