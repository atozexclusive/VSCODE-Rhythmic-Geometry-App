import { useEffect, useState } from 'react';
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
import type { PolyrhythmMidiExportMode } from '../lib/polyrhythmMidi';
import {
  MAX_POLYRHYTHM_LAYERS,
  POLYRHYTHM_LAYER_COLORS,
  POLYRHYTHM_PRESET_GROUP_META,
  POLYRHYTHM_PRESETS,
  countActiveSteps,
  type PolyrhythmLayer,
  type PolyrhythmPresetGroup,
  type PolyrhythmSoundSettings,
  type PolyrhythmStudy,
  type PolyrhythmStudyPreset,
} from '../lib/polyrhythmStudy';
import { VIDEO_EXPORT_ASPECTS, VIDEO_EXPORT_DURATIONS, type VideoExportAspect, type VideoExportDuration } from '../lib/videoExport';

interface PolyrhythmStepSelection {
  layerId: string;
  stepIndex: number;
}

interface PolyrhythmSidebarProps {
  isOpen: boolean;
  study: PolyrhythmStudy;
  currentSurface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow';
  activePresetId: string | null;
  activeSavedSceneId?: string | null;
  savedScenes?: Array<{
    id: string;
    name: string;
    description: string;
    study: PolyrhythmStudy;
  }>;
  selectedLayerId: string | null;
  selectedStep: PolyrhythmStepSelection | null;
  onClose: () => void;
  onSurfaceChange: (surface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow') => void;
  onLoadPreset: (presetId: string) => void;
  onLoadSavedScene?: (sceneId: string) => void;
  onEditSavedScene?: (sceneId: string) => void;
  onResetStudy: () => void;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onToggleStudySound: () => void;
  onUpdateSoundSettings: (updates: Partial<PolyrhythmSoundSettings>) => void;
  onSetSoundFocus: (focus: 'layer' | 'stack' | 'mute') => void;
  onToggleInactiveSteps: () => void;
  onToggleStepLabels: () => void;
  onAddLayer: () => void;
  onSelectLayer: (layerId: string) => void;
  onSelectStep: (selection: PolyrhythmStepSelection | null) => void;
  onRemoveLayer: (layerId: string) => void;
  onRotateLayer: (layerId: string, stepOffset: number) => void;
  onInvertLayerSteps: (layerId: string) => void;
  onClearLayer: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<PolyrhythmLayer>) => void;
  onSetLayerBeatCount: (layerId: string, beatCount: number) => void;
  onToggleLayerStep: (layerId: string, stepIndex: number) => void;
  onExportPng: (options: {
    aspect: 'landscape' | 'square' | 'portrait' | 'story';
    scale: 1 | 2 | 4;
  }) => void;
  onExportVideo: (options: { durationSeconds: VideoExportDuration; aspect: VideoExportAspect }) => Promise<void> | void;
  onExportMidi: (mode: PolyrhythmMidiExportMode) => void;
  onExportScene: () => void;
  isRecordingVideo: boolean;
  onHardRefresh: () => void;
  lockedFeatures?: {
    colorEditing?: boolean;
    export?: boolean;
    soundEditing?: boolean;
    proScenes?: boolean;
  };
  onLockedFeature?: (feature: 'color-editing' | 'export' | 'sound-editing' | 'pro-scenes') => void;
}

type PolyrhythmSidebarTab = 'scenes' | 'layers' | 'sound' | 'export' | 'account';
type PolyrhythmSidebarSceneTab = 'standard' | 'saved' | 'pro';

const POLYRHYTHM_SOUND_PALETTES: Array<{
  id: PolyrhythmSoundSettings['palette'];
  label: string;
}> = [
  { id: 'study-pulse', label: 'Study Pulse' },
  { id: 'wood', label: 'Wood' },
  { id: 'soft-synth', label: 'Soft Synth' },
  { id: 'bright-marker', label: 'Bright Marker' },
];

const TAU = Math.PI * 2;

