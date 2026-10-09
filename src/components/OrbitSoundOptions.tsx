import { NOTE_NAMES, SCALE_PRESETS, ORBIT_SOUND_PALETTES, getFriendlyScaleLabel, type HarmonySettings, type OrbitSoundPalette, type OrbitNoteMotion, type RootNote, type ScaleName } from '../lib/audioEngine';

export default function OrbitSoundOptions({ settings, onChange, includeKey = true }: {
  settings: HarmonySettings;
  onChange: (updates: Partial<HarmonySettings>) => void;
  includeKey?: boolean;
}) {
  const selectClass = 'mt-1 w-full rounded-lg border border-white/10 bg-[#181820] px-2 py-2 text-[11px] text-white/80 outline-none focus-visible:border-[#7FD7FF]/60';
  const labelClass = 'block min-w-0 text-[9px] font-mono uppercase tracking-wider text-white/50';
  return <div className="space-y-3">
    <label className={labelClass}>Sound
      <select aria-label="Orbit sound" className={selectClass} value={settings.soundPalette ?? 'standard'} onChange={(event) => onChange({ soundPalette: event.target.value as OrbitSoundPalette })}>
        {ORBIT_SOUND_PALETTES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <div className="grid grid-cols-2 gap-2">
      <label className={labelClass}>Note motion
        <select aria-label="Orbit note motion" className={selectClass} value={settings.noteMotion ?? 'fixed'} onChange={(event) => onChange({ noteMotion: event.target.value as OrbitNoteMotion, ...(event.target.value !== 'fixed' ? { tonePreset: 'scale-quantized' as const } : {}) })}>
          <option value="fixed">Standard · Fixed</option><option value="arpeggio">Arpeggio</option><option value="ascending">Ascending</option><option value="descending">Descending</option><option value="up-down">Up / Down</option>
        </select>
      </label>
      <label className={labelClass}>Pitch spacing
        <select aria-label="Orbit pitch spacing" className={selectClass} value={settings.pitchSpacing ?? 'standard'} onChange={(event) => onChange({ pitchSpacing: event.target.value as HarmonySettings['pitchSpacing'], ...(event.target.value !== 'standard' ? { tonePreset: 'scale-quantized' as const } : {}) })}>
          <option value="close">Close</option><option value="standard">Standard</option><option value="wide">Wide</option>
        </select>
      </label>
      <label className={labelClass}>Octave
        <select aria-label="Orbit octave" className={selectClass} value={settings.octaveShift ?? 0} onChange={(event) => onChange({ octaveShift: Number(event.target.value) })}>
          {[-2,-1,0,1,2].map((value) => <option key={value} value={value}>{value === 0 ? 'Original' : value > 0 ? `+${value}` : value}</option>)}
        </select>
      </label>
      <label className={labelClass}>Pattern range
        <select aria-label="Orbit pattern octave range" disabled={!settings.noteMotion || settings.noteMotion === 'fixed'} className={`${selectClass} disabled:opacity-40`} value={settings.arpeggioOctaves ?? 1} onChange={(event) => onChange({ arpeggioOctaves: Number(event.target.value) })}>
          {[1,2,3].map((value) => <option key={value} value={value}>{value} {value === 1 ? 'octave' : 'octaves'}</option>)}
        </select>
      </label>
    </div>
    {includeKey && <div className="grid grid-cols-[72px_1fr] gap-2">
      <label className={labelClass}>Key<select aria-label="Orbit key" className={selectClass} value={settings.rootNote} onChange={(event) => onChange({ rootNote: event.target.value as RootNote, tonePreset: 'scale-quantized' })}>{NOTE_NAMES.map((note) => <option key={note}>{note}</option>)}</select></label>
      <label className={labelClass}>Scale<select aria-label="Orbit scale" className={selectClass} value={settings.scaleName} onChange={(event) => onChange({ scaleName: event.target.value as ScaleName, tonePreset: 'scale-quantized' })}>{Object.keys(SCALE_PRESETS).map((name) => <option key={name} value={name}>{getFriendlyScaleLabel(name as ScaleName)}</option>)}</select></label>
    </div>}
    <p className="text-[9px] leading-relaxed text-white/40">{settings.noteMotion && settings.noteMotion !== 'fixed' ? 'Each layer advances one note per hit. Restart returns the pattern to its first note.' : 'Each layer keeps its own pitch. Choose a note motion to move through the scale.'}</p>
    <button type="button" onClick={() => onChange({ soundPalette: 'standard', noteMotion: 'fixed', pitchSpacing: 'standard', octaveShift: 0, arpeggioOctaves: 1, tonePreset: 'original' })} className="rounded-lg border border-white/15 px-2 py-1.5 text-[9px] text-white/65 hover:bg-white/5">Reset to standard sound</button>
  </div>;
}
