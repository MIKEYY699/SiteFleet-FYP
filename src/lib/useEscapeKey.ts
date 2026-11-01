'use client';
import { useEffect, useRef } from 'react';

// Calls onEscape when Esc is pressed, while `active` is true. Used by every pop-up.
export function useEscapeKey(onEscape: () => void, active = true) {
  const handlerRef = useRef(onEscape);
  useEffect(() => { handlerRef.current = onEscape; });

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handlerRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);
}
