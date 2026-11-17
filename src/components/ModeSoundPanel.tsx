import type { ReactNode } from 'react';
import { AudioLines, Music2, SlidersHorizontal, ChevronDown } from 'lucide-react';

export default function ModeSoundPanel({ instrument, keyed, onTuning, octave, onOctave, pitchOptions, reverb, onReverb, mode, playback }: {
  instrument: ReactNode; keyed: boolean; onTuning: (keyed: boolean) => void;
  octave: number; onOctave: (value: -1 | 0 | 1) => void; pitchOptions: ReactNode;
  reverb: number; onReverb: (value: number) => void; mode: string; playback?: ReactNode;
}) {
  return <div className="study-composer-sound mode-sound-panel">
    {playback}
    <section className="study-sound-section">
      <h3 className="study-sound-section-title"><span className="study-section-icon"><AudioLines size={14} />Sound</span></h3>
      {instrument}
    </section>
    <section className="study-sound-section">
      <h3 className="study-sound-section-title"><span className="study-section-icon"><Music2 size={14} />Pitch</span></h3>
      <div className="study-pitch-row">
        <div><div className="study-control-caption">Tuning</div>
          <div className="mode-sound-segment" role="group" aria-label={`${mode} tuning`}>
            <button type="button" aria-pressed={!keyed} onClick={() => onTuning(false)}>Standard</button>
            <button type="button" aria-pressed={keyed} onClick={() => onTuning(true)}>In Key</button>
          </div>
        </div>
        <div className="study-octave" role="group" aria-label={`${mode} octave`}><span>Octave</span>
          {([-1, 0, 1] as const).map(value => <button key={value} type="button" aria-label={`${mode} octave ${value}`} aria-pressed={octave === value} onClick={() => onOctave(value)}>{value > 0 ? '+1' : value === -1 ? '−1' : '0'}</button>)}
        </div>
      </div>
      <p className="study-sound-help">{keyed ? 'Notes follow the selected key and scale.' : 'Standard uses the instrument’s original pitch.'}</p>
      <div className="mode-sound-pitch-options">{pitchOptions}</div>
    </section>
    <details className="study-sound-section study-mix-section">
      <summary><span className="study-section-icon"><SlidersHorizontal size={14} />Mix</span><ChevronDown size={13} /></summary>
      <label className="mode-sound-field mt-3"><span className="flex justify-between">Reverb <span>{Math.round(reverb * 100)}%</span></span>
        <input aria-label={`${mode} reverb amount`} type="range" min="0" max="1" step="0.01" value={reverb} onChange={event => onReverb(Number(event.target.value))} className="w-full" />
      </label>
    </details>
  </div>;
}
