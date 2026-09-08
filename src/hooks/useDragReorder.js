import { useState, useRef } from "react";
import { triggerHaptic } from "../utils/helpers";

export default function useDragReorder(items, setItems) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragDy, setDragDy] = useState(0);
  const startYRef = useRef(0);
  const startIndexRef = useRef(0);
  const rowHeightRef = useRef(60);
  const nodeRefs = useRef(new Map());

  const registerNode = (id) => (node) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  };

  // Hauteur RÉELLE d'une rangée précise (repli sur la hauteur mesurée au
  // début du glissement si son nœud n'est pas — ou plus — monté). Sert à
  // computeSteps ci-dessous : des rangées de hauteurs différentes (ex. une
  // étape dont le texte passe sur 2 lignes à côté d'une autre sur 1 seule)
  // faussaient sinon le calcul de la rangée cible, puisqu'une seule
  // hauteur fixe (celle de la rangée SAISIE) servait d'unité pour toutes.
  const measureRowHeight = (id) => {
    const node = nodeRefs.current.get(id);
    return node ? node.getBoundingClientRect().height + 8 : rowHeightRef.current;
  };

  // Parcourt les rangées une à une dans le sens du glissement, en
  // cumulant leur VRAIE hauteur (pas une valeur unique supposée
  // identique pour toutes) — une rangée n'est franchie que lorsque le
  // glissement a dépassé la MOITIÉ de sa propre hauteur, pour ne pas
  // basculer l'ordre au moindre pixel de la frontière (même logique que
  // l'ancien Math.round, juste rangée par rangée plutôt qu'en un seul
  // calcul supposant une hauteur uniforme).
  const computeSteps = (dy, index) => {
    if (dy === 0) return 0;
    const direction = dy > 0 ? 1 : -1;
    const distance = Math.abs(dy);
    let covered = 0;
    let steps = 0;
    let i = index;
    while (true) {
      const nextIndex = i + direction;
      if (nextIndex < 0 || nextIndex > items.length - 1) break;
      const h = measureRowHeight(items[nextIndex].id);
      if (covered + h / 2 > distance) break;
      covered += h;
      steps += direction;
      i = nextIndex;
    }
    return steps;
  };

  const onHandlePointerDown = (id, index) => (e) => {
    e.preventDefault();
    const node = nodeRefs.current.get(id);
    if (node) rowHeightRef.current = node.getBoundingClientRect().height + 8;
    startYRef.current = e.clientY;
    startIndexRef.current = index;
    setDraggingId(id);
    setDragDy(0);
    triggerHaptic(15);
    if (e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };
  const onHandlePointerMove = (e) => {
    if (draggingId == null) return;
    setDragDy(e.clientY - startYRef.current);
  };
  const finishDrag = () => {
    if (draggingId == null) return;
    const steps = computeSteps(dragDy, startIndexRef.current);
    if (steps !== 0) {
      setItems((prev) => {
        const idx = prev.findIndex((r) => r.id === draggingId);
        if (idx === -1) return prev;
        const target = Math.max(0, Math.min(prev.length - 1, idx + steps));
        const copy = [...prev];
        const [moved] = copy.splice(idx, 1);
        copy.splice(target, 0, moved);
        return copy;
      });
      triggerHaptic(12);
    }
    setDraggingId(null);
    setDragDy(0);
  };

  const dragHandleProps = (id, index) => ({
    onPointerDown: onHandlePointerDown(id, index),
    onPointerMove: onHandlePointerMove,
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
  });

  const getRowStyle = (id, index) => {
    if (draggingId === id) {
      return {
        transform: `translateY(${dragDy}px)`,
        transition: "none",
        position: "relative",
        zIndex: 30,
        boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
        borderRadius: 8,
        background: "var(--parchment)",
      };
    }
    if (draggingId != null) {
      const steps = computeSteps(dragDy, startIndexRef.current);
      const idx = startIndexRef.current;
      let shift = 0;
      if (steps > 0 && index > idx && index <= idx + steps) shift = -1;
      else if (steps < 0 && index < idx && index >= idx + steps) shift = 1;
      if (shift !== 0) {
        return { transform: `translateY(${shift * rowHeightRef.current}px)`, transition: "transform 0.15s ease", position: "relative", zIndex: 1 };
      }
      return { transition: "transform 0.15s ease" };
    }
    return {};
  };

  return { draggingId, dragHandleProps, getRowStyle, registerNode };
}
