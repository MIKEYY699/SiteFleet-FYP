'use client';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RouteLoadingBar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const creepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || !href.startsWith('/') || target.target === '_blank') return;
      if (href === pathname) return;

      setVisible(true);
      setWidth(15);
      if (creepRef.current) clearInterval(creepRef.current);
      creepRef.current = setInterval(() => {
        setWidth((w) => (w < 85 ? w + (85 - w) * 0.1 : w));
      }, 150);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (creepRef.current) clearInterval(creepRef.current);
      setWidth(100);
      const t = setTimeout(() => { setVisible(false); setWidth(0); }, 250);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out shadow-[0_0_8px_rgba(11,95,206,0.6)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}