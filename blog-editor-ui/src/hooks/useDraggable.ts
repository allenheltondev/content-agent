import { useState, useRef, useEffect, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  position: Position;
  offset: Position;
}

export function useDraggable(initialPosition?: Position) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    position: initialPosition || { x: 0, y: 0 },
    offset: { x: 0, y: 0 }
  });

  const dragRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;

    const rect = dragRef.current.getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setDragState(prev => ({
      ...prev,
      isDragging: true,
      offset
    }));

    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;

    const newPosition = {
      x: e.clientX - dragState.offset.x,
      y: e.clientY - dragState.offset.y
    };

    // Keep within viewport bounds
    const maxX = window.innerWidth - (dragRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (dragRef.current?.offsetHeight || 0);

    newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
    newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));

    setDragState(prev => ({
      ...prev,
      position: newPosition
    }));
  }, [dragState.isDragging, dragState.offset]);

  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      isDragging: false
    }));
  }, []);

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  return {
    dragRef,
    position: dragState.position,
    isDragging: dragState.isDragging,
    handleMouseDown,
    style: {
      position: 'fixed' as const,
      left: dragState.position.x,
      top: dragState.position.y,
      cursor: dragState.isDragging ? 'grabbing' : 'grab'
    }
  };
}
