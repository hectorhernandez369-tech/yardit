import { useRef, useState } from "react";

export default function useDraggablePanel() {
  const [position, setPosition] = useState(() => ({
    x: Math.max(12, window.innerWidth - 460),
    y: 12,
  }));
  const dragRef = useRef(null);

  const onPointerDown = (event) => {
    if (event.target.closest("button")) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 80, event.clientX - dragRef.current.offsetX)),
      y: Math.max(0, Math.min(window.innerHeight - 44, event.clientY - dragRef.current.offsetY)),
    });
  };

  const onPointerUp = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return { position, dragHandlers: { onPointerDown, onPointerMove, onPointerUp } };
}