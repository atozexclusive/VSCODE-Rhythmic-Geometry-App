import ModeSoundPanel from './ModeSoundPanel';
import { NOTE_NAMES, SCALE_PRESETS, getFriendlyScaleLabel, type ScaleName } from '../lib/audioEngine';
import type { RiffCycleSoundSettings } from '../lib/riffCycleStudy';

export default function RiffSoundOptions({ settings, onChange }: { settings: RiffCycleSoundSettings; onChange: (updates: Partial<RiffCycleSoundSettings>) => void }) {
  const keyed = settings.pitchMode === 'keyed';
  return <ModeSoundPanel mode="Riff" keyed={keyed} onTuning={value => onChange({ pitchMode: value ? 'keyed' : 'free' })}
    octave={settings.octaveShift ?? 0} onOctave={octaveShift => onChange({ octaveShift })}
    reverb={settings.reverbAmount ?? 0} onReverb={reverbAmount => onChange({ reverbAmount })}
    instrument={<select aria-label="Riff instrument" value={settings.palette} onChange={event => onChange({ palette: event.target.value as RiffCycleSoundSettings['palette'] })}>
      <option value="architectural">Architectural</option><option value="deep-architectural">Deep Arch</option><option value="muted-djent">Warm Pluck</option><option value="dry-synth">Dry Synth</option><option value="metal-tick">Soft Mallet</option><option value="low-pulse">Low Pulse</option>
    </select>}
    pitchOptions={<>
      {keyed && <div className="mode-sound-key-row">
        <label className="mode-sound-field">Key<select aria-label="Riff key" value={settings.rootNote} onChange={event => onChange({ rootNote: event.target.value as RiffCycleSoundSettings['rootNote'] })}>{NOTE_NAMES.map(note => <option key={note}>{note}</option>)}</select></label>
        <label className="mode-sound-field">Scale<select aria-label="Riff scale" value={settings.scaleName} onChange={event => onChange({ scaleName: event.target.value as ScaleName })}>{Object.keys(SCALE_PRESETS).map(name => <option key={name} value={name}>{getFriendlyScaleLabel(name as ScaleName)}</option>)}</select></label>
      </div>}
      <div className="mode-sound-key-row">
        <label className="mode-sound-field">Register<select aria-label="Riff register" value={settings.register} onChange={event => onChange({ register: event.target.value as RiffCycleSoundSettings['register'] })}><option value="low">Low</option><option value="mid-low">Mid-Low</option><option value="wide">Wide</option></select></label>
        {keyed && <label className="mode-sound-field">Note Order<select aria-label="Riff note order" value={settings.noteOrder ?? 'ascending'} onChange={event => onChange({ noteOrder: event.target.value as RiffCycleSoundSettings['noteOrder'] })}><option value="ascending">Ascending</option><option value="descending">Descending</option><option value="up-down">Ascending To Descending</option><option value="arpeggio">Arpeggio</option><option value="random">Random</option></select></label>}
      </div>
    </>} />;
}
