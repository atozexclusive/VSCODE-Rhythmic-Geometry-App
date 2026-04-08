// ============================================================
// Orbital Polymeter — Glassmorphism Sidebar
// Tabs: Geometry, Orbits, Sound, Scenes, Export
// ============================================================

import { X, Plus, Trash2, ChevronDown, RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Orbit } from '../lib/orbitalEngine';
import { PRESET_RATIOS } from '../lib/orbitalEngine';
import InfoTip from './InfoTip';
import AccountPanel from './AccountPanel';
import {
  NOTE_NAMES,
  SCALE_PRESETS,
  type HarmonySettings,
  type RootNote,
  type ScaleName,
  type HarmonyMappingMode,
  type TonePreset,
} from '../lib/audioEngine';
import { useIsMobile } from '../hooks/use-mobile';
import { type GeometryMode, type InterferenceSettings } from '../lib/geometry';

interface OrbitSidebarProps {
  orbits: Orbit[];
  isOpen: boolean;
  harmonySettings: HarmonySettings;
  geometryMode: GeometryMode;
  interferenceSettings: InterferenceSettings;
  builtInScenes: Array<{
    id: string;
    name: string;
    description: string;
    thumbnailDataUrl?: string;
    geometryMode: GeometryMode;
  }>;
  premiumScenes: Array<{
    id: string;
    name: string;
    description: string;
    thumbnailDataUrl?: string;
    geometryMode: GeometryMode;
  }>;
  savedScenes: Array<{
    id: string;
    name: string;
    updatedAt: string;
    thumbnailDataUrl?: string;
    geometryMode: GeometryMode;
  }>;
  exportRecords: Array<{
    id: string;
    type: string;
    sceneName?: string | null;
    aspect?: string | null;
    scale?: number | null;
    durationSeconds?: number | null;
    createdAt: string;
  }>;
  signedIn: boolean;
  accountPersistenceLoading: boolean;
  localSceneCount: number;
  onClose: () => void;
  onUpdateOrbit: (id: string, updates: Partial<Orbit>) => void;
  onDeleteOrbit: (id: string) => void;
  onAddOrbit: () => void;
  onLoadPreset: (preset: number[]) => void;
  onReverseDirections: () => void;
  onAllClockwise: () => void;
  onAlternateDirections: () => void;
  onGeometryModeChange: (mode: GeometryMode) => void;
  onInterferenceSettingsChange: (updates: Partial<InterferenceSettings>) => void;
  onHarmonyChange: (updates: Partial<HarmonySettings>) => void;
  onSaveScene: () => void;
  onSaveSceneAs: (name: string) => void;
  onImportLocalScenes: () => void;
  onLoadScene: (sceneId: string) => void;
  onLoadBuiltInScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onExportScene: (sceneId: string) => void;
  onImportScene: (file: File) => void;
  onExportPng: (options: { aspect: 'landscape' | 'square' | 'portrait' | 'story'; scale: 1 | 2 | 4 }) => void;
  onExportVideo: (options: { durationSeconds: 8 | 12 }) => Promise<void> | void;
  isRecordingVideo: boolean;
  onHardReset: () => void;
}

const COLORS = [
  '#00FFAA', '#32CD32', '#72F1B8', '#44FF88',
  '#3388FF', '#88CCFF', '#00CCFF', '#7D89FF',
  '#FF3366', '#FF4488', '#FF0088', '#FF7799',
  '#FFAA00', '#FFCC00', '#FF6600', '#AA44FF',
];

const REGISTER_OPTIONS: Array<{ label: string; value: -1 | 0 | 1 }> = [
  { label: 'Low', value: -1 },
  { label: 'Mid', value: 0 },
  { label: 'High', value: 1 },
];

