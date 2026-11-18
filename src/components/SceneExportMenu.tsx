import { useId, useState, type ReactNode } from 'react';
import { ChevronRight, FileJson, Image, Music2, Video } from 'lucide-react';

type ExportKind = 'video' | 'image' | 'midi' | 'scene';
const sections = [
  { id: 'video', title: 'Video', description: 'Landscape, square, portrait, or Shorts', icon: Video, background: '#12303d', color: '#8fd8ff' },
  { id: 'image', title: 'Image', description: 'Save a high-resolution still', icon: Image, background: '#351925', color: '#ff76a8' },
  { id: 'midi', title: 'MIDI', description: 'Send the rhythm to music software', icon: Music2, background: '#322a10', color: '#f0c75a' },
  { id: 'scene', title: 'Editable scene', description: 'Move this setup to another device', icon: FileJson, background: '#123225', color: '#58e5b1' },
] as const;

export default function SceneExportMenu({ video, image, midi, scene, children }: {
  video: ReactNode; image: ReactNode; midi: ReactNode; scene: ReactNode; children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState<ExportKind | null>(null);
  const id = useId();
  const controls = { video, image, midi, scene };
  return <section data-scene-menu-export className="space-y-0">
    <div className="pb-4 text-[12px] font-mono uppercase tracking-[0.22em] text-[#FFD166]">Export</div>
    <div className="border-y border-white/10">
      {sections.map(({ id: kind, title, description, icon: Icon, background, color }) => <div key={kind} className="border-b border-white/10 last:border-b-0">
        <button type="button" aria-expanded={expanded === kind} aria-controls={`${id}-${kind}`} onClick={() => setExpanded(current => current === kind ? null : kind)}
          className="flex min-h-[74px] w-full items-center gap-4 rounded-lg py-3 text-left transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/60">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background, color }}><Icon size={22} /></span>
          <span className="min-w-0 flex-1"><strong className="block text-[12px] font-mono uppercase tracking-[0.14em] text-white/85">{title}</strong><span className="mt-1 block text-[11px] text-white/50">{description}</span></span>
          <ChevronRight aria-hidden="true" size={20} className={`shrink-0 text-white/34 transition-transform ${expanded === kind ? 'rotate-90' : ''}`} />
        </button>
        <div id={`${id}-${kind}`} hidden={expanded !== kind} className="space-y-3 border-t border-white/10 bg-white/[0.015] px-3 py-4">{controls[kind]}</div>
      </div>)}
    </div>
    {children}
  </section>;
}

export function ExportImageOptions({ onExport, locked, onLocked }: {
  onExport: (options: { aspect: 'landscape' | 'square' | 'portrait' | 'story'; scale: 1 | 2 | 4 }) => void;
  locked: boolean; onLocked: () => void;
}) {
  const [aspect, setAspect] = useState<'landscape' | 'square' | 'portrait' | 'story'>('square');
  const [scale, setScale] = useState<1 | 2 | 4>(2);
  const selectClass = 'min-h-11 min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 text-[12px] text-white/80';
  return <div className="grid grid-cols-2 gap-2">
    <select aria-label="Image format" value={aspect} onChange={event => setAspect(event.target.value as typeof aspect)} className={selectClass}>
      <option value="landscape" style={{ background: '#11151c' }}>Landscape</option><option value="square" style={{ background: '#11151c' }}>Square</option><option value="portrait" style={{ background: '#11151c' }}>Portrait</option><option value="story" style={{ background: '#11151c' }}>Shorts / Story</option>
    </select>
    <select aria-label="Image resolution" value={scale} onChange={event => setScale(Number(event.target.value) as typeof scale)} className={selectClass}>
      <option value="1" style={{ background: '#11151c' }}>HD</option><option value="2" style={{ background: '#11151c' }}>2K</option><option value="4" style={{ background: '#11151c' }}>4K</option>
    </select>
    <button type="button" onClick={() => { if (locked) { onLocked(); return; } onExport({ aspect, scale }); }} className="col-span-2 min-h-11 rounded-lg border border-[#ff76a8]/25 bg-[#ff76a8]/10 text-[13px] font-medium text-[#ffb2ce]">{locked ? 'Unlock image export' : 'Export image'}</button>
  </div>;
}
