import { Pause, Play, Plus, RotateCcw, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { NOTE_NAMES, SCALE_PRESETS } from '../lib/audioEngine';
import {
  POLYRHYTHM_LAYER_COLORS,
  POLYRHYTHM_PRESETS,
  countActiveSteps,
  type PolyrhythmLayer,
  type PolyrhythmSoundSettings,
  type PolyrhythmStudy,
} from '../lib/polyrhythmStudy';

interface PolyrhythmStepSelection {
  layerId: string;
  stepIndex: number;
}

interface PolyrhythmSidebarProps {
  isOpen: boolean;
  study: PolyrhythmStudy;
  currentSurface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study';
  activePresetId: string | null;
  selectedLayerId: string | null;
  selectedStep: PolyrhythmStepSelection | null;
  onClose: () => void;
  onSurfaceChange: (surface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study') => void;
  onLoadPreset: (presetId: string) => void;
  onResetStudy: () => void;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onToggleStudySound: () => void;
  onUpdateSoundSettings: (updates: Partial<PolyrhythmSoundSettings>) => void;
  onToggleInactiveSteps: () => void;
  onToggleStepLabels: () => void;
  onAddLayer: () => void;
  onSelectLayer: (layerId: string) => void;
  onSelectStep: (selection: PolyrhythmStepSelection | null) => void;
  onRemoveLayer: (layerId: string) => void;
  onRotateLayer: (layerId: string, stepOffset: number) => void;
  onInvertLayerSteps: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<PolyrhythmLayer>) => void;
  onSetLayerBeatCount: (layerId: string, beatCount: number) => void;
  onToggleLayerStep: (layerId: string, stepIndex: number) => void;
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
  onToggleInactiveSteps,
  onToggleStepLabels,
  onAddLayer,
  onSelectLayer,
  onSelectStep,
  onRemoveLayer,
  onRotateLayer,
  onInvertLayerSteps,
  onUpdateLayer,
  onSetLayerBeatCount,
  onToggleLayerStep,
}: PolyrhythmSidebarProps) {
  const isMobile = useIsMobile();
  const selectedLayer =
    study.layers.find((layer) => layer.id === selectedLayerId) ?? study.layers[0] ?? null;
  const selectedStepActive =
    selectedLayer && selectedStep?.layerId === selectedLayer.id
      ? Boolean(selectedLayer.activeSteps[selectedStep.stepIndex])
      : null;
  const polyrhythmPalettes: Array<{
    id: PolyrhythmSoundSettings['palette'];
    label: string;
  }> = [
    { id: 'study-pulse', label: 'Study Pulse' },
    { id: 'glass-tick', label: 'Glass Tick' },
    { id: 'wood', label: 'Wood' },
    { id: 'soft-synth', label: 'Soft Synth' },
    { id: 'bright-marker', label: 'Bright Marker' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed z-50 flex flex-col overflow-hidden ${
          isMobile ? 'inset-0 w-full' : 'right-0 top-0 bottom-0 w-[31.5rem]'
        }`}
        style={{
          background:
            'linear-gradient(135deg, rgba(20, 20, 28, 0.96), rgba(30, 30, 40, 0.95))',
          backdropFilter: 'blur(20px)',
          borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)',
          transform: isOpen ? 'translateX(0)' : `translateX(${isMobile ? '0' : '100%'})`,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className={`flex items-center justify-between border-b border-white/10 ${
            isMobile ? 'px-4 py-4' : 'p-6'
          }`}
        >
          <div>
            <div
              className="text-sm font-light tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Study Menu
            </div>
            <div
              className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em]"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Select a ring, then shape its mask.
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg transition-colors hover:bg-white/10 ${
              isMobile ? 'p-3' : 'p-2'
            }`}
            style={{ color: 'rgba(255,255,255,0.5)' }}
            title="Close study menu"
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

        <div
          className={`flex-1 overflow-y-auto ${
            isMobile ? 'px-3 py-3 pb-28' : 'px-4 py-4'
          } space-y-4`}
        >
          <section
            className="rounded-xl border p-3 space-y-3"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div
                  className="text-xs font-mono uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(255,255,255,0.62)' }}
                >
                  Study
                </div>
                <div
                  className="mt-1 text-[10px] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.42)' }}
                >
                  {study.description}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleStudySound}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: study.soundEnabled
                      ? 'rgba(127,215,255,0.14)'
                      : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${
                      study.soundEnabled ? 'rgba(127,215,255,0.26)' : 'rgba(255,255,255,0.08)'
                    }`,
                    color: study.soundEnabled ? '#7FD7FF' : 'rgba(255,255,255,0.48)',
                  }}
                  title={study.soundEnabled ? 'Mute study sound' : 'Enable study sound'}
                >
                  {study.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: study.playing
                      ? 'rgba(255, 51, 102, 0.18)'
                      : 'rgba(0, 255, 170, 0.14)',
                    border: `1px solid ${
                      study.playing
                        ? 'rgba(255,51,102,0.34)'
                        : 'rgba(0,255,170,0.24)'
                    }`,
                    color: study.playing ? '#FF3366' : '#72F1B8',
                  }}
                >
                  {study.playing ? <Pause size={17} /> : <Play size={17} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div
                className="flex items-center justify-between text-[11px]"
                style={{ color: 'rgba(255,255,255,0.58)' }}
              >
                <span>BPM</span>
                <span className="font-mono">{study.bpm}</span>
              </div>
              <input
                type="range"
                min="40"
                max="180"
                step="1"
                value={study.bpm}
                onChange={(event) => onBpmChange(parseInt(event.target.value, 10) || 40)}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ background: 'linear-gradient(to right, rgba(114,241,184,0.4), rgba(127,215,255,0.6))' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onToggleInactiveSteps}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: study.showInactiveSteps
                    ? 'rgba(127,215,255,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  borderColor: study.showInactiveSteps
                    ? 'rgba(127,215,255,0.3)'
                    : 'rgba(255,255,255,0.08)',
                  color: study.showInactiveSteps ? '#7FD7FF' : 'rgba(255,255,255,0.66)',
                }}
              >
                {study.showInactiveSteps ? 'Hide Faint Steps' : 'Show Faint Steps'}
              </button>
              <button
                type="button"
                onClick={onToggleStepLabels}
                className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: study.showStepLabels
                    ? 'rgba(255,209,102,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  borderColor: study.showStepLabels
                    ? 'rgba(255,209,102,0.3)'
                    : 'rgba(255,255,255,0.08)',
                  color: study.showStepLabels ? '#FFD166' : 'rgba(255,255,255,0.66)',
                }}
              >
                {study.showStepLabels ? 'Labels On' : 'Labels Off'}
              </button>
            </div>
          </section>

          <section
            className="rounded-xl border p-3 space-y-3"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div
                  className="text-xs font-mono uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(255,255,255,0.62)' }}
                >
                  Sound
                </div>
                <div
                  className="mt-1 text-[10px] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.42)' }}
                >
                  Clean study tones with optional key mapping.
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleStudySound}
                className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: study.soundEnabled ? 'rgba(127,215,255,0.12)' : 'rgba(255,255,255,0.04)',
                  borderColor: study.soundEnabled ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.08)',
                  color: study.soundEnabled ? '#7FD7FF' : 'rgba(255,255,255,0.66)',
                }}
              >
                {study.soundEnabled ? 'Study On' : 'Study Off'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {polyrhythmPalettes.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => onUpdateSoundSettings({ palette: palette.id })}
                  className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.14em]"
                  style={{
                    background:
                      study.soundSettings.palette === palette.id
                        ? 'rgba(114,241,184,0.12)'
                        : 'rgba(255,255,255,0.04)',
                    borderColor:
                      study.soundSettings.palette === palette.id
                        ? 'rgba(114,241,184,0.24)'
                        : 'rgba(255,255,255,0.08)',
                    color:
                      study.soundSettings.palette === palette.id
                        ? '#72F1B8'
                        : 'rgba(255,255,255,0.66)',
                  }}
                >
                  {palette.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'free', label: 'Free' },
                { id: 'keyed', label: 'Keyed' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    onUpdateSoundSettings({
                      pitchMode: mode.id as PolyrhythmSoundSettings['pitchMode'],
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

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-[10px] font-mono uppercase tracking-[0.16em] text-white/48">
                Root
                <select
                  value={study.soundSettings.rootNote}
                  onChange={(event) =>
                    onUpdateSoundSettings({
                      rootNote: event.target.value as PolyrhythmSoundSettings['rootNote'],
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
                Scale
                <select
                  value={study.soundSettings.scaleName}
                  onChange={(event) =>
                    onUpdateSoundSettings({
                      scaleName: event.target.value as PolyrhythmSoundSettings['scaleName'],
                    })
                  }
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[14px] font-light text-white outline-none"
                >
                  {Object.entries(SCALE_PRESETS).map(([name, scale]) => (
                    <option key={name} value={name} style={{ background: '#181820' }}>
                      {scale.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'tight', label: 'Tight' },
                { id: 'wide', label: 'Wide' },
              ].map((register) => (
                <button
                  key={register.id}
                  type="button"
                  onClick={() =>
                    onUpdateSoundSettings({
                      register: register.id as PolyrhythmSoundSettings['register'],
                    })
                  }
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
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div
                  className="text-xs font-mono uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(255,255,255,0.62)' }}
                >
                  Presets
                </div>
                <div
                  className="mt-1 text-[10px] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.42)' }}
                >
                  Start from a clear proportion, then shape it into your own mask.
                </div>
              </div>
              <button
                type="button"
                onClick={onResetStudy}
                className="rounded-xl border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.66)',
                }}
              >
                Reset
              </button>
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {POLYRHYTHM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onLoadPreset(preset.id)}
                  className="rounded-xl border px-3 py-3 text-left transition-all duration-200 hover:bg-white/5"
                  style={{
                    background:
                      activePresetId === preset.id
                        ? 'linear-gradient(180deg, rgba(114,241,184,0.12), rgba(255,255,255,0.04))'
                        : 'rgba(255,255,255,0.03)',
                    borderColor:
                      activePresetId === preset.id
                        ? 'rgba(114,241,184,0.32)'
                        : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className="text-[11px] font-mono uppercase tracking-[0.16em]"
                    style={{
                      color:
                        activePresetId === preset.id ? '#72F1B8' : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {preset.name}
                  </div>
                  <div
                    className="mt-2 text-[10px] leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.42)' }}
                  >
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div
                  className="text-xs font-mono uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(255,255,255,0.62)' }}
                >
                  Layers
                </div>
                <div
                  className="mt-1 text-[10px] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.42)' }}
                >
                  Tap a ring on the canvas or choose one here.
                </div>
              </div>
              <button
                type="button"
                onClick={onAddLayer}
                className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-white/5"
                style={{
                  color: '#72F1B8',
                  background: 'rgba(114,241,184,0.08)',
                  border: '1px solid rgba(114,241,184,0.24)',
                }}
                title="Add layer"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {study.layers.map((layer, layerIndex) => {
                const activeCount = countActiveSteps(layer);
                const selected = selectedLayer?.id === layer.id;

                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      onSelectLayer(layer.id);
                      onSelectStep(null);
                    }}
                    className="w-full rounded-xl border px-3 py-3 text-left transition-all duration-200"
                    style={{
                      background: selected
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))'
                        : 'rgba(255,255,255,0.025)',
                      borderColor: selected ? `${layer.color}55` : 'rgba(255,255,255,0.08)',
                      boxShadow: selected ? `0 0 18px ${layer.color}14` : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div
                          className="text-[11px] font-mono uppercase tracking-[0.16em]"
                          style={{ color: layer.color }}
                        >
                          Layer {layerIndex + 1}
                        </div>
                        <div
                          className="mt-1 text-[10px]"
                          style={{ color: 'rgba(255,255,255,0.44)' }}
                        >
                          {activeCount} active on {layer.beatCount} steps
                        </div>
                      </div>
                      <div
                        className="rounded-full border px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.16em]"
                        style={{
                          borderColor: selected ? `${layer.color}44` : 'rgba(255,255,255,0.08)',
                          color: selected ? layer.color : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {Math.round(layer.rotationOffset)}°
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedLayer ? (
            <section
              className="rounded-xl border p-3 space-y-3"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.038), rgba(255,255,255,0.022))',
                borderColor: `${selectedLayer.color}33`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className="text-xs font-mono uppercase tracking-[0.2em]"
                    style={{ color: selectedLayer.color }}
                  >
                    Selected Layer
                  </div>
                  <div
                    className="mt-1 text-[10px]"
                    style={{ color: 'rgba(255,255,255,0.44)' }}
                  >
                    Shape this ring directly, then refine individual steps below.
                  </div>
                </div>
                {study.layers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onRemoveLayer(selectedLayer.id)}
                    className="rounded-lg p-2 transition-all duration-200 hover:bg-white/5"
                    style={{ color: 'rgba(255,120,120,0.86)' }}
                    title="Remove layer"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-[44px,1fr,44px] gap-2 items-center">
                <button
                  type="button"
                  onClick={() => onSetLayerBeatCount(selectedLayer.id, selectedLayer.beatCount - 1)}
                  className="h-10 rounded-xl text-sm font-mono"
                  style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)' }}
                >
                  -
                </button>
                <input
                  type="number"
                  min="3"
                  max="32"
                  value={selectedLayer.beatCount}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) =>
                    onSetLayerBeatCount(selectedLayer.id, parseInt(event.target.value, 10) || 3)
                  }
                  className="h-10 rounded-xl border bg-white/5 px-3 text-center text-[15px] font-mono focus:outline-none"
                  style={{
                    color: 'rgba(255,255,255,0.84)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => onSetLayerBeatCount(selectedLayer.id, selectedLayer.beatCount + 1)}
                  className="h-10 rounded-xl text-sm font-mono"
                  style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)' }}
                >
                  +
                </button>
              </div>

              <div className="space-y-1">
                <div
                  className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(255,255,255,0.48)' }}
                >
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
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${selectedLayer.color}40, ${selectedLayer.color}70)` }}
                />
              </div>

              <div className="space-y-1">
                <div
                  className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(255,255,255,0.48)' }}
                >
                  <span>Rotation</span>
                  <span>{Math.round(selectedLayer.rotationOffset)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={selectedLayer.rotationOffset}
                  onChange={(event) =>
                    onUpdateLayer(selectedLayer.id, {
                      rotationOffset: parseInt(event.target.value, 10) || 0,
                    })
                  }
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${selectedLayer.color}30, rgba(255,255,255,0.18))` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onRotateLayer(selectedLayer.id, -1)}
                  className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.66)',
                  }}
                >
                  Rotate −1
                </button>
                <button
                  type="button"
                  onClick={() => onRotateLayer(selectedLayer.id, 1)}
                  className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.66)',
                  }}
                >
                  Rotate +1
                </button>
                <button
                  type="button"
                  onClick={() => onInvertLayerSteps(selectedLayer.id)}
                  className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{
                    background: 'rgba(255,209,102,0.08)',
                    borderColor: 'rgba(255,209,102,0.2)',
                    color: '#FFD166',
                  }}
                >
                  Invert
                </button>
              </div>

              <div className="grid grid-cols-[1fr,120px] gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLayer(selectedLayer.id, {
                      soundEnabled: !selectedLayer.soundEnabled,
                    })
                  }
                  className="rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em] flex items-center justify-center gap-2"
                  style={{
                    background: selectedLayer.soundEnabled
                      ? 'rgba(127,215,255,0.12)'
                      : 'rgba(255,255,255,0.04)',
                    borderColor: selectedLayer.soundEnabled
                      ? 'rgba(127,215,255,0.28)'
                      : 'rgba(255,255,255,0.08)',
                    color: selectedLayer.soundEnabled ? '#7FD7FF' : 'rgba(255,255,255,0.66)',
                  }}
                >
                  {selectedLayer.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {selectedLayer.soundEnabled ? 'Layer Sound On' : 'Layer Sound Off'}
                </button>
                <input
                  type="number"
                  min="90"
                  max="1400"
                  value={selectedLayer.pitchHz}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) =>
                    onUpdateLayer(selectedLayer.id, {
                      pitchHz: parseInt(event.target.value, 10) || 220,
                    })
                  }
                  className="h-10 rounded-xl border bg-white/5 px-3 text-center text-[13px] font-mono focus:outline-none"
                  style={{
                    color: 'rgba(255,255,255,0.84)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                />
              </div>

              <div className="space-y-1">
                <div
                  className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(255,255,255,0.48)' }}
                >
                  <span>Layer Gain</span>
                  <span>{selectedLayer.gain.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.28"
                  step="0.01"
                  value={selectedLayer.gain}
                  onChange={(event) =>
                    onUpdateLayer(selectedLayer.id, {
                      gain: parseFloat(event.target.value) || 0.12,
                    })
                  }
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, rgba(127,215,255,0.3), ${selectedLayer.color}60)` }}
                />
              </div>

              <div className="space-y-2">
                <div
                  className="text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{ color: 'rgba(255,255,255,0.48)' }}
                >
                  Color
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {POLYRHYTHM_LAYER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onUpdateLayer(selectedLayer.id, { color })}
                      className="aspect-square rounded-md transition-all duration-200 hover:scale-110"
                      style={{
                        background: color,
                        border:
                          selectedLayer.color === color
                            ? `2px solid ${color}`
                            : '1px solid rgba(255,255,255,0.16)',
                        boxShadow:
                          selectedLayer.color === color ? `0 0 10px ${color}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div
                  className="flex items-center justify-between gap-3"
                >
                  <div
                    className="text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{ color: 'rgba(255,255,255,0.48)' }}
                  >
                    Step Mask
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: selectedLayer.color }}>
                    {countActiveSteps(selectedLayer)}/{selectedLayer.beatCount} Active
                  </div>
                </div>
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(34px, 1fr))' }}
                >
                  {selectedLayer.activeSteps.map((active, stepIndex) => {
                    const selected =
                      selectedStep?.layerId === selectedLayer.id &&
                      selectedStep.stepIndex === stepIndex;

                    return (
                      <button
                        key={`${selectedLayer.id}-${stepIndex}`}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            onToggleLayerStep(selectedLayer.id, stepIndex);
                            return;
                          }
                          onSelectStep({
                            layerId: selectedLayer.id,
                            stepIndex,
                          });
                        }}
                        className="h-9 rounded-lg text-[10px] font-mono transition-all duration-200"
                        style={{
                          background: selected
                            ? 'rgba(255,255,255,0.12)'
                            : active
                              ? `${selectedLayer.color}20`
                              : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${
                            selected
                              ? 'rgba(255,255,255,0.32)'
                              : active
                                ? `${selectedLayer.color}55`
                                : 'rgba(255,255,255,0.08)'
                          }`,
                          color: selected
                            ? 'rgba(255,255,255,0.92)'
                            : active
                              ? selectedLayer.color
                              : 'rgba(255,255,255,0.48)',
                        }}
                      >
                        {stepIndex + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          {selectedLayer && selectedStep?.layerId === selectedLayer.id ? (
            <section
              className="rounded-xl border p-3 space-y-3"
              style={{
                background: 'rgba(255,255,255,0.025)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="text-xs font-mono uppercase tracking-[0.2em]"
                style={{ color: 'rgba(255,255,255,0.62)' }}
              >
                Selected Step
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[16px] font-light text-white">
                    Step {selectedStep.stepIndex + 1}
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
                    Tap again on the canvas or here to switch this point on or off.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleLayerStep(selectedLayer.id, selectedStep.stepIndex)}
                  className="rounded-xl border px-4 py-3 text-[10px] font-mono uppercase tracking-[0.16em]"
                  style={{
                    background: selectedStepActive
                      ? `${selectedLayer.color}18`
                      : 'rgba(255,255,255,0.04)',
                    borderColor: selectedStepActive
                      ? `${selectedLayer.color}55`
                      : 'rgba(255,255,255,0.08)',
                    color: selectedStepActive ? selectedLayer.color : 'rgba(255,255,255,0.66)',
                  }}
                >
                  {selectedStepActive ? 'Turn Off' : 'Turn On'}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
