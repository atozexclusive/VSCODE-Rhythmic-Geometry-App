// ============================================================
// Orbital Polymeter — Glassmorphism Sidebar
// Tabs: Orbits (manage), Presets (quick-load), View (toggles)
// ============================================================

import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Orbit } from '../lib/orbitalEngine';
import { PRESET_RATIOS } from '../lib/orbitalEngine';
import {
  NOTE_NAMES,
  SCALE_PRESETS,
  type HarmonySettings,
  type RootNote,
  type ScaleName,
  type HarmonyMappingMode,
  type TonePreset,
} from '../lib/audioEngine';

interface OrbitSidebarProps {
  orbits: Orbit[];
  isOpen: boolean;
  harmonySettings: HarmonySettings;
  savedScenes: Array<{
    id: string;
    name: string;
    updatedAt: string;
  }>;
  onClose: () => void;
  onUpdateOrbit: (id: string, updates: Partial<Orbit>) => void;
  onDeleteOrbit: (id: string) => void;
  onAddOrbit: () => void;
  onLoadPreset: (preset: number[]) => void;
  onHarmonyChange: (updates: Partial<HarmonySettings>) => void;
  onSaveScene: () => void;
  onSaveSceneAs: (name: string) => void;
  onLoadScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onExportScene: (sceneId: string) => void;
  onImportScene: (file: File) => void;
  onExportPng: () => void;
}

const COLORS = [
  '#00FFAA', '#FF3366', '#3388FF', '#FFAA00',
  '#AA44FF', '#FF6600', '#00CCFF', '#FF0088',
  '#44FF88', '#FF4488', '#88CCFF', '#FFCC00',
];

