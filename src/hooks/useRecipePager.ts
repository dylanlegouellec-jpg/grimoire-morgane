import { useMemo, useState } from "react";
import { visibleRecipes, type RecipeSort } from "../utils/recipeSearch";
import type { Recipe } from "./useRecipes";

/* ------------------------------------------------------------------ */
/*  « VUE LIVRE » DE LA FICHE RECETTE — côté AppShell                   */
/*                                                                      */
/*  Fournit à RecipeDetail :                                            */
/*  - `pages` : les recettes de la grille, dans son ordre exact (même    */
/*    tri, filtre, favoris et recherche — visibleRecipes()), pour        */
/*    feuilleter la fiche d'un glissement horizontal. Vide quand la      */
/*    fiche a été ouverte depuis un autre onglet (Frigo…) : l'ordre de    */
/*    la grille n'y aurait aucun sens, la fiche reste alors seule.         */
/*  - `detailKey` : la clé React de la fiche, FIGÉE à l'ouverture. Avec     */
/*    l'ancienne clé (l'id de la recette ouverte), tourner une page        */
/*    démontait/remontait toute la fiche : animation d'entrée rejouée,      */
/*    nouvelle entrée d'historique (useFocusTrap) à chaque page. Une même    */
/*    clé tant que la fiche reste ouverte = une seule fiche, une seule       */
/*    entrée d'historique, quelle que soit la page affichée.                 */
/* ------------------------------------------------------------------ */

const NO_PAGES: Recipe[] = [];

interface UseRecipePagerOptions {
  recipes: Recipe[];
  openRecipe: Recipe | null;
  /** Faux quand la fiche n'a pas été ouverte depuis la grille (autre onglet affiché). */
  enabled: boolean;
  filter: string;
  favoritesOnly: boolean;
  search: string;
  sort: RecipeSort;
}

export default function useRecipePager({ recipes, openRecipe, enabled, filter, favoritesOnly, search, sort }: UseRecipePagerOptions) {
  const pages = useMemo(
    () => (enabled ? visibleRecipes(recipes, { filter, favoritesOnly, search, sort }) : NO_PAGES),
    [enabled, recipes, filter, favoritesOnly, search, sort]
  );

  // Id de la recette par laquelle la fiche a été OUVERTE (pas celle
  // affichée) ; remis à null à la fermeture. Ajusté pendant le rendu
  // (motif « état dérivé » de React) et renvoyé directement : aucun rendu
  // ne porte jamais une clé périmée.
  const [openedId, setOpenedId] = useState<string | null>(null);
  const detailKey = openRecipe ? (openedId ?? openRecipe.id) : null;
  if (detailKey !== openedId) setOpenedId(detailKey);

  return { pages, detailKey };
}
