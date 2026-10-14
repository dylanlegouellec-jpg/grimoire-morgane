import { useState, useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronRight, Pause, Play, X } from "lucide-react";
import { groupSteps, parseDurationMinutes, triggerHaptic } from "../../utils/helpers";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { overrideStatusBarColor } from "../../utils/theme";
import useWakeLock from "../../hooks/useWakeLock";
import useLongPress from "../../hooks/useLongPress";
import Seal from "../common/Seal";
import StepTimer from "./StepTimer";
import PortionBadge from "./PortionBadge";
import CookPhotoPrompt from "./CookPhotoPrompt";
import AnimatedNumber from "../common/AnimatedNumber";
import { formatQuantity, scaleQuantity } from "../../utils/ingredients";
import type { ShowToast } from "../../hooks/useToast";
import type { Recipe } from "../../hooks/useRecipes";
import {
  formatRemaining,
  getCookSession,
  getCookTimersSnapshot,
  getRemainingMs,
  isActiveCookTimer,
  releaseCookTimers,
  removeCookTimer,
  saveCookSession,
  type CookSession,
  toggleCookTimer,
  useCookTimers,
} from "../../utils/cookTimers";

// Lecture à voix haute : API native du navigateur, absente de certains
// navigateurs intégrés (et de jsdom) — l'appui long sur une étape ne fait
// alors rien de plus qu'un appui court.
function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

// Même condition que la mise en page deux colonnes de cookmode.css.
const LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 500px)";

// Durée de défilement des quantités quand les parts changent : un peu plus
// longue que le nombre de parts lui-même, pour que l'œil suive la cascade.
const QTY_ROLL_S = 0.45;

/* ------------------------------------------------------------------ */
/*  CARTE D'ÉTAPE — appui court : cocher ; appui long : lire à voix     */
/*  haute (remplace les anciens boutons haut-parleur, jugés peu jolis). */
/*  Composant à part : useLongPress est un hook, il ne peut pas être    */
/*  appelé dans le .map() des étapes. Le hook gère déjà l'annulation au  */
/*  moindre déplacement du doigt (défilement fluide, écouteurs passifs),  */
/*  le retour haptique au déclenchement et le menu contextuel ; il suffit */
/*  ici d'ignorer le clic qui suit un appui long (wasLongPress).          */
/* ------------------------------------------------------------------ */
interface CookStepCardProps {
  text: string;
  done: boolean;
  speaking: boolean;
  canSpeak: boolean;
  duration: number | null;
  groupIndex: number;
  stepIndex: number;
  pressDuration: number;
  recipeId: string | null;
  onToggle: () => void;
  onSpeak: () => void;
}

// Après un vrai toucher, les navigateurs mobiles émettent encore des
// événements souris « de compatibilité » (mousedown/mouseup/click) juste
// après le relâchement (compté depuis touchend : un appui long dure
// lui-même plus longtemps que ce délai) : sans
// ce délai, ce mousedown relancerait l'appui long et effacerait le fait
// qu'il vient d'être déclenché — le clic qui suit cocherait alors l'étape.
const TOUCH_MOUSE_GUARD_MS = 1000;

function CookStepCard({ text, done, speaking, canSpeak, duration, groupIndex, stepIndex, pressDuration, recipeId, onToggle, onSpeak }: CookStepCardProps) {
  const { t } = useTranslation();
  const longPress = useLongPress<HTMLDivElement>(onSpeak, pressDuration);
  const lastTouchRef = useRef(0);

  const handleClick = () => {
    if (longPress.wasLongPress()) return;
    onToggle();
  };
  // Clavier : Entrée / Espace cochent, comme un appui court.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // ex. bouton du minuteur
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
  };

  return (
    <div
      // Sans synthèse vocale, pas d'appui long : la ref n'est pas posée,
      // le hook n'attache donc aucun écouteur tactile.
      ref={canSpeak ? longPress.ref : undefined}
      className={`cookmode-step-card ${done ? "done" : ""} ${speaking ? "speaking" : ""} ${longPress.pressState === "pressing" ? "pressing" : ""}`}
      role="checkbox"
      aria-checked={done}
      aria-description={canSpeak ? t("cookFixes.longPressHint") : undefined}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={(e: MouseEvent) => e.preventDefault()}
      onTouchStart={() => { lastTouchRef.current = Date.now(); }}
      onTouchEnd={() => { lastTouchRef.current = Date.now(); }}
      onMouseDown={canSpeak ? (e) => { if (Date.now() - lastTouchRef.current > TOUCH_MOUSE_GUARD_MS) longPress.handlers.onMouseDown(e); } : undefined}
      onMouseUp={canSpeak ? longPress.handlers.onMouseUp : undefined}
      onMouseLeave={canSpeak ? longPress.handlers.onMouseLeave : undefined}
    >
      <span className="step-check" aria-hidden="true">{done && <Check size={14} />}</span>
      <div className="step-body">
        <p className="cookmode-step-text">{text}</p>
        {duration != null && (
          <div className="cookmode-step-actions">
            <StepTimer minutes={duration} groupIndex={groupIndex} stepIndex={stepIndex} label={text} recipeId={recipeId} />
          </div>
        )}
      </div>
    </div>
  );
}

