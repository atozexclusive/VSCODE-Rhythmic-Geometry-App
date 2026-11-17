import { useState, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { StudyShellButton } from './StudyInstrumentShell';
import type { RiffCycleStudy } from '../lib/riffCycleStudy';

export default function RiffShapeEditor({ study, onStepCount, onEndingLength, onToggleEnding, bar, riffSteps, endingSteps }: {
  study: RiffCycleStudy;
  onStepCount: (count: number) => void; onEndingLength: (count: number) => void;
  onToggleEnding: () => void; bar: ReactNode; riffSteps: ReactNode; endingSteps: ReactNode;
}) {
  const [tab, setTab] = useState<'riff' | 'bar' | 'ending'>('riff');
  const accent = tab === 'ending' ? '#7FD7FF' : tab === 'bar' ? '#FF88C2' : study.riff.color;
  return <div className="riff-shape-editor" style={{ ['--riff-editor-color' as string]: study.riff.color }}>
    <div role="tablist" aria-label="Edit pattern" className="flex gap-1 rounded-lg bg-white/[.03] p-1">
      {(['bar', 'riff', 'ending'] as const).map(value => <button key={value} id={`shape-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls="shape-editor-panel" onClick={() => setTab(value)} className="flex-1 rounded-lg px-2 py-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: tab === value ? accent : 'rgba(255,255,255,.45)', background: tab === value ? `${accent}16` : 'transparent', boxShadow: tab === value ? `inset 0 0 0 1px ${accent}38, 0 0 12px ${accent}0a` : 'none' }}>{value === 'riff' ? 'Riff' : value === 'bar' ? 'Bar' : 'Ending'}</button>)}
    </div>
    <div id="shape-editor-panel" role="tabpanel" aria-labelledby={`shape-tab-${tab}`} className="mt-3 space-y-3 rounded-xl border p-3" style={{ borderColor: `${accent}26`, background: `linear-gradient(145deg, ${accent}0d, rgba(17,17,22,.65))` }}>
      {tab === 'bar' ? bar : <>
        <div className="flex items-center justify-between text-[10px] text-white/55"><span>{tab === 'riff' ? 'Riff Steps' : 'Ending Length'}</span>
          {tab === 'ending' && <StudyShellButton size="compact" tone="blue" highlighted={study.landingEditEnabled} aria-pressed={study.landingEditEnabled} onClick={onToggleEnding}>{study.landingEditEnabled ? 'On' : 'Off'}</StudyShellButton>}
        </div>
        <div className="flex items-center gap-2">
          <StudyShellButton size="square" className="!h-8 !w-8 !rounded-lg" aria-label="Decrease steps" onClick={() => (tab === 'riff' ? onStepCount : onEndingLength)(Math.max(tab === 'riff' ? 3 : 1, (tab === 'riff' ? study.riff.stepCount : study.landingLength) - 1))}><Minus size={14} /></StudyShellButton>
          <label className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-center text-xs" style={{ color: accent, background: `${accent}12`, borderColor: `${accent}30` }}>
            <input aria-label={tab === 'riff' ? 'Riff steps' : 'Ending length'} type="number" min={tab === 'riff' ? 3 : 1} value={tab === 'riff' ? study.riff.stepCount : study.landingLength} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value > 0) (tab === 'riff' ? onStepCount : onEndingLength)(value); }} className="w-12 bg-transparent text-center outline-none" /> {tab === 'riff' ? 'steps' : 'slots'}
          </label>
          <StudyShellButton size="square" className="!h-8 !w-8 !rounded-lg" aria-label="Increase steps" onClick={() => (tab === 'riff' ? onStepCount : onEndingLength)((tab === 'riff' ? study.riff.stepCount : study.landingLength) + 1)}><Plus size={14} /></StudyShellButton>
        </div>
        <div className={tab === 'ending' && !study.landingEditEnabled ? 'opacity-40 pointer-events-none' : ''} inert={tab === 'ending' && !study.landingEditEnabled ? true : undefined}>
          {tab === 'riff' ? riffSteps : endingSteps}
        </div>
      </>}
    </div>
  </div>;
}
