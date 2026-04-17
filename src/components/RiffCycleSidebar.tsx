import { useEffect, useState } from 'react';
import {
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import AccountPanel from './AccountPanel';
import { useIsMobile } from '../hooks/use-mobile';
import { NOTE_NAMES, SCALE_PRESETS, getFriendlyScaleLabel } from '../lib/audioEngine';
import {
  RIFF_CYCLE_COLORS,
  RIFF_CYCLE_PRESETS,
  getReferenceStepsPerBar,
  type ReferenceMeter,
  type RiffCyclePreset,
  type RiffCycleSoundSettings,
  type RiffCycleStudy,
  type RiffPhrase,
} from '../lib/riffCycleStudy';

interface RiffCycleSidebarProps {
  isOpen: boolean;
  study: RiffCycleStudy;
  currentSurface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow';
  activePresetId: string | null;
  selectedStep: number | null;
  onClose: () => void;
  onSurfaceChange: (surface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow') => void;
  onLoadPreset: (presetId: string) => void;
  onResetStudy: () => void;
  onToggleSound: () => void;
  onToggleReferenceSound: () => void;
  onToggleBackbeatSound: () => void;
  onUpdateSoundSettings: (updates: Partial<RiffCycleSoundSettings>) => void;
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
  onSaveScene: () => void;
  onHardRefresh: () => void;
}

type RiffCycleSidebarTab =
  | 'scenes'
  | 'bar'
  | 'phrase'
  | 'ending'
  | 'sound'
  | 'export'
  | 'account';

const RIFF_SOUND_PALETTES: Array<{
  id: RiffCycleSoundSettings['palette'];
  label: string;
}> = [
  { id: 'architectural', label: 'Architectural' },
  { id: 'deep-architectural', label: 'Deep Arch' },
  { id: 'muted-djent', label: 'Muted Djent' },
  { id: 'dry-synth', label: 'Dry Synth' },
  { id: 'metal-tick', label: 'Metal Tick' },
  { id: 'low-pulse', label: 'Low Pulse' },
];

const RIFF_REGISTERS: Array<{
  id: RiffCycleSoundSettings['register'];
  label: string;
}> = [
  { id: 'low', label: 'Low' },
  { id: 'mid-low', label: 'Mid-Low' },
  { id: 'wide', label: 'Wide' },
];

const TAU = Math.PI * 2;

function getPolygonPoints(sides: number, radius: number, centerX = 80, centerY = 80): string {
  return Array.from({ length: Math.max(3, sides) }, (_, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(3, sides)) * TAU;
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
  }).join(' ');
}

export function RiffSceneThumbnail({
  preset,
  className = 'h-24 w-24',
}: {
  preset: RiffCyclePreset;
  className?: string;
}) {
  const { study } = preset;
  const centerX = 80;
  const centerY = 68;
  const outerRadius = 42;
  const innerRadius = 27;
  const activeSteps = study.riff.activeSteps
    .map((active, index) => (active ? index : null))
    .filter((value): value is number => value != null);
  const firstActiveStep = activeSteps[0] ?? 0;
  const activePointValues = activeSteps.map((index) => {
    const angle = -Math.PI / 2 + (index / study.riff.stepCount) * TAU;
    return {
      x: centerX + Math.cos(angle) * innerRadius,
      y: centerY + Math.sin(angle) * innerRadius,
    };
  });
  const activePolyline = activePointValues.map((point) => `${point.x},${point.y}`).join(' ');
  const gradientId = `riff-thumb-${preset.id}`;
  const gridId = `riff-thumb-grid-${preset.id}`;
  const referenceHandAngle = -Math.PI / 2;
  const phraseHandAngle = -Math.PI / 2 + (firstActiveStep / study.riff.stepCount) * TAU;
  const laneCellCount = Math.min(16, study.riff.stepCount);
  const laneX = 18;
  const laneY = 118;
  const laneWidth = 124;
  const laneGap = 3;
  const laneCellWidth = (laneWidth - laneGap * (laneCellCount - 1)) / laneCellCount;
  const laneIndices = Array.from({ length: laneCellCount }, (_, index) =>
    Math.min(study.riff.stepCount - 1, Math.floor((index / laneCellCount) * study.riff.stepCount)),
  );
  const landingCellCount =
    study.riff.resetMode === 'free' ? 0 : Math.min(laneCellCount, Math.max(2, Math.round((study.landingLength / study.riff.stepCount) * laneCellCount)));

  return (
    <svg viewBox="0 0 160 160" className={`${className} rounded-lg border border-white/10 bg-[#14141b]/80`}>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor={`${study.riff.color}55`} />
          <stop offset="100%" stopColor="#111116" />
        </radialGradient>
        <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="160" height="160" rx="18" fill={`url(#${gradientId})`} />
      <rect x="0" y="0" width="160" height="160" rx="18" fill={`url(#${gridId})`} opacity="0.42" />
      <rect x="10" y="108" width="140" height="36" rx="12" fill="rgba(10,12,18,0.82)" stroke="rgba(255,255,255,0.08)" />
      <line x1={centerX} y1={centerY} x2={centerX + Math.cos(referenceHandAngle) * (outerRadius + 7)} y2={centerY + Math.sin(referenceHandAngle) * (outerRadius + 7)} stroke="rgba(255,255,255,0.42)" strokeWidth="1.3" strokeLinecap="round" />
      <line x1={centerX} y1={centerY} x2={centerX + Math.cos(phraseHandAngle) * (innerRadius + 7)} y2={centerY + Math.sin(phraseHandAngle) * (innerRadius + 7)} stroke={study.riff.color} strokeWidth="1.9" strokeLinecap="round" />
      <polygon
        points={getPolygonPoints(study.reference.numerator, outerRadius, centerX, centerY)}
        fill="rgba(255,255,255,0.015)"
        stroke="rgba(255,255,255,0.24)"
        strokeWidth="1.4"
      />
      <circle
        cx={centerX}
        cy={centerY}
        r={innerRadius}
        fill="none"
        stroke={`${study.riff.color}48`}
        strokeWidth="1.1"
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
            r={index === 0 ? 4.5 : 3.4}
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
      {laneIndices.map((stepIndex, laneIndex) => {
        const active = study.riff.activeSteps[stepIndex];
        const accented = study.riff.accents[stepIndex];
        const x = laneX + laneIndex * (laneCellWidth + laneGap);
        const inLanding = landingCellCount > 0 && laneIndex >= laneCellCount - landingCellCount;
        return (
          <rect
            key={`lane-${laneIndex}`}
            x={x}
            y={laneY}
            width={laneCellWidth}
            height={16}
            rx="4"
            fill={
              accented
                ? '#FFD166'
                : active
                  ? study.riff.color
                  : inLanding
                    ? 'rgba(127,215,255,0.18)'
                    : 'rgba(255,255,255,0.07)'
            }
            opacity={active || accented ? 0.95 : 1}
            stroke={inLanding ? 'rgba(127,215,255,0.35)' : 'rgba(255,255,255,0.06)'}
            strokeWidth="0.8"
          />
        );
      })}
      <text x="16" y="30" fill="rgba(255,255,255,0.55)" fontSize="8.8" fontFamily='"SF Mono", "Fira Code", monospace' letterSpacing="1.6">
        {study.reference.numerator}/{study.reference.denominator}
      </text>
      <text x="16" y="146" fill="rgba(255,255,255,0.55)" fontSize="8.6" fontFamily='"SF Mono", "Fira Code", monospace' letterSpacing="1.4">
        {study.riff.stepCount} STEP
      </text>
    </svg>
  );
}

export default function RiffCycleSidebar({
  isOpen,
  study,
  currentSurface,
  activePresetId,
  selectedStep,
  onClose,
  onSurfaceChange,
  onLoadPreset,
  onToggleSound,
  onToggleReferenceSound,
  onToggleBackbeatSound,
  onUpdateSoundSettings,
  onUpdateReference,
  onUpdateRiff,
  onSetRiffStepCount,
  onToggleStep,
  onToggleAccent,
  onRotateRiff,
  onInvertRiff,
  onClearRiff,
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
  onSaveScene,
  onHardRefresh,
}: RiffCycleSidebarProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<RiffCycleSidebarTab>(isMobile ? 'account' : 'scenes');
  const [exportAspect, setExportAspect] = useState<'landscape' | 'square' | 'portrait' | 'story'>('square');
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(2);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const landingStepLimit = getReferenceStepsPerBar(study.reference);
  const selectedStepEditable = selectedStep != null;
  const tabMeta: Array<{ id: RiffCycleSidebarTab; label: string; color: string }> = isMobile
    ? [
        { id: 'account', label: 'Account', color: '#88CCFF' },
        { id: 'scenes', label: 'Scenes', color: '#72F1B8' },
        { id: 'export', label: 'Export', color: '#FFAA00' },
      ]
    : [
        { id: 'scenes', label: 'Scenes', color: '#72F1B8' },
        { id: 'bar', label: 'Bar', color: '#FF88C2' },
        { id: 'phrase', label: 'Pattern', color: study.riff.color },
        { id: 'ending', label: 'Ending', color: '#7FD7FF' },
        { id: 'sound', label: 'Audio', color: '#88CCFF' },
        { id: 'export', label: 'Export', color: '#FFAA00' },
        { id: 'account', label: 'Account', color: '#88CCFF' },
      ];

  useEffect(() => {
    if (isMobile) {
      setActiveTab('account');
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile && study.landingEditEnabled) {
      setActiveTab('ending');
    }
  }, [isMobile, study.landingEditEnabled]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }
    if (activeTab === 'bar' || activeTab === 'phrase' || activeTab === 'ending' || activeTab === 'sound') {
      setActiveTab('scenes');
    }
  }, [activeTab, isMobile]);

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm" onClick={onClose} /> : null}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden ${
          isMobile ? 'inset-0 w-full' : 'right-4 top-4 bottom-4 w-[28rem] rounded-[2rem] border'
        }`}
        style={{
          background: isMobile
            ? 'linear-gradient(135deg, rgba(17, 17, 22, 0.97), rgba(28, 28, 34, 0.96))'
            : `
              radial-gradient(circle at 84% -8%, ${study.riff.color}2b, transparent 42%),
              radial-gradient(circle at 12% 0%, rgba(255,255,255,0.08), transparent 36%),
              linear-gradient(145deg, rgba(17,19,27,0.97), rgba(8,10,16,0.92))
            `,
          borderColor: isMobile ? undefined : `${study.riff.color}28`,
          borderLeft: isMobile ? 'none' : undefined,
          boxShadow: isMobile
            ? undefined
            : `0 28px 90px rgba(0,0,0,0.5), 0 0 48px ${study.riff.color}12, inset 0 1px 0 rgba(255,255,255,0.08)`,
          transform: isOpen ? 'translateX(0)' : `translateX(${isMobile ? '0' : 'calc(100% + 1.5rem)'})`,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease',
          backdropFilter: 'blur(22px)',
        }}
      >
        <div
          className={`flex items-center justify-between border-b border-white/10 ${isMobile ? 'px-4 py-4' : 'px-5 py-4'}`}
          style={{
            background: isMobile
              ? undefined
              : `linear-gradient(90deg, ${study.riff.color}10, rgba(255,255,255,0.025), transparent)`,
          }}
        >
          <div>
            <div className="text-sm font-light uppercase tracking-[0.24em] text-white/78">{isMobile ? 'Menu' : 'Riff Cycle'}</div>
            {!isMobile ? (
              <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/34">
                scenes · export · account
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border text-white/60 transition-colors hover:bg-white/10 ${isMobile ? 'p-3' : 'p-2'}`}
            style={{
              background: 'rgba(255,255,255,0.045)',
              borderColor: 'rgba(255,255,255,0.09)',
            }}
            aria-label="Collapse Riff menu"
            title="Collapse menu"
          >
            <X size={18} />
          </button>
        </div>

        {isMobile ? (
          <div className="border-b border-white/8 px-4 py-3">
            <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-white/36">
              Mode
            </div>
            <div className="flex gap-2">
              {([
                ['orbital', 'Orbit'],
                ['polyrhythm-study', 'Study'],
                ['riff-cycle-study', 'Riff'],
              ] as const).map(([surfaceId, label]) => {
                const active = currentSurface === surfaceId;
                return (
                  <button
                    key={surfaceId}
                    type="button"
                    onClick={() => onSurfaceChange(surfaceId)}
                    className="flex-1 rounded-full border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: active ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.03)',
                      borderColor: active ? 'rgba(114,241,184,0.22)' : 'rgba(255,255,255,0.08)',
                      color: active ? '#72F1B8' : 'rgba(255,255,255,0.56)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 py-3 pb-28' : 'px-4 py-3'} space-y-3`}>
          {isMobile ? (
            <div className="-mx-3 border-b border-white/5 px-3 pt-3 pb-1">
              <div className="flex min-w-max gap-1 overflow-x-auto">
                {tabMeta.map((tab) => {
                  const active = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="shrink-0 rounded-t-lg px-3 py-3 text-xs font-mono font-light transition-all duration-200"
                      style={{
                        color: active ? tab.color : 'rgba(255,255,255,0.4)',
                        borderBottom: active ? `2px solid ${tab.color}` : 'none',
                        background: active ? `${tab.color}10` : 'transparent',
                      }}
                    >
                      {tab.label.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <section
              className="-mx-4 sticky top-0 z-10 space-y-2 border-y border-white/8 px-4 py-2.5"
              style={{
                background: 'linear-gradient(180deg, rgba(18,18,24,0.94), rgba(18,18,24,0.82))',
                backdropFilter: 'blur(18px)',
              }}
            >
              <div className="flex gap-2 overflow-x-auto pb-1">
                {tabMeta.map((tab) => {
                  const active = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === 'phrase') {
                          onSetEditMode('phrase');
                        }
                        if (tab.id === 'ending') {
                          onSetEditMode('landing');
                        }
                        setActiveTab(tab.id);
                      }}
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.15em]"
                      style={{
                        background: active
                          ? `linear-gradient(180deg, ${tab.color}24, ${tab.color}10)`
                          : 'rgba(255,255,255,0.03)',
                        borderColor: active ? `${tab.color}3d` : 'rgba(255,255,255,0.08)',
                        color: active ? tab.color : 'rgba(255,255,255,0.58)',
                        boxShadow: active
                          ? `0 0 0 1px ${tab.color}26 inset, 0 10px 24px rgba(0,0,0,0.24), 0 0 24px ${tab.color}18`
                          : 'none',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

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
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF88C2]">Bar</div>
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
                  {[8, 12, 16, 20, 32].map((value) => (
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
                Bar Marker
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
                {study.reference.showBackbeat ? 'Marker On' : 'Marker Off'}
              </button>
            </div>
          </section>
          ) : null}

          {activeTab === 'phrase' ? (
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: study.riff.color }}>Riff</div>
              <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-white/58">
                Step {selectedStep != null ? selectedStep + 1 : '—'}
              </div>
            </div>
            <label className="block space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
              Riff Length
              <input
                type="number"
                min="3"
                max="64"
                value={study.riff.stepCount}
                onChange={(event) => onSetRiffStepCount(parseInt(event.target.value, 10) || 17)}
                className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
              />
            </label>

            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Pattern Tools
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onRotateRiff(-1)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                <RotateCcw size={14} />
                Back 1
              </button>
              <button type="button" onClick={() => onRotateRiff(1)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                <RotateCw size={14} />
                Forward 1
              </button>
              <button type="button" onClick={onInvertRiff} className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                Invert
              </button>
              <button type="button" onClick={onClearRiff} className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66">
                Clear Pattern
              </button>
            </div>
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
              </div>
            ) : null}
          </section>
          ) : null}

          {activeTab === 'ending' ? (
          <>
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#7FD7FF]">Ending</div>
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
                Riff stays the same
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
                Remove Last Hit
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
                Remove Last 2
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
                Strong Last Hit
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
                Strong Last 2
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
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#FFD166]">Return</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'free', label: 'Free' },
                { value: 'per-bar', label: 'Every Bar' },
                { value: 'every-2-bars', label: 'Every 2' },
                { value: 'every-4-bars', label: 'Every 4' },
                { value: 'every-8-bars', label: 'Every 8' },
                { value: 'every-16-bars', label: 'Every 16' },
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
                  max="16"
                  value={study.riff.resetBars}
                  onChange={(event) => onUpdateRiff({ resetBars: parseInt(event.target.value, 10) || 4 })}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
            ) : null}
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
                PNG Export
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['square', 'Square'],
                  ['landscape', 'Wide'],
                  ['story', 'Story'],
                ] as const).map(([aspect, label]) => (
                  <button
                    key={aspect}
                    type="button"
                    onClick={() => setExportAspect(aspect)}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: exportAspect === aspect ? 'rgba(136,204,255,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: exportAspect === aspect ? 'rgba(136,204,255,0.24)' : 'rgba(255,255,255,0.08)',
                      color: exportAspect === aspect ? '#88CCFF' : 'rgba(255,255,255,0.64)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 4].map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => setExportScale(scale as 1 | 2 | 4)}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: exportScale === scale ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: exportScale === scale ? 'rgba(255,209,102,0.24)' : 'rgba(255,255,255,0.08)',
                      color: exportScale === scale ? '#FFD166' : 'rgba(255,255,255,0.64)',
                    }}
                  >
                    {scale}x
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onExportPng({ aspect: exportAspect, scale: exportScale });
                  setExportNotice('PNG exported.');
                }}
                className="w-full rounded-lg px-3 py-2 text-xs font-mono transition-all duration-200"
                style={{
                  background: 'rgba(136, 204, 255, 0.08)',
                  border: '1px solid rgba(136, 204, 255, 0.2)',
                  color: '#88CCFF',
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
                Saved Scene
              </div>
              <div className="text-[11px] leading-relaxed text-white/46">
                Save this Riff Cycle into the Saved scene bank.
              </div>
              <button
                type="button"
                onClick={() => {
                  onSaveScene();
                  setExportNotice('Riff scene saved to Saved.');
                }}
                className="w-full rounded-lg px-3 py-2 text-xs font-mono transition-all duration-200"
                style={{
                  background: 'rgba(0, 255, 170, 0.08)',
                  border: '1px solid rgba(0, 255, 170, 0.2)',
                  color: '#00FFAA',
                }}
              >
                Save Scene
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

          {activeTab === 'account' ? (
          <section className="space-y-3">
            <AccountPanel />
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Refresh This Mode
                  </div>
                  <div className="mt-1 text-[11px] text-white/46">
                    Reload the app and come back to Riff instead of Orbit.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onHardRefresh}
                  className="shrink-0 rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.15em]"
                  style={{
                    background: 'rgba(255,170,0,0.1)',
                    borderColor: 'rgba(255,170,0,0.22)',
                    color: '#FFAA00',
                  }}
                >
                  Hard Refresh
                </button>
              </div>
            </div>
          </section>
          ) : null}

          {activeTab === 'sound' ? (
          <section className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#88CCFF]">Sound</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bar', label: 'Bar' },
                { id: 'riff', label: 'Riff' },
                { id: 'full', label: 'Both' },
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
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Palette
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RIFF_SOUND_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => onUpdateSoundSettings({ palette: palette.id })}
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background:
                        study.soundSettings.palette === palette.id
                          ? `${study.riff.color}14`
                          : 'rgba(255,255,255,0.04)',
                      borderColor:
                        study.soundSettings.palette === palette.id
                          ? `${study.riff.color}36`
                          : 'rgba(255,255,255,0.08)',
                      color:
                        study.soundSettings.palette === palette.id
                          ? study.riff.color
                          : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    {palette.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Sound Mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'free', label: 'Original' },
                  { id: 'keyed', label: 'In Key' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      onUpdateSoundSettings({
                        pitchMode: mode.id as RiffCycleSoundSettings['pitchMode'],
                      })
                    }
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background:
                        study.soundSettings.pitchMode === mode.id
                          ? 'rgba(127,215,255,0.12)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor:
                        study.soundSettings.pitchMode === mode.id
                          ? 'rgba(127,215,255,0.24)'
                          : 'rgba(255,255,255,0.08)',
                      color:
                        study.soundSettings.pitchMode === mode.id
                          ? '#7FD7FF'
                          : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              {study.soundSettings.pitchMode === 'keyed' ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                    Key
                    <select
                      value={study.soundSettings.rootNote}
                      onChange={(event) =>
                        onUpdateSoundSettings({
                          rootNote: event.target.value as RiffCycleSoundSettings['rootNote'],
                        })
                      }
                      className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[14px] font-light text-white outline-none"
                    >
                      {NOTE_NAMES.map((note) => (
                        <option key={note} value={note} style={{ background: '#181820' }}>
                          {note}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                    Note Family
                    <select
                      value={study.soundSettings.scaleName}
                      onChange={(event) =>
                        onUpdateSoundSettings({
                          scaleName: event.target.value as RiffCycleSoundSettings['scaleName'],
                        })
                      }
                      className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[14px] font-light text-white outline-none"
                    >
                      {Object.entries(SCALE_PRESETS).map(([name]) => (
                        <option key={name} value={name} style={{ background: '#181820' }}>
                          {getFriendlyScaleLabel(name as import('../lib/audioEngine').ScaleName)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Register
              </div>
              <div className="grid grid-cols-3 gap-2">
                {RIFF_REGISTERS.map((register) => (
                  <button
                    key={register.id}
                    type="button"
                    onClick={() => onUpdateSoundSettings({ register: register.id })}
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background:
                        study.soundSettings.register === register.id
                          ? 'rgba(255,209,102,0.12)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor:
                        study.soundSettings.register === register.id
                          ? 'rgba(255,209,102,0.24)'
                          : 'rgba(255,255,255,0.08)',
                      color:
                        study.soundSettings.register === register.id
                          ? '#FFD166'
                          : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    {register.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Accent Push
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'soft', label: 'Soft' },
                  { id: 'strong', label: 'Strong' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      onUpdateSoundSettings({
                        accentPush: option.id as RiffCycleSoundSettings['accentPush'],
                      })
                    }
                    className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      background:
                        study.soundSettings.accentPush === option.id
                          ? 'rgba(255,136,194,0.12)'
                          : 'rgba(255,255,255,0.04)',
                      borderColor:
                        study.soundSettings.accentPush === option.id
                          ? 'rgba(255,136,194,0.24)'
                          : 'rgba(255,255,255,0.08)',
                      color:
                        study.soundSettings.accentPush === option.id
                          ? '#FF88C2'
                          : 'rgba(255,255,255,0.66)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
          </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
