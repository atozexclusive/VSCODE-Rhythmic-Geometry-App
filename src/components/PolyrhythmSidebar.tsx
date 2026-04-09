import { Pause, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  POLYRHYTHM_LAYER_COLORS,
  POLYRHYTHM_PRESETS,
  type PolyrhythmLayer,
  type PolyrhythmStudy,
} from '../lib/polyrhythmStudy';

interface PolyrhythmSidebarProps {
  isOpen: boolean;
  study: PolyrhythmStudy;
  activePresetId: string | null;
  onClose: () => void;
  onLoadPreset: (presetId: string) => void;
  onResetStudy: () => void;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onToggleInactiveSteps: () => void;
  onToggleStepLabels: () => void;
  onAddLayer: () => void;
  onRemoveLayer: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<PolyrhythmLayer>) => void;
  onSetLayerBeatCount: (layerId: string, beatCount: number) => void;
  onToggleLayerStep: (layerId: string, stepIndex: number) => void;
}

export default function PolyrhythmSidebar({
  isOpen,
  study,
  activePresetId,
  onClose,
  onLoadPreset,
  onResetStudy,
  onTogglePlay,
  onBpmChange,
  onToggleInactiveSteps,
  onToggleStepLabels,
  onAddLayer,
  onRemoveLayer,
  onUpdateLayer,
  onSetLayerBeatCount,
  onToggleLayerStep,
}: PolyrhythmSidebarProps) {
  const isMobile = useIsMobile();

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
              Nested Circular Polyrhythm
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

        <div
          className={`flex-1 overflow-y-auto ${
            isMobile ? 'px-3 py-3 pb-28' : 'px-4 py-4'
          } space-y-4`}
        >
          <div className="space-y-1">
            <div
              className="text-xs font-mono uppercase tracking-[0.2em]"
              style={{ color: 'rgba(255,255,255,0.62)' }}
            >
              Presets
            </div>
            <p
              className="text-[10px] leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.46)' }}
            >
              Start with a ratio study, then reshape each ring by toggling steps.
            </p>
          </div>

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}
          >
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
                      activePresetId === preset.id
                        ? '#72F1B8'
                        : 'rgba(255,255,255,0.72)',
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

          <div
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
                  Global
                </div>
                <div
                  className="mt-1 text-[10px] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.42)' }}
                >
                  {study.description}
                </div>
              </div>
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

            <button
              type="button"
              onClick={onResetStudy}
              className="w-full rounded-xl border px-3 py-3 text-[10px] font-mono uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-all duration-200 hover:bg-white/5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.66)',
              }}
            >
              <RotateCcw size={14} />
              Reset To Current Preset
            </button>
          </div>

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
                Each ring holds its own step mask, rotation, and weight.
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

          {study.layers.map((layer, layerIndex) => {
            const activeCount = layer.activeSteps.reduce(
              (count, step) => count + (step ? 1 : 0),
              0,
            );

            return (
              <div
                key={layer.id}
                className="rounded-xl border p-3 space-y-3"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.038), rgba(255,255,255,0.022))',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className="text-xs font-mono uppercase tracking-[0.18em]"
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
                  {study.layers.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onRemoveLayer(layer.id)}
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
                    onClick={() => onSetLayerBeatCount(layer.id, layer.beatCount - 1)}
                    className="h-10 rounded-xl text-sm font-mono"
                    style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)' }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="3"
                    max="32"
                    value={layer.beatCount}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) =>
                      onSetLayerBeatCount(layer.id, parseInt(event.target.value, 10) || 3)
                    }
                    className="h-10 rounded-xl border bg-white/5 px-3 text-center text-[15px] font-mono focus:outline-none"
                    style={{
                      color: 'rgba(255,255,255,0.84)',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onSetLayerBeatCount(layer.id, layer.beatCount + 1)}
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
                    <span>{layer.radius}</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="320"
                    step="2"
                    value={layer.radius}
                    onChange={(event) =>
                      onUpdateLayer(layer.id, {
                        radius: parseInt(event.target.value, 10) || 70,
                      })
                    }
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${layer.color}40, ${layer.color}70)` }}
                  />
                </div>

                <div className="space-y-1">
                  <div
                    className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{ color: 'rgba(255,255,255,0.48)' }}
                  >
                    <span>Rotation</span>
                    <span>{Math.round(layer.rotationOffset)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={layer.rotationOffset}
                    onChange={(event) =>
                      onUpdateLayer(layer.id, {
                        rotationOffset: parseInt(event.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${layer.color}30, rgba(255,255,255,0.18))` }}
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
                        onClick={() => onUpdateLayer(layer.id, { color })}
                        className="aspect-square rounded-md transition-all duration-200 hover:scale-110"
                        style={{
                          background: color,
                          border:
                            layer.color === color
                              ? `2px solid ${color}`
                              : '1px solid rgba(255,255,255,0.16)',
                          boxShadow:
                            layer.color === color ? `0 0 10px ${color}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div
                    className="text-[10px] font-mono uppercase tracking-[0.16em]"
                    style={{ color: 'rgba(255,255,255,0.48)' }}
                  >
                    Step Mask
                  </div>
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(34px, 1fr))' }}
                  >
                    {layer.activeSteps.map((active, stepIndex) => (
                      <button
                        key={`${layer.id}-${stepIndex}`}
                        type="button"
                        onClick={() => onToggleLayerStep(layer.id, stepIndex)}
                        className="h-9 rounded-lg text-[10px] font-mono transition-all duration-200"
                        style={{
                          background: active ? `${layer.color}20` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${
                            active ? `${layer.color}55` : 'rgba(255,255,255,0.08)'
                          }`,
                          color: active ? layer.color : 'rgba(255,255,255,0.48)',
                        }}
                      >
                        {stepIndex + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
