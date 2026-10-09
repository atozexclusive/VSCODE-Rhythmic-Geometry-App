import { useState } from 'react';
import { CircleDot, Volume2, VolumeX, X } from 'lucide-react';
import OrbitSoundOptions from './OrbitSoundOptions';
import type { HarmonySettings } from '../lib/audioEngine';
import type { Orbit } from '../lib/orbitalEngine';

export type OrbitMixUpdates = Pick<Partial<Orbit>, 'volume' | 'reverbAmount' | 'soundEnabled'>;

export default function OrbitAudioMixer({ orbits, harmony, onHarmonyChange, muted, onToggleMute, onChange, onClose, onSoundSettings, reverbAmount, onReverbChange, inline = false }: {
  reverbAmount: number;
  onReverbChange: (value: number) => void;
  harmony: HarmonySettings;
  onHarmonyChange: (updates: Partial<HarmonySettings>) => void;
  inline?: boolean;
  orbits: Orbit[];
  muted: boolean;
  onToggleMute: () => void;
  onChange: (id: string, updates: OrbitMixUpdates) => void;
  onClose: () => void;
  onSoundSettings?: () => void;
}) {
  const [soundsOpen, setSoundsOpen] = useState(false);
  const [reverb, setReverb] = useState(false);
  return (
    <section onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }} aria-label="Orbit audio mixer" className={`pointer-events-auto ${inline ? 'relative w-full' : 'fixed bottom-24 right-3 z-[80] max-h-[70dvh] w-[min(320px,calc(100vw-24px))]'} overflow-y-auto rounded-[1.5rem] border border-[#7FD7FF]/20 text-white shadow-2xl`}
      style={{ background: 'radial-gradient(circle at 95% 0%, rgba(127,215,255,0.15), transparent 38%), linear-gradient(180deg, #0e1118, #07090f)', boxShadow: '0 24px 70px #0009, inset 0 1px 0 #ffffff16' }}>
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <Volume2 size={16} className="text-[#7FD7FF]" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#7FD7FF]">Audio Mix</h2>
          <div className="mt-1 flex gap-1">{orbits.map((orbit) => <span key={orbit.id} className="h-1.5 w-1.5 rounded-full" style={{ background: !muted && orbit.soundEnabled !== false ? orbit.color : '#ffffff30' }} />)}</div>
        </div>
        <button type="button" aria-pressed={reverb} onClick={() => setReverb(!reverb)} className="h-8 rounded-xl border border-white/10 px-2 text-[8px] font-mono uppercase tracking-wider text-white/55 aria-pressed:border-purple-400/40 aria-pressed:bg-purple-400/15 aria-pressed:text-purple-300">Reverb</button>
        <button type="button" onClick={onToggleMute} aria-label={muted ? 'Enable Orbit audio' : 'Mute Orbit audio'} className="flex h-8 items-center gap-1 rounded-xl border border-[#7FD7FF]/25 bg-[#7FD7FF]/10 px-2 text-[8px] uppercase text-[#7FD7FF]">{muted ? <VolumeX size={12} /> : <Volume2 size={12} />}{muted ? 'Off' : 'On'}</button>
        <button type="button" onClick={onClose} aria-label="Close Orbit audio mixer" className="p-1 text-white/50 hover:text-white"><X size={14} /></button>
      </div>
      {reverb ? <div className="space-y-3 p-4">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-purple-300"><span>All layers · Reverb</span><span>{Math.round(reverbAmount * 100)}%</span></div>
        <input type="range" min={0} max={1} step={0.01} value={reverbAmount}
          aria-label="Orbit reverb for all layers" onChange={(event) => onReverbChange(Number(event.target.value))}
          className="touch-slider rg-transport-tempo-track w-full" style={{ ['--slider-accent' as string]: '#C8A8FF' }} />
      </div> : <div className="divide-y divide-white/10 px-3">
        {orbits.map((orbit, index) => {
          const level = orbit.volume ?? 1;
          const enabled = orbit.soundEnabled !== false;
          const label = `Layer ${index + 1}`;
          return <div key={orbit.id} className="relative py-4 pl-3">
            <span className="absolute bottom-3 left-0 top-3 w-1 rounded-full" style={{ background: enabled ? orbit.color : '#ffffff20', boxShadow: enabled ? `0 0 12px ${orbit.color}44` : 'none' }} />
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border" style={{ color: orbit.color, borderColor: `${orbit.color}30`, background: `${orbit.color}10` }}><CircleDot size={15} /></span>
              <div className="flex-1">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider"><span style={{ color: enabled ? orbit.color : '#ffffff66' }}>{label} · {orbit.pulseCount}</span><span className="text-white/45">{Math.round(level * 100)}%</span></div>
                <div className="mt-1 flex gap-1">{Array.from({ length: 8 }, (_, i) => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < Math.round(level * 8) ? orbit.color : '#ffffff17', opacity: enabled ? 0.65 : 0.25 }} />)}</div>
              </div>
              <button type="button" aria-label={`${enabled ? 'Mute' : 'Enable'} Orbit ${label}`} aria-pressed={!enabled} onClick={() => onChange(orbit.id, { soundEnabled: !enabled })} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15" style={{ color: enabled ? orbit.color : '#ffffff55' }}>{enabled ? <Volume2 size={13} /> : <VolumeX size={13} />}</button>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={level} aria-label={`Orbit ${label} volume`} onChange={(event) => onChange(orbit.id, { volume: Number(event.target.value) })} className="touch-slider rg-transport-tempo-track w-full" style={{ ['--slider-accent' as string]: orbit.color }} />
          </div>;
        })}
      </div>
      }
      <div className="border-t border-white/10 px-4 py-3">
        <button type="button" aria-expanded={soundsOpen} onClick={() => setSoundsOpen(!soundsOpen)} className="text-[10px] font-mono uppercase tracking-wider text-[#7FD7FF]">Sounds {soundsOpen ? '−' : '+'}</button>
        {soundsOpen && <div className="mt-3"><OrbitSoundOptions settings={harmony} onChange={onHarmonyChange} /></div>}
      </div>
      {onSoundSettings && <button type="button" onClick={onSoundSettings} className="mb-3 ml-6 text-[9px] font-mono uppercase tracking-wider text-white/50 hover:text-[#7FD7FF]">Sound settings</button>}
    </section>
  );
}
