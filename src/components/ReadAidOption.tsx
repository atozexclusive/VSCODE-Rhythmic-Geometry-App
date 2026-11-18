import type { ReactNode } from 'react';

/** Same compact visual language as the canvas reading-aid toggles. */
export default function ReadAidOption({ children, icon, active = false, onClick, title, indicator = false }: {
  children: ReactNode; icon: ReactNode; active?: boolean; onClick: () => void; title?: string; indicator?: boolean;
}) {
  return <button type="button" onClick={onClick} aria-pressed={active} title={title}
    className="read-aid-option flex min-h-8 min-w-0 items-center gap-2 rounded-[9px] border px-2.5 py-2 text-left text-[10px] font-normal normal-case tracking-normal transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70"
    style={{ borderColor: active ? 'rgba(127,215,255,.18)' : 'rgba(255,255,255,.045)', background: active ? 'rgba(127,215,255,.09)' : 'rgba(255,255,255,.025)', color: active ? '#B5DCEF' : 'rgba(255,255,255,.55)' }}>
    <span className="shrink-0 opacity-65" aria-hidden="true">{icon}</span><span>{children}</span>
    {indicator ? <span aria-hidden="true" className="ml-auto h-[3px] w-[3px] shrink-0 rounded-full" style={{ background: active ? '#8ED8F1' : 'rgba(255,255,255,.2)' }} /> : null}
  </button>;
}