interface CookModeProps {
  recipe: Recipe;
  onClose: () => void;
  pressDuration?: number;
  // Enregistrement de la recette (photo du plat en fin de préparation,
  // voir CookPhotoPrompt) — absent : pas de proposition de photo.
  onUpdateRecipe?: (recipe: Recipe) => Promise<void> | void;
  householdId?: string | null;
  showToast?: ShowToast;
  // Parts choisies sur la fiche recette au lancement ; absent : celles d'une
  // préparation reprise (voir getCookSession), sinon celles de la recette.
  initialServings?: number;
}

// Contrairement à RecipeDetail.jsx/RecipeForm.jsx, ce composant ne passait
// jusqu'ici AUCUN texte de recette (titre, ingrédients, étapes) — ni les
// libellés fixes de son interface ("Ingrédients", "Groupe suivant"...) —
// par translateRecipeText()/t() : tout restait en français quelle que soit
// la langue choisie dans les Réglages, y compris pendant la préparation
// elle-même (l'écran le plus consulté d'une recette en cuisinant).
export default function CookMode({ recipe, onClose, pressDuration = 750, onUpdateRecipe, householdId = null, showToast, initialServings }: CookModeProps) {
  const { t, language } = useTranslation();
  const reduceMotion = useReducedMotion();
  useWakeLock();
  const groups = groupSteps(recipe.steps);
  const recipeId = recipe.id || null;
  // Préparation reprise : quitter le mode cuisine alors qu'un minuteur
  // tourne ne la termine plus (voir utils/cookTimers.ts, CookTimerPill) —
  // parts, groupe affiché et étapes cochées sont retrouvés en rouvrant.
  // On repart de zéro si la recette n'a plus aucun minuteur (tous arrêtés
  // depuis la pastille) ou si ses étapes ont changé entre-temps.
  const [resumed] = useState(() => {
    const hasTimers = getCookTimersSnapshot().timers.some((tm) => tm.recipeId === recipeId);
    const saved = recipeId && hasTimers ? getCookSession(recipeId) : undefined;
    return saved && saved.done.length === groups.length && saved.done.every((g, i) => g.length === groups[i].steps.length)
      ? saved : undefined;
  });
  const [groupIndex, setGroupIndex] = useState(() => resumed?.groupIndex ?? 0);
  const [done, setDone] = useState(() => resumed?.done ?? groups.map((g) => g.steps.map(() => false)));
  // En paysage sur téléphone (deux colonnes, voir cookmode.css), la
  // colonne de gauche a la place d'afficher les ingrédients d'emblée.
  const [showIngredients, setShowIngredients] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia(LANDSCAPE_QUERY).matches);
  const baseServings = Number(recipe.servings) || 1;
  const [servings, setServings] = useState(() => Math.max(1, Math.round(Number(initialServings) || resumed?.servings || baseServings)));
  const [portionsOpen, setPortionsOpen] = useState(false);
  const { timers: allTimers, now } = useCookTimers();
  // Le bandeau ne montre que les minuteurs de CETTE recette ; ceux d'une
  // autre préparation restent sur la pastille flottante (CookTimerPill).
  const timers = allTimers.filter((tm) => tm.recipeId === recipeId);
  // Photo du plat proposée seulement si la recette n'en a AUCUNE (ni
  // personnelle, ni illustration IA) à l'ouverture du mode cuisine — figé
  // ici pour que l'encart ne disparaisse pas juste après l'envoi.
  const [offerPhoto] = useState(() => !recipe.imageUrl);
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
  const toggleSpeak = (i: number, text: string) => {
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

  // Fermeture : les minuteurs terminés de la recette sont retirés, ceux qui
  // tournent continuent (pastille flottante) — et la préparation (parts,
  // groupe, étapes cochées) est gardée pour la reprendre en rouvrant.
  const sessionRef = useRef<CookSession>({ servings, groupIndex, done });
  useEffect(() => { sessionRef.current = { servings, groupIndex, done }; }, [servings, groupIndex, done]);
  useEffect(() => () => {
    releaseCookTimers(recipeId);
    if (!recipeId) return;
    const stillActive = getCookTimersSnapshot().timers.some((tm) => tm.recipeId === recipeId && isActiveCookTimer(tm));
    saveCookSession(recipeId, stillActive ? sessionRef.current : null);
  }, [recipeId]);

  // Sélecteur de parts ouvert : les ingrédients s'affichent (on voit les
  // quantités changer), Échap referme.
  const openPortions = () => {
    triggerHaptic(10);
    setShowIngredients(true);
    setPortionsOpen(true);
  };
  useEffect(() => {
    if (!portionsOpen) return undefined;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setPortionsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [portionsOpen]);

  const goPrevGroup = () => { triggerHaptic(10); setGroupIndex((i) => Math.max(0, i - 1)); };
  const goNextGroup = () => { triggerHaptic(10); setGroupIndex((i) => Math.min(groups.length - 1, i + 1)); };

  const scaledIngredients = recipe.ingredients.map((ing) =>
    "isSection" in ing ? ing : { ...ing, qty: scaleQuantity(ing.qty, servings, baseServings) }
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
      <div className={`cookmode cookmode-list ${portionsOpen ? "portions-open" : ""}`}>
        {/* Fond flouté du sélecteur de parts : seuls l'en-tête des
            ingrédients et leur liste restent nets, au-dessus (cookmode.css).
            Un appui à côté referme. */}
        <AnimatePresence>
          {portionsOpen && (
            <motion.div
              key="portions-scrim"
              className="cookmode-portions-scrim"
              aria-hidden="true"
              onClick={() => setPortionsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
            />
          )}
        </AnimatePresence>
        <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={22} /></button>
        {/* Deux colonnes en paysage (voir cookmode.css) ; en portrait, ces
            enveloppes sont en display: contents — mise en page inchangée. */}
        <div className="cookmode-side">
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
            <PortionBadge
              value={servings}
              onChange={setServings}
              open={portionsOpen}
              onOpenChange={(next) => (next ? openPortions() : setPortionsOpen(false))}
            />
          </div>
          <AnimatePresence initial={false}>
            {showIngredients && (
              <motion.div
                key="ingredients"
                className="cookmode-ingredients-reveal"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="cookmode-ingredients">
                  <ul>
                    {scaledIngredients.map((ing, i) =>
                      "isSection" in ing ? (
                        <li key={i} className="ingredient-section-title">{translateRecipeText(ing.title, language)}</li>
                      ) : (
                        <li key={i}>
                          {/* Toucher une quantité ouvre aussi le sélecteur de parts. */}
                          {ing.qty != null && (
                            <button
                              type="button"
                              className="cookmode-qty"
                              onClick={() => { if (!portionsOpen) openPortions(); }}
                              aria-description={t("cookPortions.qtyHint")}
                            >
                              <AnimatedNumber value={ing.qty} format={formatQuantity} duration={QTY_ROLL_S} />
                            </button>
                          )}
                          {ing.qty != null ? " " : ""}{ing.unit ? `${translateRecipeText(ing.unit, language)} ` : ""}{ing.qty != null || ing.unit ? "— " : ""}{translateRecipeText(ing.name, language)}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
        </div>

        <div className="cookmode-main">
          <div className="cookmode-steps">
            {currentGroup.steps.map((s, i) => {
              const text = translateRecipeText(s, language);
              return (
                <CookStepCard
                  key={i}
                  text={text}
                  done={Boolean(currentDone[i])}
                  speaking={speakingIndex === i}
                  canSpeak={canSpeak}
                  duration={parseDurationMinutes(s)}
                  groupIndex={groupIndex}
                  stepIndex={i}
                  pressDuration={pressDuration}
                  recipeId={recipeId}
                  onToggle={() => toggleDone(i)}
                  onSpeak={() => toggleSpeak(i, text)}
                />
              );
            })}
          </div>

          {/* Fin de la liste d'étapes (dernier groupe) : photo du plat, si la
              recette n'en a pas encore. */}
          {onUpdateRecipe && offerPhoto && groupIndex === groups.length - 1 && (
            <CookPhotoPrompt
              recipe={recipe}
              onUpdateRecipe={onUpdateRecipe}
              householdId={householdId}
              showToast={showToast}
              allDone={totalSteps > 0 && totalDone === totalSteps}
            />
          )}

          {groups.length > 1 && groupIndex < groups.length - 1 ? (
            <Seal tone="gold" onClick={goNextGroup}>{t("cookMode.nextGroup")} <ChevronRight size={16} /></Seal>
          ) : (
            <Seal tone="gold" onClick={onClose}>{t("cookMode.finish")}</Seal>
          )}
        </div>
      </div>
    </div>
  );
}
