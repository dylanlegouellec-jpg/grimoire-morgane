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

  const computeSteps = (dy, index) => {
    const raw = Math.round(dy / rowHeightRef.current);
    return Math.max(-index, Math.min(items.length - 1 - index, raw));
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
