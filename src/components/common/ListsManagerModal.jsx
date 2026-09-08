import { useState } from "react";
import { Plus, X } from "lucide-react";
import Flourish from "./Flourish";
import Seal from "./Seal";
import useFocusTrap from "../../hooks/useFocusTrap";

export default function ListsManagerModal({ lists, activeListId, onOpen, onCreate, onRename, onDelete, onClose }) {
  const modalRef = useFocusTrap(onClose);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (list) => {
    setRenamingId(list.id);
    setRenameValue(list.name);
  };
  const commitRename = () => {
    if (renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page" ref={modalRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 className="dropcap-title">Mes listes de courses</h2>
        <Flourish />
        {lists.length === 0 ? (
          <p className="hint">Aucune liste pour l'instant.</p>
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
                    <span className="lists-manager-count">{list.items.length} article{list.items.length > 1 ? "s" : ""}</span>
                  </button>
                )}
                <button type="button" className="lists-manager-icon-btn" onClick={() => startRename(list)} aria-label="Renommer">✎</button>
                <button type="button" className="lists-manager-icon-btn lists-manager-delete" onClick={() => onDelete(list.id)} aria-label="Supprimer">✕</button>
              </div>
            ))}
          </div>
        )}
        <Seal tone="gold" onClick={() => { onCreate(); onClose(); }} style={{ marginTop: 16 }}>
          <Plus size={16} /> Nouvelle liste
        </Seal>
      </div>
    </div>
  );
}

