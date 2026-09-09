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
/* ------------------------------------------------------------------ */
export default function SegmentedControl({ options, value, onChange, ariaLabel, compact = false }) {
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
            {Icon && <Icon size={14} />}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