export function PolyrhythmSceneThumbnail({
  preset,
  className = 'h-24 w-24',
}: {
  preset: PolyrhythmStudyPreset;
  className?: string;
}) {
  const { study } = preset;
  const centerX = 80;
  const centerY = 72;
  const outerRadius = 48;
  const layers = [...study.layers];
  const gridId = `poly-grid-${preset.id}`;
  const glowId = `poly-glow-${preset.id}`;
  const sharedDisplay = study.displayStyle === 'shared';
  const layeredRadii = layers.map((layer, index) =>
    sharedDisplay
      ? outerRadius
      : Math.max(
          15,
          outerRadius *
            (layer.radius / Math.max(...layers.map((entry) => entry.radius), 1)),
        ),
  );

  return (
    <svg viewBox="0 0 160 160" className={`${className} rounded-lg border border-white/10 bg-[#14141b]/80`}>
      <defs>
        <radialGradient id={glowId} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="rgba(127,215,255,0.24)" />
          <stop offset="100%" stopColor="#111116" />
        </radialGradient>
        <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="160" height="160" rx="18" fill={`url(#${glowId})`} />
      <rect x="0" y="0" width="160" height="160" rx="18" fill={`url(#${gridId})`} opacity="0.42" />
      <line x1={centerX} y1={18} x2={centerX} y2={126} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1={18} y1={centerY} x2={142} y2={centerY} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      {sharedDisplay ? (
        <circle
          cx={centerX}
          cy={centerY}
          r={outerRadius}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.2"
        />
      ) : null}

      {layers.map((layer, index) => {
        const radius = layeredRadii[index] ?? outerRadius;
        const activePoints = layer.activeSteps
          .map((active, stepIndex) => {
            if (!active) {
              return null;
            }
            const angle = -Math.PI / 2 + (stepIndex / layer.beatCount) * TAU + (layer.rotationOffset / 180) * Math.PI;
            return {
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius,
            };
          })
          .filter((value): value is { x: number; y: number } => value != null);
        const polyline = activePoints.map((point) => `${point.x},${point.y}`).join(' ');

        return (
          <g key={layer.id}>
            {!sharedDisplay || index === 0 ? (
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={`${layer.color}${index === 0 ? '3f' : '1f'}`}
                strokeWidth={index === 0 ? 1.6 : 1.15}
              />
            ) : null}
            {activePoints.length >= 2 ? (
              <>
                {activePoints.length >= 3 ? (
                  <polygon points={polyline} fill={`${layer.color}${sharedDisplay ? '20' : '18'}`} stroke="none" />
                ) : null}
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={layer.color}
                  strokeWidth={index === 0 ? 2 : sharedDisplay ? 1.7 : 1.45}
                  strokeLinejoin="round"
                />
              </>
            ) : null}
            {activePoints.map((point, pointIndex) => (
              <circle
                key={`${layer.id}-${pointIndex}`}
                cx={point.x}
                cy={point.y}
                r={index === 0 ? 3.2 : 2.6}
                fill={layer.color}
              />
            ))}
          </g>
        );
      })}

      <text
        x="16"
        y="28"
        fill="rgba(255,255,255,0.55)"
        fontSize="8.8"
        fontFamily='"SF Mono", "Fira Code", monospace'
        letterSpacing="1.6"
      >
        {sharedDisplay ? 'SHARED CYCLE' : 'NESTED STACK'}
      </text>
      <text
        x="16"
        y="146"
        fill="rgba(255,255,255,0.55)"
        fontSize="8.6"
        fontFamily='"SF Mono", "Fira Code", monospace'
        letterSpacing="1.4"
      >
        {study.layers.map((layer) => layer.beatCount).join(' · ')}
      </text>
    </svg>
  );
}

