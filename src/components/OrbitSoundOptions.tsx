import NoteOrderControl from './NoteOrderControl';
import type { ReactNode } from 'react';
import { NOTE_NAMES, SCALE_PRESETS, ORBIT_SOUND_PALETTES, getFriendlyScaleLabel, type HarmonySettings, type OrbitSoundPalette, type RootNote, type ScaleName } from '../lib/audioEngine';
import type { Orbit } from '../lib/orbitalEngine';
import ModeSoundPanel from './ModeSoundPanel';

export default function OrbitSoundOptions({ settings, onChange, orbits, muted, onToggleMute, onOrbitChange, selectedOrbitId }: {
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
  return <ModeSoundPanel mode="Orbit" keyed={keyed}
    onTuning={value => onChange({ tonePreset: value ? 'scale-quantized' : 'original' })}
    octave={settings.octaveShift ?? 0} onOctave={octaveShift => onChange({ octaveShift })}
    reverb={settings.reverbAmount ?? 0} onReverb={reverbAmount => onChange({ reverbAmount })}
    playback={<div className="study-listening-controls" role="group" aria-label="Orbit playback"><span>Playback</span>
      {(['solo', 'all', 'mute'] as const).map(value => <button key={value} type="button" aria-pressed={focus === value} onClick={() => setFocus(value)}>{value === 'solo' ? 'Solo' : value === 'all' ? 'All' : 'Mute'}</button>)}
    </div>}
    instrument={<select aria-label="Orbit instrument" value={settings.soundPalette ?? 'standard'} onChange={event => onChange({ soundPalette: event.target.value as OrbitSoundPalette, ...(['orbit-keys', 'dusk-synth'].includes(event.target.value) ? { reverbAmount: 1 } : {}) })}>
      {ORBIT_SOUND_PALETTES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>}
    pitchOptions={<>
      {keyed && <div className="mode-sound-key-row">
        <label className="mode-sound-field">Key<select aria-label="Orbit key" value={settings.rootNote} onChange={event => onChange({ rootNote: event.target.value as RootNote })}>{NOTE_NAMES.map(note => <option key={note}>{note}</option>)}</select></label>
        <label className="mode-sound-field">Scale<select aria-label="Orbit scale" value={settings.scaleName} onChange={event => onChange({ scaleName: event.target.value as ScaleName })}>{Object.keys(SCALE_PRESETS).map(name => <option key={name} value={name}>{getFriendlyScaleLabel(name as ScaleName)}</option>)}</select></label>
      </div>}
      <NoteOrderControl mode="Orbit" value={!settings.noteMotion || settings.noteMotion === 'fixed' ? 'standard' : settings.noteMotion}
        onChange={value => onChange({ noteMotion: value === 'standard' ? 'fixed' : value, ...(value !== 'standard' ? { tonePreset: 'scale-quantized' as const } : {}) })} />
      <div><div className="study-control-caption">Spacing</div><div className="mode-sound-segment" role="group" aria-label="Orbit pitch spacing">
        <button type="button" aria-pressed={settings.pitchSpacing !== 'wide'} onClick={() => onChange({ pitchSpacing: 'standard' })}>Tight</button>
        <button type="button" aria-pressed={settings.pitchSpacing === 'wide'} onClick={() => onChange({ pitchSpacing: 'wide', tonePreset: 'scale-quantized' })}>Wide</button>
      </div></div>
    </>} />;
}
