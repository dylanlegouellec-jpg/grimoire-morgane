import { describe, it, expect, beforeEach, vi } from "vitest";
import { installDevLog, getDevLogEntries, clearDevLog, subscribeDevLog } from "../devLog";

/* ------------------------------------------------------------------ */
/*  Journal de debug en mémoire — verrouille le contrat dont dépend la    */
/*  console de logs du Panneau de Diagnostics : console.error/warn         */
/*  finissent bien dans le ring buffer, les abonnés sont notifiés, et le     */
/*  buffer ne grossit jamais sans limite.                                     */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  clearDevLog();
  installDevLog(); // idempotent — ne repatche pas une seconde fois
});

describe("devLog", () => {
  it("garde les erreurs console dans le journal, sans supprimer le comportement console normal", () => {
    const originalError = console.error;
    console.error("Oups", { code: 500 });
    expect(console.error).toBe(originalError); // toujours la même référence patchée une seule fois

    const entries = getDevLogEntries();
    const last = entries[entries.length - 1];
    expect(last.level).toBe("error");
    expect(last.message).toContain("Oups");
  });

  it("notifie les abonnés à chaque nouvelle entrée", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDevLog(listener);

    console.warn("Attention");
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    console.warn("Encore");
    expect(listener).not.toHaveBeenCalled();
  });

  it("vide le journal sur demande", () => {
    console.log("un événement");
    expect(getDevLogEntries().length).toBeGreaterThan(0);

    clearDevLog();
    expect(getDevLogEntries()).toHaveLength(0);
  });

  it("plafonne le journal à 200 entrées (ne grossit jamais indéfiniment)", () => {
    for (let i = 0; i < 250; i += 1) console.log(`événement ${i}`);
    expect(getDevLogEntries().length).toBeLessThanOrEqual(200);
  });
});
