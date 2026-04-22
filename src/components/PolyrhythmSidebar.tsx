import { useEffect, useState } from 'react';
import {
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import AccountPanel from './AccountPanel';
import { useIsMobile } from '../hooks/use-mobile';
import { NOTE_NAMES, SCALE_PRESETS, getFriendlyScaleLabel } from '../lib/audioEngine';
import type { PolyrhythmMidiExportMode } from '../lib/polyrhythmMidi';
import {
  POLYRHYTHM_LAYER_COLORS,
  POLYRHYTHM_PRESET_GROUP_META,
  POLYRHYTHM_PRESETS,
  countActiveSteps,
  type PolyrhythmLayer,
  type PolyrhythmSoundSettings,
  type PolyrhythmStudy,
  type PolyrhythmStudyPreset,
} from '../lib/polyrhythmStudy';

interface PolyrhythmStepSelection {
  layerId: string;
  stepIndex: number;
}

interface PolyrhythmSidebarProps {
  isOpen: boolean;
  study: PolyrhythmStudy;
  currentSurface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow';
  activePresetId: string | null;
  selectedLayerId: string | null;
  selectedStep: PolyrhythmStepSelection | null;
  onClose: () => void;
  onSurfaceChange: (surface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow') => void;
  onLoadPreset: (presetId: string) => void;
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
  onExportMidi: (mode: PolyrhythmMidiExportMode) => void;
  onExportScene: () => void;
  onSaveScene: () => void;
  onHardRefresh: () => void;
}

type PolyrhythmSidebarTab = 'scenes' | 'layers' | 'sound' | 'export' | 'account';

const POLYRHYTHM_SOUND_PALETTES: Array<{
  id: PolyrhythmSoundSettings['palette'];
  label: string;
}> = [
  { id: 'study-pulse', label: 'Study Pulse' },
  { id: 'glass-tick', label: 'Glass Tick' },
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
  selectedLayerId,
  selectedStep,
  onClose,
  onSurfaceChange,
  onLoadPreset,
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
  onExportMidi,
  onExportScene,
  onSaveScene,
  onHardRefresh,
}: PolyrhythmSidebarProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<PolyrhythmSidebarTab>(isMobile ? 'account' : 'scenes');
  const [exportAspect, setExportAspect] =
    useState<'landscape' | 'square' | 'portrait' | 'story'>('square');
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(2);
  const [exportMidiMode, setExportMidiMode] = useState<PolyrhythmMidiExportMode>('per-layer');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const selectedLayer =
    study.layers.find((layer) => layer.id === selectedLayerId) ?? study.layers[0] ?? null;
  const selectedLayerIndex = selectedLayer
    ? Math.max(0, study.layers.findIndex((layer) => layer.id === selectedLayer.id))
    : 0;
  const selectedStepActive =
    selectedLayer && selectedStep?.layerId === selectedLayer.id
      ? Boolean(selectedLayer.activeSteps[selectedStep.stepIndex])
      : null;
  const soundFocus =
    !study.soundEnabled
      ? 'mute'
      : selectedLayer &&
          study.layers.every((layer) =>
            layer.id === selectedLayer.id ? layer.soundEnabled : !layer.soundEnabled,
          )
        ? 'layer'
        : 'stack';

  const tabMeta: Array<{ id: PolyrhythmSidebarTab; label: string; color: string }> = isMobile
    ? [
        { id: 'account', label: 'Account', color: '#88CCFF' },
        { id: 'scenes', label: 'Scenes', color: '#72F1B8' },
        { id: 'export', label: 'Export', color: '#FFAA00' },
      ]
    : [
        { id: 'scenes', label: 'Scenes', color: '#72F1B8' },
        { id: 'layers', label: 'Layers', color: selectedLayer?.color ?? '#7FD7FF' },
        { id: 'sound', label: 'Audio', color: '#88CCFF' },
        { id: 'export', label: 'Export', color: '#FFAA00' },
        { id: 'account', label: 'Account', color: '#88CCFF' },
      ];
  const groupedPresets = (['one-layer', 'two-layer', 'advanced'] as const).map((group) => ({
    group,
    presets: POLYRHYTHM_PRESETS.filter((preset) => preset.group === group),
  }));

  useEffect(() => {
    if (isMobile) {
      setActiveTab('account');
    }
  }, [isMobile]);

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
      {isOpen ? <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm" onClick={onClose} /> : null}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden ${
          isMobile ? 'inset-0 w-full' : 'right-4 top-4 bottom-4 w-[28rem] rounded-[2rem] border'
        }`}
        style={{
          background: isMobile
            ? 'linear-gradient(135deg, rgba(17,17,22,0.97), rgba(28,28,34,0.96))'
            : `
              radial-gradient(circle at 84% -8%, ${(selectedLayer?.color ?? '#72F1B8')}2b, transparent 42%),
              radial-gradient(circle at 12% 0%, rgba(255,255,255,0.08), transparent 36%),
              linear-gradient(145deg, rgba(17,19,27,0.97), rgba(8,10,16,0.92))
            `,
          borderColor: isMobile ? undefined : `${selectedLayer?.color ?? '#72F1B8'}28`,
          borderLeft: isMobile ? 'none' : undefined,
          boxShadow: isMobile
            ? undefined
            : `0 28px 90px rgba(0,0,0,0.5), 0 0 48px ${(selectedLayer?.color ?? '#72F1B8')}12, inset 0 1px 0 rgba(255,255,255,0.08)`,
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
            <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.035] px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/36">
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
                      className="flex-1 rounded-full border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{
                        background: active ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.03)',
                        borderColor: active ? 'rgba(114,241,184,0.22)' : 'rgba(255,255,255,0.08)',
                        color: active ? '#72F1B8' : 'rgba(255,255,255,0.56)',
                        boxShadow: active ? '0 0 0 1px rgba(114,241,184,0.12) inset, 0 10px 24px rgba(0,0,0,0.18)' : 'none',
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
            <div className="-mx-1 rounded-[1.35rem] border border-white/8 bg-white/[0.028] p-1.5">
              <div className="flex min-w-max gap-1 overflow-x-auto">
                {tabMeta.map((tab) => {
                  const active = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="shrink-0 rounded-xl px-3 py-2.5 text-xs font-mono font-light transition-all duration-200"
                      style={{
                        color: active ? tab.color : 'rgba(255,255,255,0.4)',
                        border: active ? `1px solid ${tab.color}32` : '1px solid transparent',
                        background: active ? `${tab.color}14` : 'transparent',
                        boxShadow: active ? `0 0 0 1px ${tab.color}1c inset` : 'none',
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
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Scenes
                  </div>
                  <div className="mt-1 text-[11px] text-white/52">
                    Start with one rhythm, then move into shared-cycle studies.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onResetStudy}
                  className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.68)',
                  }}
                >
                  Reset
                </button>
              </div>

              {groupedPresets.map(({ group, presets }) => (
                <div key={group} className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5">
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/56">
                      {POLYRHYTHM_PRESET_GROUP_META[group].label}
                    </div>
                    <div className="mt-1 text-[11px] text-white/42">
                      {POLYRHYTHM_PRESET_GROUP_META[group].description}
                    </div>
                  </div>
                  {presets.map((preset) => {
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
                            <button
                              type="button"
                              onClick={() => onLoadPreset(preset.id)}
                              className="mt-3 rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em]"
                              style={{
                                background: active ? 'rgba(114,241,184,0.12)' : 'rgba(255,255,255,0.04)',
                                borderColor: active ? 'rgba(114,241,184,0.22)' : 'rgba(255,255,255,0.08)',
                                color: active ? '#72F1B8' : 'rgba(255,255,255,0.68)',
                              }}
                            >
                              {active ? 'Loaded' : 'Load Scene'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
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
                        className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em]"
                        style={{
                          background: 'rgba(127,215,255,0.12)',
                          borderColor: 'rgba(127,215,255,0.22)',
                          color: '#7FD7FF',
                        }}
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
                              onClick={() => onUpdateLayer(selectedLayer.id, { color })}
                              className="h-9 rounded-lg border transition-transform active:scale-[0.97]"
                              style={{
                                background: `${color}18`,
                                borderColor: active ? `${color}aa` : `${color}44`,
                                boxShadow: active ? `0 0 0 1px ${color}aa inset` : 'none',
                              }}
                            />
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
                      className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.15em]"
                      style={{
                        background: 'rgba(114,241,184,0.12)',
                        borderColor: 'rgba(114,241,184,0.24)',
                        color: '#72F1B8',
                      }}
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
            <section className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                      Audio
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
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                    PNG Export
                  </div>
                  <div className="mt-1 text-[11px] text-white/52">
                    Export the current study canvas as an image.
                  </div>
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
                  className="w-full rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.15em]"
                  style={{
                    background: 'rgba(136,204,255,0.1)',
                    borderColor: 'rgba(136,204,255,0.22)',
                    color: '#88CCFF',
                  }}
                >
                  Export PNG
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                    MIDI Export
                  </div>
                  <div className="mt-1 text-[11px] text-white/52">
                    Export one shared study cycle as MIDI.
                  </div>
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
                      onClick={() => setExportMidiMode(mode)}
                      className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{
                        background: exportMidiMode === mode ? 'rgba(127,215,255,0.12)' : 'rgba(255,255,255,0.04)',
                        borderColor: exportMidiMode === mode ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                        color: exportMidiMode === mode ? '#7FD7FF' : 'rgba(255,255,255,0.64)',
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
                    onExportMidi(exportMidiMode);
                    setExportNotice(
                      exportMidiMode === 'per-layer'
                        ? 'Study per-layer MIDI exported.'
                        : exportMidiMode === 'merged'
                          ? 'Study merged MIDI exported.'
                          : 'Study selected-layer MIDI exported.',
                    );
                  }}
                  className="w-full rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.15em]"
                  style={{
                    background: 'rgba(127,215,255,0.1)',
                    borderColor: 'rgba(127,215,255,0.22)',
                    color: '#7FD7FF',
                  }}
                >
                  Export MIDI
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/42">
                    Saved Scene
                  </div>
                  <div className="mt-1 text-[11px] text-white/52">
                    Save the current study into the Saved scene bank.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSaveScene();
                    setExportNotice('Study saved to Saved.');
                  }}
                  className="w-full rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.15em]"
                  style={{
                    background: 'rgba(0,255,170,0.1)',
                    borderColor: 'rgba(0,255,170,0.22)',
                    color: '#00FFAA',
                  }}
                >
                  Save Scene
                </button>
                {exportNotice ? (
                  <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/42">
                    {exportNotice}
                  </div>
                ) : null}
              </div>
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
