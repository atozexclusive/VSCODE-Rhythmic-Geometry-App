import { ChevronLeft, ChevronRight, SquarePen, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

/** Persistent desktop rails slide to their edge without resizing their contents. */
export default function DesktopSidePanel({ side, open, onOpen, children }: {
  side: 'left' | 'right'; open: boolean; onOpen: () => void; children: ReactNode;
}) {
  const label = side === 'left' ? 'Edit' : 'Settings';
  return <>
    <aside className="desktop-side-panel" data-desktop-side={side} data-open={open}
      aria-label={label} aria-hidden={!open} inert={!open}>
      <div className="desktop-side-panel-content">{children}</div>
    </aside>
    {!open ? <button type="button" className="desktop-side-panel-handle" data-side={side}
      aria-label={`Open ${label}`} title={`Open ${label}`} onClick={onOpen}>
      {side === 'left' ? <SquarePen size={15} /> : <SlidersHorizontal size={15} />}
      <span>{label}</span>
      {side === 'left' ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
    </button> : null}
  </>;
}
