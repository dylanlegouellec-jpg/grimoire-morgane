import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import useOfflineSync from "../useOfflineSync";
import type { Recipe } from "../useRecipes";
import type { ShoppingList } from "../useShoppingLists";
import type { MealPlanEntry } from "../useMealPlan";

// Payload d'un événement Realtime "app_state" tel que livré par le SDK
// Supabase réel (voir useOfflineSync.ts) — seuls les champs lus par le
// hook sont modélisés ici.
interface AppStateRealtimePayload {
  eventType: string;
  new: { pantry: string[]; basics: string[]; meal_plan: unknown[] };
}

/* ------------------------------------------------------------------ */
/*  RÉGRESSION : "je coche un ingrédient du frigo et parfois ça le       */
/*  décoche tout seul, je dois recliquer" — voir le commentaire détaillé  */
/*  sur pantryDirtyRef/basicsDirtyRef/mealPlanDirtyRef dans                */
/*  useOfflineSync.js. Deux modifications locales rapprochées (typique :   */
/*  cocher deux ingrédients de suite) pouvaient voir la seconde effacée      */
/*  en silence par l'écho Realtime d'une sauvegarde antérieure, encore en    */
/*  vol, arrivant avant que le PATCH de la modification la plus récente ne   */
/*  soit lui-même parti.                                                     */
/* ------------------------------------------------------------------ */

let capturedAppStateHandler: ((payload: AppStateRealtimePayload) => void) | null = null;
const saveAppStateMock = vi.fn((..._args: unknown[]) => Promise.resolve());

vi.mock("../../utils/supabase", () => ({
  fetchTable: vi.fn(() => Promise.resolve([])),
  loadAppState: vi.fn(() => Promise.resolve({ pantry: [], basics: [], meal_plan: [] })),
  saveAppState: (...args: unknown[]) => saveAppStateMock(...args),
  mapRowToRecipe: (r: unknown) => r,
  mapRowToShoppingList: (r: unknown) => r,
  flushOfflineQueue: vi.fn(() => Promise.resolve({ flushed: 0, dropped: 0 })),
  RECIPE_COLUMNS: "*",
  SHOPPING_LIST_COLUMNS: "*",
}));

vi.mock("../../utils/supabaseClient", () => ({
  getSupabaseClient: () => {
    const channel = {
      on: (_event: string, config: { table: string }, handler: (payload: AppStateRealtimePayload) => void) => {
        if (config.table === "app_state") capturedAppStateHandler = handler;
        return channel;
      },
      subscribe: () => channel,
    };
    return {
      channel: () => channel,
      removeChannel: () => {},
    };
  },
}));

vi.mock("../../utils/offlineQueue", () => ({
  getOfflineQueueSize: () => 0,
}));

vi.mock("../../utils/localCache", () => ({
  saveLocalCache: () => {},
}));

vi.mock("../../utils/imageCache", () => ({
  prefetchRecipeImages: () => {},
}));

vi.mock("../../constants", () => ({
  DEFAULT_BASICS: [],
  SUPABASE_READY: true,
  demoRecipes: () => [],
}));

// Référence stable — un littéral inline dans les props passées au hook
// changerait de référence à CHAQUE rendu du Harness, ce qui ferait croire à
// l'effet de chargement initial (dépendant de `user`) qu'une vraie
// reconnexion vient d'avoir lieu et le ferait tourner en boucle, écrasant
// sans cesse le pantry du test avec la valeur "chargée" à nouveau — un
// artefact du harness de test, jamais un cas réel (useSupabaseAuth.js
// renvoie le même objet `session.user` tant que la session ne change pas).
const STABLE_USER = { id: "u1" };

let externalSetPantry: Dispatch<SetStateAction<string[]>> | null = null;

