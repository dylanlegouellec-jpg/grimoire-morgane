import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  enqueueOfflineAction,
  getOfflineQueue,
  getOfflineQueueSize,
  removeFromOfflineQueue,
  incrementOfflineActionFailCount,
  clearOfflineQueue,
} from "../offlineQueue";

/* ------------------------------------------------------------------ */
/*  File d'attente hors-ligne — verrouille le contrat dont dépend        */
/*  flushOfflineQueue (utils/supabase.js) : chaque action mise en file    */
/*  garde son ordre d'arrivée, gagne un failCount initialisé à 0, et       */
/*  peut être retirée ou voir son compteur d'échecs incrémenté sans         */
/*  perturber les autres actions en attente.                                */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  clearOfflineQueue();
});

describe("offlineQueue", () => {
  it("empile une action avec un id généré, un horodatage et failCount à 0", () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "Tarte" } });
    const queue = getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ table: "recipes", type: "insert", failCount: 0 });
    expect(queue[0].id).toBeTruthy();
    expect(queue[0].ts).toBeTypeOf("number");
  });

  it("conserve l'ordre d'arrivée sur plusieurs actions", () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "1" } });
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "2" } });
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "3" } });
    const queue = getOfflineQueue();
    expect(queue.map((a) => a.payload.title)).toEqual(["1", "2", "3"]);
  });

  it("getOfflineQueueSize reflète le nombre d'actions en attente", () => {
    expect(getOfflineQueueSize()).toBe(0);
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: {} });
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: {} });
    expect(getOfflineQueueSize()).toBe(2);
  });

  it("removeFromOfflineQueue ne retire que l'action visée, jamais les autres", () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "garder" } });
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "retirer" } });
    const [, toRemove] = getOfflineQueue();
    removeFromOfflineQueue(toRemove.id);
    const remaining = getOfflineQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].payload.title).toBe("garder");
  });

  it("incrementOfflineActionFailCount incrémente et persiste le compteur d'échecs d'une seule action", () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "A" } });
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "B" } });
    const [actionA, actionB] = getOfflineQueue();

    expect(incrementOfflineActionFailCount(actionA.id)).toBe(1);
    expect(incrementOfflineActionFailCount(actionA.id)).toBe(2);

    const queue = getOfflineQueue();
    expect(queue.find((a) => a.id === actionA.id).failCount).toBe(2);
    // L'action B n'a jamais été touchée : son compteur reste intact.
    expect(queue.find((a) => a.id === actionB.id).failCount).toBe(0);
  });

  it("incrementOfflineActionFailCount renvoie 0 pour un id inconnu, sans rien modifier", () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: {} });
    expect(incrementOfflineActionFailCount("id-inexistant")).toBe(0);
    expect(getOfflineQueue()[0].failCount).toBe(0);
  });

  it("clearOfflineQueue vide entièrement la file", () => {
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: {} });
    enqueueOfflineAction({ table: "recipes", type: "insert", payload: {} });
    clearOfflineQueue();
    expect(getOfflineQueue()).toEqual([]);
  });
});

// Instance de module à part (vi.resetModules + import dynamique) : la
// bascule en mémoire est un état de module PERMANENT pour le reste de la
// session (voir offlineQueue.js, `memoryFallback`) — la déclencher sur le
// même module que les tests ci-dessus les ferait tous basculer en mémoire à
// leur tour dès que celui-ci s'exécute, quel que soit l'ordre réel
// d'exécution des tests.
describe("offlineQueue — repli mémoire si localStorage échoue", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bascule en mémoire dès le premier échec d'écriture, sans perdre l'action mise en file au même moment", async () => {
    vi.resetModules();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Sur le PROTOTYPE (pas une réassignation directe sur l'instance) : le
    // Storage de jsdom expose ses clés via un proxy qui intercepte aussi les
    // affectations directes de propriété, une simple réassignation de
    // `localStorage.setItem` ne remplace donc pas réellement la méthode
    // appelée en interne par offlineQueue.js.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const fresh = await import("../offlineQueue");
    fresh.enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "Perdue ?" } });

    // L'action reste lisible malgré l'échec d'écriture localStorage — plus
    // le silence total d'avant (aucun repli réel derrière le commentaire).
    expect(fresh.getOfflineQueue()).toHaveLength(1);
    expect(fresh.getOfflineQueue()[0].payload.title).toBe("Perdue ?");
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Le repli fait foi pour tout le reste de la session, pas seulement le
    // tout premier échec : une action suivante reste elle aussi visible.
    fresh.enqueueOfflineAction({ table: "recipes", type: "insert", payload: { title: "Deuxième" } });
    expect(fresh.getOfflineQueue()).toHaveLength(2);
  });
});
