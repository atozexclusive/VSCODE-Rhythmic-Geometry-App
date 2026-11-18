import { useState } from 'react';
import { Flower2, Sparkles, Star, Layers } from 'lucide-react';
import { SYMMETRY_GROUPS, SYMMETRY_SCENES, type SymmetryGroup } from '../lib/symmetryScenes';

const icons = { Rosettes: Flower2, Petals: Sparkles, Stars: Star, Mandalas: Layers };

export default function SymmetrySceneLibrary({ scenes, onLoad }: {
  scenes: Array<{ id: string; thumbnailDataUrl?: string }>;
  onLoad: (id: string) => void;
}) {
  const [group, setGroup] = useState<SymmetryGroup>('Rosettes');
  return <div className="space-y-3">
    <p className="text-[11px] leading-relaxed text-white/50">Choose a shape. Watch it unfold, then make it your own.</p>
    <div role="group" aria-label="Visual character" className="grid grid-cols-2 gap-1.5">
      {SYMMETRY_GROUPS.map(value => {
        const Icon = icons[value];
        return <button key={value} type="button" aria-pressed={group === value} onClick={() => setGroup(value)}
          className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-[11px] transition-colors ${group === value ? 'border-sky-200/25 bg-sky-200/10 text-sky-200' : 'border-white/[0.07] bg-white/[0.02] text-white/50 hover:bg-white/5'}`}><Icon size={14} aria-hidden="true" />{value}</button>;
      })}
    </div>
    <section aria-label={`${group} scenes`} className="space-y-2.5">
      {SYMMETRY_SCENES.filter(scene => scene.group === group).map(scene => {
        const preview = scenes.find(entry => entry.id === scene.id)?.thumbnailDataUrl;
        return <article key={scene.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
          {preview ? <img src={preview} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover" /> : null}
          <div className="min-w-0 flex-1">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-white/85">{scene.name}</h3>
            <p className="mt-1 text-[10px] leading-relaxed text-white/50">{scene.description}</p>
          </div>
          <button type="button" aria-label={`Load ${scene.name}`} onClick={() => onLoad(scene.id)} className="min-h-10 shrink-0 rounded-xl border border-emerald-200/20 bg-emerald-200/[0.06] px-3 text-[10px] font-mono uppercase tracking-[0.1em] text-emerald-200 hover:bg-emerald-200/10">Load</button>
        </article>;
      })}
    </section>
    <p className="text-[10px] leading-relaxed text-white/35">Petals and stars use Interference. Mandalas use Standard. Each scene loads its drawing mode and a matching pentatonic harmony.</p>
  </div>;
}
