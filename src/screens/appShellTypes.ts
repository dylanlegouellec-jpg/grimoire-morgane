import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { Recipe } from "../hooks/useRecipes";
import type { MealPlanEntry } from "../hooks/useMealPlan";
import type { ShoppingList } from "../hooks/useShoppingLists";
import type { Household } from "../utils/auth";
import type { ViewScope } from "../utils/localSettings";
import type { ParsedRecipe } from "../utils/templateParser";

/* ------------------------------------------------------------------ */
/*  Ce que GrimoireDeMorgane fournit à l'écran principal (AppShell) :    */
/*  les données et actions de chaque domaine, regroupées par « API ».     */
/*  Sortis d'AppShell.tsx pour l'alléger.                                 */
/* ------------------------------------------------------------------ */

export interface RecipesApi {
  recipes: Recipe[];
  saveRecipe: (recipe: Recipe) => void;
  importRecipe: (parsed: ParsedRecipe, label: string) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;
  exportGrimoire: () => void;
  handleImportFile: (e: ChangeEvent<HTMLInputElement>) => void;
}

export interface PantryApi {
  pantry: string[];
  setPantry: Dispatch<SetStateAction<string[]>>;
  basics: string[];
  moveBasicToVariable: (name: string) => void;
  removeBasic: (name: string) => void;
  resetPantry: () => void;
}

export interface MealPlanApi {
  mealPlan: MealPlanEntry[];
  addMealPlanEntry: (
    date: string,
    mealType: string,
    recipeId: string | null,
    customTitle: string | null,
    scope: "household" | "personal",
    userId: string | null,
    courseType: string | null
  ) => void;
  removeMealPlanEntry: (id: string) => void;
  removeMealPlanEntries: (ids: string[]) => void;
  restoreMealPlanEntries: (removed: { entry: MealPlanEntry; index: number }[]) => void;
  updateMealPlanEntry: (id: string, updates: Partial<MealPlanEntry>) => void;
  reorderMealPlanEntries: (orderedIds: string[]) => void;
  moveMealPlanSection: (entryIds: string[], newMealType: string) => void;
}

export interface ShoppingApi {
  shoppingLists: ShoppingList[];
  visibleShoppingLists: ShoppingList[];
  activeListId: string | null;
  openShoppingList: (id: string) => void;
  shoppingScope: ViewScope;
  setShoppingScope: (scope: string) => void;
  createShoppingList: () => void;
  renameShoppingList: (id: string | null, name: string) => void;
  deleteShoppingList: (id: string) => void;
  addManualItem: (name: string) => void;
  toggleShoppingItem: (id: string) => void;
  deleteShoppingItem: (id: string) => void;
  adjustShoppingQty: (id: string, delta: number) => void;
  setShoppingItemQty: (id: string, qty: number, unit: string) => void;
  generateShoppingList: (recipes: Recipe[], ids: string[]) => void;
  resetActiveList: () => void;
}

export interface SettingsApi {
  theme: string;
  setTheme: (value: string) => void;
  pressDuration: number;
  setPressDuration: (value: number) => void;
  showNutriscore: boolean;
  setShowNutriscore: (value: boolean) => void;
  navOpacity: number;
  setNavOpacity: (value: number) => void;
  heroTreatment: string;
  setHeroTreatment: (value: string) => void;
  iconStyle: string;
  setIconStyle: (value: string) => void;
  textSize: string;
  setTextSize: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  onboardingResolved: boolean;
}

export interface HouseholdApiUser {
  id: string;
  email?: string;
}

export interface HouseholdMemberLike {
  user_id: string;
  role: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
}

export interface HouseholdApi {
  user: HouseholdApiUser | null;
  householdId: string | null;
  households: Household[];
  onSwitchHousehold: (id: string) => void;
  onCreateHousehold: (name: string) => Promise<void>;
  onRenameHousehold: (id: string, name: string) => Promise<void>;
  onDeleteHousehold: (id: string) => Promise<void>;
  onRequestJoinHousehold: (id: string) => Promise<void>;
  onGetPendingHouseholdRequests: (householdId: string) => Promise<HouseholdMemberLike[]>;
  onApproveHouseholdMember: (householdId: string | null, userId: string) => Promise<void>;
  onRejectHouseholdMember: (householdId: string | null, userId: string) => Promise<void>;
  onRefreshHouseholds?: () => void;
  signOut: () => void;
}

// Recette décodée depuis un lien/code reçu (voir GrimoireDeMorgane.jsx) —
// aussi peu fiable que PublicRecipe (PublicRecipeView.tsx) : jamais
// revalidée, seul `title` est garanti pour l'affichage de confirmation
// (ImportConfirmModal).
export interface PendingImportRecipe {
  title: string;
  [key: string]: unknown;
}

export interface SyncApi {
  offlineQueueSize: number;
  connectionStatus: string;
  onRetryConnection?: () => void;
  pendingImport: PendingImportRecipe | null;
  setPendingImport: Dispatch<SetStateAction<PendingImportRecipe | null>>;
  pendingHouseholdJoin: string | null;
  setPendingHouseholdJoin: Dispatch<SetStateAction<string | null>>;
}
