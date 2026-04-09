import {
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  RIFF_CYCLE_COLORS,
  RIFF_CYCLE_PRESETS,
  type ReferenceMeter,
  type RiffCycleStudy,
  type RiffPhrase,
} from '../lib/riffCycleStudy';

interface RiffCycleSidebarProps {
  isOpen: boolean;
  study: RiffCycleStudy;
  activePresetId: string | null;
  selectedStep: number | null;
  onClose: () => void;
  onLoadPreset: (presetId: string) => void;
  onResetStudy: () => void;
  onTogglePlay: () => void;
  onToggleSound: () => void;
  onUpdateReference: (updates: Partial<ReferenceMeter>) => void;
  onUpdateRiff: (updates: Partial<RiffPhrase>) => void;
  onSetRiffStepCount: (stepCount: number) => void;
  onToggleStep: (stepIndex: number) => void;
  onToggleAccent: (stepIndex: number) => void;
  onSelectStep: (stepIndex: number | null) => void;
  onRotateRiff: (stepOffset: number) => void;
  onInvertRiff: () => void;
  onClearRiff: () => void;
  onToggleViewMode: () => void;
  onToggleAlignmentMarkers: () => void;
  onToggleDriftTrail: () => void;
  onToggleStepLabels: () => void;
  onTogglePhraseBody: () => void;
  onToggleEmphasisMode: () => void;
}

