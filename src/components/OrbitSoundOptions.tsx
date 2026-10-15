import type { ReactNode } from 'react';
import { NOTE_NAMES, SCALE_PRESETS, ORBIT_SOUND_PALETTES, getFriendlyScaleLabel, type HarmonySettings, type OrbitSoundPalette, type RootNote, type ScaleName } from '../lib/audioEngine';
import type { Orbit } from '../lib/orbitalEngine';
import { StudyShellButton } from './StudyInstrumentShell';
import InfoTip from './InfoTip';

export default function OrbitSoundOptions({ settings, onChange, orbits, muted, onToggleMute, onOrbitChange, selectedOrbitId, soundModeLabel }: {
  settings: HarmonySettings;
  onChange: (updates: Partial<HarmonySettings>) => void;
  orbits: Orbit[];
  muted: boolean;
  onToggleMute: () => void;
  onOrbitChange: (id: string, updates: Pick<Partial<Orbit>, 'soundEnabled'>) => void;
  selectedOrbitId?: string | null;
  soundModeLabel?: ReactNode;
}) {
  const keyed = settings.tonePreset === 'scale-quantized';
  const enabled = orbits.filter((orbit) => orbit.soundEnabled !== false);
  const focus = muted || enabled.length === 0 ? 'mute' : enabled.length === 1 && orbits.length > 1 ? 'solo' : 'all';
  const setFocus = (next: 'solo' | 'all' | 'mute') => {
    if (next === 'mute') {
      if (!muted) onToggleMute();
      return;
    }
    const soloId = orbits.find((orbit) => orbit.id === selectedOrbitId)?.id
      ?? (enabled.length === 1 ? enabled[0].id : orbits[0]?.id);
    orbits.forEach((orbit) => onOrbitChange(orbit.id, { soundEnabled: next === 'all' || orbit.id === soloId }));
    if (muted) onToggleMute();
  };
  const selectClass = 'w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] font-mono uppercase tracking-[0.12em] text-white outline-none';
  return <div className="space-y-3 border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
    <div className="space-y-2">
      <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Sound</div>
      <div className="grid grid-cols-3 gap-2">
        <StudyShellButton size="compact" tone="blue" highlighted={focus === 'solo'} onClick={() => setFocus('solo')}>Solo</StudyShellButton>
        <StudyShellButton size="compact" tone="blue" highlighted={focus === 'all'} onClick={() => setFocus('all')}>All</StudyShellButton>
        <StudyShellButton size="compact" tone="blue" highlighted={focus === 'mute'} onClick={() => setFocus('mute')}>Mute</StudyShellButton>
      </div>
    </div>
    <div className="space-y-2">
      {soundModeLabel ?? <div className="flex items-center gap-1.5"><span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Sound Mode</span><InfoTip text="Original keeps the raw sound. In Key keeps notes inside one note family so the rhythm feels more melodic." /></div>}
      <div className="grid grid-cols-2 gap-2">
        <StudyShellButton size="compact" tone="green" highlighted={!keyed} onClick={() => onChange({ tonePreset: 'original' })}>Original</StudyShellButton>
        <StudyShellButton size="compact" tone="green" highlighted={keyed} onClick={() => onChange({ tonePreset: 'scale-quantized' })}>In Key</StudyShellButton>
      </div>
      <select aria-label="Orbit sound palette" className={selectClass} value={settings.soundPalette ?? 'standard'} onChange={(event) => onChange({ soundPalette: event.target.value as OrbitSoundPalette })}>
        {ORBIT_SOUND_PALETTES.map(([value, label]) => <option key={value} value={value} style={{ background: '#181820' }}>{label}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <StudyShellButton size="compact" tone="amber" highlighted={settings.pitchSpacing !== 'wide'} onClick={() => onChange({ pitchSpacing: 'standard' })}>Tight</StudyShellButton>
        <StudyShellButton size="compact" tone="amber" highlighted={settings.pitchSpacing === 'wide'} onClick={() => onChange({ pitchSpacing: 'wide', tonePreset: 'scale-quantized' })}>Wide</StudyShellButton>
      </div>
      <div className="space-y-1.5">
        <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/42">Octave</div>
        <div className="grid grid-cols-3 gap-2">
          <StudyShellButton size="compact" tone="green" highlighted={settings.octaveShift === -1} onClick={() => onChange({ octaveShift: -1 })}>Down</StudyShellButton>
          <StudyShellButton size="compact" tone="green" highlighted={(settings.octaveShift ?? 0) === 0} onClick={() => onChange({ octaveShift: 0 })}>Original</StudyShellButton>
          <StudyShellButton size="compact" tone="green" highlighted={settings.octaveShift === 1} onClick={() => onChange({ octaveShift: 1 })}>Up</StudyShellButton>
        </div>
      </div>
      <div className="space-y-0 rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-1.5">
        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.18em] text-white/42"><span>Reverb</span><span>{Math.round((settings.reverbAmount ?? 0) * 100)}%</span></div>
        <input type="range" min="0" max="1" step="0.01" value={settings.reverbAmount ?? 0} onChange={(event) => onChange({ reverbAmount: Number(event.target.value) })} className="touch-slider rg-compact-slider block w-full" style={{ ['--slider-accent' as string]: '#88FFCC', accentColor: '#88FFCC' }} aria-label="Orbit reverb amount" />
      </div>
      {keyed && <div className="space-y-1.5">
        <div className="grid grid-cols-[82px,1fr] gap-2 text-[9px] font-mono uppercase tracking-[0.18em] text-white/42"><div>Key</div><div>Note Family</div></div>
        <div className="grid grid-cols-[82px,1fr] gap-2">
          <select aria-label="Orbit key" className={selectClass} value={settings.rootNote} onChange={(event) => onChange({ rootNote: event.target.value as RootNote })}>{NOTE_NAMES.map((note) => <option key={note} value={note} style={{ background: '#181820' }}>{note}</option>)}</select>
          <select aria-label="Orbit scale" className={selectClass} value={settings.scaleName} onChange={(event) => onChange({ scaleName: event.target.value as ScaleName })}>{Object.keys(SCALE_PRESETS).map((name) => <option key={name} value={name} style={{ background: '#181820' }}>{getFriendlyScaleLabel(name as ScaleName)}</option>)}</select>
        </div>
      </div>}
    </div>
  </div>;
}
