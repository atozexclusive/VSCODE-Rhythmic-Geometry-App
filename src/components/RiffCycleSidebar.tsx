import { useEffect, useState } from 'react';
import {
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  RIFF_CYCLE_COLORS,
  RIFF_CYCLE_PRESETS,
  getReferenceStepsPerBar,
  type ReferenceMeter,
  type RiffCyclePreset,
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
  onToggleSound: () => void;
  onToggleReferenceSound: () => void;
  onToggleBackbeatSound: () => void;
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
  onToggleStepLabels: () => void;
  onTogglePhraseBody: () => void;
  onToggleEmphasisMode: () => void;
  onSetEditMode: (mode: 'phrase' | 'landing') => void;
  onSetSoundFocus: (focus: 'bar' | 'riff' | 'full') => void;
  onToggleLandingEdit: () => void;
  onSetLandingLength: (landingLength: number) => void;
  onClearLanding: () => void;
  onMuteLastLandingHit: () => void;
  onMuteLastTwoLandingHits: () => void;
  onAccentLastLandingHit: () => void;
  onAccentLastTwoLandingHits: () => void;
  onExportPng: (options: {
    aspect: 'landscape' | 'square' | 'portrait' | 'story';
    scale: 1 | 2 | 4;
  }) => void;
  onExportScene: () => void;
}

type RiffCycleSidebarTab = 'scenes' | 'bar' | 'phrase' | 'ending' | 'sound' | 'export';

const RIFF_CYCLE_SIDEBAR_TABS: Array<{
  id: RiffCycleSidebarTab;
  label: string;
}> = [
  { id: 'scenes', label: 'Scenes' },
  { id: 'bar', label: 'Bar' },
  { id: 'phrase', label: 'Phrase' },
  { id: 'ending', label: 'Ending' },
  { id: 'sound', label: 'Sound' },
  { id: 'export', label: 'Export' },
];

const TAU = Math.PI * 2;

function getPolygonPoints(sides: number, radius: number, centerX = 80, centerY = 80): string {
  return Array.from({ length: Math.max(3, sides) }, (_, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(3, sides)) * TAU;
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
  }).join(' ');
}

