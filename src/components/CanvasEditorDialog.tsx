import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

const CloseCanvasEditorContext = createContext<(() => void) | null>(null);
export const useCanvasEditorClose = () => useContext(CloseCanvasEditorContext);

/** The shared opening, placement and focus behavior for canvas editors. */
export default function CanvasEditorDialog({ title, color, colorControl, headerActions, onClose, children }: {
  title: string; color: string; colorControl?: ReactNode; headerActions?: ReactNode;
  onClose: () => void; children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <CloseCanvasEditorContext.Provider value={onClose}>
    <div className="fixed inset-0 z-[150] flex items-end justify-end bg-black/10 p-3 pb-24 sm:p-6" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} data-canvas-editor-dialog tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        style={{ borderColor: `${color}30`, boxShadow: `0 0 0 1px ${color}0b inset, 0 20px 60px #0007` }}
        className="w-full max-w-[420px] max-h-[70dvh] overflow-y-auto rounded-[24px] border bg-[#111116]/95 p-4 shadow-2xl outline-none backdrop-blur-xl"
        onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
          if (event.key === 'Tab') {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')).filter(node => !node.closest('[inert]') && node.getClientRects().length);
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[.18em] text-white/65"><span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}66` }} />{title}</span>
          <div className="flex items-center gap-2">{headerActions}{colorControl}<button type="button" aria-label={`Close ${title.toLowerCase()}`} className="rounded-lg p-2 text-white/50 hover:bg-white/5" onClick={onClose}><X size={16} /></button></div>
        </div>
        {children}
      </div>
    </div>
  </CloseCanvasEditorContext.Provider>;
}
