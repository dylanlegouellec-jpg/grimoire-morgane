import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { groupSteps, parseDurationMinutes, triggerHaptic } from "../../utils/helpers";
import Seal from "../common/Seal";
import StepTimer from "./StepTimer";
import PortionBadge from "./PortionBadge";

export default function CookMode({ recipe, onClose, pressDuration = 750 }) {
  const groups = groupSteps(recipe.steps);
  const [groupIndex, setGroupIndex] = useState(0);
  const [done, setDone] = useState(() => groups.map((g) => g.steps.map(() => false)));
  const [showIngredients, setShowIngredients] = useState(false);
  const [servings, setServings] = useState(() => Number(recipe.servings) || 1);

  const currentGroup = groups[groupIndex] || { title: null, steps: [] };
  const currentDone = done[groupIndex] || [];
  const toggleDone = (i) => {
    triggerHaptic(12);
    setDone((prev) => prev.map((g, gi) => (gi === groupIndex ? g.map((d, si) => (si === i ? !d : d)) : g)));
  };
  const totalSteps = groups.reduce((sum, g) => sum + g.steps.length, 0);
  const totalDone = done.reduce((sum, g) => sum + g.filter(Boolean).length, 0);

  const goPrevGroup = () => { triggerHaptic(10); setGroupIndex((i) => Math.max(0, i - 1)); };
  const goNextGroup = () => { triggerHaptic(10); setGroupIndex((i) => Math.min(groups.length - 1, i + 1)); };

  const baseServings = Number(recipe.servings) || 1;
  const ratio = servings / baseServings;
  const scaledIngredients = recipe.ingredients.map((ing) =>
    ing.isSection ? ing : { ...ing, qty: Math.round(ing.qty * ratio * 100) / 100 }
  );

  // Le mode cuisine est sombre et doit bloquer tout scroll de l'arrière-plan :
  // on applique la couleur de fond assortie au conteneur racine (html/body)
  // pour éviter que le crème de base de l'app n'apparaisse pendant le rebond
  // de scroll iOS, et on verrouille le body en position fixe (technique la
  // plus fiable sur iOS Safari, où un simple overflow:hidden ne suffit pas
  // toujours à bloquer le scroll/rebond en arrière-plan) tant que la
  // préparation est ouverte, en restaurant exactement la position au retour.
  useEffect(() => {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;

    document.documentElement.style.backgroundColor = "#2c221e";
    document.body.style.backgroundColor = "#2c221e";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="cookmode-backdrop">
      <div className="cookmode cookmode-list">
        <button className="modal-close" onClick={onClose}><X size={22} /></button>
        <div className="cookmode-progress">{totalDone} / {totalSteps} étapes terminées</div>
        <h2 className="dropcap-title">{recipe.title}</h2>

        <div className="cookmode-ingredients-header">
          <button
            type="button"
            className={`ingredients-toggle ${showIngredients ? "open" : ""}`}
            onClick={() => { triggerHaptic(10); setShowIngredients((v) => !v); }}
          >
            Ingrédients {showIngredients ? "▲" : "▼"}
          </button>
          <PortionBadge value={servings} onChange={setServings} pressDuration={pressDuration} />
        </div>
        {showIngredients && (
          <div className="cookmode-ingredients">
            <ul>
              {scaledIngredients.map((ing, i) =>
                ing.isSection ? (
                  <li key={i} className="ingredient-section-title">{ing.title}</li>
                ) : (
                  <li key={i}>{ing.qty} {ing.unit ? `${ing.unit} ` : ""}— {ing.name}</li>
                )
              )}
            </ul>
          </div>
        )}

        {groups.length > 1 && (
          <div className="group-nav">
            <button type="button" className="group-nav-btn" onClick={goPrevGroup} disabled={groupIndex === 0}>◀</button>
            <span className="group-nav-label">
              {currentGroup.title || `Groupe ${groupIndex + 1}`} <em>({groupIndex + 1}/{groups.length})</em>
            </span>
            <button type="button" className="group-nav-btn" onClick={goNextGroup} disabled={groupIndex === groups.length - 1}>▶</button>
          </div>
        )}
        {groups.length === 1 && currentGroup.title && (
          <h3 className="group-solo-title">{currentGroup.title}</h3>
        )}

        <div className="cookmode-steps">
          {currentGroup.steps.map((s, i) => {
            const duration = parseDurationMinutes(s);
            return (
              <div key={i} className={`cookmode-step-card ${currentDone[i] ? "done" : ""}`} onClick={() => toggleDone(i)}>
                <span className="step-check">{currentDone[i] && <Check size={14} />}</span>
                <div className="step-body">
                  <p className="cookmode-step-text">{s}</p>
                  {duration != null && <StepTimer minutes={duration} />}
                </div>
              </div>
            );
          })}
        </div>

        {groups.length > 1 && groupIndex < groups.length - 1 ? (
          <Seal tone="gold" onClick={goNextGroup}>Groupe suivant ▶</Seal>
        ) : (
          <Seal tone="gold" onClick={onClose}>Terminer la préparation</Seal>
        )}
      </div>
    </div>
  );
}

