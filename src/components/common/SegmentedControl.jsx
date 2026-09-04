import { triggerHaptic } from "../../utils/helpers";

/* ------------------------------------------------------------------ */
/*  CONTRÔLE SEGMENTÉ — style iOS (HIG), pour les réglages à choix       */
/*  exclusif à 2-3 options (Thème, Langue, durée de pression, taille de  */
/*  texte). `options` : [{ value, label, icon? }].                       */
/* ------------------------------------------------------------------ */
export default function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`segmented-btn ${active ? "active" : ""}`}
            onClick={() => { if (!active) { triggerHaptic(15); onChange(opt.value); } }}
          >
            {Icon && <Icon size={14} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
