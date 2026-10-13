import { AISLES } from "./helpers";
import type { ShoppingItem } from "../hooks/useShoppingLists";

/* ------------------------------------------------------------------ */
/*  PARTAGE D'UNE LISTE DE COURSES PAR MESSAGE                         */
/*  Texte lisible dans n'importe quelle messagerie (WhatsApp, SMS…),   */
/*  pour quelqu'un qui n'a pas l'app : un bloc par rayon avec son       */
/*  emoji, une case ☐ par article, et les articles déjà pris à la fin. */
/* ------------------------------------------------------------------ */

export interface ShareAisle {
  /** Clé du rayon telle que regroupée dans ShoppingView (son libellé français). */
  key: string;
  label: string;
  items: ShoppingItem[];
}

export interface ShoppingShareText {
  listName: string;
  aisles: ShareAisle[];
  bought: ShoppingItem[];
  language: string;
  boughtLabel: string;
  footer: string;
  itemName: (name: string) => string;
}

const aisleIcon = (key: string) => AISLES.find((a) => a.label === key)?.icon ?? "🧺";

/** « 2 kg farine », « 3 œufs », « persil » (quantité 1 sans unité : juste le nom). */
export function formatShareItem(item: ShoppingItem, language: string, itemName: (name: string) => string): string {
  const name = itemName(item.name);
  const qty = Number(item.qty);
  if (!item.unit && (!qty || qty === 1)) return name;
  const qtyText = Number.isFinite(qty) ? (Math.round(qty * 100) / 100).toLocaleString(language === "en" ? "en-US" : "fr-FR") : String(item.qty);
  return `${qtyText}${item.unit ? ` ${item.unit}` : ""} ${name}`;
}

export function buildShoppingShareText({ listName, aisles, bought, language, boughtLabel, footer, itemName }: ShoppingShareText): string {
  const lines = [`🛒 *${listName}*`];
  for (const aisle of aisles) {
    if (!aisle.items.length) continue;
    lines.push("", `${aisleIcon(aisle.key)} ${aisle.label}`);
    aisle.items.forEach((it) => lines.push(`☐ ${formatShareItem(it, language, itemName)}`));
  }
  if (bought.length) {
    lines.push("", `✅ ${boughtLabel} ${bought.map((it) => itemName(it.name)).join(", ")}`);
  }
  lines.push("", `— ${footer}`);
  return lines.join("\n");
}