export default function PolyrhythmSidebar({
  isOpen,
  study,
  currentSurface,
  activePresetId,
  activeSavedSceneId = null,
  savedScenes = [],
  selectedLayerId,
  selectedStep,
  onClose,
  onSurfaceChange,
  onLoadPreset,
  onLoadSavedScene,
  onEditSavedScene,
  onResetStudy,
  onTogglePlay,
  onBpmChange,
  onToggleStudySound,
  onUpdateSoundSettings,
  onSetSoundFocus,
  onToggleInactiveSteps,
  onToggleStepLabels,
  onAddLayer,
  onSelectLayer,
  onSelectStep,
  onRemoveLayer,
  onRotateLayer,
  onInvertLayerSteps,
  onClearLayer,
  onUpdateLayer,
  onSetLayerBeatCount,
  onToggleLayerStep,
  onExportPng,
  onExportVideo,
  onExportMidi,
  onExportScene,
  isRecordingVideo,
  onHardRefresh,
  lockedFeatures = {},
  onLockedFeature,
}: PolyrhythmSidebarProps) {
  const isMobile = useIsMobile();
  const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/i.test(navigator.userAgent);
  const [activeTab, setActiveTab] = useState<PolyrhythmSidebarTab>('scenes');
  const [sceneTab, setSceneTab] = useState<PolyrhythmSidebarSceneTab>('standard');
  const [expandedSceneGroups, setExpandedSceneGroups] = useState<Record<PolyrhythmPresetGroup, boolean>>({
    'one-layer': false,
    'two-layer': false,
    advanced: false,
  });
  const [exportAspect, setExportAspect] =
    useState<'landscape' | 'square' | 'portrait' | 'story'>('square');
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(2);
  const [videoDuration, setVideoDuration] = useState<VideoExportDuration>(8);
  const [videoAspect, setVideoAspect] = useState<VideoExportAspect>('canvas');
  const [exportMidiMode, setExportMidiMode] = useState<PolyrhythmMidiExportMode>('per-layer');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const exportLocked = Boolean(lockedFeatures.export);
  const promptLockedExport = () => {
    onLockedFeature?.('export');
    setExportNotice('Export is a Pro feature.');
  };
  const promptLockedSound = () => {
    onLockedFeature?.('sound-editing');
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

  const selectedLayer =
    study.layers.find((layer) => layer.id === selectedLayerId) ?? study.layers[0] ?? null;
  const selectedLayerIndex = selectedLayer
    ? Math.max(0, study.layers.findIndex((layer) => layer.id === selectedLayer.id))
    : 0;
  const selectedStepActive =
    selectedLayer && selectedStep?.layerId === selectedLayer.id
      ? Boolean(selectedLayer.activeSteps[selectedStep.stepIndex])
      : null;
  const canAddLayer = study.layers.length < MAX_POLYRHYTHM_LAYERS;
  const soundFocus =
    !study.soundEnabled
      ? 'mute'
      : selectedLayer &&
          study.layers.every((layer) =>
            layer.id === selectedLayer.id ? layer.soundEnabled : !layer.soundEnabled,
          )
        ? 'layer'
        : 'stack';
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

  const tabMeta: Array<{ id: PolyrhythmSidebarTab; label: string; color: string }> = isMobile
    ? [
        { id: 'scenes', label: 'Scenes', color: '#7FD7FF' },
        { id: 'export', label: 'Export', color: '#FFAA00' },
        { id: 'account', label: 'Account', color: '#C9D4E5' },
      ]
    : [
        { id: 'scenes', label: 'Scenes', color: '#72F1B8' },
        { id: 'layers', label: 'Layers', color: selectedLayer?.color ?? '#7FD7FF' },
        { id: 'sound', label: 'Sound', color: '#88CCFF' },
        { id: 'export', label: 'Export', color: '#FFAA00' },
        { id: 'account', label: 'Account', color: '#88CCFF' },
      ];
  const groupedPresets = (['one-layer', 'two-layer', 'advanced'] as const).map((group) => ({
    group,
    presets: POLYRHYTHM_PRESETS.filter((preset) => preset.group === group && !preset.pro),
  }));
  const proPresets = POLYRHYTHM_PRESETS.filter((preset) => preset.pro);

  useEffect(() => {
    if (isMobile && isOpen) {
      setActiveTab('scenes');
    }
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (!exportNotice) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setExportNotice(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [exportNotice]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }
    if (activeTab === 'layers' || activeTab === 'sound') {
      setActiveTab('scenes');
    }
  }, [activeTab, isMobile]);

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
              radial-gradient(circle at 84% -8%, ${(selectedLayer?.color ?? '#72F1B8')}2f, transparent 42%),
              radial-gradient(circle at 12% 0%, rgba(255,255,255,0.08), transparent 36%),
              linear-gradient(145deg, rgba(17,19,27,0.94), rgba(8,10,16,0.9))
            `
            : `
              radial-gradient(circle at 84% -8%, ${(selectedLayer?.color ?? '#72F1B8')}2b, transparent 42%),
              radial-gradient(circle at 12% 0%, rgba(255,255,255,0.08), transparent 36%),
              linear-gradient(145deg, rgba(17,19,27,0.97), rgba(8,10,16,0.92))
            `,
          borderColor: isMobile ? `${selectedLayer?.color ?? '#72F1B8'}24` : `${selectedLayer?.color ?? '#72F1B8'}28`,
          borderLeft: isMobile ? 'none' : undefined,
          boxShadow: isMobile
            ? `0 -28px 90px rgba(0,0,0,0.56), 0 0 54px ${(selectedLayer?.color ?? '#72F1B8')}14, inset 0 1px 0 rgba(255,255,255,0.1)`
            : `0 28px 90px rgba(0,0,0,0.5), 0 0 48px ${(selectedLayer?.color ?? '#72F1B8')}12, inset 0 1px 0 rgba(255,255,255,0.08)`,
          transform: isOpen ? 'translate(0, 0)' : isMobile ? 'translateY(calc(100% + 1rem))' : 'translateX(calc(100% + 1.5rem))',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease',
          backdropFilter: 'blur(22px)',
        }}
      >
        {isMobile ? (
          <div className="flex justify-center pt-2">
            <div className="h-1.5 w-12 rounded-full border border-white/10 bg-white/16 shadow-[0_0_18px_rgba(114,241,184,0.16)]" />
          </div>
        ) : null}
        <div
          className={`flex items-center justify-between border-b border-white/10 ${isMobile ? 'px-4 py-3' : 'px-5 py-4'}`}
          style={{
            background: isMobile
              ? undefined
              : `linear-gradient(90deg, ${(selectedLayer?.color ?? '#72F1B8')}10, rgba(255,255,255,0.025), transparent)`,
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: selectedLayer?.color ?? '#72F1B8',
                  boxShadow: `0 0 18px ${(selectedLayer?.color ?? '#72F1B8')}66`,
                }}
              />
              <div className="text-sm font-light uppercase tracking-[0.24em] text-white/78">
                {isMobile ? 'Study Menu' : 'Study'}
              </div>
            </div>
            {isMobile ? (
              <div className="mt-1 text-[12px] leading-relaxed text-white/42">
                Scenes, saved studies, and account tools for the rhythm study mode.
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
            aria-label="Collapse Study menu"
            title="Collapse menu"
          >
            <X size={18} />
          </button>
        </div>

        {isMobile ? (
          <div className="border-b border-white/8 px-4 py-3">
            <div data-guide="study-mobile-mode-switcher" className="rounded-[1.45rem] border px-3.5 py-3.5" style={mobileModeCardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-mono uppercase tracking-[0.24em]" style={mobilePrimaryTitleStyle}>
                    Mode
                  </div>
                  <div className="mt-1 text-[12px] leading-relaxed text-white/42">
                    Switch instruments without leaving the app.
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
                      onClick={() => setActiveTab(tab.id)}
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.15em]"
                      style={{
                        background: active
                          ? `linear-gradient(180deg, ${tab.color}22, ${tab.color}10)`
                          : 'rgba(255,255,255,0.03)',
                        borderColor: active ? `${tab.color}3d` : 'rgba(255,255,255,0.08)',
                        color: active ? tab.color : 'rgba(255,255,255,0.58)',
                        boxShadow: active ? `0 0 0 1px ${tab.color}26 inset, 0 10px 24px rgba(0,0,0,0.24)` : 'none',
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
                <div className="text-[11px] text-white/52">
                  Start with one rhythm, then move into shared-cycle studies.
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

              {sceneTab === 'standard' ? groupedPresets.map(({ group, presets }) => {
                const expanded = expandedSceneGroups[group];
                const visiblePresets = expanded ? presets : presets.slice(0, group === 'advanced' ? 1 : 2);
                const hiddenCount = Math.max(0, presets.length - visiblePresets.length);

                return (
                <div key={group} className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={mobileSubTitleStyle}>
                          {POLYRHYTHM_PRESET_GROUP_META[group].label}
                        </div>
                        <div className="mt-1 text-[11px] leading-relaxed text-white/50">
                          {group === 'one-layer'
                            ? 'Start with one editable rhythm layer.'
                            : group === 'two-layer'
                              ? 'Hear two layers lock, drift, and resolve.'
                              : 'More layers and denser relationships.'}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/38">
                        {presets.length} Scenes
                      </div>
                    </div>
                  </div>
                  {visiblePresets.map((preset) => {
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
                          <PolyrhythmSceneThumbnail preset={preset} />
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-xs font-mono uppercase tracking-[0.16em]"
                              style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,0.84)' }}
                            >
                              {preset.name}
                            </div>
                            <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-white/34">
                              {preset.study.displayStyle === 'shared' ? 'Shared' : 'Nested'} · {preset.study.layers.map((layer) => layer.beatCount).join(' · ')}
                            </div>
                            <div className="mt-2 text-[11px] leading-relaxed text-white/46">
                              {preset.description}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onLoadPreset(preset.id)}
                            className="shrink-0 rounded-xl border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em]"
                            style={{
                              background: active ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.04)',
                              borderColor: active ? 'rgba(114,241,184,0.22)' : 'rgba(255,255,255,0.08)',
                              color: active ? '#72F1B8' : 'rgba(255,255,255,0.68)',
                            }}
                          >
                            {active ? 'Loaded' : 'Load'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSceneGroups((current) => ({
                          ...current,
                          [group]: true,
                        }))
                      }
                      className="w-full rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] transition active:scale-[0.99]"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.58)',
                      }}
                    >
                      Load {hiddenCount} More
                    </button>
                  ) : expanded && presets.length > (group === 'advanced' ? 1 : 2) ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSceneGroups((current) => ({
                          ...current,
                          [group]: false,
                        }))
                      }
                      className="w-full rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em] transition active:scale-[0.99]"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: 'rgba(255,255,255,0.07)',
                        color: 'rgba(255,255,255,0.44)',
                      }}
                    >
                      Show Less
                    </button>
                  ) : null}
                </div>
                );
              }) : null}

              {sceneTab === 'saved' ? (
                savedScenes.length > 0 ? (
                  <div className="space-y-3">
                    {savedScenes.map((scene) => {
                      const active = scene.id === activeSavedSceneId;
                      const presetForThumbnail: PolyrhythmStudyPreset = {
                        id: scene.id,
                        name: scene.name,
                        description: scene.description,
                        group: 'two-layer',
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
                            <PolyrhythmSceneThumbnail preset={presetForThumbnail} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-mono uppercase tracking-[0.16em]" style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,0.84)' }}>
                                {scene.name}
                              </div>
                              <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-white/34">
                                {scene.study.layers.map((layer) => layer.beatCount).join(' · ')}
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
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-4 text-center">
                    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/56">No Saved Scenes Yet</div>
                    <div className="mt-2 text-[11px] text-white/42">Saved studies will appear here.</div>
                  </div>
                )
              ) : null}

              {sceneTab === 'pro' ? (
                <div className="space-y-3">
                  {proPresets.map((preset) => {
                    const active = preset.id === activePresetId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (lockedFeatures.proScenes) {
                            onLockedFeature?.('pro-scenes');
                            return;
                          }
                          onLoadPreset(preset.id);
                        }}
                        className="relative w-full rounded-xl border p-3 text-left"
                        style={{
                          background: active
                            ? 'linear-gradient(180deg, rgba(255,170,0,0.1), rgba(255,255,255,0.03))'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.028))',
                          borderColor: active ? 'rgba(255,170,0,0.24)' : 'rgba(255,255,255,0.1)',
                          filter: lockedFeatures.proScenes ? 'grayscale(0.45)' : undefined,
                        }}
                      >
                        {lockedFeatures.proScenes ? (
                          <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border border-white/12 bg-black/45 px-2 py-1 text-[8px] font-mono uppercase tracking-[0.12em] text-white/70">
                            <Lock size={8} strokeWidth={2.4} /> Pro
                          </span>
                        ) : null}
                        <div className="flex items-center gap-3">
                          <PolyrhythmSceneThumbnail preset={preset} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono uppercase tracking-[0.16em]" style={{ color: active ? '#FFAA00' : 'rgba(255,255,255,0.84)' }}>
                              {preset.name}
                            </div>
                            <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.15em] text-white/34">
                              {preset.study.layers.map((layer) => layer.beatCount).join(' · ')}
                            </div>
                            <div className="mt-2 text-[11px] leading-relaxed text-white/46">
                              {preset.description}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-xl border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em]" style={{ borderColor: active ? 'rgba(255,170,0,0.24)' : 'rgba(255,255,255,0.08)', color: active ? '#FFAA00' : 'rgba(255,255,255,0.68)' }}>
                            {active ? 'Loaded' : lockedFeatures.proScenes ? 'Pro' : 'Load'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === 'layers' ? (
            isMobile ? (
              <section className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                        Stack
                      </div>
                      <div className="mt-1 text-[11px] text-white/52">
                        Select a layer, adjust its size, then shape its mask.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onAddLayer}
                        disabled={!canAddLayer}
                        className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em] disabled:opacity-40"
                        style={{
                          background: 'rgba(127,215,255,0.12)',
                          borderColor: 'rgba(127,215,255,0.22)',
                          color: '#7FD7FF',
                        }}
                        title={canAddLayer ? 'Add layer' : `Layer limit (${MAX_POLYRHYTHM_LAYERS}) reached`}
                      >
                        Add Layer
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedLayer && study.layers.length > 1 && onRemoveLayer(selectedLayer.id)}
                        disabled={!selectedLayer || study.layers.length <= 1}
                        className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em] disabled:opacity-40"
                        style={{
                          background: 'rgba(255,51,102,0.12)',
                          borderColor: 'rgba(255,51,102,0.22)',
                          color: '#FF667F',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {study.layers.map((layer, index) => {
                      const active = layer.id === selectedLayer?.id;
                      return (
                        <button
                          key={layer.id}
                          type="button"
                          onClick={() => {
                            onSelectLayer(layer.id);
                            onSelectStep(null);
                          }}
                          className="rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em]"
                          style={{
                            background: active ? `${layer.color}14` : 'rgba(255,255,255,0.03)',
                            borderColor: active ? `${layer.color}40` : 'rgba(255,255,255,0.08)',
                            color: active ? layer.color : 'rgba(255,255,255,0.58)',
                          }}
                        >
                          L{index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedLayer ? (
                  <div
                    className="rounded-xl border p-3 space-y-3"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.038), rgba(255,255,255,0.022))',
                      borderColor: `${selectedLayer.color}33`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: selectedLayer.color }}>
                          Layer {selectedLayerIndex + 1}
                        </div>
                        <div className="mt-1 text-[11px] text-white/48">
                          {countActiveSteps(selectedLayer)} on · {selectedLayer.beatCount} steps
                        </div>
                      </div>
                      <div className="rounded-full border px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em]" style={{ borderColor: `${selectedLayer.color}33`, color: selectedLayer.color }}>
                        {Math.round(selectedLayer.rotationOffset)}°
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">Steps</div>
                      <div className="grid grid-cols-[40px,1fr,40px] gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => onSetLayerBeatCount(selectedLayer.id, selectedLayer.beatCount - 1)}
                          className="h-10 rounded-xl border border-white/8 bg-white/[0.04] text-white/68"
                        >
                          −
                        </button>
                        <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-center text-[14px] font-light text-white">
                          {selectedLayer.beatCount}
                        </div>
                        <button
                          type="button"
                          onClick={() => onSetLayerBeatCount(selectedLayer.id, selectedLayer.beatCount + 1)}
                          className="h-10 rounded-xl border border-white/8 bg-white/[0.04] text-white/68"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                        <span>Radius</span>
                        <span>{selectedLayer.radius}</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="320"
                        step="2"
                        value={selectedLayer.radius}
                        onChange={(event) =>
                          onUpdateLayer(selectedLayer.id, {
                            radius: parseInt(event.target.value, 10) || 70,
                          })
                        }
                        className="w-full"
                        style={{ accentColor: selectedLayer.color }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">Color</div>
                      <div className="grid grid-cols-6 gap-2">
                        {POLYRHYTHM_LAYER_COLORS.slice(0, 12).map((color) => {
                          const active = selectedLayer.color === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                if (lockedFeatures.colorEditing) {
                                  onLockedFeature?.('color-editing');
                                  return;
                                }
                                onUpdateLayer(selectedLayer.id, { color });
                              }}
                              className="relative h-9 overflow-hidden rounded-lg border transition-transform active:scale-[0.97]"
                              style={{
                                background: lockedFeatures.colorEditing ? 'rgba(255,255,255,0.035)' : `${color}18`,
                                borderColor: lockedFeatures.colorEditing ? 'rgba(255,255,255,0.1)' : active ? `${color}aa` : `${color}44`,
                                boxShadow: lockedFeatures.colorEditing ? 'none' : active ? `0 0 0 1px ${color}aa inset` : 'none',
                                filter: lockedFeatures.colorEditing ? 'grayscale(0.6)' : undefined,
                              }}
                            >
                              {lockedFeatures.colorEditing ? (
                                <span className="pointer-events-none absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/14 bg-black/40 text-white/68">
                                  <Lock size={8} strokeWidth={2.4} />
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => onRotateLayer(selectedLayer.id, -1)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/68"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRotateLayer(selectedLayer.id, 1)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/68"
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onInvertLayerSteps(selectedLayer.id)}
                        className="rounded-xl border px-2 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          background: 'rgba(255,170,0,0.12)',
                          borderColor: 'rgba(255,170,0,0.2)',
                          color: '#FFAA00',
                        }}
                      >
                        Invert
                      </button>
                      <button
                        type="button"
                        onClick={() => onClearLayer(selectedLayer.id)}
                        className="rounded-xl border px-2 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          background: 'rgba(255,51,102,0.12)',
                          borderColor: 'rgba(255,51,102,0.2)',
                          color: '#FF667F',
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    {selectedStep?.layerId === selectedLayer.id ? (
                      <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                          Step {selectedStep.stepIndex + 1}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedStepActive) {
                                onToggleLayerStep(selectedLayer.id, selectedStep.stepIndex);
                              }
                            }}
                            className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                            style={{
                              background: !selectedStepActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                              borderColor: !selectedStepActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
                              color: !selectedStepActive ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.56)',
                            }}
                          >
                            Off
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedStepActive) {
                                onToggleLayerStep(selectedLayer.id, selectedStep.stepIndex);
                              }
                            }}
                            className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                            style={{
                              background: selectedStepActive ? `${selectedLayer.color}16` : 'rgba(255,255,255,0.03)',
                              borderColor: selectedStepActive ? `${selectedLayer.color}38` : 'rgba(255,255,255,0.08)',
                              color: selectedStepActive ? selectedLayer.color : 'rgba(255,255,255,0.56)',
                            }}
                          >
                            On
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-white/42">Tap a layer step on the canvas to edit it here.</div>
                    )}
                  </div>
                ) : null}

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                      Tempo
                    </div>
                    <div className="text-[12px] font-mono uppercase tracking-[0.14em] text-white/54">
                      {study.bpm} BPM
                    </div>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="180"
                    step="1"
                    value={study.bpm}
                    onChange={(event) => onBpmChange(parseInt(event.target.value, 10) || 40)}
                    className="mt-3 w-full"
                    style={{ accentColor: selectedLayer?.color ?? '#7FD7FF' }}
                  />
                </div>
              </section>
            ) : (
              <section className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                        Active Layers
                      </div>
                      <div className="mt-1 text-[11px] text-white/52">
                        Adjust multiple layers quickly, then select one to shape on the canvas.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onAddLayer}
                      disabled={!canAddLayer}
                      className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em] disabled:opacity-40"
                      style={{
                        background: 'rgba(114,241,184,0.12)',
                        borderColor: 'rgba(114,241,184,0.24)',
                        color: '#72F1B8',
                      }}
                      title={canAddLayer ? 'Add layer' : `Layer limit (${MAX_POLYRHYTHM_LAYERS}) reached`}
                    >
                      Add Layer
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {study.layers.map((layer, index) => {
                    const active = layer.id === selectedLayer?.id;
                    return (
                      <div
                        key={layer.id}
                        className="rounded-xl border p-3 transition-colors"
                        style={{
                          background: active
                            ? `linear-gradient(180deg, ${layer.color}12, rgba(255,255,255,0.025))`
                            : 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.024))',
                          borderColor: active ? `${layer.color}4d` : 'rgba(255,255,255,0.09)',
                          boxShadow: active ? `0 0 0 1px ${layer.color}1f inset` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLayer(layer.id);
                              onSelectStep(null);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: layer.color, boxShadow: `0 0 12px ${layer.color}88` }}
                              />
                              <span
                                className="text-[10px] font-mono uppercase tracking-[0.16em]"
                                style={{ color: active ? layer.color : 'rgba(255,255,255,0.82)' }}
                              >
                                Layer {index + 1}
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-white/48">
                              {countActiveSteps(layer)} on · {layer.beatCount} steps
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (study.layers.length > 1) {
                                onRemoveLayer(layer.id);
                              }
                            }}
                            disabled={study.layers.length <= 1}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-white/48 disabled:opacity-35"
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              borderColor: active ? `${layer.color}28` : 'rgba(255,255,255,0.08)',
                            }}
                            aria-label={`Remove layer ${index + 1}`}
                            title={`Remove layer ${index + 1}`}
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-[34px,1fr,34px] gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => onSetLayerBeatCount(layer.id, layer.beatCount - 1)}
                            className="h-9 rounded-lg border border-white/8 bg-white/[0.04] text-white/68"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLayer(layer.id);
                              onSelectStep(null);
                            }}
                            className="rounded-lg border px-3 py-2 text-center text-[13px] font-light"
                            style={{
                              background: active ? `${layer.color}12` : 'rgba(255,255,255,0.04)',
                              borderColor: active ? `${layer.color}38` : 'rgba(255,255,255,0.08)',
                              color: active ? layer.color : 'rgba(255,255,255,0.92)',
                            }}
                          >
                            {layer.beatCount}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSetLayerBeatCount(layer.id, layer.beatCount + 1)}
                            className="h-9 rounded-lg border border-white/8 bg-white/[0.04] text-white/68"
                          >
                            +
                          </button>
                        </div>

                        <input
                          type="range"
                          min="3"
                          max="64"
                          step="1"
                          value={layer.beatCount}
                          onChange={(event) =>
                            onSetLayerBeatCount(layer.id, parseInt(event.target.value, 10) || 3)
                          }
                          onMouseDown={() => {
                            onSelectLayer(layer.id);
                            onSelectStep(null);
                          }}
                          className="mt-3 w-full"
                          style={{ accentColor: layer.color }}
                          aria-label={`Layer ${index + 1} steps`}
                        />
                      </div>
                    );
                  })}
                </div>

                {selectedLayer ? (
                  <div
                    className="rounded-xl border p-3 space-y-3"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.038), rgba(255,255,255,0.022))',
                      borderColor: `${selectedLayer.color}33`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: selectedLayer.color }}>
                          Selected Layer
                        </div>
                        <div className="mt-1 text-[11px] text-white/48">
                          Layer {selectedLayerIndex + 1} stays highlighted on the canvas while you adjust it.
                        </div>
                      </div>
                      <div
                        className="rounded-full border px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.14em]"
                        style={{ borderColor: `${selectedLayer.color}33`, color: selectedLayer.color }}
                      >
                        {countActiveSteps(selectedLayer)} On
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onRotateLayer(selectedLayer.id, -1)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] text-[10px] font-mono uppercase tracking-[0.14em] text-white/68"
                      >
                        <RotateCcw size={14} />
                        Earlier
                      </button>
                      <button
                        type="button"
                        onClick={() => onRotateLayer(selectedLayer.id, 1)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] text-[10px] font-mono uppercase tracking-[0.14em] text-white/68"
                      >
                        <RotateCw size={14} />
                        Later
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.16em] text-white/42">
                        <span>Radius</span>
                        <span>{selectedLayer.radius}</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="320"
                        step="2"
                        value={selectedLayer.radius}
                        onChange={(event) =>
                          onUpdateLayer(selectedLayer.id, {
                            radius: parseInt(event.target.value, 10) || 70,
                          })
                        }
                        className="w-full"
                        style={{ accentColor: selectedLayer.color }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onInvertLayerSteps(selectedLayer.id)}
                        className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          background: 'rgba(255,170,0,0.12)',
                          borderColor: 'rgba(255,170,0,0.2)',
                          color: '#FFAA00',
                        }}
                      >
                        Invert
                      </button>
                      <button
                        type="button"
                        onClick={() => onClearLayer(selectedLayer.id)}
                        className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          background: 'rgba(255,51,102,0.12)',
                          borderColor: 'rgba(255,51,102,0.2)',
                          color: '#FF667F',
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            )
          ) : null}

          {activeTab === 'sound' ? (
            <section
              className="space-y-3"
              onClickCapture={(event) => {
                if (!soundLocked) return;
                event.preventDefault();
                event.stopPropagation();
                promptLockedSound();
              }}
              style={lockedSoundStyle}
            >
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                        Sound
                      </div>
                      {soundLocked ? <Lock size={12} className="text-white/45" /> : null}
                    </div>
                    <div className="mt-1 text-[11px] text-white/52">
                      Focus one layer or hear the full stack.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleStudySound}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em]"
                    style={{
                      background: study.soundEnabled ? 'rgba(127,215,255,0.12)' : 'rgba(255,255,255,0.04)',
                      borderColor: study.soundEnabled ? 'rgba(127,215,255,0.22)' : 'rgba(255,255,255,0.08)',
                      color: study.soundEnabled ? '#7FD7FF' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    {study.soundEnabled ? 'Study On' : 'Study Off'}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onSetSoundFocus('layer')}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: soundFocus === 'layer' ? 'rgba(127,215,255,0.14)' : 'rgba(255,255,255,0.03)',
                      borderColor: soundFocus === 'layer' ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                      color: soundFocus === 'layer' ? '#7FD7FF' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetSoundFocus('stack')}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: soundFocus === 'stack' ? 'rgba(127,215,255,0.14)' : 'rgba(255,255,255,0.03)',
                      borderColor: soundFocus === 'stack' ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                      color: soundFocus === 'stack' ? '#7FD7FF' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetSoundFocus('mute')}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: soundFocus === 'mute' ? 'rgba(127,215,255,0.14)' : 'rgba(255,255,255,0.03)',
                      borderColor: soundFocus === 'mute' ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                      color: soundFocus === 'mute' ? '#7FD7FF' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    Mute
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Sound
                  </div>
                  <div className="mt-1 text-[11px] text-white/52">
                    Keep it original or map the stack into a key.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSoundSettings({ pitchMode: 'free' })}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: study.soundSettings.pitchMode === 'free' ? 'rgba(114,241,184,0.16)' : 'rgba(255,255,255,0.03)',
                      borderColor: study.soundSettings.pitchMode === 'free' ? 'rgba(114,241,184,0.26)' : 'rgba(255,255,255,0.08)',
                      color: study.soundSettings.pitchMode === 'free' ? '#72F1B8' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSoundSettings({ pitchMode: 'keyed' })}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: study.soundSettings.pitchMode === 'keyed' ? 'rgba(114,241,184,0.16)' : 'rgba(255,255,255,0.03)',
                      borderColor: study.soundSettings.pitchMode === 'keyed' ? 'rgba(114,241,184,0.26)' : 'rgba(255,255,255,0.08)',
                      color: study.soundSettings.pitchMode === 'keyed' ? '#72F1B8' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    In Key
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {POLYRHYTHM_SOUND_PALETTES.map((palette) => {
                    const active = study.soundSettings.palette === palette.id;
                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => onUpdateSoundSettings({ palette: palette.id })}
                        className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{
                          background: active ? 'rgba(136,204,255,0.14)' : 'rgba(255,255,255,0.03)',
                          borderColor: active ? 'rgba(136,204,255,0.24)' : 'rgba(255,255,255,0.08)',
                          color: active ? '#88CCFF' : 'rgba(255,255,255,0.58)',
                        }}
                      >
                        {palette.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSoundSettings({ register: 'tight' })}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: study.soundSettings.register === 'tight' ? 'rgba(255,170,0,0.14)' : 'rgba(255,255,255,0.03)',
                      borderColor: study.soundSettings.register === 'tight' ? 'rgba(255,170,0,0.24)' : 'rgba(255,255,255,0.08)',
                      color: study.soundSettings.register === 'tight' ? '#FFAA00' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    Tight
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSoundSettings({ register: 'wide' })}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: study.soundSettings.register === 'wide' ? 'rgba(255,170,0,0.14)' : 'rgba(255,255,255,0.03)',
                      borderColor: study.soundSettings.register === 'wide' ? 'rgba(255,170,0,0.24)' : 'rgba(255,255,255,0.08)',
                      color: study.soundSettings.register === 'wide' ? '#FFAA00' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    Wide
                  </button>
                </div>

                {study.soundSettings.pitchMode === 'keyed' ? (
                  <div className="grid grid-cols-[76px,1fr] gap-2">
                    <label className="space-y-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/42">
                      Key
                      <select
                        value={study.soundSettings.rootNote}
                        onChange={(event) =>
                          onUpdateSoundSettings({
                            rootNote: event.target.value as PolyrhythmSoundSettings['rootNote'],
                          })
                        }
                        className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
                      >
                        {NOTE_NAMES.map((note) => (
                          <option key={note} value={note} style={{ background: '#181820' }}>
                            {note}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-[9px] font-mono uppercase tracking-[0.14em] text-white/42">
                      Note Family
                      <select
                        value={study.soundSettings.scaleName}
                        onChange={(event) =>
                          onUpdateSoundSettings({
                            scaleName: event.target.value as PolyrhythmSoundSettings['scaleName'],
                          })
                        }
                        className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white outline-none"
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onToggleInactiveSteps}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: study.showInactiveSteps ? 'rgba(127,215,255,0.14)' : 'rgba(255,255,255,0.03)',
                      borderColor: study.showInactiveSteps ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                      color: study.showInactiveSteps ? '#7FD7FF' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    Faint
                  </button>
                  <button
                    type="button"
                    onClick={onToggleStepLabels}
                    className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: study.showStepLabels ? 'rgba(255,170,0,0.14)' : 'rgba(255,255,255,0.03)',
                      borderColor: study.showStepLabels ? 'rgba(255,170,0,0.24)' : 'rgba(255,255,255,0.08)',
                      color: study.showStepLabels ? '#FFAA00' : 'rgba(255,255,255,0.58)',
                    }}
                  >
                    Labels
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === 'export' ? (
            <section className="space-y-3">
              <div className="space-y-1">
                <div className="text-[12px] font-mono uppercase tracking-[0.22em]" style={mobilePrimaryTitleStyle}>
                  Export
                </div>
                <p className="text-[11px] leading-relaxed text-white/52">
                  Save an image, export MIDI, or move the editable Study scene.
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
                  <InfoTip text="Exports the Study canvas as a short MP4 when supported. If the browser records WebM first, the app converts it before download." />
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
                  <InfoTip text="MIDI exports the rhythm as note events for a DAW. It does not export the app's synth sound." />
                </div>
                <div className="text-[11px] leading-relaxed text-white/52">
                  Send the Study rhythm to a DAW as notes.
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['per-layer', 'Per Layer'],
                    ['merged', 'Merged'],
                    ['selected-layer', selectedLayer ? selectedLayerIndex >= 0 ? `Layer ${selectedLayerIndex + 1}` : 'Selected' : 'Selected'],
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
                <div className="text-[11px] leading-relaxed text-white/46">
                  {exportMidiMode === 'per-layer'
                    ? 'Each layer gets its own MIDI track over one shared cycle.'
                    : exportMidiMode === 'merged'
                      ? 'All layers are merged into one MIDI track over one shared cycle.'
                      : 'Only the current selected layer is exported.'}
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
                      exportMidiMode === 'per-layer'
                        ? 'Study per-layer MIDI exported.'
                        : exportMidiMode === 'merged'
                          ? 'Study merged MIDI exported.'
                          : 'Study selected-layer MIDI exported.',
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
                  {exportLocked ? <span className="inline-flex items-center justify-center gap-2"><Lock size={12} /> Pro Export</span> : 'Export MIDI'}
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
                    setExportNotice('Study scene exported.');
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
                      Reload the app and come back to Study instead of Orbit.
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
        </div>
      </div>
    </>
  );
}
