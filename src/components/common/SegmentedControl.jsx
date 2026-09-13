import { useId } from "react";
import { motion } from "motion/react";
import { triggerHaptic } from "../../utils/helpers";

/* ------------------------------------------------------------------ */
/*  CONTRÔLE SEGMENTÉ — style iOS (HIG), pour les réglages à choix       */
/*  exclusif à 2-3 options (Thème, Langue, durée de pression, taille de  */
/*  texte, portée du plan de repas). `options` :                         */
/*  [{ value, label, icon?, ariaLabel? }] — `label` peut être vide pour   */
/*  une variante uniquement iconographique (voir PlanningView.jsx) ;       */
/*  dans ce cas `ariaLabel` (ou `label` s'il existe) porte le nom annoncé   */
/*  aux lecteurs d'écran, puisqu'aucun texte visible ne le fait plus.       */
/*  `compact` : largeur au contenu plutôt qu'étirée sur toute la ligne     */
/*  (utile pour une variante iconographique à 2 options, qui n'a pas         */
/*  besoin d'occuper toute la largeur comme Thème/Langue). */
/*                                                                        */
/*  Fond de l'option active glissant d'une option à l'autre — Framer      */
/*  Motion `layoutId`, même principe que .nav-pill (NavButton.jsx) et      */
/*  .filter-indicator (AppShell.jsx/RecipePickerModal.jsx). `useId()`       */
/*  donne à CHAQUE instance de ce composant partagé son propre layoutId :   */
/*  plusieurs contrôles segmentés distincts peuvent être montés en même     */
/*  temps à l'écran (ex. Thème ET Langue dans les Réglages) — sans un id     */
/*  propre à chacun, Framer les confondrait en un seul groupe et ferait      */
/*  glisser leurs pastilles l'une vers l'autre au montage.                    */
/* ------------------------------------------------------------------ */
export default function SegmentedControl({ options, value, onChange, ariaLabel, compact = false }) {
  const layoutId = useId();
  return (
    <div className={`segmented ${compact ? "segmented-compact" : ""}`} role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={opt.ariaLabel || opt.label || undefined}
            title={opt.ariaLabel || opt.label || undefined}
            className={`segmented-btn ${active ? "active" : ""}`}
            onClick={() => { if (!active) { triggerHaptic(15); onChange(opt.value); } }}
          >
            {active && (
              <motion.span
                layoutId={`${layoutId}-pill`}
                className="segmented-pill"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {Icon && <Icon size={14} />}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
