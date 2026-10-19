import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import useOfflineSync from "../useOfflineSync";
import type { Recipe } from "../useRecipes";
import type { ShoppingList } from "../useShoppingLists";
import type { MealPlanEntry } from "../useMealPlan";
import type { UnitSettings } from "../../utils/units";

/* ------------------------------------------------------------------ */
/*  app_state.units (Réglages > Unités des ingrédients) : lu au           */
/*  chargement, écrit comme pantry/basics (debounce + baseline), appliqué    */
/*  depuis Realtime sauf modification locale en cours, mis en cache local.  */
/* ------------------------------------------------------------------ */

type AppStateRow = Record<string, unknown>;
let capturedAppStateHandler: ((payload: { eventType: string; new: AppStateRow }) => void) | null = null;
const saveAppStateMock = vi.fn((..._args: unknown[]) => Promise.resolve());
const saveLocalCacheMock = vi.fn((..._args: unknown[]) => {});

vi.mock("../../utils/supabase", () => ({
  fetchTable: vi.fn(() => Promise.resolve([])),
  loadAppState: vi.fn(() => Promise.resolve({ pantry: [], basics: [], meal_plan: [], units: { custom: ["sachet"], hidden: [] } })),
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
      on: (_event: string, config: { table: string }, handler: (payload: { eventType: string; new: AppStateRow }) => void) => {
        if (config.table === "app_state") capturedAppStateHandler = handler;
        return channel;
      },
      subscribe: () => channel,
    };
    return { channel: () => channel, removeChannel: () => {} };
  },
}));
vi.mock("../../utils/offlineQueue", () => ({ getOfflineQueueSize: () => 0 }));
vi.mock("../../utils/localCache", () => ({ saveLocalCache: (...args: unknown[]) => saveLocalCacheMock(...args) }));
vi.mock("../../utils/imageCache", () => ({ prefetchRecipeImages: () => {} }));
vi.mock("../../constants", () => ({ DEFAULT_BASICS: [], SUPABASE_READY: true, demoRecipes: () => [] }));

const STABLE_USER = { id: "u1" };
let externalSetUnits: Dispatch<SetStateAction<UnitSettings | null>> | null = null;

function Harness() {
  const [pantry, setPantry] = useState<string[]>([]);
  const [basics, setBasics] = useState<string[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [units, setUnits] = useState<UnitSettings | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/globals
  externalSetUnits = setUnits;
  const { ready } = useOfflineSync({
    authLoading: false, user: STABLE_USER, householdId: "h1", localCache: {}, connectionStatus: "online",
    recipes, setRecipes, pantry, setPantry, basics, setBasics, mealPlan, setMealPlan,
    units, setUnits,
    shoppingLists, setShoppingLists, activeListId, setActiveListId, shoppingScope: "household", showToast: () => {},
  });
  return (
    <div>
      <div data-testid="ready">{String(ready)}</div>
      <div data-testid="units">{JSON.stringify(units)}</div>
    </div>
  );
}

describe("useOfflineSync — unités du foyer (app_state.units)", () => {
  beforeEach(() => {
    capturedAppStateHandler = null;
    saveAppStateMock.mockClear();
    saveLocalCacheMock.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("charge, enregistre, met en cache et reçoit en direct la liste d'unités", async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId("units")).toHaveTextContent(JSON.stringify({ custom: ["sachet"], hidden: [] })));
    await waitFor(() => expect(capturedAppStateHandler).toBeTruthy());
    // Valeur chargée = déjà celle du serveur : pas de renvoi inutile.
    expect(saveAppStateMock).not.toHaveBeenCalled();
    expect(saveLocalCacheMock).toHaveBeenLastCalledWith(expect.objectContaining({ units: { custom: ["sachet"], hidden: [] } }));

    vi.useFakeTimers();
    act(() => { externalSetUnits!({ custom: ["sachet", "gousse"], hidden: ["cl"] }); });
    // Écho Realtime périmé pendant la modification locale : ignoré.
    act(() => { capturedAppStateHandler!({ eventType: "UPDATE", new: { pantry: [], basics: [], meal_plan: [], units: { custom: ["sachet"], hidden: [] } } }); });
    expect(screen.getByTestId("units")).toHaveTextContent(JSON.stringify({ custom: ["sachet", "gousse"], hidden: ["cl"] }));

    await vi.advanceTimersByTimeAsync(500);
    expect(saveAppStateMock).toHaveBeenLastCalledWith(
      "h1",
      { units: { custom: ["sachet", "gousse"], hidden: ["cl"] } },
      { units: { custom: ["sachet"], hidden: [] } }
    );

    // Une fois confirmée, un changement d'un autre appareil s'applique (null = liste par défaut).
    act(() => { capturedAppStateHandler!({ eventType: "UPDATE", new: { pantry: [], basics: [], meal_plan: [], units: null } }); });
    expect(screen.getByTestId("units")).toHaveTextContent("null");
  });
});
