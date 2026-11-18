import { useState } from 'react';
import { ChevronDown, ExternalLink, Orbit } from 'lucide-react';
import { PLANETARY_SCENES } from '../lib/planetaryScenes';

const groups = ['All', 'Planets', 'Moons', 'Experiments'] as const;

export default function PlanetarySceneLibrary({ scenes, onLoad }: {
  scenes: Array<{ id: string; thumbnailDataUrl?: string }>;
  onLoad: (id: string) => void;
}) {
  const [group, setGroup] = useState<typeof groups[number]>('All');
  return <div className="space-y-3">
    <p className="text-[11px] leading-relaxed text-white/50">Real celestial rhythms, translated into moving geometry.</p>
    <details className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[11px] text-white/55">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[#A9DDF4]"><Orbit size={14} />How to read these orbits<ChevronDown size={13} className="ml-auto" /></summary>
      <p className="mt-2 leading-relaxed">Smaller period numbers travel faster. The canvas numbers count turns in the shared return. Open a scene’s details for its real periods and how they were simplified. Time is sped up, distances are composed, and each scene begins aligned.</p>
    </details>
    <div role="group" aria-label="Planetary scene collection" className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
      {groups.map(value => <button key={value} type="button" aria-pressed={group === value} onClick={() => setGroup(value)}
        className={`min-h-9 min-w-0 flex-1 rounded-lg px-1 text-[10px] transition-colors ${group === value ? 'bg-sky-200/10 text-sky-200' : 'text-white/45 hover:bg-white/5'}`}>{value}</button>)}
    </div>
    {groups.slice(1).filter(value => group === 'All' || group === value).map(section => <section key={section} aria-label={`${section} scenes`} className="space-y-2">
      <h3 className="pt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">{section}</h3>
      {PLANETARY_SCENES.filter(scene => scene.group === section).map(scene => {
        const preview = scenes.find(entry => entry.id === scene.id)?.thumbnailDataUrl;
        return <article key={scene.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          <div className="flex items-center gap-3 p-3">
            {preview ? <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover" loading="lazy" /> : null}
            <div className="min-w-0 flex-1">
              <h4 className="text-[11px] font-mono uppercase tracking-[0.1em] text-white/85">{scene.name}</h4>
              <p className="mt-1 text-[10px] leading-relaxed text-white/50">{scene.description}</p>
            </div>
            <button type="button" aria-label={`Load ${scene.name}`} onClick={() => onLoad(scene.id)} className="min-h-10 shrink-0 rounded-xl border border-emerald-200/20 bg-emerald-200/[0.06] px-3 text-[10px] font-mono uppercase tracking-[0.1em] text-emerald-200 hover:bg-emerald-200/10">Load</button>
          </div>
          <details className="border-t border-white/[0.05] px-3 py-2 text-[10px] text-white/45">
            <summary className="flex cursor-pointer list-none items-center gap-2"><span className="text-white/65">{scene.counts.join(' : ')}</span><span>· {scene.model}</span><ChevronDown size={12} className="ml-auto shrink-0" /></summary>
            <div className="space-y-2 pt-3">
              <p className="leading-relaxed">{scene.note}</p>
              <p className="text-[9px] font-mono uppercase tracking-[0.1em] text-white/35">Inner → outer · orbital periods</p>
              <dl className="space-y-1.5">{scene.bodies.map(body => <div key={body.name} className="flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: body.color }} /><dt className="text-white/70">{body.name}</dt><dd className="ml-auto tabular-nums text-white/55">{body.period.toLocaleString('en-US', { maximumFractionDigits: 8 })} {body.unit}</dd></div>)}</dl>
              <a href={scene.source} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1.5 text-sky-200/70 hover:text-sky-200">NASA / JPL source<ExternalLink size={11} /></a>
            </div>
          </details>
        </article>;
      })}
    </section>)}
  </div>;
}