export default function RiffCycleSidebar({
  isOpen,
  study,
  activePresetId,
  selectedStep,
  onClose,
  onLoadPreset,
  onResetStudy,
  onTogglePlay,
  onToggleSound,
  onUpdateReference,
  onUpdateRiff,
  onSetRiffStepCount,
  onToggleStep,
  onToggleAccent,
  onSelectStep,
  onRotateRiff,
  onInvertRiff,
  onClearRiff,
  onToggleViewMode,
  onToggleAlignmentMarkers,
  onToggleDriftTrail,
  onToggleStepLabels,
  onTogglePhraseBody,
  onToggleEmphasisMode,
}: RiffCycleSidebarProps) {
  const isMobile = useIsMobile();
  const resetSummary =
    study.riff.resetMode === 'free'
      ? 'Free run'
      : study.riff.resetMode === 'per-bar'
        ? 'Reset every bar'
        : study.riff.resetMode === 'every-2-bars'
          ? 'Reset every 2 bars'
          : study.riff.resetMode === 'every-4-bars'
            ? 'Reset every 4 bars'
            : `Reset every ${study.riff.resetBars} bars`;

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm" onClick={onClose} /> : null}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden ${
          isMobile ? 'inset-0 w-full' : 'right-0 top-0 bottom-0 w-[31.5rem]'
        }`}
        style={{
          background:
            'linear-gradient(135deg, rgba(17, 17, 22, 0.97), rgba(28, 28, 34, 0.96))',
          borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
          transform: isOpen ? 'translateX(0)' : `translateX(${isMobile ? '0' : '100%'})`,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className={`flex items-center justify-between border-b border-white/10 ${isMobile ? 'px-4 py-4' : 'px-6 py-5'}`}>
          <div>
            <div className="text-sm font-light uppercase tracking-[0.24em] text-white/70">Riff Cycle</div>
            <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/34">
              Phrase against bar
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg text-white/50 transition-colors hover:bg-white/10 ${isMobile ? 'p-3' : 'p-2'}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 py-3 pb-28' : 'px-4 py-4'} space-y-4`}>
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Overview</div>
                <div className="mt-1 text-[11px] leading-relaxed text-white/42">{study.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border"
                  style={{
                    background: study.soundEnabled ? 'rgba(127,215,255,0.14)' : 'rgba(255,255,255,0.05)',
                    borderColor: study.soundEnabled ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                    color: study.soundEnabled ? '#7FD7FF' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {study.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border"
                  style={{
                    background: study.playing ? 'rgba(255,51,102,0.16)' : 'rgba(114,241,184,0.14)',
                    borderColor: study.playing ? 'rgba(255,51,102,0.28)' : 'rgba(114,241,184,0.22)',
                    color: study.playing ? '#FF3366' : '#72F1B8',
                  }}
                >
                  {study.playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[`${study.reference.numerator}/${study.reference.denominator}`, `${study.riff.stepCount}-step phrase`, resetSummary].map((label) => (
                <div key={label} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-white/58">
                  {label}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Presets</div>
            <div className="grid gap-2">
              {RIFF_CYCLE_PRESETS.map((preset) => {
                const active = preset.id === activePresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onLoadPreset(preset.id)}
                    className="rounded-xl border px-3 py-3 text-left transition-colors"
                    style={{
                      background: active ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.03)',
                      borderColor: active ? 'rgba(114,241,184,0.24)' : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,0.78)' }}>
                      {preset.name}
                    </div>
                    <div className="mt-1 text-[11px] leading-relaxed text-white/42">{preset.description}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Reference</div>
              <button type="button" onClick={onResetStudy} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-white/58">
                Restart On 1
              </button>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-[11px] leading-relaxed text-white/46">
              {study.reference.numerator}/{study.reference.denominator} reference on a {study.reference.subdivision}th-note grid, shown across {study.reference.barCountForDisplay} bars.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Numerator
                <input
                  type="number"
                  min="2"
                  max="11"
                  value={study.reference.numerator}
                  onChange={(event) => onUpdateReference({ numerator: parseInt(event.target.value, 10) || 4 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Denominator
                <select
                  value={study.reference.denominator}
                  onChange={(event) => onUpdateReference({ denominator: parseInt(event.target.value, 10) || 4 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                >
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                </select>
              </label>
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Subdivision
                <select
                  value={study.reference.subdivision}
                  onChange={(event) => onUpdateReference({ subdivision: parseInt(event.target.value, 10) as ReferenceMeter['subdivision'] })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                >
                  {[8, 12, 16, 32].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Bars Visible
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={study.reference.barCountForDisplay}
                  onChange={(event) => onUpdateReference({ barCountForDisplay: parseInt(event.target.value, 10) || 4 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                BPM
                <input
                  type="number"
                  min="45"
                  max="220"
                  value={study.reference.bpm}
                  onChange={(event) => onUpdateReference({ bpm: parseInt(event.target.value, 10) || 112 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Backbeat
                <input
                  type="number"
                  min="1"
                  max={study.reference.numerator}
                  value={study.reference.backbeatBeat ?? 3}
                  onChange={(event) => onUpdateReference({ backbeatBeat: parseInt(event.target.value, 10) || 3 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onUpdateReference({ showDownbeats: !study.reference.showDownbeats })} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.reference.showDownbeats ? 'rgba(127,215,255,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.reference.showDownbeats ? 'rgba(127,215,255,0.28)' : 'rgba(255,255,255,0.08)', color: study.reference.showDownbeats ? '#7FD7FF' : 'rgba(255,255,255,0.66)' }}>
                {study.reference.showDownbeats ? 'Downbeats On' : 'Downbeats Off'}
              </button>
              <button type="button" onClick={() => onUpdateReference({ showBackbeat: !study.reference.showBackbeat })} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.reference.showBackbeat ? 'rgba(255,136,194,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.reference.showBackbeat ? 'rgba(255,136,194,0.26)' : 'rgba(255,255,255,0.08)', color: study.reference.showBackbeat ? '#FF88C2' : 'rgba(255,255,255,0.66)' }}>
                {study.reference.showBackbeat ? 'Backbeat On' : 'Backbeat Off'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Phrase</div>
              <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-white/58">
                Step {selectedStep != null ? selectedStep + 1 : '—'}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-[11px] leading-relaxed text-white/46">
              {study.riff.stepCount}-step phrase drifting against the reference bar. Rotate the mask, then write directly into the step grid.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Phrase Length
                <input
                  type="number"
                  min="3"
                  max="64"
                  value={study.riff.stepCount}
                  onChange={(event) => onSetRiffStepCount(parseInt(event.target.value, 10) || 17)}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Rotation
                <input
                  type="number"
                  min="0"
                  max="359"
                  value={Math.round(study.riff.rotationOffset)}
                  onChange={(event) => onUpdateRiff({ rotationOffset: parseInt(event.target.value, 10) || 0 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onRotateRiff(-1)} className="flex h-11 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                <RotateCcw size={14} />
                Rotate
              </button>
              <button type="button" onClick={() => onRotateRiff(1)} className="flex h-11 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                <RotateCw size={14} />
                Advance
              </button>
              <button type="button" onClick={onInvertRiff} className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                Invert
              </button>
              <button type="button" onClick={onClearRiff} className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                Clear
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {RIFF_CYCLE_COLORS.map((color) => {
                const active = study.riff.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onUpdateRiff({ color })}
                    className="h-10 rounded-xl border transition-transform active:scale-[0.97]"
                    style={{
                      background: `${color}18`,
                      borderColor: active ? `${color}AA` : `${color}44`,
                      boxShadow: active ? `0 0 0 1px ${color}AA inset` : 'none',
                    }}
                  />
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">Mask</div>
              <div className="grid grid-cols-8 gap-2">
                {study.riff.activeSteps.map((active, index) => {
                  const accented = study.riff.accents[index];
                  const selected = selectedStep === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={(event) => {
                        onSelectStep(index);
                        if (event.altKey || event.metaKey || event.shiftKey) {
                          onToggleAccent(index);
                        } else {
                          onToggleStep(index);
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        onSelectStep(index);
                        onToggleAccent(index);
                      }}
                      className="rounded-xl border px-0 py-3 text-[10px] font-mono uppercase tracking-[0.14em] transition-transform active:scale-[0.98]"
                      style={{
                        background: active ? `${study.riff.color}${accented ? '22' : '14'}` : 'rgba(255,255,255,0.04)',
                        borderColor: selected
                          ? 'rgba(255,255,255,0.58)'
                          : accented
                            ? 'rgba(255,209,102,0.66)'
                            : active
                              ? `${study.riff.color}66`
                              : 'rgba(255,255,255,0.08)',
                        color: accented ? '#FFD166' : active ? study.riff.color : 'rgba(255,255,255,0.5)',
                      }}
                      title={accented ? 'Accent step' : active ? 'Active step' : 'Rest step'}
                    >
                      <span className="inline-flex items-center gap-1">
                        {accented ? '!' : ''}
                        {index + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedStep != null ? (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                  Selected Step
                </div>
                <div className="mt-1 text-[14px] font-light text-white">
                  Step {selectedStep + 1}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleStep(selectedStep)}
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background: study.riff.activeSteps[selectedStep] ? `${study.riff.color}14` : 'rgba(255,255,255,0.04)',
                      borderColor: study.riff.activeSteps[selectedStep] ? `${study.riff.color}33` : 'rgba(255,255,255,0.08)',
                      color: study.riff.activeSteps[selectedStep] ? study.riff.color : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    {study.riff.activeSteps[selectedStep] ? 'Step On' : 'Step Off'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleAccent(selectedStep)}
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background: study.riff.accents[selectedStep] ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: study.riff.accents[selectedStep] ? 'rgba(255,209,102,0.3)' : 'rgba(255,255,255,0.08)',
                      color: study.riff.accents[selectedStep] ? '#FFD166' : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    {study.riff.accents[selectedStep] ? 'Accent On' : 'Accent Off'}
                  </button>
                </div>
                <div className="mt-2 text-[11px] leading-relaxed text-white/42">
                  Click toggles rest and hit. Right-click or the Accent button gives the step a stronger attack.
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Reset</div>
            <select
              value={study.riff.resetMode}
              onChange={(event) => onUpdateRiff({ resetMode: event.target.value as RiffPhrase['resetMode'] })}
              className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
            >
              <option value="free">Free Run</option>
              <option value="per-bar">Every Bar</option>
              <option value="every-2-bars">Every 2 Bars</option>
              <option value="every-4-bars">Every 4 Bars</option>
              <option value="custom-cycle">Custom</option>
            </select>
            {study.riff.resetMode === 'custom-cycle' ? (
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Reset Bars
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={study.riff.resetBars}
                  onChange={(event) => onUpdateRiff({ resetBars: parseInt(event.target.value, 10) || 4 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
            ) : null}
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-[11px] leading-relaxed text-white/46">
              {study.riff.stepCount}-step phrase on a {study.reference.numerator}/{study.reference.denominator} grid. {resetSummary.toLowerCase()}.
            </div>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Display</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onToggleViewMode} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.viewMode === 'unwrapped' ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.viewMode === 'unwrapped' ? 'rgba(114,241,184,0.24)' : 'rgba(255,255,255,0.08)', color: study.viewMode === 'unwrapped' ? '#72F1B8' : 'rgba(255,255,255,0.66)' }}>
                {study.viewMode === 'unwrapped' ? 'Split View' : 'Circle Only'}
              </button>
              <button type="button" onClick={onToggleEmphasisMode} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.emphasisMode === 'analysis' ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.emphasisMode === 'analysis' ? 'rgba(255,209,102,0.22)' : 'rgba(255,255,255,0.08)', color: study.emphasisMode === 'analysis' ? '#FFD166' : 'rgba(255,255,255,0.66)' }}>
                {study.emphasisMode === 'analysis' ? 'Analysis' : 'Groove'}
              </button>
              <button type="button" onClick={onToggleAlignmentMarkers} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.showAlignmentMarkers ? 'rgba(127,215,255,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.showAlignmentMarkers ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)', color: study.showAlignmentMarkers ? '#7FD7FF' : 'rgba(255,255,255,0.66)' }}>
                {study.showAlignmentMarkers ? 'Markers On' : 'Markers Off'}
              </button>
              <button type="button" onClick={onToggleDriftTrail} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.showDriftTrail ? 'rgba(255,136,194,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.showDriftTrail ? 'rgba(255,136,194,0.24)' : 'rgba(255,255,255,0.08)', color: study.showDriftTrail ? '#FF88C2' : 'rgba(255,255,255,0.66)' }}>
                {study.showDriftTrail ? 'Drift Trail On' : 'Drift Trail Off'}
              </button>
              <button type="button" onClick={onToggleStepLabels} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.showStepLabels ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.showStepLabels ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)', color: study.showStepLabels ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.66)' }}>
                {study.showStepLabels ? 'Labels On' : 'Labels Off'}
              </button>
              <button type="button" onClick={onTogglePhraseBody} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.showPhraseRing ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.showPhraseRing ? 'rgba(114,241,184,0.24)' : 'rgba(255,255,255,0.08)', color: study.showPhraseRing ? '#72F1B8' : 'rgba(255,255,255,0.66)' }}>
                {study.showPhraseRing ? 'Phrase Body On' : 'Phrase Body Off'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Sound</div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-[11px] leading-relaxed text-white/46">
              Keep the bar pulse steady, let the riff speak darker, and use the backbeat to orient the drift.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onToggleSound}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: study.soundEnabled ? 'rgba(127,215,255,0.12)' : 'rgba(255,255,255,0.04)',
                  borderColor: study.soundEnabled ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                  color: study.soundEnabled ? '#7FD7FF' : 'rgba(255,255,255,0.66)',
                }}
              >
                {study.soundEnabled ? 'Study Sound On' : 'Study Sound Off'}
              </button>
              <button
                type="button"
                onClick={() => onUpdateRiff({ soundEnabled: !study.riff.soundEnabled })}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: study.riff.soundEnabled ? `${study.riff.color}14` : 'rgba(255,255,255,0.04)',
                  borderColor: study.riff.soundEnabled ? `${study.riff.color}33` : 'rgba(255,255,255,0.08)',
                  color: study.riff.soundEnabled ? study.riff.color : 'rgba(255,255,255,0.66)',
                }}
              >
                {study.riff.soundEnabled ? 'Phrase Voice On' : 'Phrase Voice Off'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Pitch
                <input
                  type="number"
                  min="80"
                  max="1600"
                  value={study.riff.pitchHz}
                  onChange={(event) => onUpdateRiff({ pitchHz: parseInt(event.target.value, 10) || 120 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Gain
                <input
                  type="number"
                  min="0.02"
                  max="0.32"
                  step="0.01"
                  value={study.riff.gain}
                  onChange={(event) => onUpdateRiff({ gain: parseFloat(event.target.value) || 0.12 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
