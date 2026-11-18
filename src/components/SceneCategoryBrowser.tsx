import { ChevronLeft, ChevronRight, Drum, FlaskConical, Folder, GraduationCap, Music2, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

const categoryIcons: Record<string, LucideIcon> = {
  saved: Folder,
  songs: Music2,
  grooves: Drum,
  exercises: GraduationCap,
  experiments: FlaskConical,
};

function CategorySymbol({ id, color }: { id: string; color: string }) {
  const Icon = categoryIcons[id] ?? Folder;
  return <Icon size={15} strokeWidth={1.6} aria-hidden="true" className="shrink-0" style={{ color }} />;
}

export interface SceneCategory {
  id: string;
  title: string;
  description: string;
  preview?: ReactNode;
  color: string;
}

export default function SceneCategoryBrowser({ categories, active, onSelect, onBack, saveAction, children }: {
  categories: SceneCategory[];
  active: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  saveAction?: ReactNode;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const scroller = sectionRef.current?.closest('[data-scene-menu-content]');
    if (scroller) scroller.scrollTop = 0;
  }, [active]);
  const category = categories.find(item => item.id === active);
  if (category) return <section ref={sectionRef} className="space-y-3" aria-label={category.title}>
    <div className="flex min-h-10 items-center gap-3 border-b border-white/10 pb-3">
      <button type="button" onClick={onBack} aria-label="Back to scene categories" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/65 hover:bg-white/5 focus-visible:outline-sky-200"><ChevronLeft size={18} /></button>
      <h2 className="flex items-center gap-2 text-[12px] font-mono uppercase tracking-[0.16em] text-[#FFD166]"><CategorySymbol id={category.id} color={category.color} />{category.title}</h2>
    </div>
    {active === 'saved' ? saveAction : null}
    {children}
  </section>;
  return <section ref={sectionRef} aria-label="Scene categories">
    <h2 className="pb-4 text-[12px] font-mono uppercase tracking-[0.22em] text-[#FFD166]">Scenes</h2>
    {saveAction ? <div className="mb-4">{saveAction}</div> : null}
    <div className="border-y border-white/10">
      {categories.map(item => <button key={item.id} type="button" onClick={() => onSelect(item.id)}
        className="flex min-h-[86px] w-full items-center gap-4 border-b border-white/10 py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/60">
        <span aria-hidden="true" className="pointer-events-none flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10" style={{ background: `${item.color}12`, color: item.color }}>
          {item.preview ?? <Folder size={26} strokeWidth={1.5} />}
        </span>
        <span className="min-w-0 flex-1"><strong className="block text-[12px] font-mono uppercase tracking-[0.14em] text-white/85">{item.title}</strong><span className="mt-1 block text-[11px] leading-relaxed text-white/50">{item.description}</span></span>
        <ChevronRight aria-hidden="true" size={20} className="shrink-0 text-white/34" />
      </button>)}
    </div>
  </section>;
}
