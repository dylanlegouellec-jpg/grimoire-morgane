import { useCallback, useState } from "react";
import { nextId, triggerHaptic } from "../utils/helpers";
import { DEFAULT_COURSE_TYPE, mealTypeHasCourse } from "../utils/planning";

/* ------------------------------------------------------------------ */
/*  PLAN DE REPAS — état + actions.                                    */
/*  Persisté dans `app_state.meal_plan` (voir hooks/useOfflineSync.js), */
/*  au même titre que `pantry`/`basics` : une donnée de foyer, simple et */
/*  peu volumineuse, qui n'a pas besoin de sa propre table dédiée ni de   */
/*  sa propre file d'attente hors-ligne — elle profite gratuitement de   */
/*  celle déjà en place pour app_state.                                  */
/*  Une entrée : { id, date: "YYYY-MM-DD", mealType, courseType, recipeId,  */
/*  customTitle, scope, userId }. `recipeId` XOR `customTitle` : un repas   */
/*  "personnalisé" (texte libre, ex. "Restes", "McDo" — voir                */
/*  AddMealModal.jsx) n'est rattaché à aucune fiche recette, `recipeId`      */
/*  reste alors null et `customTitle` porte le nom saisi ; l'inverse pour     */
/*  un repas normal. `mealType` (moment de la journée) et `courseType`       */
/*  (type de plat — Apéro/Entrée/Plat/Dessert, voir utils/planning.js)       */
/*  sont deux dimensions indépendantes, jamais mélangées dans la même        */
/*  liste de choix (voir AddMealModal.jsx). `courseType` vaut explicitement  */
/*  `null` pour les moments où il n'a pas de sens (petit-déjeuner, en-cas —  */
/*  voir mealTypeHasCourse) : ce `null` est VOLONTAIRE, à distinguer d'un    */
/*  simple champ absent (entrées créées avant ce champ), traité comme        */
/*  "plat" à l'affichage pour déjeuner/dîner — même logique de               */
/*  rétrocompatibilité sans migration que `scope` ci-dessous.                */
/*  `scope` ("household" | "personal") + `userId` : voir PlanningView.jsx,   */
/*  qui filtre l'affichage selon la portée active. Reste stocké dans le       */
/*  MÊME tableau partagé de foyer plutôt qu'une colonne séparée — donc         */
/*  visible de tout le foyer au niveau des données (RLS reste au niveau        */
/*  du foyer, pas de l'utilisateur), même si l'interface ne montre à           */
/*  chacun que SES propres entrées "personal" par défaut. `scope` absent       */
/*  (entrées existantes créées avant ce champ) est traité comme "household"    */
/*  par PlanningView, jamais comme "personal" — rétrocompatible sans            */
/*  migration nécessaire. */
/* ------------------------------------------------------------------ */
export default function useMealPlan({ initialMealPlan = [] }) {
  const [mealPlan, setMealPlan] = useState(() => (Array.isArray(initialMealPlan) ? initialMealPlan : []));

  const addMealPlanEntry = useCallback((date, mealType, recipeId, customTitle = null, scope = "household", userId = null, courseType = DEFAULT_COURSE_TYPE) => {
    triggerHaptic(15);
    setMealPlan((prev) => [
      ...prev,
      {
        id: nextId(),
        date,
        mealType,
        // Pas de repli "|| DEFAULT_COURSE_TYPE" ici : `null` explicite
        // (moment sans type de plat, voir le commentaire de fichier
        // ci-dessus) doit rester `null`, pas redevenir "plat". Le
        // paramètre par défaut ci-dessus ne couvre que l'appel qui omet
        // carrément cet argument (undefined), pas un null volontaire.
        courseType,
        recipeId: recipeId || null,
        customTitle: customTitle || null,
        scope: scope === "personal" ? "personal" : "household",
        userId: scope === "personal" ? userId : null,
      },
    ]);
  }, []);

  const removeMealPlanEntry = useCallback((id) => {
    triggerHaptic(20);
    setMealPlan((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Suppression groupée — menu "Tout supprimer" d'un sous-groupe de type de
  // plat entier (voir PlanningCourseGroup.jsx) : un seul setMealPlan/haptique
  // pour tout le groupe plutôt qu'un removeMealPlanEntry par entrée.
  const removeMealPlanEntries = useCallback((ids) => {
    triggerHaptic(20);
    const idSet = new Set(ids);
    setMealPlan((prev) => prev.filter((e) => !idSet.has(e.id)));
  }, []);

  // Modifie la recette/le type de plat d'une entrée existante (voir menu
  // "Modifier" ouvert par l'appui long sur une ligne, PlanningMealItem.jsx)
  // sans toucher à sa date ni à son moment — ceux-là restent fixes, seul
  // le contenu du plat change.
  const updateMealPlanEntry = useCallback((id, updates) => {
    triggerHaptic(15);
    setMealPlan((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  // Réordonne un SOUS-ENSEMBLE d'entrées les unes par rapport aux autres
  // (glisser-déposer d'un même sous-groupe — voir PlanningMealItemsList.jsx,
  // hooks/useDragReorder.js) sans toucher à leur position relative au reste
  // du plan : l'ordre d'affichage d'un groupe (voir groupEntriesByCourse
  // dans PlanningView.jsx) suit l'ordre de CE tableau pour les entrées de
  // même type de plat/moment (tri stable), donc réordonner ici les entrées
  // concernées suffit à changer leur ordre affiché, sans rien déplacer
  // d'autre. `orderedIds` doit contenir exactement les ids d'un même
  // sous-groupe, dans le nouvel ordre voulu.
  const reorderMealPlanEntries = useCallback((orderedIds) => {
    triggerHaptic(12);
    setMealPlan((prev) => {
      const idSet = new Set(orderedIds);
      const byId = new Map(prev.map((e) => [e.id, e]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
      let cursor = 0;
      return prev.map((e) => (idSet.has(e.id) ? reordered[cursor++] : e));
    });
  }, []);

  // Reclassification rapide d'une section entière vers un autre moment (menu
  // "Changer le moment du repas" d'un en-tête de moment, voir
  // PlanningMealGroup.jsx/MoveMealSectionModal.jsx) : change le `mealType`
  // de TOUTES les entrées listées vers `newMealType`, en ajustant leur
  // `courseType` selon les mêmes règles que partout ailleurs dans ce fichier
  // (voir le commentaire de fichier plus haut) — `null` si le moment
  // d'arrivée n'a pas de type de plat, "plat" par défaut s'il en a un mais
  // que l'entrée n'en avait pas encore (venant d'un moment sans type de
  // plat). Les entrées DÉJÀ présentes sous le moment cible ne sont jamais
  // touchées : elles se retrouvent simplement mélangées avec les entrées
  // déplacées via le même regroupement par type de plat déjà appliqué à
  // l'affichage (voir PlanningView.jsx, groupEntriesByCourse) — une
  // "fusion" propre entre les deux sections, sans code de fusion dédié.
  const moveMealPlanSection = useCallback((entryIds, newMealType) => {
    triggerHaptic(15);
    const idSet = new Set(entryIds);
    const targetHasCourse = mealTypeHasCourse(newMealType);
    setMealPlan((prev) => prev.map((e) => {
      if (!idSet.has(e.id)) return e;
      return {
        ...e,
        mealType: newMealType,
        courseType: targetHasCourse ? (e.courseType || DEFAULT_COURSE_TYPE) : null,
      };
    }));
  }, []);

  return {
    mealPlan,
    setMealPlan,
    addMealPlanEntry,
    removeMealPlanEntry,
    removeMealPlanEntries,
    updateMealPlanEntry,
    reorderMealPlanEntries,
    moveMealPlanSection,
  };
}
