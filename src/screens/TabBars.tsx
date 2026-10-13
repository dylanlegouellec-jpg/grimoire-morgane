import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { motion } from "motion/react";
import { Heart, Search } from "lucide-react";
import { FILTERS } from "../constants";
import { SPRING_PILL } from "../constants/motion";
import { triggerHaptic } from "../utils/helpers";
import { useTranslation } from "../contexts/LanguageContext";

/* Recherche + filtres (Recettes) et recherche (Frigo) : font PARTIE du
      contenu de l'onglet — mêmes classes, même fondu de sortie, même
      entrée, même `key` que le contenu juste en dessous. Ils se fondent
      avec l'ancien contenu, puis le nouveau (barres + contenu) entre
      ensemble : la mise en page ne change que quand tout est invisible.
      Deux essais précédents, abandonnés : (1) des barres qui changeaient
      d'un coup à la bascule — elles restaient opaques pendant que le
      contenu se fondait, puis disparaissaient en une image, et tout sautait
      de 56 à 105 px ; (2) des barres animées en hauteur dès le clic — la
      barre du NOUVEL onglet glissait au-dessus de l'ancien contenu encore
      affiché et le repoussait vers le bas (enregistrement iPhone à l'appui). */

interface TabBarsProps {
  shownTab: string;
  tabExiting: boolean;
  tabSlideStyle: CSSProperties;
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (key: string) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: Dispatch<SetStateAction<boolean>>;
  fridgeSearch: string;
  onFridgeSearchChange: (value: string) => void;
}

export default function TabBars({
  shownTab,
  tabExiting,
  tabSlideStyle,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  fridgeSearch,
  onFridgeSearchChange,
}: TabBarsProps) {
  const { t } = useTranslation();
  if (shownTab !== "recettes" && shownTab !== "frigo") return null;
  return (
    <div
      key={shownTab}
      className={`tab-bars tab-transition${tabExiting ? " tab-exit" : ""}`}
      style={tabSlideStyle}
    >
      {shownTab === "recettes" && (
        <>
          <div className="search-bar">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("app.searchRecipePlaceholder")}
              aria-label={t("app.searchRecipePlaceholder")}
            />
          </div>
          <div className="filter-bar">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  className={`filter-pill ${active ? "active" : ""}`}
                  onClick={() => { triggerHaptic(10); onFilterChange(f.key); }}
                >
                  {/* Pastille dorée glissante — Framer Motion (layoutId
                      "recettes-filter-pill", propre à cette barre : un autre
                      layoutId que celui de RecipePickerModal.jsx, chacun
                      avec son propre état "filter" local, jamais les deux
                      montés à la fois de toute façon mais autant éviter tout
                      risque de collision). */}
                  {active && (
                    <motion.span
                      layoutId="recettes-filter-pill"
                      className="filter-indicator"
                      transition={SPRING_PILL}
                    />
                  )}
                  {t(`filters.${f.key}`)}
                </button>
              );
            })}
            <button
              className={`filter-pill heart-pill ${favoritesOnly ? "active" : ""}`}
              onClick={() => { triggerHaptic(10); onFavoritesOnlyChange((v) => !v); }}
              title={t("app.favoritesTitle")}
            >
              <Heart size={13} fill={favoritesOnly ? "currentColor" : "none"} /> {t("app.favorites")}
            </button>
          </div>

        </>
      )}
      {shownTab === "frigo" && (
        <div className="search-bar">
          <Search size={15} />
          <input
            value={fridgeSearch}
            onChange={(e) => onFridgeSearchChange(e.target.value)}
            placeholder={t("app.searchFridgePlaceholder")}
            aria-label={t("app.searchFridgePlaceholder")}
          />
        </div>
      )}
    </div>
  );
}
