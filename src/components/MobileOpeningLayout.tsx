import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Reserve the opening viewport for the canvas and its transport; Edit stays below. */
export default function MobileOpeningLayout({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = root?.querySelector<HTMLElement>('[data-opening-stage]');
    const playback = root?.querySelector<HTMLElement>('[data-opening-playback]');
    if (!root || !stage || !playback) return;
    const measure = () => {
      const stageRect = stage.getBoundingClientRect();
      const playbackRect = playback.getBoundingClientRect();
      const topInset = stageRect.top - root.getBoundingClientRect().top;
      const reserved = Math.ceil(topInset + playbackRect.bottom - stageRect.bottom + 16);
      const value = `${reserved}px`;
      if (root.style.getPropertyValue('--opening-controls-height') !== value) {
        root.style.setProperty('--opening-controls-height', value);
      }
    };
    measure();
    // Each mode opens at its own top, rather than inheriting the previous
    // mode's scroll position or the browser's canvas scroll anchor.
    root.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const observer = new ResizeObserver(measure);
    observer.observe(playback);
    observer.observe(root);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return <div ref={rootRef} data-mobile-opening className="min-h-[100svh] overflow-y-auto bg-[#111116] pt-2 pb-7 select-none">{children}</div>;
}
