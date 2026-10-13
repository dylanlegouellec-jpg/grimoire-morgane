import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { motion } from "motion/react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import { MODAL_BACKDROP_MOTION, MODAL_SHEET_MOTION } from "../../constants/motion";
import { useTranslation } from "../../contexts/LanguageContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useFocusTrap from "../../hooks/useFocusTrap";
import useDismissibleSheet from "../../hooks/useDismissibleSheet";
import type { ShoppingList } from "../../hooks/useShoppingLists";

// `scope` optionnel : quand fourni (voir AppShell.jsx, listes de courses),
// `lists` n'est déjà qu'un sous-ensemble filtré par portée (household/
// personal — voir useShoppingLists.js) — le titre le rappelle pour que ce
// soit sans ambiguïté quelle portée on est en train de gérer. Omis, le
// modal se comporte comme avant (titre générique, ex. gestionnaire de
// recettes s'il en existait un autre usage).
// Clés de traduction (voir modals.lists.*), résolues au rendu par t().
const SCOPE_TITLES: Record<string, string> = {
  household: "modals.lists.scopeHousehold",
  personal: "modals.lists.scopePersonal",
};

interface ListsManagerModalProps {
  lists: ShoppingList[];
  activeListId: string | null;
  scope?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string | null, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function ListsManagerModal({ lists, activeListId, scope, onOpen, onCreate, onRename, onDelete, onClose }: ListsManagerModalProps) {
  const { t } = useTranslation();
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  // Sans second appui dans les 3 s, le bouton se désarme tout seul.
  useEffect(() => {
    if (!armedDeleteId) return undefined;
    const timer = setTimeout(() => setArmedDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [armedDeleteId]);
  useBodyScrollLock(true);
  const modalRef = useFocusTrap<HTMLDivElement>(onClose);
  const sheet = useDismissibleSheet(onClose, { scrollRef: modalRef });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (list: ShoppingList) => {
    setRenamingId(list.id);
    setRenameValue(list.name);
  };
  const commitRename = () => {
    if (renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...MODAL_BACKDROP_MOTION}>
      <motion.div
        className="modal grimoire-page modal-swipeable"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...MODAL_SHEET_MOTION}
        {...sheet.panHandlers}
      >
        <button className="modal-close" onClick={onClose} aria-label={t("common.close")}><X size={20} /></button>
        <h2 className="dropcap-title">{scope ? (SCOPE_TITLES[scope] && t(SCOPE_TITLES[scope])) : t("modals.lists.title")}</h2>
        <Flourish />
        {lists.length === 0 ? (
          <p className="hint">{t("modals.lists.empty")}</p>
        ) : (
          <div className="lists-manager">
            {lists.map((list) => (
              <div key={list.id} className={`lists-manager-row ${list.id === activeListId ? "active" : ""}`}>
                {renamingId === list.id ? (
                  <input
                    className="lists-manager-rename-input"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      // stopPropagation : sans ça, l'Échap qui annule juste le
                      // renommage remontait aussi jusqu'au piège à focus de la
                      // modale (useFocusTrap) et fermait toute la modale d'un
                      // coup — un seul Échap ne doit annuler qu'UNE chose à la fois.
                      if (e.key === "Escape") { e.stopPropagation(); setRenamingId(null); }
                    }}
                    onBlur={commitRename}
                  />
                ) : (
                  <button type="button" className="lists-manager-name" onClick={() => { onOpen(list.id); onClose(); }}>
                    {list.name}
                    <span className="lists-manager-count">{t("modals.lists.itemCount", { count: list.items.length, plural: list.items.length > 1 ? "s" : "" })}</span>
                  </button>
                )}
                <button type="button" className="lists-manager-icon-btn" onClick={() => startRename(list)} aria-label={t("modals.lists.rename")}>✎</button>
                {/* Deux appuis pour supprimer : le premier arme le bouton
                    (« Supprimer ? »), le second confirme. Un seul appui
                    effaçait la liste entière sans prévenir. */}
                <button
                  type="button"
                  className={`lists-manager-icon-btn lists-manager-delete ${armedDeleteId === list.id ? "armed" : ""}`}
                  onClick={() => {
                    if (armedDeleteId === list.id) { setArmedDeleteId(null); onDelete(list.id); }
                    else setArmedDeleteId(list.id);
                  }}
                  aria-label={armedDeleteId === list.id ? t("modals.lists.confirmDelete") : t("common.delete")}
                >
                  {armedDeleteId === list.id ? t("modals.lists.deleteArmed") : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}
        <Seal tone="gold" onClick={() => { onCreate(); onClose(); }}>
          <Plus size={16} /> {t("modals.lists.newList")}
        </Seal>
      </motion.div>
    </motion.div>
  );
}
