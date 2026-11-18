import StepCountControl from './StepCountControl';
import { useState, type ReactNode } from 'react';
import { StudyShellButton } from './StudyInstrumentShell';
import type { RiffCycleStudy } from '../lib/riffCycleStudy';

export default function RiffShapeEditor({ study, onStepCount, onEndingLength, onToggleEnding, bar, riffSteps, endingSteps, sequencer, patternTools, riffStepLabel = 'Riff Steps' }: {
  study: RiffCycleStudy;
  onStepCount: (count: number) => void; onEndingLength: (count: number) => void;
  patternTools?: ReactNode;
  sequencer?: (stepEditor: ReactNode) => ReactNode; riffStepLabel?: string;
  onToggleEnding: () => void; bar: ReactNode; riffSteps: ReactNode; endingSteps: ReactNode;
}) {
  const [tab, setTab] = useState<'riff' | 'bar' | 'ending'>('riff');
  const accent = tab === 'ending' ? '#7FD7FF' : tab === 'bar' ? '#FF88C2' : study.riff.color;
  const stepControls = <>        <div className={`riff-step-heading flex items-center justify-between text-[10px] text-white ${tab === 'riff' && sequencer ? 'riff-step-heading-with-sequencer' : ''}`}><span>{tab === 'riff' ? riffStepLabel : 'Ending Length'}</span>
          {tab === 'ending' && <StudyShellButton size="compact" tone="blue" highlighted={study.landingEditEnabled} aria-pressed={study.landingEditEnabled} onClick={onToggleEnding}>{study.landingEditEnabled ? 'On' : 'Off'}</StudyShellButton>}
        </div>
        <StepCountControl value={tab === 'riff' ? study.riff.stepCount : study.landingLength}
          color={accent} label={tab === 'riff' ? 'Riff steps' : 'Ending length'}
          unit={tab === 'riff' ? 'steps' : 'slots'} min={tab === 'riff' ? 3 : 1}
          onChange={tab === 'riff' ? onStepCount : onEndingLength} />
        <div className={tab === 'ending' && !study.landingEditEnabled ? 'opacity-40 pointer-events-none' : ''} inert={tab === 'ending' && !study.landingEditEnabled ? true : undefined}>
          {tab === 'riff' ? riffSteps : endingSteps}
        </div>
</>;
  return <div className="riff-shape-editor" style={{ ['--riff-editor-color' as string]: study.riff.color }}>
    <div role="tablist" aria-label="Edit pattern" className="flex gap-1 rounded-lg bg-white/[.03] p-1">
      {(['bar', 'riff', 'ending'] as const).map(value => <button key={value} id={`shape-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls="shape-editor-panel" onClick={() => setTab(value)} className="flex-1 rounded-lg px-2 py-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: tab === value ? accent : 'rgba(255,255,255,.45)', background: tab === value ? `${accent}16` : 'transparent', boxShadow: tab === value ? `inset 0 0 0 1px ${accent}38, 0 0 12px ${accent}0a` : 'none' }}>{value === 'riff' ? 'Riff' : value === 'bar' ? 'Bar' : 'Ending'}</button>)}
    </div>
    <div id="shape-editor-panel" role="tabpanel" aria-labelledby={`shape-tab-${tab}`} className="riff-shape-editor-panel mt-3 space-y-3 rounded-xl border p-3" style={{ borderColor: `${accent}26`, background: `linear-gradient(145deg, ${accent}0d, rgba(17,17,22,.65))` }}>
      {tab === 'bar' ? bar : <>
        {tab === 'riff' && sequencer ? sequencer(stepControls) : stepControls}
      </>}
    </div>
    {tab === 'riff' ? patternTools : null}
  </div>;
}
