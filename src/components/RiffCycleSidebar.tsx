import { useEffect, useRef, useState } from 'react';
import {
  Lock,
  MoreHorizontal,
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import AccountPanel from './AccountPanel';
import InfoTip from './InfoTip';
import { useIsMobile } from '../hooks/use-mobile';
import { NOTE_NAMES, SCALE_PRESETS, getFriendlyScaleLabel } from '../lib/audioEngine';
import {
  RIFF_CYCLE_COLORS,
  RIFF_CYCLE_PRESETS,
  RIFF_MAX_STEP_COUNT,
  getReferenceStepsPerBar,
  type ReferenceMeter,
  type RiffCyclePreset,
  type RiffCycleSoundSettings,
  type RiffCycleStudy,
  type RiffPhrase,
} from '../lib/riffCycleStudy';
import type { RiffMidiExportMode } from '../lib/riffCycleMidi';
import { VIDEO_EXPORT_ASPECTS, VIDEO_EXPORT_DURATIONS, type VideoExportAspect, type VideoExportDuration } from '../lib/videoExport';

interface RiffCycleSidebarProps {
  isOpen: boolean;
  study: RiffCycleStudy;
  currentSurface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow';
  activePresetId: string | null;
  activeSavedSceneId?: string | null;
  savedScenes?: Array<{
    id: string;
    name: string;
    description: string;
    study: RiffCycleStudy;
  }>;
  selectedStep: number | null;
  onClose: () => void;
  onSurfaceChange: (surface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow') => void;
  onLoadPreset: (presetId: string) => void;
  onLoadSavedScene?: (sceneId: string) => void;
  onEditSavedScene?: (sceneId: string) => void;
  onSaveScene: () => void;
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
  onExportVideo: (options: { durationSeconds: VideoExportDuration; aspect: VideoExportAspect }) => Promise<void> | void;
  onExportMidi: (mode: RiffMidiExportMode) => void;
  onExportScene: () => void;
  onImportScene: (file: File) => void;
  isRecordingVideo: boolean;
  onHardRefresh: () => void;
  lockedFeatures?: {
    colorEditing?: boolean;
    export?: boolean;
    saveScenes?: boolean;
    soundEditing?: boolean;
    proScenes?: boolean;
    riffPatternTools?: boolean;
    riffExtendedPatterns?: boolean;
  };
  onLockedFeature?: (feature: 'color-editing' | 'export' | 'save-scenes' | 'sound-editing' | 'riff-pattern-tools' | 'riff-extended-patterns' | 'pro-scenes') => void;
}

type RiffCycleSidebarTab =
  | 'scenes'
  | 'bar'
  | 'phrase'
  | 'ending'
  | 'sound'
  | 'export'
  | 'account';
type RiffCycleSidebarSceneTab = 'standard' | 'saved' | 'pro';

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
  activeSavedSceneId = null,
  savedScenes = [],
  selectedStep,
  onClose,
  onSurfaceChange,
  onLoadPreset,
  onLoadSavedScene,
  onEditSavedScene,
  onSaveScene,
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
  onExportVideo,
  onExportMidi,
  onExportScene,
  onImportScene,
  isRecordingVideo,
  onHardRefresh,
  lockedFeatures = {},
  onLockedFeature,
}: RiffCycleSidebarProps) {
  const isMobile = useIsMobile();
  const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/i.test(navigator.userAgent);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<RiffCycleSidebarTab>('scenes');
  const [sceneTab, setSceneTab] = useState<RiffCycleSidebarSceneTab>('standard');
  const [exportAspect, setExportAspect] = useState<'landscape' | 'square' | 'portrait' | 'story'>('square');
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(2);
  const [videoDuration, setVideoDuration] = useState<VideoExportDuration>(8);
  const [videoAspect, setVideoAspect] = useState<VideoExportAspect>('canvas');
  const [exportMidiMode, setExportMidiMode] = useState<RiffMidiExportMode>('cycle');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const exportLocked = Boolean(lockedFeatures.export);
  const promptLockedExport = () => {
    onLockedFeature?.('export');
    setExportNotice('Export is a Pro feature.');
  };
  const promptLockedSound = () => {
    onLockedFeature?.('sound-editing');
  };
  const riffPatternToolsLocked = Boolean(lockedFeatures.riffPatternTools);
  const promptLockedPatternTools = () => {
    onLockedFeature?.('riff-pattern-tools');
  };
  const saveScenesLocked = Boolean(lockedFeatures.saveScenes);
  const promptLockedSaveScenes = () => {
    onLockedFeature?.('save-scenes');
  };
  const lockedExportStyle = exportLocked
    ? {
        background: 'rgba(255,255,255,0.035)',
        borderColor: 'rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.5)',
        filter: 'grayscale(0.45)',
      }
    : {};
  const soundLocked = Boolean(lockedFeatures.soundEditing);
  const lockedSoundStyle = soundLocked
    ? {
        opacity: 0.68,
        filter: 'grayscale(0.45)',
      }
    : {};
  const landingStepLimit = getReferenceStepsPerBar(study.reference);
  const riffStepEditingLocked =
    Boolean(lockedFeatures.riffExtendedPatterns) && study.riff.stepCount > 12;
  const selectedStepEditable = selectedStep != null && !riffStepEditingLocked;
  const mobilePrimaryTitleStyle = {
    color: '#FFD166',
    textShadow: '0 0 14px rgba(255,209,102,0.26)',
  } as const;
  const mobileSubTitleStyle = {
    color: 'rgba(244,250,255,0.9)',
    textShadow: '0 0 12px rgba(255,255,255,0.14)',
  } as const;
  const mobileModeCardStyle = {
    background: `
      radial-gradient(circle at 14% 10%, rgba(0,255,170,0.16), transparent 42%),
      linear-gradient(135deg, rgba(0,255,170,0.09), rgba(127,215,255,0.06) 52%, rgba(255,255,255,0.026))
    `,
    borderColor: 'rgba(127,215,255,0.14)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 18px 42px rgba(0,0,0,0.18), 0 0 34px rgba(0,255,170,0.06)',
  } as const;
  const mobilePrimaryTabShellStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.036), rgba(255,255,255,0.018))',
    borderColor: 'rgba(255,255,255,0.075)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)',
  } as const;
  const mobileSceneSubTabShellStyle = {
    background: 'rgba(255,255,255,0.022)',
    borderColor: 'rgba(255,255,255,0.065)',
  } as const;
  const exportCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))',
    borderColor: 'rgba(255, 170, 0, 0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12)',
  } as const;
  const tabMeta: Array<{ id: RiffCycleSidebarTab; label: string; color: string }> = isMobile
    ? [
        { id: 'scenes', label: 'Scenes', color: '#7FD7FF' },
        { id: 'export', label: 'Export', color: '#FFAA00' },
        { id: 'account', label: 'Account', color: '#C9D4E5' },
      ]
    : [
        { id: 'scenes', label: 'Scenes', color: '#7FD7FF' },
        { id: 'export', label: 'Export', color: '#FFAA00' },
        { id: 'account', label: 'Account', color: '#C9D4E5' },
      ];
  const standardPresets = RIFF_CYCLE_PRESETS.filter((preset) => !preset.pro);
  const proPresets = RIFF_CYCLE_PRESETS.filter((preset) => preset.pro);

  useEffect(() => {
    if (isMobile && isOpen) {
      setActiveTab('scenes');
    }
  }, [isMobile, isOpen]);

  const pinEndingTab = () => {
    onSetEditMode('landing');
    setActiveTab('scenes');
  };

  useEffect(() => {
    if (activeTab === 'bar' || activeTab === 'phrase' || activeTab === 'ending' || activeTab === 'sound') {
      setActiveTab('scenes');
    }
  }, [activeTab]);

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[3px]" onClick={onClose} /> : null}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden ${
          isMobile
            ? 'left-3 right-3 top-3 bottom-3 rounded-[1.5rem] border'
            : 'right-4 top-4 bottom-4 w-[28rem] rounded-[2rem] border'
        }`}
        style={{
          background: isMobile
            ? `
              radial-gradient(circle at 84% -8%, ${study.riff.color}2f, transparent 42%),
              radial-gradient(circle at 12% 0%, rgba(255,255,255,0.08), transparent 36%),
              linear-gradient(145deg, rgba(17,19,27,0.94), rgba(8,10,16,0.9))
            `
            : `
              radial-gradient(circle at 84% -8%, ${study.riff.color}2b, transparent 42%),
              radial-gradient(circle at 12% 0%, rgba(255,255,255,0.08), transparent 36%),
              linear-gradient(145deg, rgba(17,19,27,0.97), rgba(8,10,16,0.92))
            `,
          borderColor: isMobile ? `${study.riff.color}24` : `${study.riff.color}28`,
          borderLeft: isMobile ? 'none' : undefined,
          boxShadow: isMobile
            ? `0 -28px 90px rgba(0,0,0,0.56), 0 0 54px ${study.riff.color}14, inset 0 1px 0 rgba(255,255,255,0.1)`
            : `0 28px 90px rgba(0,0,0,0.5), 0 0 48px ${study.riff.color}12, inset 0 1px 0 rgba(255,255,255,0.08)`,
          transform: isOpen ? 'translate(0, 0)' : isMobile ? 'translateY(calc(100% + 1rem))' : 'translateX(calc(100% + 1.5rem))',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease',
          backdropFilter: 'blur(22px)',
        }}
      >
        {isMobile ? (
          <div className="flex justify-center pt-2">
            <div className="h-1.5 w-12 rounded-full border border-white/10 bg-white/16 shadow-[0_0_18px_rgba(255,209,102,0.16)]" />
          </div>
        ) : null}
        <div
          className={`flex items-center justify-between border-b border-white/10 ${isMobile ? 'px-4 py-3' : 'px-5 py-4'}`}
          style={{
            background: isMobile
              ? undefined
              : `linear-gradient(90deg, ${study.riff.color}10, rgba(255,255,255,0.025), transparent)`,
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: study.riff.color,
                  boxShadow: `0 0 18px ${study.riff.color}66`,
                }}
              />
              <div className="text-sm font-light uppercase tracking-[0.24em] text-white/78">
                {isMobile ? 'Riff Menu' : 'Riff Cycle'}
              </div>
            </div>
            {isMobile ? (
              <div className="mt-1 text-[12px] leading-relaxed text-white/42">
                Scenes, saved grooves, and account tools for the riff builder.
              </div>
            ) : null}
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
            <div data-guide="riff-mobile-mode-switcher" className="rounded-[1.45rem] border px-3.5 py-3.5" style={mobileModeCardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-mono uppercase tracking-[0.24em]" style={mobilePrimaryTitleStyle}>
                    Mode
                  </div>
                  <div className="mt-1 text-[12px] leading-relaxed text-white/42">
                    Switch instruments without losing your place.
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                  3 Modes
                </div>
              </div>
              <div className="mt-3 flex gap-2">
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
                      className="flex-1 rounded-full border px-3 py-2.5 text-[10px] font-mono uppercase tracking-[0.16em]"
                      style={{
                        background: active ? 'rgba(114,241,184,0.15)' : 'rgba(255,255,255,0.032)',
                        borderColor: active ? 'rgba(114,241,184,0.28)' : 'rgba(255,255,255,0.085)',
                        color: active ? '#72F1B8' : 'rgba(255,255,255,0.56)',
                        boxShadow: active ? '0 0 0 1px rgba(114,241,184,0.16) inset, 0 0 24px rgba(114,241,184,0.08), 0 10px 24px rgba(0,0,0,0.18)' : 'none',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 py-3 pb-28' : 'px-4 py-3'} space-y-3`}>
          {isMobile ? (
            <div className="rounded-[1.25rem] border p-1" style={mobilePrimaryTabShellStyle}>
              <div className="grid grid-cols-3 gap-1">
                {tabMeta.map((tab) => {
                  const active = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="min-w-0 rounded-xl px-2 py-2 text-[11px] font-mono font-light transition-all duration-200"
                      style={{
                        color: active ? tab.color : 'rgba(255,255,255,0.4)',
                        border: active ? `1px solid ${tab.color}32` : '1px solid transparent',
                        background: active ? `${tab.color}14` : 'transparent',
                        boxShadow: active ? `0 0 0 1px ${tab.color}1c inset, 0 8px 18px rgba(0,0,0,0.12)` : 'none',
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
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={mobilePrimaryTitleStyle}>
                Scenes
              </div>
              <div className="text-[11px] leading-relaxed text-white/52">
                Load a starting riff, then edit the pattern and ending from the main controls.
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border p-1" style={mobilePrimaryTabShellStyle}>
              {([
                { key: 'standard' as const, label: 'Standard', color: '#88CCFF' },
                { key: 'saved' as const, label: 'Saved', color: '#72F1B8' },
                { key: 'pro' as const, label: 'Pro', color: '#FFAA00' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSceneTab(tab.key)}
                  className="flex-1 rounded-xl px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                  style={{
                    background: sceneTab === tab.key ? `${tab.color}14` : 'transparent',
                    border: `1px solid ${sceneTab === tab.key ? `${tab.color}45` : 'transparent'}`,
                    color: sceneTab === tab.key ? tab.color : 'rgba(255,255,255,0.48)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => (saveScenesLocked ? promptLockedSaveScenes() : onSaveScene())}
              className="relative flex w-full items-center justify-center rounded-2xl border px-4 py-3 text-[11px] font-mono uppercase tracking-[0.18em] transition-transform active:scale-[0.985]"
              style={{
                background: saveScenesLocked
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))'
                  : 'linear-gradient(180deg, rgba(0,255,170,0.18), rgba(0,255,170,0.09))',
                borderColor: saveScenesLocked ? 'rgba(255,255,255,0.1)' : 'rgba(0,255,170,0.28)',
                color: saveScenesLocked ? 'rgba(255,255,255,0.5)' : '#72F1B8',
                boxShadow: saveScenesLocked
                  ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px rgba(0,255,170,0.1)',
                filter: saveScenesLocked ? 'grayscale(0.45)' : undefined,
              }}
            >
              Save Scene
              {saveScenesLocked ? <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-white/42" size={13} strokeWidth={2.4} /> : null}
            </button>

            {sceneTab === 'standard' ? standardPresets.map((preset) => {
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
                  <div className="flex items-center gap-3">
                    <RiffSceneThumbnail preset={preset} />
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-xs font-mono uppercase tracking-[0.16em]"
                        style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,0.84)' }}
                      >
                        {preset.name}
                      </div>
                      <div
                        className="mt-1.5 text-[10px] leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.48)' }}
                      >
                        {preset.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onLoadPreset(preset.id)}
                      className="shrink-0 rounded-xl border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] transition-all duration-200"
                      style={{
                        background: active ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.06)',
                        borderColor: active ? 'rgba(114,241,184,0.3)' : 'rgba(255,255,255,0.12)',
                        color: active ? '#72F1B8' : 'rgba(255,255,255,0.72)',
                      }}
                    >
                      {active ? 'Loaded' : 'Load'}
                    </button>
                  </div>
                </div>
              );
            }) : null}

            {sceneTab === 'saved' ? (
              savedScenes.length > 0 ? (
                savedScenes.map((scene) => {
                  const active = scene.id === activeSavedSceneId;
                  const presetForThumbnail: RiffCyclePreset = {
                    id: scene.id,
                    name: scene.name,
                    description: scene.description,
                    study: scene.study,
                  };
                  return (
                    <div
                      key={scene.id}
                      onClick={() => onLoadSavedScene?.(scene.id)}
                      className="relative w-full rounded-xl border p-3 text-left"
                      style={{
                        background: active
                          ? 'linear-gradient(180deg, rgba(114,241,184,0.08), rgba(255,255,255,0.03))'
                          : 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.028))',
                        borderColor: active ? 'rgba(114,241,184,0.22)' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditSavedScene?.(scene.id);
                        }}
                        className="absolute right-2 top-2 z-10 rounded-lg border p-1.5"
                        style={{
                          background: 'rgba(0,0,0,0.36)',
                          borderColor: 'rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.7)',
                        }}
                        title="Edit scene details"
                        aria-label="Edit scene details"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      <div className="flex items-center gap-3">
                        <RiffSceneThumbnail preset={presetForThumbnail} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono uppercase tracking-[0.16em]" style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,0.84)' }}>
                            {scene.name}
                          </div>
                          <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-white/34">
                            {scene.study.riff.stepCount} steps
                          </div>
                          <div className="mt-2 text-[11px] leading-relaxed text-white/46">
                            {scene.description}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-xl border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em]" style={{ borderColor: active ? 'rgba(114,241,184,0.22)' : 'rgba(255,255,255,0.08)', color: active ? '#72F1B8' : 'rgba(255,255,255,0.68)' }}>
                          {active ? 'Loaded' : 'Load'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-4 text-center">
                  <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/56">No Saved Scenes Yet</div>
                  <div className="mt-2 text-[11px] text-white/42">Saved riffs will appear here.</div>
                </div>
              )
            ) : null}

            {sceneTab === 'pro' ? (
              <div className="space-y-3">
                {proPresets.map((preset) => {
                  const active = preset.id === activePresetId;
                  const locked = Boolean(lockedFeatures.proScenes);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (locked) {
                          onLockedFeature?.('pro-scenes');
                          return;
                        }
                        onLoadPreset(preset.id);
                      }}
                      className="relative w-full rounded-xl border p-3 text-left"
                      style={{
                        background: active
                          ? `linear-gradient(180deg, ${preset.study.riff.color}12, rgba(255,255,255,0.03))`
                          : 'linear-gradient(180deg, rgba(255,170,0,0.055), rgba(255,255,255,0.028))',
                        borderColor: active ? `${preset.study.riff.color}36` : 'rgba(255,170,0,0.13)',
                        filter: locked ? 'saturate(0.72)' : undefined,
                      }}
                    >
                      {locked ? (
                        <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border border-[#FFD166]/20 bg-black/45 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.12em] text-[#FFD166]">
                          <Lock size={8} strokeWidth={2.4} /> Pro
                        </span>
                      ) : null}
                      <div className="flex items-center gap-3">
                        <RiffSceneThumbnail preset={preset} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono uppercase tracking-[0.16em]" style={{ color: active ? preset.study.riff.color : 'rgba(255,255,255,0.84)' }}>
                            {preset.name}
                          </div>
                          <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-white/34">
                            {preset.study.riff.stepCount} steps
                          </div>
                          <div className="mt-2 text-[11px] leading-relaxed text-white/46">
                            {preset.description}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-xl border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em]" style={{ borderColor: active ? `${preset.study.riff.color}36` : 'rgba(255,255,255,0.08)', color: active ? preset.study.riff.color : 'rgba(255,255,255,0.68)' }}>
                          {active ? 'Loaded' : locked ? 'Pro' : 'Load'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
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
                max={RIFF_MAX_STEP_COUNT}
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
                <button
                  type="button"
                  onClick={() => (riffPatternToolsLocked ? promptLockedPatternTools() : onRotateRiff(-1))}
                  className="relative flex h-11 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66"
                >
                  <RotateCcw size={14} />
                  Back 1
                  {riffPatternToolsLocked ? <Lock className="absolute right-2 top-2 text-white/42" size={10} strokeWidth={2.4} /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => (riffPatternToolsLocked ? promptLockedPatternTools() : onRotateRiff(1))}
                  className="relative flex h-11 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66"
                >
                  <RotateCw size={14} />
                  Forward 1
                  {riffPatternToolsLocked ? <Lock className="absolute right-2 top-2 text-white/42" size={10} strokeWidth={2.4} /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => (riffPatternToolsLocked ? promptLockedPatternTools() : onInvertRiff())}
                  className="relative col-span-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/66"
                >
                  Invert
                  {riffPatternToolsLocked ? <Lock className="absolute right-2 top-2 text-white/42" size={10} strokeWidth={2.4} /> : null}
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
                    onClick={() => {
                      if (lockedFeatures.colorEditing) {
                        onLockedFeature?.('color-editing');
                        return;
                      }
                      onUpdateRiff({ color });
                    }}
                    className="relative h-10 overflow-hidden rounded-xl border transition-transform active:scale-[0.97]"
                    style={{
                      background: lockedFeatures.colorEditing ? 'rgba(255,255,255,0.035)' : `${color}18`,
                      borderColor: lockedFeatures.colorEditing ? 'rgba(255,255,255,0.1)' : active ? `${color}AA` : `${color}44`,
                      boxShadow: lockedFeatures.colorEditing ? 'none' : active ? `0 0 0 1px ${color}AA inset` : 'none',
                      filter: lockedFeatures.colorEditing ? 'grayscale(0.6)' : undefined,
                    }}
                  >
                    {lockedFeatures.colorEditing ? (
                      <span className="pointer-events-none absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/14 bg-black/40 text-white/68">
                        <Lock size={9} strokeWidth={2.4} />
                      </span>
                    ) : null}
                  </button>
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
                { value: 'every-32-bars', label: 'Every 32' },
              ].map((option) => {
                const active = study.riff.resetMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      pinEndingTab();
                      onUpdateRiff({ resetMode: option.value as RiffPhrase['resetMode'] });
                    }}
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
              onClick={() => {
                pinEndingTab();
                onUpdateRiff({ resetMode: 'custom-cycle' });
              }}
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
                  max="32"
                  value={study.riff.resetBars}
                  onChange={(event) => {
                    pinEndingTab();
                    onUpdateRiff({ resetBars: parseInt(event.target.value, 10) || 4 });
                  }}
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[15px] font-light text-white outline-none"
                />
              </label>
            ) : null}
          </section>
          </>
          ) : null}

          {activeTab === 'export' ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <div className="text-[12px] font-mono uppercase tracking-[0.22em]" style={mobilePrimaryTitleStyle}>
                Export
              </div>
              <p className="text-[11px] leading-relaxed text-white/52">
                Save an image, export MIDI, or move the editable Riff scene.
              </p>
            </div>

            <div
              className="rounded-[1.25rem] border p-3.5 space-y-3"
              style={exportCardStyle}
            >
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={mobilePrimaryTitleStyle}>
                  Image Export
                </div>
                <InfoTip text="Choose the crop shape, then choose output size. HD is smallest, 2K is sharper, 4K is best for large posts or prints." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={exportAspect}
                  onChange={(event) => {
                    if (exportLocked) {
                      promptLockedExport();
                      return;
                    }
                    setExportAspect(event.target.value as typeof exportAspect);
                  }}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                  style={{ color: 'rgba(255, 255, 255, 0.8)', ...lockedExportStyle }}
                >
                  <option value="landscape" style={{ background: '#181820' }}>Landscape</option>
                  <option value="square" style={{ background: '#181820' }}>Square Post</option>
                  <option value="portrait" style={{ background: '#181820' }}>Wallpaper</option>
                  <option value="story" style={{ background: '#181820' }}>Story</option>
                </select>
                <select
                  value={String(exportScale)}
                  onChange={(event) => {
                    if (exportLocked) {
                      promptLockedExport();
                      return;
                    }
                    setExportScale(Number(event.target.value) as 1 | 2 | 4);
                  }}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                  style={{ color: 'rgba(255, 255, 255, 0.8)', ...lockedExportStyle }}
                >
                  <option value="1" style={{ background: '#181820' }}>HD</option>
                  <option value="2" style={{ background: '#181820' }}>2K</option>
                  <option value="4" style={{ background: '#181820' }}>4K</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (exportLocked) {
                    promptLockedExport();
                    return;
                  }
                  onExportPng({ aspect: exportAspect, scale: exportScale });
                  setExportNotice('PNG exported. On mobile: Share > Save Image.');
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                style={{
                  background: 'rgba(0, 255, 170, 0.08)',
                  border: '1px solid rgba(0, 255, 170, 0.2)',
                  color: '#00FFAA',
                  ...lockedExportStyle,
                }}
              >
                {exportLocked ? <span className="inline-flex items-center justify-center gap-2"><Lock size={12} /> Pro Export</span> : 'Export PNG'}
              </button>
            </div>

            <div
              className="rounded-[1.25rem] border p-3.5 space-y-3"
              style={exportCardStyle}
            >
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={mobilePrimaryTitleStyle}>
                  Motion Export
                </div>
                <InfoTip text="Exports the Riff canvas as a short MP4 when supported. If the browser records WebM first, the app converts it before download." />
              </div>
              <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                <select
                  value={String(videoDuration)}
                  onChange={(event) => {
                    if (exportLocked) {
                      promptLockedExport();
                      return;
                    }
                    setVideoDuration(Number(event.target.value) as VideoExportDuration);
                  }}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                  style={{ color: 'rgba(255, 255, 255, 0.8)', ...lockedExportStyle }}
                >
                  {VIDEO_EXPORT_DURATIONS.map((duration) => (
                    <option key={duration.value} value={duration.value} style={{ background: '#181820' }}>
                      {duration.label}
                    </option>
                  ))}
                </select>
                <select
                  value={videoAspect}
                  onChange={(event) => {
                    if (exportLocked) {
                      promptLockedExport();
                      return;
                    }
                    setVideoAspect(event.target.value as VideoExportAspect);
                  }}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                  style={{ color: 'rgba(255, 255, 255, 0.8)', ...lockedExportStyle }}
                >
                  {VIDEO_EXPORT_ASPECTS.map((aspect) => (
                    <option key={aspect.value} value={aspect.value} style={{ background: '#181820' }}>
                      {aspect.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (exportLocked) {
                      promptLockedExport();
                      return;
                    }
                    void onExportVideo({ durationSeconds: videoDuration, aspect: videoAspect });
                    setExportNotice(
                      isIOS
                        ? 'Video recording may not save cleanly on iPhone. PNG is more reliable there.'
                        : 'Video recording started from reset.',
                    );
                  }}
                  disabled={isRecordingVideo}
                  className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5 disabled:opacity-60"
                  style={{
                    background: 'rgba(51, 136, 255, 0.08)',
                    border: '1px solid rgba(51, 136, 255, 0.2)',
                    color: '#88CCFF',
                    ...lockedExportStyle,
                  }}
                >
                  {exportLocked ? <span className="inline-flex items-center justify-center gap-2"><Lock size={12} /> Pro</span> : isRecordingVideo ? 'Recording...' : 'Export Video'}
                </button>
              </div>
            </div>

            <div
              className="rounded-[1.25rem] border p-3.5 space-y-3"
              style={exportCardStyle}
            >
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={mobilePrimaryTitleStyle}>
                  MIDI Export
                </div>
                <InfoTip text="MIDI exports separate DAW lanes: Riff, Metronome, Subdivision, and Cycle Markers. The marker lane spans each pattern cycle so starts and ends are easy to see." />
              </div>
              <div className="text-[11px] leading-relaxed text-white/52">
                Send Riff, metronome, subdivision, and cycle marker lanes to a DAW.
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['pattern', 'Pattern Only'],
                  ['cycle', 'Full Cycle'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      if (exportLocked) {
                        promptLockedExport();
                        return;
                      }
                      setExportMidiMode(mode);
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-mono transition-all duration-200 hover:bg-white/5"
                    style={{
                      background: exportMidiMode === mode ? 'rgba(127, 215, 255, 0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${exportMidiMode === mode ? 'rgba(127, 215, 255, 0.24)' : 'rgba(255,255,255,0.1)'}`,
                      color: exportMidiMode === mode ? '#7FD7FF' : 'rgba(255,255,255,0.68)',
                      ...lockedExportStyle,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-[11px] leading-relaxed text-white/52">
                {exportMidiMode === 'cycle'
                  ? 'Cycle includes bar timing, riff restart, ending slots, metronome, subdivision hits, and pattern start/end markers.'
                  : 'Pattern exports the raw riff length with matching metronome, selected subdivision hits, and start/end markers.'}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (exportLocked) {
                    promptLockedExport();
                    return;
                  }
                  onExportMidi(exportMidiMode);
                  setExportNotice(
                    exportMidiMode === 'cycle'
                      ? 'Riff full-cycle MIDI exported.'
                      : 'Riff pattern MIDI exported.',
                  );
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                style={{
                  background: 'rgba(127, 215, 255, 0.08)',
                  border: '1px solid rgba(127, 215, 255, 0.2)',
                  color: '#7FD7FF',
                  ...lockedExportStyle,
                }}
              >
                {exportLocked ? <span className="inline-flex items-center justify-center gap-2"><Lock size={12} /> Pro Export</span> : 'Export MIDI Lanes'}
              </button>
            </div>

            <div
              className="rounded-[1.25rem] border p-3.5 space-y-3"
              style={exportCardStyle}
            >
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={mobilePrimaryTitleStyle}>
                  Scene Files
                </div>
                <InfoTip text="Scene files save the editable setup, not just a picture. Use them to move a scene between devices." />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (exportLocked) {
                    promptLockedExport();
                    return;
                  }
                  onExportScene();
                  setExportNotice('Riff scene exported.');
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  ...lockedExportStyle,
                }}
              >
                {exportLocked ? <span className="inline-flex items-center justify-center gap-2"><Lock size={12} /> Pro Export</span> : 'Export Scene'}
              </button>
              <button
                type="button"
                onClick={() => (saveScenesLocked ? promptLockedSaveScenes() : importInputRef.current?.click())}
                className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                style={{
                  background: 'rgba(255, 255, 255, 0.045)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.68)',
                  ...(saveScenesLocked
                    ? {
                        background: 'rgba(255,255,255,0.035)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)',
                        filter: 'grayscale(0.45)',
                      }
                    : {}),
                }}
              >
                {saveScenesLocked ? <span className="inline-flex items-center justify-center gap-2"><Lock size={12} /> Pro Import</span> : 'Import Scene'}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onImportScene(file);
                  }
                  event.target.value = '';
                }}
              />
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
          <section
            className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3"
            onClickCapture={(event) => {
              if (!soundLocked) return;
              event.preventDefault();
              event.stopPropagation();
              promptLockedSound();
            }}
            style={lockedSoundStyle}
          >
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#88CCFF]">Sound</div>
              {soundLocked ? <Lock size={13} className="text-white/45" /> : null}
            </div>
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