export default function OrbitSidebar({
  orbits,
  isOpen,
  harmonySettings,
  savedScenes,
  onClose,
  onUpdateOrbit,
  onDeleteOrbit,
  onAddOrbit,
  onLoadPreset,
  onHarmonyChange,
  onSaveScene,
  onSaveSceneAs,
  onLoadScene,
  onDeleteScene,
  onExportScene,
  onImportScene,
  onExportPng,
}: OrbitSidebarProps) {
  const [activeTab, setActiveTab] = useState<'orbits' | 'scenes' | 'presets' | 'sound' | 'view'>('orbits');
  const [expandedOrbit, setExpandedOrbit] = useState<string | null>(null);
  const [sceneName, setSceneName] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed right-0 top-0 bottom-0 w-80 z-50 flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.95), rgba(30, 30, 40, 0.95))',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-sm font-light tracking-widest uppercase" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Orbital Control
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-4 border-b border-white/5">
          {(['orbits', 'scenes', 'presets', 'sound', 'view'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-2 text-xs font-mono font-light rounded-t-lg transition-all duration-200"
              style={{
                color: activeTab === tab ? '#00FFAA' : 'rgba(255, 255, 255, 0.4)',
                borderBottom: activeTab === tab ? '2px solid #00FFAA' : 'none',
                background: activeTab === tab ? 'rgba(0, 255, 170, 0.05)' : 'transparent',
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* ORBITS TAB */}
          {activeTab === 'orbits' && (
            <div className="space-y-3">
              {orbits.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                  No orbits. Add one to begin.
                </p>
              ) : (
                orbits.map((orbit) => (
                  <div
                    key={orbit.id}
                    className="rounded-lg border transition-all duration-200"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderColor: expandedOrbit === orbit.id ? orbit.color + '40' : 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Orbit Header */}
                    <button
                      onClick={() => setExpandedOrbit(expandedOrbit === orbit.id ? null : orbit.id)}
                      className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: orbit.color, boxShadow: `0 0 8px ${orbit.color}` }}
                        />
                        <span className="text-xs font-mono" style={{ color: orbit.color }}>
                          {orbit.pulseCount} pulses
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: expandedOrbit === orbit.id ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          color: 'rgba(255, 255, 255, 0.4)',
                        }}
                      />
                    </button>

                    {/* Expanded Controls */}
                    {expandedOrbit === orbit.id && (
                      <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
                        {/* Pulse Count Stepper */}
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Pulses
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() =>
                                onUpdateOrbit(orbit.id, {
                                  pulseCount: Math.max(2, orbit.pulseCount - 1),
                                })
                              }
                              className="px-2 py-1 rounded text-xs font-mono hover:bg-white/10 transition-colors"
                              style={{ color: orbit.color }}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="2"
                              max="100"
                              value={orbit.pulseCount}
                              onChange={(e) =>
                                onUpdateOrbit(orbit.id, {
                                  pulseCount: Math.max(2, Math.min(100, parseInt(e.target.value) || 2)),
                                })
                              }
                              className="flex-1 px-2 py-1 rounded text-xs font-mono text-center bg-white/5 border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
                              style={{ color: orbit.color }}
                            />
                            <button
                              onClick={() =>
                                onUpdateOrbit(orbit.id, {
                                  pulseCount: Math.min(100, orbit.pulseCount + 1),
                                })
                              }
                              className="px-2 py-1 rounded text-xs font-mono hover:bg-white/10 transition-colors"
                              style={{ color: orbit.color }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Radius Slider */}
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Radius: {orbit.radius}px
                          </label>
                          <input
                            type="range"
                            min="40"
                            max="500"
                            step="10"
                            value={orbit.radius}
                            onChange={(e) =>
                              onUpdateOrbit(orbit.id, { radius: parseInt(e.target.value) })
                            }
                            className="w-full h-1 rounded-full mt-2 appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, ${orbit.color}40, ${orbit.color}80)`,
                              WebkitAppearance: 'none',
                            }}
                          />
                        </div>

                        {/* Direction Toggle */}
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Direction
                          </label>
                          <div className="flex gap-2 mt-2">
                            {(['CW', 'CCW'] as const).map((dir, idx) => (
                              <button
                                key={dir}
                                onClick={() => onUpdateOrbit(orbit.id, { direction: idx === 0 ? 1 : -1 })}
                                className="flex-1 px-2 py-1 rounded text-xs font-mono transition-all duration-200"
                                style={{
                                  background: (orbit.direction === 1 && idx === 0) || (orbit.direction === -1 && idx === 1)
                                    ? orbit.color + '30'
                                    : 'rgba(255, 255, 255, 0.05)',
                                  border: `1px solid ${(orbit.direction === 1 && idx === 0) || (orbit.direction === -1 && idx === 1)
                                    ? orbit.color + '60'
                                    : 'rgba(255, 255, 255, 0.1)'}`,
                                  color: (orbit.direction === 1 && idx === 0) || (orbit.direction === -1 && idx === 1)
                                    ? orbit.color
                                    : 'rgba(255, 255, 255, 0.4)',
                                }}
                              >
                                {dir}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Color Grid */}
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Color
                          </label>
                          <div className="grid grid-cols-6 gap-2 mt-2">
                            {COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => onUpdateOrbit(orbit.id, { color })}
                                className="w-full aspect-square rounded-lg transition-all duration-200 hover:scale-110"
                                style={{
                                  background: color,
                                  boxShadow: orbit.color === color ? `0 0 12px ${color}` : 'none',
                                  border: orbit.color === color ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.2)',
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteOrbit(orbit.id)}
                          className="w-full px-3 py-2 rounded text-xs font-mono flex items-center justify-center gap-2 transition-all duration-200 hover:bg-red-500/20 border border-red-500/30 text-red-400"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Add Orbit Button */}
              <button
                onClick={onAddOrbit}
                className="w-full px-4 py-3 rounded-lg border border-dashed transition-all duration-200 hover:bg-white/5 flex items-center justify-center gap-2 font-mono text-xs"
                style={{
                  borderColor: 'rgba(0, 255, 170, 0.3)',
                  color: '#00FFAA',
                }}
              >
                <Plus size={16} />
                Add Orbit
              </button>
            </div>
          )}

          {/* PRESETS TAB */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              {Object.entries(PRESET_RATIOS).map(([name, ratios]) => (
                <button
                  key={name}
                  onClick={() => onLoadPreset(ratios)}
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-200 hover:bg-white/5 text-left"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  <div className="text-xs font-mono font-light">{name}</div>
                  <div className="text-[10px] mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    {ratios.join(' : ')}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* SCENES TAB */}
          {activeTab === 'scenes' && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Saved Scenes
                </div>
                <p className="text-[10px] mt-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  Save the full current state locally in this browser: orbits, speed, trace mode, and harmony.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={onExportPng}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                  style={{
                    background: 'rgba(0, 255, 170, 0.08)',
                    border: '1px solid rgba(0, 255, 170, 0.2)',
                    color: '#00FFAA',
                  }}
                >
                  Export Current View PNG
                </button>
                <input
                  type="text"
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  placeholder="Scene name"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                  style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onSaveSceneAs(sceneName);
                      setSceneName('');
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                    style={{
                      background: 'rgba(0, 255, 170, 0.12)',
                      border: '1px solid rgba(0, 255, 170, 0.3)',
                      color: '#00FFAA',
                    }}
                  >
                    Save Named Scene
                  </button>
                  <button
                    onClick={onSaveScene}
                    className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    Quick Save
                  </button>
                </div>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  Import Scene JSON
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportScene(file);
                    }
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="space-y-2">
                {savedScenes.length === 0 ? (
                  <p className="text-[10px] py-4" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                    No saved scenes yet.
                  </p>
                ) : (
                  savedScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="rounded-lg border p-3"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-mono truncate" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {scene.name}
                          </div>
                          <div className="text-[10px] mt-1" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                            {new Date(scene.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      <button
                        onClick={() => onDeleteScene(scene.id)}
                        className="p-1 rounded transition-colors hover:bg-red-500/10"
                          style={{ color: 'rgba(255, 99, 132, 0.8)' }}
                          title="Delete scene"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onLoadScene(scene.id)}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.7)',
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => onExportScene(scene.id)}
                          className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                          style={{
                            background: 'rgba(0, 255, 170, 0.08)',
                            border: '1px solid rgba(0, 255, 170, 0.2)',
                            color: '#00FFAA',
                          }}
                        >
                          Export
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SOUND TAB */}
          {activeTab === 'sound' && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Harmony
                </div>
                <p className="text-[10px] mt-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  The original tone set stays as the main preset. Scale quantization is optional.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Tone Preset
                </label>
                <select
                  value={harmonySettings.tonePreset}
                  onChange={(e) => onHarmonyChange({ tonePreset: e.target.value as TonePreset })}
                  className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                  style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  <option value="original" style={{ background: '#181820' }}>Original</option>
                  <option value="scale-quantized" style={{ background: '#181820' }}>Scale Quantized</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Root Note
                </label>
                <select
                  value={harmonySettings.rootNote}
                  onChange={(e) => onHarmonyChange({ rootNote: e.target.value as RootNote })}
                  className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                  style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  {NOTE_NAMES.map((note) => (
                    <option key={note} value={note} style={{ background: '#181820' }}>
                      {note}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Scale
                </label>
                <select
                  value={harmonySettings.scaleName}
                  onChange={(e) => onHarmonyChange({ scaleName: e.target.value as ScaleName })}
                  className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                  style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  {Object.entries(SCALE_PRESETS).map(([scaleName, scale]) => (
                    <option key={scaleName} value={scaleName} style={{ background: '#181820' }}>
                      {scale.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Mapping Mode
                </label>
                <select
                  value={harmonySettings.mappingMode}
                  onChange={(e) => onHarmonyChange({ mappingMode: e.target.value as HarmonyMappingMode })}
                  className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                  style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  <option value="color-hue" style={{ background: '#181820' }}>Color Hue</option>
                  <option value="orbit-index" style={{ background: '#181820' }}>Orbit Index</option>
                  <option value="pulse-count" style={{ background: '#181820' }}>Pulse Count</option>
                  <option value="radius" style={{ background: '#181820' }}>Radius</option>
                </select>
              </div>

              <div className="rounded-lg border border-white/10 p-3" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Current Mode
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                  {harmonySettings.tonePreset === 'original'
                    ? 'Original hue-based pentatonic voicing.'
                    : `${SCALE_PRESETS[harmonySettings.scaleName].label} in ${harmonySettings.rootNote}, mapped by ${harmonySettings.mappingMode.replace('-', ' ')}.`}
                </p>
              </div>
            </div>
          )}

          {/* VIEW TAB */}
          {activeTab === 'view' && (
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Display Options
              </div>
              <p className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                View controls coming soon. Currently all elements are visible.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: currentColor;
          cursor: pointer;
          box-shadow: 0 0 6px currentColor;
        }
        input[type='range']::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: currentColor;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px currentColor;
        }
      `}</style>
    </>
  );
}