function Harness() {
  const [pantry, setPantry] = useState<string[]>([]);
  const [basics, setBasics] = useState<string[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  externalSetPantry = setPantry;

  const { ready } = useOfflineSync({
    authLoading: false,
    user: STABLE_USER,
    householdId: "h1",
    localCache: {},
    connectionStatus: "online",
    recipes,
    setRecipes,
    pantry,
    setPantry,
    basics,
    setBasics,
    mealPlan,
    setMealPlan,
    shoppingLists,
    setShoppingLists,
    activeListId,
    setActiveListId,
    shoppingScope: "household",
    showToast: () => {},
  });

  return (
    <div>
      <div data-testid="ready">{String(ready)}</div>
      <div data-testid="pantry">{JSON.stringify(pantry)}</div>
    </div>
  );
}

describe("useOfflineSync — course écho Realtime vs. sauvegarde locale en attente (frigo)", () => {
  beforeEach(() => {
    capturedAppStateHandler = null;
    saveAppStateMock.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("un écho Realtime périmé n'efface pas une modification locale pas encore confirmée", async () => {
    render(<Harness />);

    // Chargement initial (promesses réelles, pas de minuteur factice actif
    // encore) : attend que le hook soit prêt ET abonné au canal Realtime.
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    await waitFor(() => expect(capturedAppStateHandler).toBeTruthy());

    vi.useFakeTimers();

    // Coche "Ail" — programme une sauvegarde différée (400ms).
    act(() => { externalSetPantry!(["ail"]); });
    act(() => { vi.advanceTimersByTime(100); }); // toujours dans la fenêtre de debounce

    // Coche "Carottes" juste après, avant que le PATCH précédent ne soit
    // parti — reproduit l'usage normal de l'écran Frigo (cocher plusieurs
    // ingrédients de suite).
    act(() => { externalSetPantry!(["ail", "carottes"]); });

    // Un événement Realtime arrive maintenant, porteur d'une valeur DÉJÀ
    // dépassée par cette dernière modification locale (ex. l'écho d'une
    // sauvegarde antérieure encore en vol). Avant le correctif, ceci
    // effaçait "carottes" de l'état affiché.
    act(() => {
      capturedAppStateHandler!({ eventType: "UPDATE", new: { pantry: ["ail"], basics: [], meal_plan: [] } });
    });

    expect(screen.getByTestId("pantry")).toHaveTextContent(JSON.stringify(["ail", "carottes"]));

    // Laisse la sauvegarde différée aboutir : la modification la plus
    // récente ("ail" + "carottes") doit être celle réellement envoyée.
    // NE PAS envelopper dans act(...) : combiner act(async () => ...) avec
    // vi.advanceTimersByTimeAsync bloque indéfiniment (deux mécanismes de
    // flush de microtâches qui s'attendent mutuellement) — la fonction
    // renvoyée par vi.advanceTimersByTimeAsync fait déjà elle-même le
    // nécessaire pour que les mises à jour de rendu soient prises en compte.
    await vi.advanceTimersByTimeAsync(500);

    // Troisième argument : la baseline (voir parseBaseline/findAppStateConflicts,
    // ajoutés pour détecter un conflit au rejeu hors-ligne) — ici `[]`, la
    // valeur chargée au démarrage par loadAppState (mocké plus haut).
    expect(saveAppStateMock).toHaveBeenLastCalledWith("h1", { pantry: ["ail", "carottes"] }, { pantry: [] });
    expect(screen.getByTestId("pantry")).toHaveTextContent(JSON.stringify(["ail", "carottes"]));

    // Une fois la modification locale confirmée (plus rien en attente), un
    // événement Realtime légitime (autre appareil) doit de nouveau
    // s'appliquer normalement.
    act(() => {
      capturedAppStateHandler!({
        eventType: "UPDATE",
        new: { pantry: ["ail", "carottes", "poulet"], basics: [], meal_plan: [] },
      });
    });
    expect(screen.getByTestId("pantry")).toHaveTextContent(JSON.stringify(["ail", "carottes", "poulet"]));
  });
});
