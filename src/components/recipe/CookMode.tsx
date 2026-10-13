import { useState, useEffect, useRef, type MouseEvent } from "react";
import { Check, ChevronRight, Pause, Play, Square, Volume2, X } from "lucide-react";
import { groupSteps, parseDurationMinutes, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { overrideStatusBarColor } from "../../utils/theme";
import useWakeLock from "../../hooks/useWakeLock";
import Seal from "../common/Seal";
import StepTimer from "./StepTimer";
import PortionBadge from "./PortionBadge";
import type { Recipe } from "../../hooks/useRecipes";
import {
  clearCookTimers,
  formatRemaining,
  getRemainingMs,
  removeCookTimer,
  toggleCookTimer,
  useCookTimers,
} from "../../utils/cookTimers";

// Lecture à voix haute : API native du navigateur, absente de certains
// navigateurs intégrés (et de jsdom) — le bouton n'est alors pas affiché.
function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

interface CookModeProps {
  recipe: Recipe;
  onClose: () => void;
  pressDuration?: number;
}

// Contrairement à RecipeDetail.jsx/RecipeForm.jsx, ce composant ne passait
// jusqu'ici AUCUN texte de recette (titre, ingrédients, étapes) — ni les
// libellés fixes de son interface ("Ingrédients", "Groupe suivant"...) —
// par translateRecipeText()/t() : tout restait en français quelle que soit
// la langue choisie dans les Réglages, y compris pendant la préparation
// elle-même (l'écran le plus consulté d'une recette en cuisinant).
export default function CookMode({ recipe, onClose, pressDuration = 750 }: CookModeProps) {
  const { t, language } = useTranslation();
  useWakeLock();
  const groups = groupSteps(recipe.steps);
  const [groupIndex, setGroupIndex] = useState(0);
  const [done, setDone] = useState(() => groups.map((g) => g.steps.map(() => false)));
  const [showIngredients, setShowIngredients] = useState(false);
  const [servings, setServings] = useState(() => Number(recipe.servings) || 1);
  const { timers, now } = useCookTimers();
  const canSpeak = speechAvailable();
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentGroup = groups[groupIndex] || { title: null, steps: [] };
  const currentDone = done[groupIndex] || [];
  const toggleDone = (i: number) => {
    triggerHaptic(12);
    setDone((prev) => prev.map((g, gi) => (gi === groupIndex ? g.map((d, si) => (si === i ? !d : d)) : g)));
  };
  const totalSteps = groups.reduce((sum, g) => sum + g.steps.length, 0);
  const totalDone = done.reduce((sum, g) => sum + g.filter(Boolean).length, 0);

  // Une seule lecture à la fois : relancer la même étape l'arrête, en lancer
  // une autre coupe la précédente.
  const stopSpeaking = () => {
    utteranceRef.current = null;
    setSpeakingIndex(null);
    if (speechAvailable()) window.speechSynthesis.cancel();
  };
  const toggleSpeak = (e: MouseEvent<HTMLButtonElement>, i: number, text: string) => {
    e.stopPropagation(); // la carte se coche au clic : la lecture ne doit pas la cocher
    if (!speechAvailable()) return;
    if (speakingIndex === i) { stopSpeaking(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "fr" ? "fr-FR" : "en-US";
    // cancel() déclenche aussi la fin de l'ancienne lecture : on ne remet à
    // zéro que si c'est bien la lecture en cours qui s'achève.
    const finish = () => {
      if (utteranceRef.current === utterance) { utteranceRef.current = null; setSpeakingIndex(null); }
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    utteranceRef.current = utterance;
    setSpeakingIndex(i);
    window.speechSynthesis.speak(utterance);
  };

  // Changer de groupe d'étapes (ou fermer le mode cuisine) coupe la lecture.
  useEffect(() => () => {
    utteranceRef.current = null;
    setSpeakingIndex(null);
    if (speechAvailable()) window.speechSynthesis.cancel();
  }, [groupIndex]);

  // Les minuteurs vivent le temps du mode cuisine (comme avant, quand ils
  // disparaissaient avec lui) : on les vide à la fermeture.
  useEffect(() => () => clearCookTimers(), []);

  const goPrevGroup = () => { triggerHaptic(10); setGroupIndex((i) => Math.max(0, i - 1)); };
  const goNextGroup = () => { triggerHaptic(10); setGroupIndex((i) => Math.min(groups.length - 1, i + 1)); };

  const baseServings = Number(recipe.servings) || 1;
  const ratio = servings / baseServings;
  const scaledIngredients = recipe.ingredients.map((ing) =>
    "isSection" in ing ? ing : { ...ing, qty: Math.round((ing.qty ?? 0) * ratio * 100) / 100 }
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
    // Capturée telle quelle (pas re-dérivée du thème courant à la
    // fermeture, voir plus bas) : la couleur EXACTE affichée juste avant
    // l'ouverture est la seule certaine d'être correcte pour y revenir,
    // quel que soit le thème réel au moment considéré.
    const prevMeta = document.querySelector('meta[name="theme-color"]');
    const prevMetaColor = prevMeta ? prevMeta.getAttribute("content") : null;

    document.documentElement.style.backgroundColor = "#2c221e";
    document.body.style.backgroundColor = "#2c221e";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    // Le fond ci-dessus est peint directement en style inline, sans jamais
    // passer par applyTheme() (utils/theme.js) : la balise <meta
    // name="theme-color"> continue donc de refléter le thème réel de l'app
    // (souvent clair), pas ce fond sombre — d'où la barre d'état d'une PWA
    // installée qui ne correspond à rien de visible à l'écran en mode
    // cuisine. On l'aligne explicitement ici, et on restaure la couleur
    // capturée ci-dessus à la fermeture (voir plus bas).
    overrideStatusBarColor("#2c221e");

    return () => {
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
      if (prevMetaColor != null) overrideStatusBarColor(prevMetaColor);
    };
  }, []);

  return (
    <div className="cookmode-backdrop">
      <div className="cookmode cookmode-list">
        <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={22} /></button>
        <div className="cookmode-progress">{t("cookMode.stepsDone", { done: totalDone, total: totalSteps })}</div>
        {timers.length > 0 && (
          <div className="cookmode-timers" role="list" aria-label={t("cookExtras.timers.title")}>
            {timers.map((timer) => {
              const isDone = timer.status === "done";
              const time = isDone ? t("cookExtras.timers.done") : formatRemaining(getRemainingMs(timer, now));
              return (
                <div key={timer.key} role="listitem" className={`cookmode-timer-chip ${timer.status}`}>
                  <button
                    type="button"
                    className="cookmode-timer-main"
                    onClick={() => { triggerHaptic(10); setGroupIndex(timer.groupIndex); }}
                    aria-label={t("cookExtras.timers.goToStep", { label: timer.label, time })}
                  >
                    <span className="cookmode-timer-label">{timer.label}</span>
                    <span className="cookmode-timer-time">{time}</span>
                  </button>
                  {isDone ? (
                    <button type="button" className="cookmode-timer-action" onClick={() => removeCookTimer(timer.key)} aria-label={t("cookExtras.timers.remove")}>
                      <X size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="cookmode-timer-action"
                      onClick={() => toggleCookTimer(timer.key)}
                      aria-label={timer.status === "running" ? t("cookExtras.timers.pause") : t("cookExtras.timers.resume")}
                    >
                      {timer.status === "running" ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <h2 className="dropcap-title">{translateRecipeText(recipe.title, language)}</h2>

        <div className="cookmode-ingredients-header">
          <button
            type="button"
            className={`ingredients-toggle ${showIngredients ? "open" : ""}`}
            onClick={() => { triggerHaptic(10); setShowIngredients((v) => !v); }}
          >
            {t("cookMode.ingredients")} {showIngredients ? "▲" : "▼"}
          </button>
          <PortionBadge value={servings} onChange={setServings} pressDuration={pressDuration} />
        </div>
        {showIngredients && (
          <div className="cookmode-ingredients">
            <ul>
              {scaledIngredients.map((ing, i) =>
                "isSection" in ing ? (
                  <li key={i} className="ingredient-section-title">{translateRecipeText(ing.title, language)}</li>
                ) : (
                  <li key={i}>{ing.qty} {ing.unit ? `${translateRecipeText(ing.unit, language)} ` : ""}— {translateRecipeText(ing.name, language)}</li>
                )
              )}
            </ul>
          </div>
        )}

        {groups.length > 1 && (
          <div className="group-nav">
            <button type="button" className="group-nav-btn" onClick={goPrevGroup} disabled={groupIndex === 0} aria-label={t("cookMode.previousGroup")}>◀</button>
            <span className="group-nav-label">
              {currentGroup.title ? translateRecipeText(currentGroup.title, language) : t("cookMode.group", { index: groupIndex + 1 })} <em>({groupIndex + 1}/{groups.length})</em>
            </span>
            <button type="button" className="group-nav-btn" onClick={goNextGroup} disabled={groupIndex === groups.length - 1} aria-label={t("cookMode.nextGroup")}>▶</button>
          </div>
        )}
        {groups.length === 1 && currentGroup.title && (
          <h3 className="group-solo-title">{translateRecipeText(currentGroup.title, language)}</h3>
        )}

        <div className="cookmode-steps">
          {currentGroup.steps.map((s, i) => {
            const duration = parseDurationMinutes(s);
            const text = translateRecipeText(s, language);
            const speaking = speakingIndex === i;
            return (
              <div key={i} className={`cookmode-step-card ${currentDone[i] ? "done" : ""}`} onClick={() => toggleDone(i)}>
                <span className="step-check">{currentDone[i] && <Check size={14} />}</span>
                <div className="step-body">
                  <p className="cookmode-step-text">{text}</p>
                  {(duration != null || canSpeak) && (
                    <div className="cookmode-step-actions">
                      {duration != null && <StepTimer minutes={duration} groupIndex={groupIndex} stepIndex={i} label={text} />}
                      {canSpeak && (
                        <button
                          type="button"
                          className={`step-speak-btn ${speaking ? "speaking" : ""}`}
                          onClick={(e) => toggleSpeak(e, i, text)}
                          aria-label={speaking ? t("cookExtras.speech.stop") : t("cookExtras.speech.read")}
                          aria-pressed={speaking}
                        >
                          {speaking ? <Square size={14} /> : <Volume2 size={16} />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {groups.length > 1 && groupIndex < groups.length - 1 ? (
          <Seal tone="gold" onClick={goNextGroup}>{t("cookMode.nextGroup")} <ChevronRight size={16} /></Seal>
        ) : (
          <Seal tone="gold" onClick={onClose}>{t("cookMode.finish")}</Seal>
        )}
      </div>
    </div>
  );
}