export default function OrbitSidebar({
  orbits,
  isOpen,
  harmonySettings,
  geometryMode,
  interferenceSettings,
  builtInScenes,
  premiumScenes,
  savedScenes,
  exportRecords,
  signedIn,
  accountPersistenceLoading,
  localSceneCount,
  onClose,
  onUpdateOrbit,
  onDeleteOrbit,
  onAddOrbit,
  onLoadPreset,
  onReverseDirections,
  onAllClockwise,
  onAlternateDirections,
  onGeometryModeChange,
  onInterferenceSettingsChange,
  onHarmonyChange,
  onSaveScene,
  onSaveSceneAs,
  onImportLocalScenes,
  onLoadScene,
  onLoadBuiltInScene,
  onDeleteScene,
  onExportScene,
  onImportScene,
  onExportPng,
  onExportVideo,
  isRecordingVideo,
  onHardReset,
}: OrbitSidebarProps) {
  const isMobile = useIsMobile();
  const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/i.test(navigator.userAgent);
  const [activeTab, setActiveTab] = useState<'account' | 'geometry' | 'orbits' | 'sound' | 'scenes' | 'export'>('account');
  const [activeSceneTab, setActiveSceneTab] = useState<'built-in' | 'saved' | 'premium'>('built-in');
  const [activeSceneMode, setActiveSceneMode] = useState<GeometryMode>('standard-trace');
  const [expandedOrbit, setExpandedOrbit] = useState<string | null>(null);
  const [sceneName, setSceneName] = useState('');
  const [exportAspect, setExportAspect] = useState<'landscape' | 'square' | 'portrait' | 'story'>('square');
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(2);
  const [videoDuration, setVideoDuration] = useState<8 | 12>(8);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const currentModeLabel =
    geometryMode === 'standard-trace'
      ? 'Standard'
      : geometryMode === 'interference-trace'
        ? 'Interference'
        : 'Sweep';
  const baseCardStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  } as const;
  const sceneCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.028))',
    borderColor: 'rgba(0, 255, 170, 0.12)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  } as const;
  const ratioCardStyle = {
    background: `linear-gradient(180deg, ${
      geometryMode === 'standard-trace'
        ? 'rgba(0,255,170,0.12)'
        : geometryMode === 'interference-trace'
          ? 'rgba(136,204,255,0.12)'
          : 'rgba(255,170,0,0.12)'
    }, rgba(255,255,255,0.028))`,
    borderColor: geometryMode === 'standard-trace' ? 'rgba(0,255,170,0.16)' : geometryMode === 'interference-trace' ? 'rgba(136,204,255,0.16)' : 'rgba(255,170,0,0.16)',
    boxShadow:
      geometryMode === 'standard-trace'
        ? 'inset 0 1px 0 rgba(255,255,255,0.035), 0 0 0 1px rgba(0,255,170,0.03)'
        : geometryMode === 'interference-trace'
          ? 'inset 0 1px 0 rgba(255,255,255,0.035), 0 0 0 1px rgba(136,204,255,0.03)'
          : 'inset 0 1px 0 rgba(255,255,255,0.035), 0 0 0 1px rgba(255,170,0,0.03)',
  } as const;
  const ratioAccentColor =
    geometryMode === 'standard-trace'
      ? '#00FFAA'
      : geometryMode === 'interference-trace'
        ? '#88CCFF'
        : '#FFAA00';
  const soundCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
    borderColor: 'rgba(136, 204, 255, 0.12)',
  } as const;
  const soundPrimaryCardStyle = {
    background: 'linear-gradient(180deg, rgba(136,204,255,0.12), rgba(136,204,255,0.04))',
    borderColor: 'rgba(136, 204, 255, 0.22)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
  } as const;
  const soundSecondaryCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.038), rgba(255,255,255,0.022))',
    borderColor: 'rgba(120, 170, 220, 0.12)',
  } as const;
  const soundSummaryCardStyle = {
    background: 'linear-gradient(180deg, rgba(80,130,190,0.14), rgba(80,130,190,0.045))',
    borderColor: 'rgba(136, 204, 255, 0.18)',
  } as const;
  const exportCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))',
    borderColor: 'rgba(255, 170, 0, 0.12)',
  } as const;
  const tabMeta: Array<{ key: 'account' | 'scenes' | 'geometry' | 'orbits' | 'sound' | 'export'; label: string; activeColor: string }> = [
    { key: 'account', label: 'Account', activeColor: '#FFAA00' },
    { key: 'scenes', label: 'Scenes', activeColor: '#00FFAA' },
    { key: 'geometry', label: 'Ratios', activeColor: geometryMode === 'standard-trace' ? '#00FFAA' : geometryMode === 'interference-trace' ? '#88CCFF' : '#FFAA00' },
    { key: 'orbits', label: 'Orbits', activeColor: '#FF88C2' },
    { key: 'sound', label: 'Sound', activeColor: '#88CCFF' },
    { key: 'export', label: 'Export', activeColor: '#FFAA00' },
  ];
  const sceneModeTabs: Array<{ key: GeometryMode; label: string; color: string }> = [
    { key: 'standard-trace', label: 'Standard', color: '#00FFAA' },
    { key: 'interference-trace', label: 'Interference', color: '#88CCFF' },
    { key: 'sweep', label: 'Sweep', color: '#FFAA00' },
  ];
  const filteredBuiltInScenes = builtInScenes.filter((scene) => scene.geometryMode === activeSceneMode);
  const filteredSavedScenes = savedScenes.filter((scene) => scene.geometryMode === activeSceneMode);
  const filteredPremiumScenes = premiumScenes.filter((scene) => scene.geometryMode === activeSceneMode);
  const sceneModeLabel =
    activeSceneMode === 'standard-trace'
      ? 'Standard'
      : activeSceneMode === 'interference-trace'
        ? 'Interference'
        : 'Sweep';

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
        className={`fixed z-50 flex flex-col overflow-hidden ${isMobile ? 'inset-0 w-full' : 'right-0 top-0 bottom-0 w-[31.5rem]'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.95), rgba(30, 30, 40, 0.95))',
          backdropFilter: 'blur(20px)',
          borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          transform: isOpen ? 'translateX(0)' : `translateX(${isMobile ? '0' : '100%'})`,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-white/10 ${isMobile ? 'px-4 py-4' : 'p-6'}`}>
          <h2 className="text-sm font-light tracking-widest uppercase" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Menu
          </h2>
          <button
            onClick={onClose}
            className={`rounded-lg transition-colors hover:bg-white/10 ${isMobile ? 'p-3' : 'p-2'}`}
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            title="Close controls"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`${isMobile ? 'overflow-x-auto px-3 pt-3 pb-1' : 'px-4 pt-4 pb-2'} border-b border-white/5`}>
          <div className={`${isMobile ? 'flex min-w-max gap-1' : 'flex flex-wrap gap-1.5'}`}>
          {tabMeta.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-t-lg text-xs font-mono font-light transition-all duration-200 ${isMobile ? 'px-3 py-3' : 'px-3 py-2.5'}`}
              style={{
                color: activeTab === tab.key ? tab.activeColor : 'rgba(255, 255, 255, 0.4)',
                borderBottom: activeTab === tab.key ? `2px solid ${tab.activeColor}` : 'none',
                background: activeTab === tab.key ? `${tab.activeColor}10` : 'transparent',
              }}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 py-3 pb-28' : 'px-4 py-4'}`}>
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255, 255, 255, 0.62)' }}>
                  Account
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.46)' }}>
                  Sign in, review your plan, and manage account access from one place.
                </p>
              </div>
              <AccountPanel />
            </div>
          )}

          {/* ORBITS TAB */}
          {activeTab === 'orbits' && (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Orbits
                </div>
                <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  Shape the motion, spacing, direction, and color of each orbit.
                </p>
              </div>
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
                        <div className="text-left">
                          <div className="text-xs font-mono" style={{ color: orbit.color }}>
                            Orbit {orbits.findIndex((entry) => entry.id === orbit.id) + 1}
                          </div>
                          <div className="text-[10px] font-mono" style={{ color: 'rgba(255, 255, 255, 0.42)' }}>
                            {orbit.pulseCount} pulses · {orbit.direction === 1 ? 'CW' : 'CCW'} · {orbit.radius}px
                          </div>
                        </div>
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
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.38)' }}>
                            Motion
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Pulses
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() =>
                                onUpdateOrbit(orbit.id, {
                                  pulseCount: Math.max(1, orbit.pulseCount - 1),
                                })
                              }
                              className="px-2 py-1 rounded text-xs font-mono hover:bg-white/10 transition-colors"
                              style={{ color: orbit.color }}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={orbit.pulseCount}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) =>
                                onUpdateOrbit(orbit.id, {
                                  pulseCount: Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)),
                                })
                              }
                              className="flex-1 px-2 py-1 rounded text-xs font-mono text-center bg-white/5 border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
                              style={{ color: orbit.color }}
                            />
                            <button
                              onClick={() =>
                                onUpdateOrbit(orbit.id, {
                                  pulseCount: Math.min(1000, orbit.pulseCount + 1),
                                })
                              }
                              className="px-2 py-1 rounded text-xs font-mono hover:bg-white/10 transition-colors"
                              style={{ color: orbit.color }}
                            >
                              +
                            </button>
                          </div>
                        </div>

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

                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.38)' }}>
                            Appearance
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Color
                          </label>
                          <div className="grid grid-cols-8 gap-1.5 mt-2">
                            {COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => onUpdateOrbit(orbit.id, { color })}
                                className="w-full aspect-square rounded-md transition-all duration-200 hover:scale-110"
                                style={{
                                  background: color,
                                  boxShadow: orbit.color === color ? `0 0 12px ${color}` : 'none',
                                  border: orbit.color === color ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.2)',
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {harmonySettings.tonePreset === 'scale-quantized' && harmonySettings.manualOrbitRoles && (
                          <>
                            <div>
                              <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.38)' }}>
                                Note Role
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                Scale Degree
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="7"
                                step="1"
                                value={orbit.harmonyDegree ?? 0}
                                onChange={(e) =>
                                  onUpdateOrbit(orbit.id, { harmonyDegree: parseInt(e.target.value) })
                                }
                                className="w-full h-1 rounded-full mt-2 appearance-none cursor-pointer"
                                style={{
                                  background: `linear-gradient(to right, ${orbit.color}30, ${orbit.color}70)`,
                                  WebkitAppearance: 'none',
                                }}
                              />
                              <div className="text-[10px] mt-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                                Degree {(orbit.harmonyDegree ?? 0) + 1}
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                Register
                              </label>
                              <div className="flex gap-2 mt-2">
                                {REGISTER_OPTIONS.map((option) => (
                                  <button
                                    key={option.label}
                                    onClick={() => onUpdateOrbit(orbit.id, { harmonyRegister: option.value })}
                                    className="flex-1 px-2 py-1 rounded text-xs font-mono transition-all duration-200"
                                    style={{
                                      background: (orbit.harmonyRegister ?? 0) === option.value
                                        ? orbit.color + '30'
                                        : 'rgba(255, 255, 255, 0.05)',
                                      border: `1px solid ${(orbit.harmonyRegister ?? 0) === option.value
                                        ? orbit.color + '60'
                                        : 'rgba(255, 255, 255, 0.1)'}`,
                                      color: (orbit.harmonyRegister ?? 0) === option.value
                                        ? orbit.color
                                        : 'rgba(255, 255, 255, 0.4)',
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

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

          {/* SCENES TAB */}
          {activeTab === 'scenes' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255, 255, 255, 0.62)' }}>
                  Scenes
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.46)' }}>
                  Start from built-ins, keep your own saves, or preview pro-only scene packs.
                </p>
              </div>

              <div className="rounded-xl border p-1 flex gap-1" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                {[
                  { key: 'built-in' as const, label: 'Scenes', color: '#00FFAA' },
                  { key: 'saved' as const, label: 'Saved', color: '#88CCFF' },
                  { key: 'premium' as const, label: 'Premium', color: '#FFAA00' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveSceneTab(tab.key)}
                    className="flex-1 px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-[0.16em] transition-all duration-200"
                    style={{
                      background: activeSceneTab === tab.key ? `${tab.color}16` : 'transparent',
                      border: `1px solid ${activeSceneTab === tab.key ? `${tab.color}45` : 'transparent'}`,
                      color: activeSceneTab === tab.key ? tab.color : 'rgba(255,255,255,0.46)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border p-1 flex gap-1" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                {sceneModeTabs.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setActiveSceneMode(mode.key)}
                    className="flex-1 px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-[0.16em] transition-all duration-200"
                    style={{
                      background: activeSceneMode === mode.key ? `${mode.color}16` : 'transparent',
                      border: `1px solid ${activeSceneMode === mode.key ? `${mode.color}45` : 'transparent'}`,
                      color: activeSceneMode === mode.key ? mode.color : 'rgba(255,255,255,0.46)',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {activeSceneTab === 'built-in' && (
                <div className="space-y-3">
                  {filteredBuiltInScenes.length === 0 ? (
                    <p className="text-[10px] py-4" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                      No {sceneModeLabel.toLowerCase()} scenes in this set yet.
                    </p>
                  ) : filteredBuiltInScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="rounded-lg border p-3"
                      style={sceneCardStyle}
                    >
                      {scene.thumbnailDataUrl && (
                        <div className="mb-3 flex justify-center">
                          <img
                            src={scene.thumbnailDataUrl}
                            alt={`${scene.name} thumbnail`}
                            className="w-24 h-24 rounded-lg object-contain border border-white/10 p-1"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                          />
                        </div>
                      )}
                      <div className="text-xs font-mono" style={{ color: 'rgba(255, 255, 255, 0.88)' }}>
                        {scene.name}
                      </div>
                      <div className="text-[10px] mt-1 font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.34)' }}>
                        {sceneModeLabel}
                      </div>
                      <div className="text-[10px] mt-1 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.48)' }}>
                        {scene.description}
                      </div>
                      <button
                        onClick={() => onLoadBuiltInScene(scene.id)}
                        className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                        style={{
                          background: 'rgba(0, 255, 170, 0.08)',
                          border: '1px solid rgba(0, 255, 170, 0.2)',
                          color: '#00FFAA',
                        }}
                      >
                        Load Scene
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeSceneTab === 'saved' && (
                <div className="space-y-3">
                  <div className="space-y-3 rounded-lg border p-3" style={sceneCardStyle}>
                    <div
                      className="rounded-lg px-3 py-2 text-[10px] leading-relaxed"
                      style={{
                        background: signedIn ? 'rgba(0,255,170,0.06)' : 'rgba(255,255,255,0.035)',
                        border: `1px solid ${signedIn ? 'rgba(0,255,170,0.14)' : 'rgba(255,255,255,0.08)'}`,
                        color: signedIn ? 'rgba(208,255,240,0.78)' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {signedIn
                        ? 'Saved scenes sync to your account.'
                        : 'Saved scenes stay on this device until you sign in.'}
                    </div>
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
                        Save Scene
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
                        Save
                      </button>
                    </div>
                    {signedIn && localSceneCount > 0 && (
                      <button
                        onClick={onImportLocalScenes}
                        className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                        style={{
                          background: 'rgba(51, 136, 255, 0.08)',
                          border: '1px solid rgba(51, 136, 255, 0.16)',
                          color: '#88CCFF',
                        }}
                      >
                        Import {localSceneCount} Local Scene{localSceneCount === 1 ? '' : 's'}
                      </button>
                    )}
                  </div>
                  {accountPersistenceLoading ? (
                    <p className="text-[10px] py-4" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                      Loading saved scenes…
                    </p>
                  ) : savedScenes.length === 0 ? (
                    <p className="text-[10px] py-4" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                      {signedIn ? 'No account scenes yet.' : 'No saved scenes yet.'}
                    </p>
                  ) : filteredSavedScenes.length === 0 ? (
                    <p className="text-[10px] py-4" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                      No saved {sceneModeLabel.toLowerCase()} scenes yet.
                    </p>
                  ) : (
                    filteredSavedScenes.map((scene) => (
                      <div
                        key={scene.id}
                        className="rounded-lg border p-3"
                        style={baseCardStyle}
                      >
                        {scene.thumbnailDataUrl && (
                          <div className="mb-3 flex justify-center">
                            <img
                              src={scene.thumbnailDataUrl}
                              alt={`${scene.name} thumbnail`}
                              className="w-20 h-20 rounded-lg object-contain border border-white/10 p-1"
                              style={{ background: 'rgba(255,255,255,0.02)' }}
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-mono truncate" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                              {scene.name}
                            </div>
                            <div className="text-[10px] mt-1 font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.32)' }}>
                              {sceneModeLabel}
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
              )}

              {activeSceneTab === 'premium' && (
                <div className="space-y-3">
                  <div
                    className="rounded-lg border p-3"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,170,0,0.08), rgba(255,255,255,0.025))',
                      borderColor: 'rgba(255, 170, 0, 0.16)',
                    }}
                  >
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: '#FFAA00' }}>
                      Pro Scenes
                    </div>
                    <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
                      Browse premium scene packs by mode before unlocking the full library.
                    </p>
                  </div>
                  {filteredPremiumScenes.length === 0 ? (
                    <p className="text-[10px] py-4" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                      No premium {sceneModeLabel.toLowerCase()} scenes yet.
                    </p>
                  ) : filteredPremiumScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="rounded-lg border p-3"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.042), rgba(255,255,255,0.025))',
                        borderColor: 'rgba(255, 170, 0, 0.14)',
                      }}
                    >
                      {scene.thumbnailDataUrl && (
                        <div className="mb-3 flex justify-center">
                          <img
                            src={scene.thumbnailDataUrl}
                            alt={`${scene.name} thumbnail`}
                            className="w-24 h-24 rounded-lg object-contain border border-white/10 p-1 opacity-90"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                          />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.84)' }}>
                            {scene.name}
                          </div>
                          <div className="text-[10px] mt-1 font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.32)' }}>
                            {sceneModeLabel}
                          </div>
                          <div className="text-[10px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
                            {scene.description}
                          </div>
                        </div>
                        <div
                          className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.14em]"
                          style={{ background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.22)', color: '#FFAA00' }}
                        >
                          Pro
                        </div>
                      </div>
                      <button
                        onClick={() => onLoadBuiltInScene(scene.id)}
                        className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                        style={{
                          background: 'rgba(255, 170, 0, 0.1)',
                          border: '1px solid rgba(255, 170, 0, 0.22)',
                          color: '#FFAA00',
                        }}
                      >
                        Load Preview
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EXPORT TAB */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255, 255, 255, 0.62)' }}>
                  Export
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.46)' }}>
                  Export clean stills, short motion loops, or scene files.
                </p>
              </div>

              <div
                className="rounded-lg border p-3 space-y-3"
                style={exportCardStyle}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                  Image Export
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={exportAspect}
                    onChange={(e) => setExportAspect(e.target.value as typeof exportAspect)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                    style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    <option value="landscape" style={{ background: '#181820' }}>Landscape</option>
                    <option value="square" style={{ background: '#181820' }}>Square Post</option>
                    <option value="portrait" style={{ background: '#181820' }}>Wallpaper</option>
                    <option value="story" style={{ background: '#181820' }}>Story</option>
                  </select>
                  <select
                    value={String(exportScale)}
                    onChange={(e) => setExportScale(Number(e.target.value) as 1 | 2 | 4)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                    style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    <option value="1" style={{ background: '#181820' }}>HD</option>
                    <option value="2" style={{ background: '#181820' }}>2K</option>
                    <option value="4" style={{ background: '#181820' }}>4K</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    onExportPng({ aspect: exportAspect, scale: exportScale });
                    setExportNotice('PNG exported. On mobile: Share > Save Image.');
                  }}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
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
                style={exportCardStyle}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                  Motion Export
                </div>
                <div className="grid grid-cols-[1fr,auto] gap-2">
                  <select
                    value={String(videoDuration)}
                    onChange={(e) => setVideoDuration(Number(e.target.value) as 8 | 12)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none focus:border-white/30"
                    style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    <option value="8" style={{ background: '#181820' }}>8s loop</option>
                    <option value="12" style={{ background: '#181820' }}>12s clip</option>
                  </select>
                  <button
                    onClick={() => {
                      void onExportVideo({ durationSeconds: videoDuration });
                      setExportNotice(
                        isIOS
                          ? 'WebM may not save cleanly on iPhone. PNG is more reliable there.'
                          : 'WebM recording started from reset.',
                      );
                    }}
                    disabled={isRecordingVideo}
                    className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5 disabled:opacity-60"
                    style={{
                      background: 'rgba(51, 136, 255, 0.08)',
                      border: '1px solid rgba(51, 136, 255, 0.2)',
                      color: '#88CCFF',
                    }}
                  >
                    {isRecordingVideo ? 'Recording…' : 'Record WebM'}
                  </button>
                </div>
              </div>

              <div
                className="rounded-lg border p-3 space-y-3"
                style={exportCardStyle}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                  Scene Files
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
                  Import Scene
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

              {exportNotice && (
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
              )}

              <div
                className="rounded-lg border p-3 space-y-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                    Export History
                  </div>
                  <div
                    className="rounded-full px-2 py-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                    style={{
                      background: signedIn ? 'rgba(0,255,170,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${signedIn ? 'rgba(0,255,170,0.14)' : 'rgba(255,255,255,0.08)'}`,
                      color: signedIn ? '#00FFAA' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {signedIn ? 'Account' : 'Local Only'}
                  </div>
                </div>
                {!signedIn ? (
                  <div className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
                    Sign in to keep export history attached to your account.
                  </div>
                ) : accountPersistenceLoading ? (
                  <div className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
                    Loading export history…
                  </div>
                ) : exportRecords.length === 0 ? (
                  <div className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
                    No account exports yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exportRecords.map((record) => (
                      <div
                        key={record.id}
                        className="rounded-lg px-3 py-2"
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.78)' }}>
                            {record.sceneName || 'Current Scene'}
                          </div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.46)' }}>
                            {record.type}
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(record.createdAt).toLocaleString()}
                          {record.aspect ? ` · ${record.aspect}` : ''}
                          {record.scale ? ` · ${record.scale}x` : ''}
                          {record.durationSeconds ? ` · ${record.durationSeconds}s` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="rounded-lg border p-3"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  borderColor: 'rgba(255,90,120,0.12)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                      Reset Everything
                    </div>
                    <div className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Restore defaults.
                    </div>
                  </div>
                  <button
                    onClick={onHardReset}
                    className="shrink-0 px-3 py-2 rounded-lg text-[10px] font-mono transition-all duration-200 hover:bg-white/5 flex items-center justify-center gap-1.5"
                    style={{
                      background: 'rgba(255,70,110,0.08)',
                      border: '1px solid rgba(255,70,110,0.16)',
                      color: 'rgba(255,160,180,0.92)',
                    }}
                  >
                    <RotateCcw size={13} />
                    Hard Refresh
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SOUND TAB */}
          {activeTab === 'sound' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255, 255, 255, 0.62)' }}>
                  Sound
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.46)' }}>
                  Choose between Original Tones and Keyed Harmony.
                </p>
              </div>

              <div className="rounded-lg border p-3 space-y-3" style={soundPrimaryCardStyle}>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255, 255, 255, 0.56)' }}>
                    Sound Mode
                  </div>
                  <InfoTip text="Original Tones use the original palette. Keyed Harmony locks the system into a key and scale." />
                </div>
                <select
                  value={harmonySettings.tonePreset}
                  onChange={(e) => onHarmonyChange({ tonePreset: e.target.value as TonePreset })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                  style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  <option value="original" style={{ background: '#181820' }}>Original Tones</option>
                  <option value="scale-quantized" style={{ background: '#181820' }}>Keyed Harmony</option>
                </select>
              </div>

              <div className="rounded-lg border p-3 space-y-3" style={soundSecondaryCardStyle}>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255, 255, 255, 0.52)' }}>
                    Key
                  </div>
                  <InfoTip text="These are global. They define the tonal home base and note palette for the whole system." />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Key Center
                    </label>
                    <InfoTip text="The tonal home base. Changing it shifts the whole mood without changing the rhythm." />
                  </div>
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
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Scale
                    </label>
                    <InfoTip text="The set of notes the system is allowed to use." />
                  </div>
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
              </div>

              <div className="rounded-lg border p-3 space-y-3" style={soundSecondaryCardStyle}>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255, 255, 255, 0.52)' }}>
                    Note Assignment
                  </div>
                  <InfoTip text="Choose whether the app assigns notes automatically or lets each orbit take its own role inside the key." />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Auto Mapping
                    </label>
                    <InfoTip text="When per-orbit roles are off, this decides how the system chooses notes." />
                  </div>
                  <select
                    value={harmonySettings.mappingMode}
                    onChange={(e) => onHarmonyChange({ mappingMode: e.target.value as HarmonyMappingMode })}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                    style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    <option value="color-hue" style={{ background: '#181820' }}>By Color</option>
                    <option value="orbit-index" style={{ background: '#181820' }}>By Orbit Order</option>
                    <option value="pulse-count" style={{ background: '#181820' }}>By Pulse Count</option>
                    <option value="radius" style={{ background: '#181820' }}>By Radius</option>
                  </select>
                </div>

                <button
                  onClick={() => onHarmonyChange({ manualOrbitRoles: !harmonySettings.manualOrbitRoles })}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                  style={{
                    background: harmonySettings.manualOrbitRoles
                      ? 'rgba(0, 255, 170, 0.12)'
                      : 'rgba(255, 255, 255, 0.06)',
                    border: `1px solid ${harmonySettings.manualOrbitRoles ? 'rgba(0, 255, 170, 0.3)' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: harmonySettings.manualOrbitRoles ? '#00FFAA' : 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {harmonySettings.manualOrbitRoles ? 'Orbit Roles: Manual' : 'Orbit Roles: Auto'}
                </button>
                <p className="text-[10px] -mt-1 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.42)' }}>
                  Global key and scale shape the whole system. Orbit roles shape each orbit inside it.
                </p>
              </div>

              <div className="rounded-lg border p-3" style={soundSummaryCardStyle}>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255, 255, 255, 0.56)' }}>
                  Current Sound
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                  {harmonySettings.tonePreset === 'original'
                    ? 'Original Tones are active.'
                    : `${SCALE_PRESETS[harmonySettings.scaleName].label} in ${harmonySettings.rootNote}. ${
                        harmonySettings.manualOrbitRoles
                          ? 'Each orbit can choose its own role.'
                          : `Notes are assigned automatically ${harmonySettings.mappingMode === 'color-hue'
                              ? 'by color'
                              : harmonySettings.mappingMode === 'orbit-index'
                                ? 'by orbit order'
                                : harmonySettings.mappingMode === 'pulse-count'
                                  ? 'by pulse count'
                                  : 'by radius'}.`
                      }`}
                </p>
              </div>
            </div>
          )}

          {/* GEOMETRY TAB */}
          {activeTab === 'geometry' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255, 255, 255, 0.62)' }}>
                  Ratios
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.46)' }}>
                  Shape the core orbit relationships and the geometry they produce.
                </p>
              </div>

              {(geometryMode === 'interference-trace' || geometryMode === 'sweep') && (
                <div className="space-y-3 rounded-lg border p-3" style={ratioCardStyle}>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Pair A
                    </label>
                    <select
                      value={interferenceSettings.sourceOrbitAId ?? ''}
                      onChange={(e) => onInterferenceSettingsChange({ sourceOrbitAId: e.target.value || null })}
                      className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                      style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                    >
                      {orbits.map((orbit, index) => (
                        <option key={orbit.id} value={orbit.id} style={{ background: '#181820' }}>
                          Orbit {index + 1} · {orbit.pulseCount} pulses
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Pair B
                    </label>
                    <select
                      value={interferenceSettings.sourceOrbitBId ?? ''}
                      onChange={(e) => onInterferenceSettingsChange({ sourceOrbitBId: e.target.value || null })}
                      className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                      style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                    >
                      {orbits.map((orbit, index) => (
                        <option key={orbit.id} value={orbit.id} style={{ background: '#181820' }}>
                          Orbit {index + 1} · {orbit.pulseCount} pulses
                        </option>
                      ))}
                    </select>
                  </div>

                  {(geometryMode === 'sweep' || geometryMode === 'interference-trace') && orbits.length >= 3 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {geometryMode === 'sweep' ? 'Sweep C' : 'Interference C'}
                      </label>
                      <select
                        value={interferenceSettings.sourceOrbitCId ?? ''}
                        onChange={(e) => onInterferenceSettingsChange({ sourceOrbitCId: e.target.value || null })}
                        className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                        style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                      >
                        <option value="" style={{ background: '#181820' }}>
                          {geometryMode === 'sweep' ? 'None · Keep pair sweep' : 'None · Keep pair interference'}
                        </option>
                        {orbits.map((orbit, index) => (
                          <option key={orbit.id} value={orbit.id} style={{ background: '#181820' }}>
                            Orbit {index + 1} · {orbit.pulseCount} pulses
                          </option>
                        ))}
                      </select>
                      {interferenceSettings.sourceOrbitCId ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onInterferenceSettingsChange({ sourceOrbitCId: null })}
                            className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                            style={{
                              background: 'rgba(255, 170, 0, 0.08)',
                              border: '1px solid rgba(255, 170, 0, 0.2)',
                              color: '#FFAA00',
                            }}
                          >
                            {geometryMode === 'sweep' ? 'Disable Triad' : 'Disable Triad'}
                          </button>
                          <button
                            onClick={() => onDeleteOrbit(interferenceSettings.sourceOrbitCId!)}
                            className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                            style={{
                              background: 'rgba(255, 70, 110, 0.08)',
                              border: '1px solid rgba(255, 70, 110, 0.18)',
                              color: 'rgba(255, 120, 150, 0.92)',
                            }}
                          >
                            {geometryMode === 'sweep' ? 'Delete Sweep C' : 'Delete Interference C'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {(geometryMode === 'sweep' || geometryMode === 'interference-trace') &&
                  orbits.length >= 4 &&
                  interferenceSettings.sourceOrbitCId ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {geometryMode === 'sweep' ? 'Sweep D' : 'Interference D'}
                      </label>
                      <select
                        value={interferenceSettings.sourceOrbitDId ?? ''}
                        onChange={(e) => onInterferenceSettingsChange({ sourceOrbitDId: e.target.value || null })}
                        className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                        style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                      >
                        <option value="" style={{ background: '#181820' }}>
                          {geometryMode === 'sweep' ? 'None · Keep triad sweep' : 'None · Keep triad interference'}
                        </option>
                        {orbits.map((orbit, index) => (
                          <option key={orbit.id} value={orbit.id} style={{ background: '#181820' }}>
                            Orbit {index + 1} · {orbit.pulseCount} pulses
                          </option>
                        ))}
                      </select>
                      {interferenceSettings.sourceOrbitDId ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => onInterferenceSettingsChange({ sourceOrbitDId: null })}
                            className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                            style={{
                              background: 'rgba(255, 170, 0, 0.08)',
                              border: '1px solid rgba(255, 170, 0, 0.2)',
                              color: '#FFAA00',
                            }}
                          >
                            {geometryMode === 'sweep' ? 'Disable Quartet' : 'Disable Quartet'}
                          </button>
                          <button
                            onClick={() => onDeleteOrbit(interferenceSettings.sourceOrbitDId!)}
                            className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                            style={{
                              background: 'rgba(255, 70, 110, 0.08)',
                              border: '1px solid rgba(255, 70, 110, 0.18)',
                              color: 'rgba(255, 120, 150, 0.92)',
                            }}
                          >
                            {geometryMode === 'sweep' ? 'Delete Sweep D' : 'Delete Interference D'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    onClick={() => onInterferenceSettingsChange({ showConnectors: !interferenceSettings.showConnectors })}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                    style={{
                      background: interferenceSettings.showConnectors ? 'rgba(0, 255, 170, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${interferenceSettings.showConnectors ? 'rgba(0, 255, 170, 0.3)' : 'rgba(255, 255, 255, 0.12)'}`,
                      color: interferenceSettings.showConnectors ? '#00FFAA' : 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    {interferenceSettings.showConnectors ? 'Pair Guide Lines On' : 'Pair Guide Lines Off'}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {Object.entries(PRESET_RATIOS).map(([name, ratios]) => (
                  <button
                    key={name}
                    onClick={() => onLoadPreset(ratios)}
                    className="w-full rounded-lg border px-4 py-3 text-left transition-all duration-200 hover:bg-white/5"
                    style={{
                      background: `linear-gradient(90deg, ${ratioAccentColor}14 0px, ${ratioAccentColor}08 10px, rgba(255, 255, 255, 0.03) 10px, rgba(255, 255, 255, 0.03) 100%)`,
                      borderColor: `${ratioAccentColor}22`,
                      color: 'rgba(255, 255, 255, 0.74)',
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px ${ratioAccentColor}08`,
                    }}
                  >
                    <div className="text-xs font-mono font-light" style={{ color: 'rgba(255, 255, 255, 0.86)' }}>{name}</div>
                    <div className="mt-1 text-[10px]" style={{ color: `${ratioAccentColor}AA` }}>
                      {ratios.join(' : ')}
                    </div>
                  </button>
                ))}
              </div>

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
        input[type='range']:not(.touch-slider)::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: currentColor;
          cursor: pointer;
          box-shadow: 0 0 6px currentColor;
        }
        input[type='range']:not(.touch-slider)::-moz-range-thumb {
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
