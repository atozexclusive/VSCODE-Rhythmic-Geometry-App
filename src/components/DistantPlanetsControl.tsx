import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { StudyShellButton } from './StudyInstrumentShell';
import type { CanvasDisplaySettings } from '../lib/canvasDisplayThemes';
import { DISTANT_PLANET_OPTIONS, normalizeDistantPlanets, type DistantPlanetId } from '../lib/distantPlanets';

export default function DistantPlanetsControl({ settings, onChange }: {
  settings: CanvasDisplaySettings;
  onChange: (updates: Partial<CanvasDisplaySettings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const planets = normalizeDistantPlanets(settings.distantPlanets);
  useEffect(() => { if (open) panelRef.current?.scrollIntoView({ block: 'nearest' }); }, [open]);
  const cancelHold = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  const choose = () => { onChange({ atmosphere: 'distant-planets' }); setOpen(true); };

  return <>
    <StudyShellButton
      size="compact" tone="blue" highlighted={settings.atmosphere === 'distant-planets'}
      className="select-none px-1.5 tracking-[0.11em]"
      title="Hold to choose planets, or press Arrow Down"
      aria-expanded={open} aria-controls={panelId}
      onPointerDown={event => {
        if (event.button !== 0) return;
        cancelHold(); held.current = false; origin.current = { x: event.clientX, y: event.clientY };
        timer.current = setTimeout(() => { timer.current = null; held.current = true; choose(); }, 500);
      }}
      onPointerMove={event => { if (Math.hypot(event.clientX-origin.current.x,event.clientY-origin.current.y)>10) cancelHold(); }}
      onPointerUp={cancelHold} onPointerCancel={cancelHold} onPointerLeave={cancelHold} onBlur={cancelHold}
      onContextMenu={event => { event.preventDefault(); cancelHold(); held.current = true; choose(); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); choose(); }
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'Enter' || event.key === ' ') held.current = false;
      }}
      onClick={() => {
        if (held.current) { held.current = false; return; }
        onChange({ atmosphere: 'distant-planets' });
      }}
    >Distant Planets</StudyShellButton>
    {open ? <section ref={panelRef} id={panelId} aria-label="Choose distant planets" className="col-span-3 space-y-2 rounded-xl border border-sky-200/15 bg-sky-200/[0.035] p-3" onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-sky-100/80">Distant Planets</span>
        <button type="button" aria-label="Close planet choices" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/5 focus-visible:outline focus-visible:outline-sky-200"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['Upper left', 'Lower right'] as const).map((position, index) => <label key={position} className="space-y-1 text-[10px] text-white/55">
          <span>{position}</span>
          <select aria-label={`${position} planet`} value={planets[index]} onChange={event => {
            const next = normalizeDistantPlanets(planets);
            next[index] = event.target.value as DistantPlanetId;
            onChange({ distantPlanets: next });
          }} className="min-h-10 w-full rounded-lg border border-white/10 bg-[#151c26] px-2 text-[11px] text-sky-100 outline-none focus-visible:border-sky-200/60">
            {DISTANT_PLANET_OPTIONS.map(planet => <option key={planet.id} value={planet.id}>{planet.label}</option>)}
          </select>
        </label>)}
      </div>
    </section> : null}
  </>;
}
