// ============================================================
// Orbital Polymeter — Glassmorphism Sidebar
// Tabs: Geometry, Orbits, Sound, Scenes, Export
// ============================================================

import { X, Plus, Trash2, ChevronDown, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_ORBIT_COUNT_MODE,
  ENABLE_STANDARD_TURNS_PER_CYCLE,
  PRESET_RATIOS,
  type Orbit,
  type OrbitCountMode,
} from '../lib/orbitalEngine';
import InfoTip from './InfoTip';
import AccountPanel from './AccountPanel';
import {
  NOTE_NAMES,
  SCALE_PRESETS,
  getFriendlyScaleLabel,
  type HarmonySettings,
  type RootNote,
  type ScaleName,
  type HarmonyMappingMode,
  type TonePreset,
} from '../lib/audioEngine';
import { useIsMobile } from '../hooks/use-mobile';
import { type GeometryMode, type InterferenceSettings } from '../lib/geometry';
import { VIDEO_EXPORT_ASPECTS, VIDEO_EXPORT_DURATIONS, type VideoExportAspect, type VideoExportDuration } from '../lib/videoExport';

interface OrbitSidebarProps {
  orbits: Orbit[];
  isOpen: boolean;
  currentSurface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow';
  harmonySettings: HarmonySettings;
  geometryMode: GeometryMode;
  standardTimingMode?: OrbitCountMode;
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
  onSurfaceChange: (surface: 'orbital' | 'polyrhythm-study' | 'riff-cycle-study' | 'flow') => void;
  onUpdateOrbit: (id: string, updates: Partial<Orbit>) => void;
  onDeleteOrbit: (id: string) => void;
  onAddOrbit: () => void;
  onLoadPreset: (preset: number[]) => void;
  onReverseDirections: () => void;
  onAllClockwise: () => void;
  onAlternateDirections: () => void;
  onGeometryModeChange: (mode: GeometryMode) => void;
  onStandardTimingModeChange: (mode: OrbitCountMode) => void;
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
  onExportVideo: (options: { durationSeconds: VideoExportDuration; aspect: VideoExportAspect }) => Promise<void> | void;
  onExportMidi: (options: { bars: 4 | 8 | 16 }) => void;
  isRecordingVideo: boolean;
  lockedFeatures?: {
    colorEditing?: boolean;
    export?: boolean;
    soundEditing?: boolean;
    proScenes?: boolean;
  };
  onLockedFeature?: (feature: 'color-editing' | 'export' | 'sound-editing' | 'pro-scenes') => void;
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
  currentSurface,
  harmonySettings,
  geometryMode,
  standardTimingMode = DEFAULT_ORBIT_COUNT_MODE,
  interferenceSettings,
  builtInScenes,
  premiumScenes,
  savedScenes,
  exportRecords,
  signedIn,
  accountPersistenceLoading,
  localSceneCount,
  onClose,
  onSurfaceChange,
  onUpdateOrbit,
  onDeleteOrbit,
  onAddOrbit,
  onLoadPreset,
  onReverseDirections,
  onAllClockwise,
  onAlternateDirections,
  onGeometryModeChange,
  onStandardTimingModeChange,
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
  onExportMidi,
  isRecordingVideo,
  lockedFeatures = {},
  onLockedFeature,
}: OrbitSidebarProps) {
  const isMobile = useIsMobile();
  const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/i.test(navigator.userAgent);
  const [activeTab, setActiveTab] = useState<'account' | 'geometry' | 'orbits' | 'sound' | 'scenes' | 'export'>('scenes');
  const [activeSceneTab, setActiveSceneTab] = useState<'built-in' | 'saved' | 'premium'>('built-in');
  const [activeSceneMode, setActiveSceneMode] = useState<GeometryMode>('standard-trace');
  const [expandedOrbit, setExpandedOrbit] = useState<string | null>(null);
  const [sceneName, setSceneName] = useState('');
  const [exportAspect, setExportAspect] = useState<'landscape' | 'square' | 'portrait' | 'story'>('square');
  const [exportScale, setExportScale] = useState<1 | 2 | 4>(2);
  const [videoDuration, setVideoDuration] = useState<VideoExportDuration>(8);
  const [videoAspect, setVideoAspect] = useState<VideoExportAspect>('canvas');
  const [midiBars, setMidiBars] = useState<4 | 8 | 16>(8);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const exportLocked = Boolean(lockedFeatures.export);
  const promptLockedExport = () => {
    onLockedFeature?.('export');
    setExportNotice('Export is a Pro feature.');
  };
  const promptLockedSound = () => {
    onLockedFeature?.('sound-editing');
  };
  const promptLockedProScene = () => {
    onLockedFeature?.('pro-scenes');
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
  const proScenesLocked = Boolean(lockedFeatures.proScenes);
  const lockedSoundStyle = soundLocked
    ? {
        opacity: 0.68,
        filter: 'grayscale(0.45)',
      }
    : {};
  const currentModeLabel =
    geometryMode === 'standard-trace'
      ? 'Standard'
      : geometryMode === 'interference-trace'
        ? 'Interference'
        : 'Sweep';
  const usesCycleCount =
    ENABLE_STANDARD_TURNS_PER_CYCLE &&
    geometryMode === 'standard-trace' &&
    standardTimingMode === 'turns-per-cycle';
  const orbitCountLabel = usesCycleCount ? 'Turns / Cycle' : 'Beats / Turn';
  const orbitCountSummaryLabel = usesCycleCount ? 'turns/cycle' : 'beats/turn';
  const sectionTitleStyle = {
    color: 'rgba(244, 250, 255, 0.9)',
    textShadow: '0 0 12px rgba(127,215,255,0.14)',
  } as const;
  const mobilePrimaryTitleStyle = {
    color: '#FFD166',
    textShadow: '0 0 14px rgba(255,209,102,0.26)',
  } as const;
  const mobileSubTitleStyle = {
    color: 'rgba(244,250,255,0.9)',
    textShadow: '0 0 12px rgba(255,255,255,0.14)',
  } as const;
  const sectionCopyStyle = {
    color: 'rgba(255, 255, 255, 0.48)',
  } as const;
  const sectionLabelStyle = {
    color: 'rgba(237, 244, 255, 0.86)',
    textShadow: '0 0 10px rgba(127,215,255,0.12)',
  } as const;
  const sectionSecondaryLabelStyle = {
    color: 'rgba(255, 255, 255, 0.4)',
  } as const;
  const baseCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.042), rgba(255,255,255,0.024))',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 32px rgba(0,0,0,0.12)',
  } as const;
  const sceneCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.028))',
    borderColor: 'rgba(0, 255, 170, 0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12)',
  } as const;
  const ratioCardStyle = {
    background: `linear-gradient(180deg, ${
      geometryMode === 'standard-trace'
        ? 'rgba(0,255,170,0.12)'
        : geometryMode === 'interference-trace'
          ? 'rgba(136,204,255,0.12)'
          : 'rgba(255,170,0,0.12)'
    }, rgba(255,255,255,0.028))`,
    borderColor: geometryMode === 'standard-trace' ? 'rgba(0,255,170,0.14)' : geometryMode === 'interference-trace' ? 'rgba(136,204,255,0.14)' : 'rgba(255,170,0,0.14)',
    boxShadow:
      geometryMode === 'standard-trace'
        ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,255,170,0.03)'
        : geometryMode === 'interference-trace'
          ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12), 0 0 0 1px rgba(136,204,255,0.03)'
          : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,170,0,0.03)',
  } as const;
  const ratioAccentColor =
    geometryMode === 'standard-trace'
      ? '#00FFAA'
      : geometryMode === 'interference-trace'
        ? '#88CCFF'
        : '#FFAA00';
  const soundCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.048), rgba(255,255,255,0.028))',
    borderColor: 'rgba(136, 204, 255, 0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12)',
  } as const;
  const soundPrimaryCardStyle = {
    background: 'linear-gradient(180deg, rgba(136,204,255,0.12), rgba(136,204,255,0.04))',
    borderColor: 'rgba(136, 204, 255, 0.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12)',
  } as const;
  const soundSecondaryCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.038), rgba(255,255,255,0.022))',
    borderColor: 'rgba(120, 170, 220, 0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12)',
  } as const;
  const soundSummaryCardStyle = {
    background: 'linear-gradient(180deg, rgba(80,130,190,0.14), rgba(80,130,190,0.045))',
    borderColor: 'rgba(136, 204, 255, 0.16)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12)',
  } as const;
  const exportCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))',
    borderColor: 'rgba(255, 170, 0, 0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 34px rgba(0,0,0,0.12)',
  } as const;
  const mobileSceneCardStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.044), rgba(255,255,255,0.024))',
    borderColor: 'rgba(255, 255, 255, 0.085)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 28px rgba(0,0,0,0.12)',
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
  const mobileSceneFilterShellStyle = {
    background: 'rgba(255,255,255,0.016)',
    borderColor: 'rgba(255,255,255,0.055)',
  } as const;
  const mobileSectionTitleClass = 'text-[12px] font-mono uppercase tracking-[0.22em]';
  const mobileSubTitleClass = 'text-[10px] font-mono uppercase tracking-[0.18em]';
  const getCompactDescription = (description: string) => {
    const firstSentence = description.split('. ')[0]?.trim();
    return firstSentence ? `${firstSentence.replace(/\.$/, '')}.` : description;
  };
  const exportScaleLabel = (scale?: number | null) =>
    scale === 4 ? '4K' : scale === 2 ? '2K' : scale === 1 ? 'HD' : null;
  const tabMeta: Array<{ key: 'account' | 'scenes' | 'geometry' | 'orbits' | 'sound' | 'export'; label: string; activeColor: string }> = isMobile
    ? [
        { key: 'scenes', label: 'Scenes', activeColor: '#7FD7FF' },
        { key: 'export', label: 'Export', activeColor: '#FFAA00' },
        { key: 'account', label: 'Account', activeColor: '#C9D4E5' },
      ]
    : [
        { key: 'scenes', label: 'Scenes', activeColor: '#00FFAA' },
        { key: 'geometry', label: 'Orbit Mode', activeColor: geometryMode === 'standard-trace' ? '#00FFAA' : geometryMode === 'interference-trace' ? '#88CCFF' : '#FFAA00' },
        { key: 'orbits', label: 'Orbits', activeColor: '#FF88C2' },
        { key: 'sound', label: 'Sound', activeColor: '#88CCFF' },
        { key: 'export', label: 'Export', activeColor: '#FFAA00' },
        { key: 'account', label: 'Account', activeColor: '#FFAA00' },
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

  useEffect(() => {
    if (isMobile && isOpen) {
      setActiveTab('scenes');
    }
  }, [isMobile, isOpen]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[3px]"
          onClick={onClose}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed z-50 flex flex-col overflow-hidden ${
          isMobile
            ? 'left-3 right-3 top-3 bottom-3 rounded-[1.5rem] border'
            : 'right-0 top-0 bottom-0 w-[31.5rem]'
        }`}
        style={{
          background: `
            radial-gradient(circle at 88% 6%, rgba(127,215,255,${isMobile ? '0.18' : '0.08'}), transparent ${isMobile ? '34%' : '22%'}),
            radial-gradient(circle at 12% 0%, rgba(0,255,170,${isMobile ? '0.14' : '0.08'}), transparent ${isMobile ? '38%' : '26%'}),
            linear-gradient(180deg, rgba(17, 18, 26, ${isMobile ? '0.94' : '0.98'}), rgba(8, 10, 16, ${isMobile ? '0.9' : '0.96'}))
          `,
          backdropFilter: 'blur(20px)',
          borderColor: isMobile ? 'rgba(127,215,255,0.16)' : undefined,
          borderLeft: isMobile ? undefined : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: isMobile
            ? '0 -28px 90px rgba(0,0,0,0.56), 0 0 54px rgba(127,215,255,0.12), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '-24px 0 60px rgba(0,0,0,0.34)',
          transform: isOpen ? 'translate(0, 0)' : isMobile ? 'translateY(calc(100% + 1rem))' : 'translateX(100%)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {isMobile ? (
          <div className="flex justify-center pt-2">
            <div className="h-1.5 w-12 rounded-full border border-white/10 bg-white/16 shadow-[0_0_18px_rgba(127,215,255,0.16)]" />
          </div>
        ) : null}
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-white/10 ${isMobile ? 'px-4 py-3' : 'p-6'}`}>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: ratioAccentColor,
                  boxShadow: `0 0 18px ${ratioAccentColor}66`,
                }}
              />
              <h2 className="text-sm font-light tracking-[0.24em] uppercase" style={{ color: 'rgba(244,250,255,0.88)', textShadow: '0 0 12px rgba(127,215,255,0.14)' }}>
                {isMobile ? 'Orbit Menu' : 'Orbit Controls'}
              </h2>
            </div>
            {isMobile ? (
              <div className="mt-1 text-[12px] leading-relaxed text-white/42">
                Scenes, export, and account tools for Orbit.
              </div>
            ) : null}
            {!isMobile ? (
              <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/34">
                scenes · export · account
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg transition-colors hover:bg-white/10 ${isMobile ? 'p-3' : 'p-2'}`}
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            title="Close controls"
          >
            <X size={18} />
          </button>
        </div>

        {isMobile ? (
          <div className="border-b border-white/8 px-4 py-3">
            <div data-guide="mobile-mode-switcher" className="rounded-[1.45rem] border px-3.5 py-3.5" style={mobileModeCardStyle}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-mono uppercase tracking-[0.24em]" style={mobilePrimaryTitleStyle}>
                    Mode
                  </div>
                  <div className="mt-1 text-[12px] leading-relaxed text-white/42">
                    Switch between Orbit, Study, and Riff.
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

        {/* Tabs */}
        <div className={`${isMobile ? 'px-3 pt-3 pb-1' : 'px-4 pt-4 pb-2'} border-b border-white/5`}>
          <div
            className={`${isMobile ? 'grid grid-cols-3 gap-1 p-1' : 'flex flex-wrap gap-1.5 p-1.5'} rounded-[1.25rem] border`}
            style={isMobile ? mobilePrimaryTabShellStyle : {
              background: 'rgba(255,255,255,0.028)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
          {tabMeta.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl border text-center font-mono font-light transition-all duration-200 ${isMobile ? 'min-w-0 px-2 py-2 text-[11px]' : 'shrink-0 px-3 py-2.5 text-xs'}`}
              style={{
                color: activeTab === tab.key ? tab.activeColor : 'rgba(255, 255, 255, 0.4)',
                borderColor: activeTab === tab.key ? `${tab.activeColor}36` : 'transparent',
                background: activeTab === tab.key ? `${tab.activeColor}14` : 'transparent',
                boxShadow: activeTab === tab.key ? `inset 0 0 0 1px ${tab.activeColor}18, 0 8px 18px rgba(0,0,0,0.12)` : 'none',
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
            <div className="space-y-3">
              <AccountPanel />
            </div>
          )}

          {/* ORBITS TAB */}
          {activeTab === 'orbits' && (
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={sectionTitleStyle}>
                  Orbits
                </div>
                <p className="text-[11px] mt-2 leading-relaxed" style={sectionCopyStyle}>
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
                    className="rounded-[1.3rem] border transition-all duration-200"
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
                            {orbit.pulseCount} {orbitCountSummaryLabel} · {orbit.direction === 1 ? 'CW' : 'CCW'} · {orbit.radius}px
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
                          <div className="text-[10px] font-mono uppercase tracking-widest" style={sectionSecondaryLabelStyle}>
                            Motion
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={sectionLabelStyle}>
                            {orbitCountLabel}
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
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={sectionLabelStyle}>
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
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={sectionLabelStyle}>
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
                          <div className="text-[10px] font-mono uppercase tracking-widest" style={sectionSecondaryLabelStyle}>
                            Appearance
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-widest" style={sectionLabelStyle}>
                            Color
                          </label>
                          <div className="grid grid-cols-8 gap-1.5 mt-2">
                            {COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  if (lockedFeatures.colorEditing) {
                                    onLockedFeature?.('color-editing');
                                    return;
                                  }
                                  onUpdateOrbit(orbit.id, { color });
                                }}
                                className="relative w-full aspect-square overflow-hidden rounded-md transition-all duration-200 hover:scale-110"
                                style={{
                                  background: lockedFeatures.colorEditing ? 'rgba(255,255,255,0.035)' : color,
                                  boxShadow: !lockedFeatures.colorEditing && orbit.color === color ? `0 0 12px ${color}` : 'none',
                                  border: lockedFeatures.colorEditing
                                    ? '1px solid rgba(255, 255, 255, 0.1)'
                                    : orbit.color === color ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.2)',
                                  filter: lockedFeatures.colorEditing ? 'grayscale(0.6)' : undefined,
                                }}
                              >
                                {lockedFeatures.colorEditing ? (
                                  <span className="pointer-events-none absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/14 bg-black/40 text-white/68">
                                    <Lock size={8} strokeWidth={2.4} />
                                  </span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>

                        {harmonySettings.tonePreset === 'scale-quantized' && harmonySettings.manualOrbitRoles && (
                          <>
                            <div>
                              <div className="text-[10px] font-mono uppercase tracking-widest" style={sectionSecondaryLabelStyle}>
                                Note Role
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-mono uppercase tracking-widest" style={sectionLabelStyle}>
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
                              <label className="text-[10px] font-mono uppercase tracking-widest" style={sectionLabelStyle}>
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
                className="w-full px-4 py-3 rounded-[1.25rem] border border-dashed transition-all duration-200 hover:bg-white/5 flex items-center justify-center gap-2 font-mono text-xs"
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
            <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
              <div className="space-y-1">
                <div className={isMobile ? mobileSectionTitleClass : 'text-[11px] font-mono uppercase tracking-[0.2em]'} style={isMobile ? mobilePrimaryTitleStyle : sectionTitleStyle}>
                  Scenes
                </div>
                <p className="text-[11px] leading-relaxed" style={sectionCopyStyle}>
                  Load a starting point, save your own, or preview Pro scenes.
                </p>
              </div>

              <div className="rounded-[1.15rem] border p-1 flex gap-1" style={isMobile ? mobileSceneSubTabShellStyle : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                {[
                  { key: 'built-in' as const, label: 'Standard', color: '#FFD166' },
                  { key: 'saved' as const, label: 'Saved', color: '#7FD7FF' },
                  { key: 'premium' as const, label: 'Pro', color: '#FF88C2' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveSceneTab(tab.key)}
                    className="flex-1 px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-[0.16em] transition-all duration-200"
                    style={{
                      background: activeSceneTab === tab.key ? `${tab.color}16` : 'transparent',
                      border: `1px solid ${activeSceneTab === tab.key ? `${tab.color}34` : 'transparent'}`,
                      color: activeSceneTab === tab.key ? tab.color : 'rgba(255,255,255,0.42)',
                      boxShadow: activeSceneTab === tab.key ? `inset 0 0 0 1px ${tab.color}10, 0 0 20px ${tab.color}07` : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="rounded-[1rem] border px-1 py-1 flex gap-1" style={isMobile ? mobileSceneFilterShellStyle : { background: 'rgba(255,255,255,0.022)', borderColor: 'rgba(255,255,255,0.065)' }}>
                {sceneModeTabs.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setActiveSceneMode(mode.key)}
                    className="flex-1 px-2 py-1.5 rounded-[0.8rem] text-[8px] font-mono uppercase tracking-[0.14em] transition-all duration-200"
                    style={{
                      background: activeSceneMode === mode.key ? `${mode.color}10` : 'transparent',
                      border: `1px solid ${activeSceneMode === mode.key ? `${mode.color}26` : 'transparent'}`,
                      color: activeSceneMode === mode.key ? mode.color : 'rgba(255,255,255,0.38)',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {activeSceneTab === 'built-in' && (
                <div className="space-y-2.5">
                  {filteredBuiltInScenes.length === 0 ? (
                    <p className="text-[10px] py-4" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                      No {sceneModeLabel.toLowerCase()} scenes in this set yet.
                    </p>
                  ) : filteredBuiltInScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="rounded-2xl border p-3"
                      style={isMobile ? mobileSceneCardStyle : sceneCardStyle}
                    >
                      <div className="flex items-center gap-3">
                        {scene.thumbnailDataUrl ? (
                          <img
                            src={scene.thumbnailDataUrl}
                            alt={`${scene.name} thumbnail`}
                            className={`${isMobile ? 'h-16 w-16' : 'h-24 w-24'} shrink-0 rounded-xl border border-white/10 object-contain p-1`}
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-mono uppercase tracking-[0.16em]" style={isMobile ? mobileSubTitleStyle : { color: 'rgba(255,255,255,0.86)' }}>
                            {scene.name}
                          </div>
                          <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
                            {isMobile ? getCompactDescription(scene.description) : scene.description}
                          </div>
                        </div>
                        <button
                          onClick={() => onLoadBuiltInScene(scene.id)}
                          className="shrink-0 rounded-xl border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] transition-all duration-200 hover:bg-white/5"
                          style={{
                            background: 'rgba(0, 255, 170, 0.08)',
                            borderColor: 'rgba(0, 255, 170, 0.2)',
                            color: '#00FFAA',
                          }}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSceneTab === 'saved' && (
                <div className="space-y-2.5">
                  <div className="space-y-3 rounded-2xl border p-3.5" style={isMobile ? mobileSceneCardStyle : sceneCardStyle}>
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
                        className="rounded-2xl border p-3"
                        style={isMobile ? mobileSceneCardStyle : baseCardStyle}
                      >
                        <div className="flex items-center gap-3">
                          {scene.thumbnailDataUrl ? (
                            <img
                              src={scene.thumbnailDataUrl}
                              alt={`${scene.name} thumbnail`}
                              className="h-14 w-14 shrink-0 rounded-xl object-contain border border-white/10 p-1"
                              style={{ background: 'rgba(255,255,255,0.02)' }}
                            />
                          ) : null}
                          <div className="min-w-0">
                            <div className="truncate text-xs font-mono uppercase tracking-[0.14em]" style={mobileSubTitleStyle}>
                              {scene.name}
                            </div>
                            <div className="text-[10px] mt-1" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                              {new Date(scene.updatedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="ml-auto flex shrink-0 items-center gap-1.5">
                            <button
                              onClick={() => onDeleteScene(scene.id)}
                              className="rounded-lg p-2 transition-colors hover:bg-red-500/10"
                              style={{ color: 'rgba(255, 99, 132, 0.8)' }}
                              title="Delete scene"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
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
                            onClick={() => {
                              if (exportLocked) {
                                promptLockedExport();
                                return;
                              }
                              onExportScene(scene.id);
                            }}
                            className="px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200 hover:bg-white/5"
                            style={{
                              background: 'rgba(0, 255, 170, 0.08)',
                              border: '1px solid rgba(0, 255, 170, 0.2)',
                              color: '#00FFAA',
                              ...lockedExportStyle,
                            }}
                          >
                            {exportLocked ? <span className="inline-flex items-center gap-1.5"><Lock size={11} /> Pro</span> : 'Export'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSceneTab === 'premium' && (
                <div className="space-y-2.5">
                  <div
                    className="rounded-2xl border p-3.5"
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
                      className="rounded-2xl border p-3"
                      style={isMobile ? mobileSceneCardStyle : {
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.042), rgba(255,255,255,0.025))',
                        borderColor: 'rgba(255, 170, 0, 0.14)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {scene.thumbnailDataUrl ? (
                          <img
                            src={scene.thumbnailDataUrl}
                            alt={`${scene.name} thumbnail`}
                            className="h-16 w-16 shrink-0 rounded-xl object-contain border border-white/10 p-1 opacity-90"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-mono uppercase tracking-[0.14em]" style={mobileSubTitleStyle}>
                            {scene.name}
                          </div>
                          <div className="text-[10px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.44)' }}>
                            {isMobile ? getCompactDescription(scene.description) : scene.description}
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
                        onClick={() => {
                          if (proScenesLocked) {
                            promptLockedProScene();
                            return;
                          }
                          onLoadBuiltInScene(scene.id);
                        }}
                        className="mt-3 w-full rounded-xl px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] transition-all duration-200 hover:bg-white/5"
                        style={{
                          background: proScenesLocked ? 'rgba(255,255,255,0.035)' : 'rgba(255, 170, 0, 0.1)',
                          border: proScenesLocked ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255, 170, 0, 0.22)',
                          color: proScenesLocked ? 'rgba(255,255,255,0.5)' : '#FFAA00',
                          filter: proScenesLocked ? 'grayscale(0.45)' : undefined,
                        }}
                      >
                        {proScenesLocked ? <span className="inline-flex items-center justify-center gap-2"><Lock size={11} /> Pro Scene</span> : 'Load Preview'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EXPORT TAB */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className={isMobile ? mobileSectionTitleClass : 'text-[11px] font-mono uppercase tracking-[0.2em]'} style={isMobile ? mobilePrimaryTitleStyle : sectionTitleStyle}>
                  Export
                </div>
                <p className="text-[11px] leading-relaxed" style={sectionCopyStyle}>
                  Save an image, record motion, export MIDI, or move the editable scene.
                </p>
              </div>

              <div
                className="rounded-[1.25rem] border p-3.5 space-y-3"
                style={exportCardStyle}
              >
                <div className="flex items-center gap-2">
                  <div className={mobileSubTitleClass} style={mobilePrimaryTitleStyle}>
                    Image Export
                  </div>
                  <InfoTip text="Choose the crop shape, then choose output size. HD is smallest, 2K is sharper, 4K is best for large posts or prints." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={exportAspect}
                    onChange={(e) => {
                      if (exportLocked) {
                        promptLockedExport();
                        return;
                      }
                      setExportAspect(e.target.value as typeof exportAspect);
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
                    onChange={(e) => {
                      if (exportLocked) {
                        promptLockedExport();
                        return;
                      }
                      setExportScale(Number(e.target.value) as 1 | 2 | 4);
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
                  <div className={mobileSubTitleClass} style={mobilePrimaryTitleStyle}>
                    Motion Export
                  </div>
                  <InfoTip text="Exports the canvas motion as a short MP4 from the start of the cycle. If the browser records WebM first, the app converts it before download." />
                </div>
                <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                  <select
                    value={String(videoDuration)}
                    onChange={(e) => {
                      if (exportLocked) {
                        promptLockedExport();
                        return;
                      }
                      setVideoDuration(Number(e.target.value) as VideoExportDuration);
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
                    onChange={(e) => {
                      if (exportLocked) {
                        promptLockedExport();
                        return;
                      }
                      setVideoAspect(e.target.value as VideoExportAspect);
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
                    {exportLocked ? <span className="inline-flex items-center justify-center gap-2"><Lock size={12} /> Pro</span> : isRecordingVideo ? 'Recording…' : 'Export Video'}
                  </button>
                </div>
              </div>

              <div
                className="rounded-[1.25rem] border p-3.5 space-y-3"
                style={exportCardStyle}
              >
                <div className="flex items-center gap-2">
                  <div className={mobileSubTitleClass} style={mobilePrimaryTitleStyle}>
                    MIDI Export
                  </div>
                  <InfoTip text="Exports note triggers that match the orbit hits. Use this if you want to edit the rhythm in a DAW." />
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
                  Send Orbit hits to a DAW as notes. Choose how many bars to capture.
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([4, 8, 16] as const).map((bars) => (
                    <button
                      key={bars}
                      type="button"
                      onClick={() => {
                        if (exportLocked) {
                          promptLockedExport();
                          return;
                        }
                        setMidiBars(bars);
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-mono transition-all duration-200 hover:bg-white/5"
                      style={{
                        background: midiBars === bars ? 'rgba(127, 215, 255, 0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${midiBars === bars ? 'rgba(127, 215, 255, 0.24)' : 'rgba(255,255,255,0.1)'}`,
                        color: midiBars === bars ? '#7FD7FF' : 'rgba(255,255,255,0.68)',
                        ...lockedExportStyle,
                      }}
                    >
                      {bars} Bars
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (exportLocked) {
                      promptLockedExport();
                      return;
                    }
                    onExportMidi({ bars: midiBars });
                    setExportNotice(`Orbit merged MIDI exported for ${midiBars} bars.`);
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
                  <div className={mobileSubTitleClass} style={mobilePrimaryTitleStyle}>
                    Scene Files
                  </div>
                  <InfoTip text="Scene files save the editable setup, not just a picture. Use them to move a scene between devices." />
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
                className="rounded-[1.25rem] border p-3.5 space-y-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.18em]" style={mobileSubTitleStyle}>
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
                          {exportScaleLabel(record.scale) ? ` · ${exportScaleLabel(record.scale)}` : ''}
                          {record.durationSeconds ? ` · ${record.durationSeconds}s` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SOUND TAB */}
          {activeTab === 'sound' && (
            <div
              className="space-y-4"
              onClickCapture={(event) => {
                if (!soundLocked) return;
                event.preventDefault();
                event.stopPropagation();
                promptLockedSound();
              }}
              style={lockedSoundStyle}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={sectionTitleStyle}>
                    Sound
                  </div>
                  {soundLocked ? <Lock size={13} style={{ color: 'rgba(255,255,255,0.46)' }} /> : null}
                </div>
                <p className="text-[11px] leading-relaxed" style={sectionCopyStyle}>
                  Original keeps the raw sound. In Key keeps notes inside one note family.
                </p>
              </div>

              <div className="rounded-[1.25rem] border p-3.5 space-y-3" style={soundPrimaryCardStyle}>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255, 255, 255, 0.56)' }}>
                    Sound Mode
                  </div>
                  <InfoTip text="Original keeps the raw sound. In Key locks the system into one key and note family." />
                </div>
                <select
                  value={harmonySettings.tonePreset}
                  onChange={(e) => onHarmonyChange({ tonePreset: e.target.value as TonePreset })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                  style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  <option value="original" style={{ background: '#181820' }}>Original</option>
                  <option value="scale-quantized" style={{ background: '#181820' }}>In Key</option>
                </select>
              </div>

              <div className="rounded-[1.25rem] border p-3.5 space-y-3" style={soundSecondaryCardStyle}>
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
                      Note Family
                    </label>
                    <InfoTip text="The set of notes the system is allowed to use." />
                  </div>
                  <select
                    value={harmonySettings.scaleName}
                    onChange={(e) => onHarmonyChange({ scaleName: e.target.value as ScaleName })}
                    className="w-full mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono focus:outline-none"
                    style={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    {Object.entries(SCALE_PRESETS).map(([scaleName]) => (
                      <option key={scaleName} value={scaleName} style={{ background: '#181820' }}>
                        {getFriendlyScaleLabel(scaleName as ScaleName)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-[1.25rem] border p-3.5 space-y-3" style={soundSecondaryCardStyle}>
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

              <div className="rounded-[1.25rem] border p-3.5" style={soundSummaryCardStyle}>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255, 255, 255, 0.56)' }}>
                  Current Sound
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                  {harmonySettings.tonePreset === 'original'
                    ? 'Original sound is active.'
                    : `${getFriendlyScaleLabel(harmonySettings.scaleName, { includeTheory: false })} in ${harmonySettings.rootNote}. ${
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

          {/* ORBIT MODE TAB */}
          {activeTab === 'geometry' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={sectionTitleStyle}>
                  Orbit Mode
                </div>
                <p className="text-[11px] leading-relaxed" style={sectionCopyStyle}>
                  Choose how Orbit draws the core layer relationships.
                </p>
              </div>

              {ENABLE_STANDARD_TURNS_PER_CYCLE && geometryMode === 'standard-trace' && (
                <div className="space-y-3 rounded-[1.25rem] border p-3.5" style={ratioCardStyle}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: '#00FFAA' }}>
                        Number Meaning
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Choose what the orbit numbers mean in Standard mode.
                      </p>
                    </div>
                    <InfoTip text="Beats / Turn is the original behavior. Turns / Cycle means the number is rotations inside one shared loop, so 3 against 7 means 3 turns against 7 turns." />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['beats-per-turn', 'Beats / Turn'],
                      ['turns-per-cycle', 'Turns / Cycle'],
                    ] as const).map(([mode, label]) => {
                      const selected = standardTimingMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onStandardTimingModeChange(mode)}
                          className="rounded-lg border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] transition-all duration-200 hover:bg-white/5"
                          style={{
                            background: selected ? 'rgba(0, 255, 170, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            borderColor: selected ? 'rgba(0, 255, 170, 0.28)' : 'rgba(255, 255, 255, 0.1)',
                            color: selected ? '#00FFAA' : 'rgba(255, 255, 255, 0.66)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.48)' }}>
                    {usesCycleCount
                      ? 'Example: 3 and 7 means one layer rotates 3 times while the other rotates 7 times before the cycle restarts.'
                      : 'Example: 7 means that layer takes 7 beats to make one full turn.'}
                  </p>
                </div>
              )}

              {(geometryMode === 'interference-trace' || geometryMode === 'sweep') && (
                <div className="space-y-3 rounded-[1.25rem] border p-3.5" style={ratioCardStyle}>
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
