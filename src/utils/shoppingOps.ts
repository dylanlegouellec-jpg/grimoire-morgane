/* ------------------------------------------------------------------ */
/*  LISTES DE COURSES — modifications article par article               */
/*                                                                      */
/*  Avant : chaque coche, ajout ou suppression renvoyait TOUTE la liste  */
/*  au serveur. Deux personnes qui faisaient les courses en même temps   */
/*  (ou deux coches rapides sur un réseau lent) s'écrasaient : des cases */
/*  cochées disparaissaient. Désormais, l'app envoie seulement « ce qui  */
/*  change » (ajouter tel article, cocher tel autre...) et le serveur    */
/*  l'applique sur SA version de la liste (fonction shopping_list_apply, */
/*  migration 20261013170000).                                           */
/*                                                                      */
/*  Toutes les opérations sont rejouables sans effet de bord (un ajout   */
/*  ne duplique pas un article déjà là, une coche fixe une valeur au     */
/*  lieu de l'inverser) : tant qu'une modification n'est pas confirmée,  */
/*  on peut la réappliquer par-dessus ce que le serveur renvoie (écho    */
/*  Realtime, rechargement) sans risque de la compter deux fois.        */
/* ------------------------------------------------------------------ */

import type { ShoppingItem } from "../hooks/useShoppingLists";

export type ShoppingOp =
  | { op: "add"; item: ShoppingItem }
  | { op: "append"; item: ShoppingItem }
  | { op: "remove"; id: string }
  | { op: "patch"; id: string; fields: Partial<Omit<ShoppingItem, "id">> }
  | { op: "clear" };

/** Même règles que la fonction SQL shopping_list_apply, côté appareil. */
export function applyShoppingOps(items: ShoppingItem[], ops: ShoppingOp[]): ShoppingItem[] {
  let next = items;
  for (const op of ops) {
    if (op.op === "add" || op.op === "append") {
      if (next.some((it) => it.id === op.item.id)) continue;
      next = op.op === "add" ? [op.item, ...next] : [...next, op.item];
    } else if (op.op === "remove") {
      next = next.filter((it) => it.id !== op.id);
    } else if (op.op === "patch") {
      next = next.map((it) => (it.id === op.id ? { ...it, ...op.fields } : it));
    } else if (op.op === "clear") {
      next = [];
    }
  }
  return next;
}

/* --- Modifications envoyées mais pas encore confirmées ----------------- */

interface PendingBatch {
  token: number;
  ops: ShoppingOp[];
}

const pending = new Map<string, PendingBatch[]>();
let nextToken = 1;

export function addPendingShoppingOps(listId: string, ops: ShoppingOp[]): number {
  const token = nextToken++;
  pending.set(listId, [...(pending.get(listId) ?? []), { token, ops }]);
  return token;
}

export function settlePendingShoppingOps(listId: string, token: number): void {
  const rest = (pending.get(listId) ?? []).filter((b) => b.token !== token);
  if (rest.length) pending.set(listId, rest);
  else pending.delete(listId);
}

/** Réapplique les modifications locales pas encore confirmées sur une liste reçue du serveur. */
export function withPendingShoppingOps<T extends { id: string; items: ShoppingItem[] }>(list: T): T {
  const batches = pending.get(list.id);
  if (!batches || !batches.length) return list;
  return { ...list, items: applyShoppingOps(list.items, batches.flatMap((b) => b.ops)) };
}

export function resetPendingShoppingOpsForTests(): void {
  pending.clear();
  nextToken = 1;
}
