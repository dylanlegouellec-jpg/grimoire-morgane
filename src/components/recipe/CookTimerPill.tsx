import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BellRing, Hourglass, Pause, X } from "lucide-react";
import BodyPortal from "../common/BodyPortal";
import { useTranslation } from "../../contexts/LanguageContext";
import { translateRecipeText } from "../../utils/recipeTranslation";
import { triggerHaptic } from "../../utils/helpers";
import { clearCookTimers, formatRemaining, getRemainingMs, summarizeCookTimers, useCookTimers } from "../../utils/cookTimers";
import type { Recipe } from "../../hooks/useRecipes";

/* ------------------------------------------------------------------ */
/*  MINUTEUR FLOTTANT — quitter le mode cuisine n'arrête plus les        */
/*  minuteurs (utils/cookTimers.ts) : cette pastille compacte (icône,      */
/*  temps restant du plus proche, « +N » s'il y en a d'autres) reste en      */
/*  haut de l'écran tant qu'il en reste un. Un appui rouvre le mode cuisine    */
/*  de la recette concernée (qui retrouve ses minuteurs) ; la petite croix      */
/*  arrête tout (pas d'appui long : invisible, et en conflit avec l'appui). Un minuteur terminé fait passer la pastille en « prêt »        */
/*  (vert et doré, pulsation douce) : l'appui rouvre la recette, où le           */
/*  bandeau montre lequel a sonné. Rendue dans <body> (BodyPortal) : aucun        */
/*  parent animé ou rogné ne peut décaler cet élément fixe sous iOS.               */
/*  Mode cuisine ouvert : seuls les minuteurs des AUTRES recettes y figurent        */
/*  (ceux de la recette ouverte sont dans son bandeau), et la pastille passe        */
/*  alors au-dessus du mode cuisine.                                                 */
/* ------------------------------------------------------------------ */

interface CookTimerPillProps {
  recipes: Recipe[];
  /** Recette dont le mode cuisine est ouvert (null : mode cuisine fermé). */
  cookingRecipeId: string | null;
  onOpenRecipe: (recipe: Recipe) => void;
}

const SPRING_PILL_IN = { type: "spring", stiffness: 380, damping: 28 } as const;

export default function CookTimerPill({ recipes, cookingRecipeId, onOpenRecipe }: CookTimerPillProps) {
  const { t, language } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { timers, now } = useCookTimers();
  const summary = summarizeCookTimers(timers, now, cookingRecipeId);
  const recipe = summary ? recipes.find((r) => r.id === summary.lead.recipeId) : undefined;

  const open = () => {
    if (!summary) return;
    triggerHaptic(12);
    if (recipe) onOpenRecipe(recipe);
    // Recette supprimée entre-temps : plus rien à rouvrir, on acquitte.
    else clearCookTimers([summary.lead.recipeId]);
  };
  const stopAll = () => {
    if (!summary) return;
    triggerHaptic([10, 30, 10]);
    clearCookTimers(summary.timers.map((tm) => tm.recipeId));
  };

  let label = "";
  if (summary) {
    const { lead } = summary;
    const title = recipe ? translateRecipeText(recipe.title, language) : "";
    const time = formatRemaining(getRemainingMs(lead, now));
    label = summary.done
      ? t("cookPortions.pill.doneLabel", { label: lead.label, recipe: title })
      : t("cookPortions.pill.openLabel", { label: lead.label, time, recipe: title });
    if (summary.others > 0) label += ` ${t("cookPortions.pill.othersLabel", { count: summary.others })}`;
  }
  const state = summary ? (summary.done ? "done" : summary.lead.status) : "";
  const Icon = state === "done" ? BellRing : state === "paused" ? Pause : Hourglass;

  return (
    <BodyPortal>
      <AnimatePresence>
        {summary && (
          <motion.div
            key="cook-timer-pill"
            className={`cook-timer-pill ${state} ${cookingRecipeId ? "over-cookmode" : ""}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.9 }}
            transition={reduceMotion ? { duration: 0.15 } : SPRING_PILL_IN}
          >
            <button type="button" className="cook-timer-pill-main" onClick={open} aria-label={label}>
              <span className="cook-timer-pill-icon" aria-hidden="true"><Icon size={15} /></span>
              <span className="cook-timer-pill-time">
                {summary.done ? t("cookPortions.pill.ready") : formatRemaining(getRemainingMs(summary.lead, now))}
              </span>
              {summary.others > 0 && (
                <span className="cook-timer-pill-more" aria-hidden="true">{t("cookPortions.pill.more", { count: summary.others })}</span>
              )}
            </button>
            {/* Pas de croix par-dessus le mode cuisine : la place y est comptée
                (compteur d'étapes à gauche) ; on arrête depuis l'accueil. */}
            {!cookingRecipeId && (
              <button type="button" className="cook-timer-pill-stop" onClick={stopAll} aria-label={t("cookPortions.pill.stopAll")}>
                <X size={14} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </BodyPortal>
  );
}
