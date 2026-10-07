import { BookOpen, CalendarClock, GripVertical, ListChecks, PenLine, Plus, Save, Sparkles, StickyNote, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Les étapes du tuto « Modifier une recette » (voir RecipeEditTour.tsx).
// `selector` pointe un élément du formulaire repéré par `data-tour` dans
// RecipeForm.tsx ; `key` donne les textes `recipeTour.<key>Title/Body`.
export interface TourStep {
  selector: string | null;
  Icon: LucideIcon;
  key: string;
}

export const RECIPE_TOUR_STEPS: TourStep[] = [
  { selector: null, Icon: PenLine, key: "intro" },
  { selector: '[data-tour="recipe-title"]', Icon: BookOpen, key: "title" },
  { selector: '[data-tour="recipe-meta"]', Icon: CalendarClock, key: "meta" },
  { selector: '[data-tour="recipe-nutrition"]', Icon: Sparkles, key: "nutrition" },
  { selector: '[data-tour="recipe-ingredients"]', Icon: ListChecks, key: "ingredients" },
  { selector: '[data-tour="recipe-ingredients"] .row-drag-handle', Icon: GripVertical, key: "reorder" },
  { selector: '[data-tour="recipe-add-ingredient"]', Icon: Plus, key: "sections" },
  { selector: '[data-tour="recipe-steps"]', Icon: Tags, key: "steps" },
  { selector: '[data-tour="recipe-notes"]', Icon: StickyNote, key: "notes" },
  { selector: '[data-tour="recipe-save"]', Icon: Save, key: "save" },
];