function RiffSceneThumbnail({ preset }: { preset: RiffCyclePreset }) {
  const { study } = preset;
  const centerX = 80;
  const centerY = 80;
  const outerRadius = 48;
  const innerRadius = 30;
  const activeSteps = study.riff.activeSteps
    .map((active, index) => (active ? index : null))
    .filter((value): value is number => value != null);
  const activePointValues = activeSteps.map((index) => {
    const angle = -Math.PI / 2 + (index / study.riff.stepCount) * TAU;
    return {
      x: centerX + Math.cos(angle) * innerRadius,
      y: centerY + Math.sin(angle) * innerRadius,
    };
  });
  const activePolyline = activePointValues.map((point) => `${point.x},${point.y}`).join(' ');
  const gradientId = `riff-thumb-${preset.id}`;

  return (
    <svg viewBox="0 0 160 160" className="h-24 w-24 rounded-lg border border-white/10 bg-[#14141b]/80">
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor={`${study.riff.color}55`} />
          <stop offset="100%" stopColor="#111116" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="160" height="160" rx="18" fill={`url(#${gradientId})`} />
      <polygon
        points={getPolygonPoints(study.reference.numerator, outerRadius, centerX, centerY)}
        fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.5"
      />
      <circle
        cx={centerX}
        cy={centerY}
        r={innerRadius}
        fill="none"
        stroke={`${study.riff.color}55`}
        strokeWidth="1.2"
      />
      {activePointValues.length >= 2 ? (
        <polyline
          points={activePolyline}
          fill={activePointValues.length >= 3 ? `${study.riff.color}24` : 'none'}
          stroke={study.riff.color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : null}
      {Array.from({ length: study.reference.numerator }, (_, index) => {
        const angle = -Math.PI / 2 + (index / study.reference.numerator) * TAU;
        return (
          <circle
            key={`beat-${index}`}
            cx={centerX + Math.cos(angle) * outerRadius}
            cy={centerY + Math.sin(angle) * outerRadius}
            r={index === 0 ? 4.6 : 3.8}
            fill={index === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.58)'}
          />
        );
      })}
      {activeSteps.map((index) => {
        const angle = -Math.PI / 2 + (index / study.riff.stepCount) * TAU;
        const accented = study.riff.accents[index];
        return (
          <circle
            key={`riff-${index}`}
            cx={centerX + Math.cos(angle) * innerRadius}
            cy={centerY + Math.sin(angle) * innerRadius}
            r={accented ? 4.2 : 3.2}
            fill={accented ? '#FFD166' : study.riff.color}
            stroke={accented ? 'rgba(255,255,255,0.8)' : 'none'}
            strokeWidth="0.8"
          />
        );
      })}
      <text
        x="16"
        y="142"
        fill="rgba(255,255,255,0.55)"
        fontSize="10"
        fontFamily='"SF Mono", "Fira Code", monospace'
        letterSpacing="1.8"
      >
        {study.reference.numerator}/{study.reference.denominator}
      </text>
    </svg>
  );
}

export default function RiffCycleSidebar({
  isOpen,
  study,
  activePresetId,
  selectedStep,
  onClose,
  onLoadPreset,
  onResetStudy,
  onToggleSound,
  onToggleReferenceSound,
  onToggleBackbeatSound,
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
  onToggleStepLabels,
  onTogglePhraseBody,
  onToggleEmphasisMode,
  onSetEditMode,
  onSetSoundFocus,
  onToggleLandingEdit,
  onSetLandingLength,
  onClearLanding,
  onMuteLastLandingHit,
  onMuteLastTwoLandingHits,
  onAccentLastLandingHit,
  onAccentLastTwoLandingHits,
  onExportPng,
  onExportScene,
}: RiffCycleSidebarProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<RiffCycleSidebarTab>('scenes');
  const [exportAspect, setExportAspect] = useState<'landscape' | 'square' | 'portrait' | 'story'>('square');
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(2);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const landingStepLimit = getReferenceStepsPerBar(study.reference);
  const selectedStepEditable = selectedStep != null;
  const activeEditMode = study.landingEditEnabled ? 'landing' : 'phrase';

  useEffect(() => {
    if (study.landingEditEnabled) {
      setActiveTab('ending');
    }
  }, [study.landingEditEnabled]);

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm" onClick={onClose} /> : null}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden ${
          isMobile ? 'inset-0 w-full' : 'right-0 top-0 bottom-0 w-[28rem]'
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
        <div className={`flex items-center justify-between border-b border-white/10 ${isMobile ? 'px-4 py-4' : 'px-5 py-4'}`}>
          <div>
            <div className="text-sm font-light uppercase tracking-[0.24em] text-white/70">Riff Cycle</div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {([
                { id: 'phrase', label: 'Phrase', color: study.riff.color },
                { id: 'landing', label: 'Ending', color: '#7FD7FF' },
              ] as const).map((mode) => {
                const active = mode.id === activeEditMode;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      onSetEditMode(mode.id);
                      setActiveTab(mode.id === 'phrase' ? 'phrase' : 'ending');
                    }}
                    className="rounded-xl border px-3 py-2.5 text-left"
                    style={{
                      background: active ? `${mode.color}18` : 'rgba(255,255,255,0.03)',
                      borderColor: active ? `${mode.color}44` : 'rgba(255,255,255,0.08)',
                      color: active ? mode.color : 'rgba(255,255,255,0.6)',
                      boxShadow: active ? `0 0 0 1px ${mode.color}22 inset` : 'none',
                    }}
                  >
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em]">
                      {mode.label}
                    </div>
                  </button>
                );
              })}
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

        <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 py-3 pb-28' : 'px-4 py-3'} space-y-3`}>
          <section
            className={`sticky top-0 z-10 space-y-2 border-y border-white/8 ${
              isMobile ? '-mx-3 px-3 py-2.5' : '-mx-4 px-4 py-2.5'
            }`}
            style={{
              background: 'linear-gradient(180deg, rgba(18,18,24,0.94), rgba(18,18,24,0.82))',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div className="flex gap-2 overflow-x-auto pb-1">
              {RIFF_CYCLE_SIDEBAR_TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.15em]"
                    style={{
                      background: active
                        ? 'linear-gradient(180deg, rgba(127,215,255,0.16), rgba(127,215,255,0.08))'
                        : 'rgba(255,255,255,0.03)',
                      borderColor: active ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                      color: active ? '#7FD7FF' : 'rgba(255,255,255,0.58)',
                      boxShadow: active ? '0 0 0 1px rgba(127,215,255,0.18) inset, 0 10px 24px rgba(0,0,0,0.24)' : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </section>

          {activeTab === 'scenes' ? (
          <section className="space-y-3">
            {RIFF_CYCLE_PRESETS.map((preset) => {
              const active = preset.id === activePresetId;
              return (
                <div
                  key={preset.id}
                  className="rounded-xl border p-3"
                  style={{
                    background: active
                      ? 'linear-gradient(180deg, rgba(114,241,184,0.08), rgba(255,255,255,0.03))'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.028))',
                    borderColor: active ? 'rgba(114,241,184,0.22)' : 'rgba(255,255,255,0.1)',
                    boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(114,241,184,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <RiffSceneThumbnail preset={preset} />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-xs font-mono uppercase tracking-[0.16em]"
                        style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,0.84)' }}
                      >
                        {preset.name}
                      </div>
                      <div
                        className="mt-1 text-[10px] font-mono uppercase tracking-[0.16em]"
                        style={{ color: 'rgba(255,255,255,0.34)' }}
                      >
                        {preset.study.reference.numerator}/{preset.study.reference.denominator} · {preset.study.riff.stepCount} steps
                      </div>
                      <div
                        className="mt-2 text-[10px] leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.48)' }}
                      >
                        {preset.description}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoadPreset(preset.id)}
                    className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-mono transition-all duration-200"
                    style={{
                      background: active ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${active ? 'rgba(114,241,184,0.3)' : 'rgba(255,255,255,0.12)'}`,
                      color: active ? '#72F1B8' : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {active ? 'Loaded' : 'Load Scene'}
                  </button>
                </div>
              );
            })}
          </section>
          ) : null}

          {activeTab === 'bar' ? (
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Bar</div>
              <button type="button" onClick={onResetStudy} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-white/58">
                Restart
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/58">
                {study.reference.numerator}/{study.reference.denominator} bar
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/58">
                {study.reference.subdivision} grid
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/58">
                Backbeat {study.reference.backbeatBeat ?? 3}
              </div>
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
          ) : null}

          {activeTab === 'phrase' ? (
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Phrase</div>
              <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-white/58">
                Step {selectedStep != null ? selectedStep + 1 : '—'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/58">
                Lower lane writes
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/58">
                Tap hit
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/58">
                Hold accent
              </div>
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
                Back 1
              </button>
              <button type="button" onClick={() => onRotateRiff(1)} className="flex h-11 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                <RotateCw size={14} />
                Forward 1
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
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">Step Grid</div>
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
                        background: active
                          ? `${study.riff.color}${accented ? '22' : '14'}`
                          : 'rgba(255,255,255,0.04)',
                        borderColor: selected
                          ? 'rgba(255,255,255,0.58)'
                          : accented
                            ? 'rgba(255,209,102,0.66)'
                            : active
                              ? `${study.riff.color}66`
                              : 'rgba(255,255,255,0.08)',
                        color: accented
                          ? '#FFD166'
                          : active
                            ? study.riff.color
                            : 'rgba(255,255,255,0.5)',
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
                  Step {selectedStep + 1} · {study.riff.activeSteps[selectedStep] ? 'Hit' : 'Rest'}
                  {study.riff.accents[selectedStep] ? ' · Accent' : ''}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (study.riff.activeSteps[selectedStep]) {
                        onToggleStep(selectedStep);
                      }
                      if (study.riff.accents[selectedStep]) {
                        onToggleAccent(selectedStep);
                      }
                    }}
                    disabled={!selectedStepEditable}
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background: !study.riff.activeSteps[selectedStep] && !study.riff.accents[selectedStep] ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                      borderColor: !study.riff.activeSteps[selectedStep] && !study.riff.accents[selectedStep] ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                      color: !selectedStepEditable
                        ? 'rgba(255,255,255,0.32)'
                        : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    Rest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!study.riff.activeSteps[selectedStep]) {
                        onToggleStep(selectedStep);
                      }
                      if (study.riff.accents[selectedStep]) {
                        onToggleAccent(selectedStep);
                      }
                    }}
                    disabled={!selectedStepEditable}
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background: study.riff.activeSteps[selectedStep] && !study.riff.accents[selectedStep] ? `${study.riff.color}14` : 'rgba(255,255,255,0.04)',
                      borderColor: study.riff.activeSteps[selectedStep] && !study.riff.accents[selectedStep] ? `${study.riff.color}33` : 'rgba(255,255,255,0.08)',
                      color: !selectedStepEditable
                        ? 'rgba(255,255,255,0.32)'
                        : study.riff.activeSteps[selectedStep] && !study.riff.accents[selectedStep]
                          ? study.riff.color
                          : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    Hit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!study.riff.activeSteps[selectedStep]) {
                        onToggleStep(selectedStep);
                      }
                      if (!study.riff.accents[selectedStep]) {
                        onToggleAccent(selectedStep);
                      }
                    }}
                    disabled={!selectedStepEditable}
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background: study.riff.accents[selectedStep] ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: study.riff.accents[selectedStep] ? 'rgba(255,209,102,0.3)' : 'rgba(255,255,255,0.08)',
                      color: !selectedStepEditable
                        ? 'rgba(255,255,255,0.32)'
                        : study.riff.accents[selectedStep]
                          ? '#FFD166'
                          : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    Accent
                  </button>
                </div>
                <div className="mt-2 text-[11px] leading-relaxed text-white/42">
                  Tap toggles the hit. Hold, right-click, or use Accent for a stronger attack.
                </div>
              </div>
            ) : null}
          </section>
          ) : null}

          {activeTab === 'ending' ? (
          <>
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Ending</div>
              <button
                type="button"
                onClick={onToggleLandingEdit}
                className="rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: study.landingEditEnabled ? 'rgba(127,215,255,0.12)' : 'rgba(255,255,255,0.04)',
                  borderColor: study.landingEditEnabled ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                  color: study.landingEditEnabled ? '#7FD7FF' : 'rgba(255,255,255,0.58)',
                }}
              >
                {study.landingEditEnabled ? 'Landing On' : 'Landing Off'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-[#7FD7FF]/20 bg-[#7FD7FF]/10 px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-[#7FD7FF]">
                Final {study.landingLength}
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/58">
                Phrase stays the same
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Landing Length
                <input
                  type="number"
                  min="1"
                  max={landingStepLimit}
                  value={study.landingLength}
                  onChange={(event) => onSetLandingLength(parseInt(event.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                  Landing Window
                </div>
                <div className="mt-1 text-[15px] font-light text-white">
                  Last {study.landingLength}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onMuteLastLandingHit}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.66)',
                }}
              >
                Mute Last Hit
              </button>
              <button
                type="button"
                onClick={onMuteLastTwoLandingHits}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.66)',
                }}
              >
                Mute Last 2
              </button>
              <button
                type="button"
                onClick={onAccentLastLandingHit}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: 'rgba(127,215,255,0.12)',
                  borderColor: 'rgba(127,215,255,0.24)',
                  color: '#7FD7FF',
                }}
              >
                Accent Last Hit
              </button>
              <button
                type="button"
                onClick={onAccentLastTwoLandingHits}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: 'rgba(127,215,255,0.12)',
                  borderColor: 'rgba(127,215,255,0.24)',
                  color: '#7FD7FF',
                }}
              >
                Accent Last 2
              </button>
            </div>
            <button
              type="button"
              onClick={onClearLanding}
              className="w-full rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.66)',
              }}
            >
              Clear Ending
            </button>
          </section>
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Return</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'free', label: 'Free' },
                { value: 'per-bar', label: 'Every Bar' },
                { value: 'every-2-bars', label: 'Every 2' },
                { value: 'every-4-bars', label: 'Every 4' },
              ].map((option) => {
                const active = study.riff.resetMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onUpdateRiff({ resetMode: option.value as RiffPhrase['resetMode'] })}
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background: active ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: active ? 'rgba(255,209,102,0.24)' : 'rgba(255,255,255,0.08)',
                      color: active ? '#FFD166' : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => onUpdateRiff({ resetMode: 'custom-cycle' })}
              className="w-full rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
              style={{
                background: study.riff.resetMode === 'custom-cycle' ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.04)',
                borderColor: study.riff.resetMode === 'custom-cycle' ? 'rgba(255,209,102,0.24)' : 'rgba(255,255,255,0.08)',
                color: study.riff.resetMode === 'custom-cycle' ? '#FFD166' : 'rgba(255,255,255,0.66)',
              }}
            >
              Custom Return
            </button>
            {study.riff.resetMode === 'custom-cycle' ? (
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Return Bars
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
          </section>

          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Display</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onToggleViewMode} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.viewMode === 'unwrapped' ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.viewMode === 'unwrapped' ? 'rgba(114,241,184,0.24)' : 'rgba(255,255,255,0.08)', color: study.viewMode === 'unwrapped' ? '#72F1B8' : 'rgba(255,255,255,0.66)' }}>
                {study.viewMode === 'unwrapped' ? 'Circle + Lane' : 'Circle Only'}
              </button>
              <button type="button" onClick={onToggleEmphasisMode} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.emphasisMode === 'analysis' ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.emphasisMode === 'analysis' ? 'rgba(255,209,102,0.22)' : 'rgba(255,255,255,0.08)', color: study.emphasisMode === 'analysis' ? '#FFD166' : 'rgba(255,255,255,0.66)' }}>
                {study.emphasisMode === 'analysis' ? 'Analysis' : 'Groove'}
              </button>
              <button type="button" onClick={onToggleAlignmentMarkers} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.showAlignmentMarkers ? 'rgba(127,215,255,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.showAlignmentMarkers ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)', color: study.showAlignmentMarkers ? '#7FD7FF' : 'rgba(255,255,255,0.66)' }}>
                {study.showAlignmentMarkers ? 'Return Marks On' : 'Return Marks Off'}
              </button>
              <button type="button" onClick={onToggleStepLabels} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.showStepLabels ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.showStepLabels ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)', color: study.showStepLabels ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.66)' }}>
                {study.showStepLabels ? 'Labels On' : 'Labels Off'}
              </button>
              <button type="button" onClick={onTogglePhraseBody} className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ background: study.showPhraseRing ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.04)', borderColor: study.showPhraseRing ? 'rgba(114,241,184,0.24)' : 'rgba(255,255,255,0.08)', color: study.showPhraseRing ? '#72F1B8' : 'rgba(255,255,255,0.66)' }}>
                {study.showPhraseRing ? 'Phrase Shape On' : 'Phrase Shape Off'}
              </button>
            </div>
          </section>
          </>
          ) : null}

          {activeTab === 'export' ? (
          <section className="space-y-4">
            <div
              className="rounded-lg border p-3 space-y-3"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))',
                borderColor: 'rgba(255, 170, 0, 0.12)',
              }}
            >
              <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                Image Export
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={exportAspect}
                  onChange={(event) =>
                    setExportAspect(event.target.value as typeof exportAspect)
                  }
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  <option value="landscape" style={{ background: '#181820' }}>Landscape</option>
                  <option value="square" style={{ background: '#181820' }}>Square</option>
                  <option value="portrait" style={{ background: '#181820' }}>Portrait</option>
                  <option value="story" style={{ background: '#181820' }}>Story</option>
                </select>
                <select
                  value={String(exportScale)}
                  onChange={(event) =>
                    setExportScale(Number(event.target.value) as 1 | 2 | 4)
                  }
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  <option value="1" style={{ background: '#181820' }}>HD</option>
                  <option value="2" style={{ background: '#181820' }}>2K</option>
                  <option value="4" style={{ background: '#181820' }}>4K</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  onExportPng({ aspect: exportAspect, scale: exportScale });
                  setExportNotice('PNG exported from the current Riff Cycle view.');
                }}
                className="w-full rounded-lg px-3 py-2 text-xs font-mono transition-all duration-200"
                style={{
                  background: 'rgba(0, 255, 170, 0.08)',
                  border: '1px solid rgba(0, 255, 170, 0.2)',
                  color: '#00FFAA',
                }}
              >
                Export PNG
              </button>
            </div>

            <div
              className="rounded-lg border p-3 space-y-3"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))',
                borderColor: 'rgba(255, 170, 0, 0.12)',
              }}
            >
              <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                Scene File
              </div>
              <button
                type="button"
                onClick={() => {
                  onExportScene();
                  setExportNotice('Scene file exported for this Riff Cycle study.');
                }}
                className="w-full rounded-lg px-3 py-2 text-xs font-mono transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.72)',
                }}
              >
                Export Scene
              </button>
            </div>

            {exportNotice ? (
              <div
                className="rounded-lg px-3 py-2 text-[10px] leading-relaxed"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.62)',
                }}
              >
                {exportNotice}
              </div>
            ) : null}
          </section>
          ) : null}

          {activeTab === 'sound' ? (
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/62">Sound</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bar', label: 'Bar Only' },
                { id: 'riff', label: 'Riff Only' },
                { id: 'full', label: 'Full' },
              ].map((focus) => (
                <button
                  key={focus.id}
                  type="button"
                  onClick={() => onSetSoundFocus(focus.id as 'bar' | 'riff' | 'full')}
                  className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{
                    background:
                      focus.id === 'bar'
                        ? study.referenceSoundEnabled && study.backbeatSoundEnabled && !study.riff.soundEnabled
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(255,255,255,0.04)'
                        : focus.id === 'riff'
                          ? !study.referenceSoundEnabled && !study.backbeatSoundEnabled && study.riff.soundEnabled
                            ? `${study.riff.color}16`
                            : 'rgba(255,255,255,0.04)'
                          : study.referenceSoundEnabled && study.backbeatSoundEnabled && study.riff.soundEnabled
                            ? 'rgba(127,215,255,0.12)'
                            : 'rgba(255,255,255,0.04)',
                    borderColor:
                      focus.id === 'bar'
                        ? study.referenceSoundEnabled && study.backbeatSoundEnabled && !study.riff.soundEnabled
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(255,255,255,0.08)'
                        : focus.id === 'riff'
                          ? !study.referenceSoundEnabled && !study.backbeatSoundEnabled && study.riff.soundEnabled
                            ? `${study.riff.color}33`
                            : 'rgba(255,255,255,0.08)'
                          : study.referenceSoundEnabled && study.backbeatSoundEnabled && study.riff.soundEnabled
                            ? 'rgba(127,215,255,0.24)'
                            : 'rgba(255,255,255,0.08)',
                    color:
                      focus.id === 'bar'
                        ? 'rgba(255,255,255,0.72)'
                        : focus.id === 'riff'
                          ? !study.referenceSoundEnabled && !study.backbeatSoundEnabled && study.riff.soundEnabled
                            ? study.riff.color
                            : 'rgba(255,255,255,0.66)'
                          : study.referenceSoundEnabled && study.backbeatSoundEnabled && study.riff.soundEnabled
                            ? '#7FD7FF'
                            : 'rgba(255,255,255,0.66)',
                  }}
                >
                  {focus.label}
                </button>
              ))}
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
                {study.soundEnabled ? 'Master On' : 'Master Off'}
              </button>
              <button
                type="button"
                onClick={onToggleReferenceSound}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: study.referenceSoundEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  borderColor: study.referenceSoundEnabled ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                  color: study.referenceSoundEnabled ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.66)',
                }}
              >
                {study.referenceSoundEnabled ? 'Reference On' : 'Reference Off'}
              </button>
              <button
                type="button"
                onClick={onToggleBackbeatSound}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: study.backbeatSoundEnabled ? 'rgba(255,136,194,0.12)' : 'rgba(255,255,255,0.04)',
                  borderColor: study.backbeatSoundEnabled ? 'rgba(255,136,194,0.24)' : 'rgba(255,255,255,0.08)',
                  color: study.backbeatSoundEnabled ? '#FF88C2' : 'rgba(255,255,255,0.66)',
                }}
              >
                {study.backbeatSoundEnabled ? 'Backbeat On' : 'Backbeat Off'}
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
                {study.riff.soundEnabled ? 'Riff On' : 'Riff Off'}
              </button>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Riff Tone
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
            </div>
          </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
