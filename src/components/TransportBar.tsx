import ReadAidOption from './ReadAidOption';
import DesktopSidePanel from './DesktopSidePanel';
import OrbitDrawingModeOptions from './OrbitDrawingModeOptions';
import RadialMenu from './RadialMenu';
import StepCountControl from './StepCountControl';
import DesktopInspectorTabs from './DesktopInspectorTabs';
import DesktopTransport from './DesktopTransport';
import PatternActionIcon from './PatternActionIcon';
import OrbitReadAids from './OrbitReadAids';
import FullscreenControls from './FullscreenControls';
// ============================================================
// Orbital Polymeter — Transport Control Bar
// Play/Pause, Tempo, Trace Toggle, Reset, Sidebar Menu
// ============================================================

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Play, Pause, RotateCcw, Menu, Zap, SkipForward, Volume2, VolumeX, CircleHelp, Maximize2, Minimize2, ChevronDown, ChevronUp, RotateCw, ArrowLeftRight, Palette, Trash2, Lock } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { type GeometryMode } from '../lib/geometry';
import {
  DEFAULT_ORBIT_COUNT_MODE,
  ENABLE_STANDARD_TURNS_PER_CYCLE,
  ORBIT_TEMPO_MIN_BPM,
  getOrbitTempoMaxBpm,
  orbitSpeedMultiplierToTempoBpm,
  type OrbitCountMode,
  type OrbitTempoMode,
} from '../lib/orbitalEngine';
import type { RootNote, ScaleName, TonePreset } from '../lib/audioEngine';
import { getRangeValueFromClientX } from '../lib/touchSlider';
import {
  CANVAS_ATMOSPHERE_OPTIONS,
  CANVAS_DISPLAY_THEME_OPTIONS,
  CANVAS_GLOW_OPTIONS,
  type CanvasAtmosphereId,
  type CanvasDisplaySettings,
  type CanvasDisplayThemeId,
  type CanvasGlowLevel,
} from '../lib/canvasDisplayThemes';
import InfoTip from './InfoTip';
import { createPortal } from 'react-dom';
import OrbitAudioMixer, { type OrbitMixUpdates } from './OrbitAudioMixer';
import type { Orbit } from '../lib/orbitalEngine';
import OrbitSoundOptions from './OrbitSoundOptions';
import type { HarmonySettings } from '../lib/audioEngine';

interface TransportBarProps {
  desktopEditRequest?: { orbitId: string; version: number } | null;
  harmonySettings: HarmonySettings;
  onHarmonyChange: (updates: Partial<HarmonySettings>) => void;
  orbitReverb: number;
  onOrbitReverbChange: (value: number) => void;
  audioOrbits: Orbit[];
  onOrbitMixChange: (id: string, updates: OrbitMixUpdates) => void;
  playing: boolean;
  speedMultiplier: number;
  baseBpm: number;
  anchorLabel: string;
  anchorPulseCount: number;
  tempoMode: OrbitTempoMode;
  traceMode: boolean;
  showPlanets: boolean;
  showImpactMarkers: boolean;
  showAlignments: boolean;
  onToggleAlignments: () => void;
  onToggleImpactMarkers: () => void;
  showStartMarkers?: boolean;
  showCenterSun?: boolean;
  traceAura?: boolean;
  outlineOnly?: boolean;
  onToggleOutline?: () => void;
  onToggleTraceAura?: () => void;
  showRatioLabels?: boolean;
  muted: boolean;
  allClockwise: boolean;
  presentationMode: boolean;
  geometryMode: GeometryMode;
  standardTimingMode?: OrbitCountMode;
  showHelp: boolean;
  tonePreset: TonePreset;
  rootNote: RootNote;
  scaleName: ScaleName;
  canvasDisplaySettings: CanvasDisplaySettings;
  quickOrbitControls: Array<{
    id: string;
    label: string;
    pulseCount: number;
    color: string;
    canDelete?: boolean;
  }>;
  onAdjustQuickOrbit: (orbitId: string, delta: number) => void;
  onSetQuickOrbit: (orbitId: string, pulseCount: number) => void;
  onOpenOrbitEditor: (orbitId: string) => void;
  onGeometryModeChange: (mode: GeometryMode) => void;
  onStandardTimingModeChange: (mode: OrbitCountMode) => void;
  onReverseDirections: () => void;
  onAllClockwise: () => void;
  onAlternateDirections: () => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onClearTraces: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleTrace: () => void;
  onTogglePlanets: () => void;
  onToggleStartMarkers: () => void;
  onToggleCenterSun?: () => void;
  onToggleRatioLabels?: () => void;
  onToggleMute: () => void;
  onToggleHelp: () => void;
  onToggleTutorial: () => void;
  guideLabel?: string;
  onTogglePresentation: () => void;
  onRandomPattern: () => void;
  onRemixPattern: () => void;
  onRandomPatternPlus: () => void;
  onSoundModeChange: (tonePreset: TonePreset) => void;
  onRootNoteChange: (rootNote: RootNote) => void;
  onScaleChange: (scaleName: ScaleName) => void;
  onCanvasDisplayChange: (settings: Partial<CanvasDisplaySettings>) => void;
  canvasColorControls?: ReactNode;
  canvasDisplayControls?: ReactNode;
  onOrbitColorChange?: (id: string, color: string) => void;
  activeGuideTarget?: string | null;
  lockedFeatures?: {
    remix?: boolean;
    randomPlus?: boolean;
    soundEditing?: boolean;
    canvasOptions?: boolean;
    colorEditing?: boolean;
    extraOrbits?: boolean;
  };
  onLockedFeature?: (feature: 'remix' | 'random-plus' | 'sound-editing' | 'canvas-options' | 'color-editing' | 'extra-orbits') => void;
  onAddOrbit: () => void;
  onDeleteOrbit: (orbitId: string) => void;
  onReset: () => void;
  onOpenSidebar: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function EditableTempoValue({
  value,
  min,
  max,
  onCommit,
  className = 'text-[14px]',
  ariaLabel = 'Set tempo',
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = useCallback(() => {
    const parsed = Number.parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const nextValue = Math.round(clamp(parsed, min, max));
    setDraft(String(nextValue));
    if (nextValue !== value) {
      onCommit(nextValue);
    }
  }, [draft, max, min, onCommit, value]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.currentTarget.blur();
      }
      if (event.key === 'Escape') {
        setDraft(String(value));
        event.currentTarget.blur();
      }
    },
    [value],
  );

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step="1"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={commitDraft}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      className={`w-full border-0 bg-transparent p-0 text-right font-light leading-none text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${className}`}
      style={{ textShadow: '0 0 12px rgba(255,255,255,0.38)' }}
    />
  );
}

export default function TransportBar({
  desktopEditRequest,
  harmonySettings,
  onHarmonyChange,
  orbitReverb,
  onOrbitReverbChange,
  audioOrbits,
  onOrbitMixChange,
  playing,
  speedMultiplier,
  baseBpm,
  anchorLabel,
  anchorPulseCount,
  tempoMode,
  traceMode,
  showPlanets,
  showImpactMarkers,
  showAlignments,
  onToggleAlignments,
  onToggleImpactMarkers,
  showStartMarkers = true,
  showCenterSun = false,
  traceAura = false,
  outlineOnly = false,
  onToggleOutline,
  onToggleTraceAura,
  showRatioLabels = true,
  muted,
  allClockwise,
  presentationMode,
  geometryMode,
  standardTimingMode = DEFAULT_ORBIT_COUNT_MODE,
  showHelp,
  canvasDisplaySettings,
  quickOrbitControls,
  onAdjustQuickOrbit,
  onSetQuickOrbit,
  onOpenOrbitEditor,
  onGeometryModeChange,
  onStandardTimingModeChange,
  onReverseDirections,
  onAllClockwise,
  onAlternateDirections,
  onTogglePlay,
  onStepForward,
  onClearTraces,
  onSpeedChange,
  onToggleTrace,
  onTogglePlanets,
  onToggleStartMarkers,
  onToggleCenterSun,
  onToggleRatioLabels,
  onToggleMute,
  onToggleHelp,
  onToggleTutorial,
  guideLabel = 'Guide',
  onTogglePresentation,
  onRandomPattern,
  onRemixPattern,
  onRandomPatternPlus,
  onCanvasDisplayChange,
  canvasColorControls,
  canvasDisplayControls,
  onOrbitColorChange,
  activeGuideTarget = null,
  lockedFeatures = {},
  onLockedFeature,
  onAddOrbit,
  onDeleteOrbit,
  onReset,
  onOpenSidebar,
}: TransportBarProps) {
  const isMobile = useIsMobile();
  const desktopOrbitPanelRef = useRef<HTMLDivElement | null>(null);
  const [selectedDesktopOrbitId, setSelectedDesktopOrbitId] = useState<string | null>(null);
  const [desktopOrbitPanelOpen, setDesktopOrbitPanelOpen] = useState(true);
  const [desktopSettingsPanelOpen, setDesktopSettingsPanelOpen] = useState(true);
  useEffect(() => {
    if (desktopEditRequest && !isMobile && !presentationMode) {
      setSelectedDesktopOrbitId(desktopEditRequest.orbitId);
      setDesktopOrbitPanelOpen(true);
    }
  }, [desktopEditRequest, isMobile, presentationMode]);
  const [desktopUtilityPlaybackOpen, setDesktopUtilityPlaybackOpen] = useState(false);
  const [desktopUtilityDirectionOpen, setDesktopUtilityDirectionOpen] = useState(false);
  const [desktopUtilityOverlayOpen, setDesktopUtilityOverlayOpen] = useState(true);
  const [desktopUtilityCanvasOpen, setDesktopUtilityCanvasOpen] = useState(false);
  const [audioMixOpen, setAudioMixOpen] = useState(false);
  const [desktopUtilityAudioOpen, setDesktopUtilityAudioOpen] = useState(false);
  useEffect(() => {
    if (lockedFeatures.soundEditing) {
      setDesktopUtilityAudioOpen(false);
      setDesktopUtilityOverlayOpen(true);
    }
  }, [lockedFeatures.soundEditing]);
  const [desktopOrbitPanelTop, setDesktopOrbitPanelTop] = useState<number | null>(null);
  const closeDesktopUtilitySections = useCallback(() => {
    setDesktopUtilityPlaybackOpen(false);
    setDesktopUtilityDirectionOpen(false);
    setDesktopUtilityOverlayOpen(false);
    setDesktopUtilityCanvasOpen(false);
    setDesktopUtilityAudioOpen(false);
  }, []);
  const toggleDesktopUtilitySection = useCallback(
    (section: 'playback' | 'direction' | 'overlay' | 'canvas' | 'audio') => {
      const isOpen =
        (section === 'playback' && desktopUtilityPlaybackOpen) ||
        (section === 'direction' && desktopUtilityDirectionOpen) ||
        (section === 'overlay' && desktopUtilityOverlayOpen) ||
        (section === 'canvas' && desktopUtilityCanvasOpen) ||
        (section === 'audio' && desktopUtilityAudioOpen);

      closeDesktopUtilitySections();

      if (isOpen) {
        return;
      }

      if (section === 'playback') setDesktopUtilityPlaybackOpen(true);
      if (section === 'direction') setDesktopUtilityDirectionOpen(true);
      if (section === 'overlay') setDesktopUtilityOverlayOpen(true);
      if (section === 'canvas') setDesktopUtilityCanvasOpen(true);
      if (section === 'audio') setDesktopUtilityAudioOpen(true);
    },
    [
      closeDesktopUtilitySections,
      desktopUtilityAudioOpen,
      desktopUtilityCanvasOpen,
      desktopUtilityDirectionOpen,
      desktopUtilityOverlayOpen,
      desktopUtilityPlaybackOpen,
    ],
  );
  const [activeTouchSlider, setActiveTouchSlider] = useState<string | null>(null);
  const anchorTempoMaxBpm = getOrbitTempoMaxBpm(tempoMode);
  const anchorTempoBpm = Math.max(
    ORBIT_TEMPO_MIN_BPM,
    Math.min(
      anchorTempoMaxBpm,
      Math.round(orbitSpeedMultiplierToTempoBpm(speedMultiplier, baseBpm, anchorPulseCount, tempoMode)),
    ),
  );
  const anchorTempoSliderValue = Math.max(
    ORBIT_TEMPO_MIN_BPM,
    Math.min(anchorTempoMaxBpm, orbitSpeedMultiplierToTempoBpm(speedMultiplier, baseBpm, anchorPulseCount, tempoMode)),
  );
  const iconButtonStyle = "px-3 py-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex flex-col items-center gap-1 min-w-[64px]";
  const mobileIconButtonStyle = "px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 flex flex-col items-center gap-1 min-w-[56px]";
  const directionButtonStyle = `rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${isMobile ? 'px-3 py-2' : 'px-3 py-2 hover:scale-105'}`;
  const compactButtonStyle = `rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${isMobile ? 'px-2 py-2' : 'px-2 py-1.5 hover:scale-105'}`;
  const mobilePanelTitleClass = 'text-[11px] font-mono font-semibold uppercase tracking-[0.2em]';
  const mobilePanelTitleStyle = {
    color: 'rgba(255,226,158,0.94)',
    textShadow: '0 0 14px rgba(255,209,102,0.3), 0 0 26px rgba(255,209,102,0.12)',
  } as const;
  const mobilePanelSubtitleClass = 'text-[10px] font-mono font-semibold uppercase tracking-[0.18em]';
  const mobilePanelSubtitleStyle = {
    color: 'rgba(244,250,255,0.86)',
    textShadow: '0 0 12px rgba(255,255,255,0.24), 0 0 22px rgba(136,204,255,0.1)',
  } as const;
  const desktopUtilityButtonStyle = "h-10 rounded-2xl border px-3.5 inline-flex items-center justify-center gap-2 whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.15em] transition-all duration-200 active:scale-[0.98]";
  const desktopDockPanelStyle = {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    backdropFilter: 'none',
  } as const;
  const desktopTempoPanelStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
  } as const;
  const desktopGlowLabelStyle = {
    color: '#88CCFF',
    textShadow: '0 0 14px rgba(136,204,255,0.22)',
  } as const;
  const desktopGeometryGlowLabelStyle = {
    color: '#7DFFD1',
    textShadow: '0 0 14px rgba(0,255,170,0.28)',
  } as const;
  const desktopGeometryPanelStyle = {
    background: `
      radial-gradient(circle at 82% -12%, rgba(125,255,209,0.16), transparent 42%),
      radial-gradient(circle at 10% 0%, rgba(255,255,255,0.08), transparent 38%),
      linear-gradient(145deg, rgba(18,20,28,0.94), rgba(9,11,18,0.86))
    `,
    borderColor: 'rgba(125,255,209,0.16)',
    boxShadow: `
      0 24px 68px rgba(0,0,0,0.38),
      0 0 34px rgba(125,255,209,0.08),
      inset 0 1px 0 rgba(255,255,255,0.08),
      inset 0 -1px 0 rgba(255,255,255,0.03)
    `,
    backdropFilter: 'blur(20px)',
  } as const;
  const desktopTopPanelStyle = {
    background: `
      radial-gradient(circle at 82% -14%, rgba(127,215,255,0.14), transparent 38%),
      radial-gradient(circle at 8% 0%, rgba(136,204,255,0.08), transparent 32%),
      linear-gradient(180deg, rgba(17,17,22,0.92), rgba(17,17,22,0.82))
    `,
    borderColor: 'rgba(127,215,255,0.12)',
    boxShadow: '0 20px 54px rgba(0,0,0,0.26), 0 0 24px rgba(127,215,255,0.055), inset 0 1px 0 rgba(255,255,255,0.06)',
    backdropFilter: 'blur(16px)',
  } as const;
  const desktopSideSectionStyle = {
    background: 'rgba(127,215,255,0.035)',
    border: '1px solid rgba(127,215,255,0.095)',
  } as const;
  const desktopSideSubmenuButtonStyle = "flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-200 hover:bg-white/5";
  const desktopDockButtonStyle = "h-10 rounded-2xl border px-3.5 inline-flex items-center justify-center gap-2 whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.15em] transition-all duration-200 active:scale-[0.98]";
  const desktopDockSquareButtonStyle = "h-10 w-10 rounded-xl border inline-flex items-center justify-center transition-all duration-200 active:scale-[0.98]";
  const lockBadge = (
    <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-white/14 bg-black/38 text-white/68">
      <Lock size={9} strokeWidth={2.4} />
    </span>
  );
  const getLockedStyle = (style: CSSProperties, locked?: boolean): CSSProperties =>
    locked
      ? {
          ...style,
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.44)',
          boxShadow: 'none',
          filter: 'grayscale(0.55)',
        }
      : style;
  const modeDescription =
    geometryMode === 'standard-trace'
      ? ENABLE_STANDARD_TURNS_PER_CYCLE && standardTimingMode === 'turns-per-cycle'
        ? 'Numbers are turns inside one shared cycle. 3 and 7 return home together.'
        : 'Numbers are beats per turn. Lower numbers move faster; higher numbers move slower.'
      : geometryMode === 'interference-trace'
        ? 'Traces one live path from the relationship between the selected orbits.'
        : 'Plots a finite sampled figure from the selected orbits.';
  const standardUsesCycleCount = ENABLE_STANDARD_TURNS_PER_CYCLE && standardTimingMode === 'turns-per-cycle';
  const standardCountLabel = standardUsesCycleCount ? 'Turns / Cycle' : 'Beats / Turn';
  const standardCountShortLabel = standardUsesCycleCount ? 'turns/cycle' : 'beats/turn';
  const standardOrbitSummary =
    standardUsesCycleCount
      ? 'Set how many turns each orbit makes before the shared cycle restarts.'
      : 'Set how many beats each orbit takes to make one turn.';
  const standardOrbitInfo =
    standardUsesCycleCount
      ? 'Each number is rotations in one shared cycle. In 3 against 7, one orbit turns 3 times while the other turns 7 times before they return home together.'
      : 'Each number is beats per turn. Lower numbers orbit faster; higher numbers orbit slower and create longer alignments.';
  const handleTouchSliderPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLInputElement>,
      sliderId: string,
      onValueChange: (value: number) => void,
    ) => {
      if (!isMobile || event.pointerType === 'mouse') {
        return;
      }

      event.preventDefault();
      const input = event.currentTarget;
      input.setPointerCapture?.(event.pointerId);
      setActiveTouchSlider(sliderId);
      onValueChange(getRangeValueFromClientX(input, event.clientX));
    },
    [isMobile],
  );

  const handleTouchSliderPointerMove = useCallback(
    (
      event: ReactPointerEvent<HTMLInputElement>,
      sliderId: string,
      onValueChange: (value: number) => void,
    ) => {
      if (activeTouchSlider !== sliderId) {
        return;
      }

      event.preventDefault();
      onValueChange(getRangeValueFromClientX(event.currentTarget, event.clientX));
    },
    [activeTouchSlider],
  );

  const clearTouchSlider = useCallback((sliderId: string) => {
    setActiveTouchSlider((current) => (current === sliderId ? null : current));
  }, []);
  useEffect(() => {
    if (!isMobile && activeGuideTarget === 'desktop-orbits') {
      setDesktopOrbitPanelOpen(true);
    }
  }, [activeGuideTarget, isMobile]);
  useEffect(() => {
    if (isMobile || presentationMode) {
      setDesktopOrbitPanelTop(null);
      return;
    }

    const updateOrbitPanelTop = () => {
      const nextTop = desktopOrbitPanelRef.current?.getBoundingClientRect().top ?? null;

      setDesktopOrbitPanelTop((currentTop) => {
        if (currentTop == null || nextTop == null) {
          return nextTop;
        }

        return Math.abs(currentTop - nextTop) > 0.5 ? nextTop : currentTop;
      });
    };

    updateOrbitPanelTop();

    const frame = window.requestAnimationFrame(updateOrbitPanelTop);
    window.addEventListener('resize', updateOrbitPanelTop);

    const panel = desktopOrbitPanelRef.current;
    const observer =
      typeof ResizeObserver !== 'undefined' && panel ? new ResizeObserver(updateOrbitPanelTop) : null;

    if (panel) {
      observer?.observe(panel);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateOrbitPanelTop);
      observer?.disconnect();
    };
  }, [desktopOrbitPanelOpen, geometryMode, isMobile, presentationMode, quickOrbitControls.length]);
  const canAddDesktopOrbit =
    (geometryMode === 'standard-trace' ||
      (geometryMode === 'sweep' && quickOrbitControls.length < 4) ||
      (geometryMode === 'interference-trace' && quickOrbitControls.length < 4)) &&
    quickOrbitControls.length < 6;
  const canDeleteDesktopOrbit = geometryMode === 'standard-trace' && quickOrbitControls.length > 1;
  const standardUtilityButtonClass =
    'h-9 rounded-xl border px-2.5 text-[9px] font-mono font-semibold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98]';
  const standardUtilityGroupClass =
    'rounded-xl border border-white/8 bg-white/[0.03] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';
  const getStandardUtilityPillStyle = (
    selected: boolean,
    color: string,
    selectedBackground = `${color}18`,
  ): CSSProperties => ({
    background: selected ? selectedBackground : 'rgba(255,255,255,0.045)',
    borderColor: selected ? `${color}48` : 'rgba(255,255,255,0.1)',
    color: selected ? color : 'rgba(255,255,255,0.62)',
    boxShadow: selected ? `0 0 0 1px ${color}18 inset, 0 0 16px ${color}12` : 'none',
  });
  const getStandardUtilitySectionStyle = (active: boolean, color: string, locked?: boolean): CSSProperties => ({
    background: locked
      ? 'rgba(255,255,255,0.025)'
      : active
        ? `linear-gradient(180deg, ${color}1c, rgba(255,255,255,0.03))`
        : 'rgba(255,255,255,0.03)',
    borderColor: locked ? 'rgba(255,255,255,0.08)' : active ? `${color}2e` : 'rgba(255,255,255,0.08)',
    boxShadow: locked ? 'none' : active ? `0 0 0 1px ${color}14 inset, 0 12px 28px rgba(0,0,0,0.22)` : 'none',
    filter: locked ? 'grayscale(0.45)' : undefined,
  });
  const renderStandardUtilitySection = ({
    label,
    descriptor,
    active,
    color,
    info,
    title,
    onToggle,
    children,
    locked = false,
    lockedFeature,
  }: {
    label: string;
    descriptor: string;
    active: boolean;
    color: string;
    info: string;
    title: string;
    onToggle: () => void;
    children: ReactNode;
    locked?: boolean;
    lockedFeature?: 'sound-editing' | 'canvas-options';
  }) => ['Sound', 'Read Aids', 'Canvas'].includes(label) ? (active && !locked ? <section data-quick-panel={label === 'Sound' ? 'audio' : label === 'Canvas' ? 'canvas' : 'read'} className="desktop-inspector-content">{children}</section> : null) : (
    <div className="rounded-2xl border" style={getStandardUtilitySectionStyle(active, color, locked)}>
      <button
        type="button"
        onClick={() => {
          if (locked && lockedFeature) {
            onLockedFeature?.(lockedFeature);
            return;
          }
          onToggle();
        }}
        className="relative flex w-full items-center justify-center px-12 py-2.5 text-center"
        title={title}
      >
        {locked ? (
          <span className="pointer-events-none absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-black/34 text-white/62">
            <Lock size={10} strokeWidth={2.4} />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col items-center">
          <div
            className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em]"
            style={{
              color: locked ? 'rgba(255,255,255,0.44)' : active ? color : 'rgba(255,255,255,0.72)',
              textShadow: locked ? 'none' : active ? `0 0 12px ${color}38` : 'none',
            }}
          >
            {label}
          </div>
        </div>
        <div
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border text-white/56"
          style={{
            background: locked ? 'rgba(255,255,255,0.035)' : active ? `${color}1f` : 'rgba(255,255,255,0.04)',
            borderColor: locked ? 'rgba(255,255,255,0.08)' : active ? `${color}38` : 'rgba(255,255,255,0.08)',
            color: locked ? 'rgba(255,255,255,0.44)' : active ? color : 'rgba(255,255,255,0.56)',
          }}
        >
          {active ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {active && !locked ? (
        <div className="space-y-2 border-t border-white/8 px-2.5 pb-2.5 pt-2">
          <div className="flex items-start justify-between gap-3 px-0.5">
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em]" style={{ color }}>
                {label}
              </div>
              <div className="mt-0.5 text-[10px] leading-snug text-white/42">
                {descriptor}
              </div>
            </div>
            <InfoTip text={info} />
          </div>
          {children}
        </div>
      ) : null}
    </div>
  );

  const audioMixPanel = audioMixOpen ? createPortal(
    <OrbitAudioMixer harmony={harmonySettings} onHarmonyChange={onHarmonyChange} reverbAmount={orbitReverb} onReverbChange={onOrbitReverbChange} orbits={audioOrbits} muted={muted} onToggleMute={onToggleMute}
      onChange={onOrbitMixChange} onClose={() => setAudioMixOpen(false)}
      onSoundSettings={presentationMode ? undefined : () => { setAudioMixOpen(false); closeDesktopUtilitySections(); setDesktopSettingsPanelOpen(true); setDesktopUtilityAudioOpen(true); }} />,
    document.body,
  ) : null;

  if (presentationMode) {
    return <>
      {audioMixPanel}
      <FullscreenControls playing={playing} muted={muted}
        onTogglePlay={onTogglePlay} onRestart={onReset} onRandom={onRandomPattern}
        onRandomPlus={onRandomPatternPlus} onRemix={onRemixPattern} onToggleMute={onToggleMute} onExit={onTogglePresentation}
        randomPlusLocked={lockedFeatures.randomPlus} remixLocked={lockedFeatures.remix} optionsLabel="Orbit options">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs"><span>Tempo</span>
            <EditableTempoValue value={anchorTempoBpm} min={ORBIT_TEMPO_MIN_BPM} max={anchorTempoMaxBpm} onCommit={onSpeedChange} className="text-sm" ariaLabel="Type exact orbit tempo" />
          </div>
          <input type="range" min={ORBIT_TEMPO_MIN_BPM} max={anchorTempoMaxBpm} step="1" value={anchorTempoSliderValue}
            onChange={(event) => onSpeedChange(parseFloat(event.target.value))}
            onPointerDown={(event) => handleTouchSliderPointerDown(event, 'present-tempo', (value) => onSpeedChange(value))}
            onPointerMove={(event) => handleTouchSliderPointerMove(event, 'present-tempo', (value) => onSpeedChange(value))}
            onPointerUp={() => clearTouchSlider('present-tempo')} onPointerCancel={() => clearTouchSlider('present-tempo')} onBlur={() => clearTouchSlider('present-tempo')}
            data-dragging={activeTouchSlider === 'present-tempo'} className="touch-slider w-full" aria-label={`Set orbit tempo from ${ORBIT_TEMPO_MIN_BPM} to ${anchorTempoMaxBpm} BPM`} />
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/35">{anchorLabel}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onToggleTrace} aria-pressed={traceMode} className="min-h-9 rounded-lg border border-white/10 bg-white/[0.03] text-xs hover:bg-white/[0.07] aria-pressed:bg-white/[0.08] aria-pressed:text-sky-200/80">Trace</button>
          <button type="button" onClick={onToggleAlignments} aria-pressed={showAlignments} className="min-h-9 rounded-lg border border-white/10 bg-white/[0.03] text-xs hover:bg-white/[0.07] aria-pressed:bg-white/[0.08] aria-pressed:text-sky-200/80">Alignments</button>
          <button type="button" onClick={onToggleStartMarkers} aria-pressed={showStartMarkers} className="min-h-9 rounded-lg border border-white/10 bg-white/[0.03] text-xs hover:bg-white/[0.07] aria-pressed:bg-white/[0.08] aria-pressed:text-sky-200/80">Markers</button>
          <button type="button" onClick={onToggleImpactMarkers} aria-pressed={showImpactMarkers} className="min-h-9 rounded-lg border border-white/10 bg-white/[0.03] text-xs hover:bg-white/[0.07] aria-pressed:bg-white/[0.08] aria-pressed:text-sky-200/80">Impacts</button>
          <button type="button" onClick={onTogglePlanets} aria-pressed={showPlanets} className="min-h-9 rounded-lg border border-white/10 bg-white/[0.03] text-xs hover:bg-white/[0.07] aria-pressed:bg-white/[0.08] aria-pressed:text-sky-200/80">Orbits</button>
        </div>
        <button type="button" onClick={() => {
          if (lockedFeatures.soundEditing) { onLockedFeature?.('sound-editing'); return; }
          setAudioMixOpen((open) => !open);
        }} className="flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs hover:bg-white/[0.07]">
          <Volume2 size={14} />Audio{lockedFeatures.soundEditing ? <Lock size={10} /> : null}
        </button>
      </FullscreenControls>
    </>;
  }

  return (
    <div
      className="z-30 pointer-events-none relative h-auto"
      style={{
        position: isMobile ? 'relative' : 'fixed',
        left: isMobile ? undefined : 0,
        right: isMobile ? undefined : 0,
        bottom: isMobile ? undefined : 0,
        top: 'auto',
        paddingBottom: isMobile ? '0px' : '0px',
      }}
    >
      {audioMixPanel}
      <div className={`pointer-events-auto ${isMobile ? 'px-3' : 'px-3 lg:px-6 pt-3'}`}>
        {!isMobile ? (
          <div className="pointer-events-none mb-2">
            <DesktopSidePanel side="left" open={desktopOrbitPanelOpen} onOpen={() => setDesktopOrbitPanelOpen(true)}>
            <div ref={desktopOrbitPanelRef} data-guide="desktop-geometry" className="desktop-orbit-content flex flex-col gap-3">
              <div className="relative flex items-start justify-center gap-3">
                <div className="min-w-0 flex-1 text-center">
                  <div
                    className="text-[10px] font-mono uppercase tracking-[0.2em]"
                    style={desktopGeometryGlowLabelStyle}
                  >
                    Drawing Mode
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Choose how Orbit draws the same orbits.
                  </div>
                </div>
                <div className="absolute right-0 top-0">
                  <InfoTip text="Choose how Orbit turns the same orbits into a shape: Standard connects all orbits, Interference shows how orbits push and pull, and Sweep draws a cleaner outline." />
                </div>
              </div>
              <OrbitDrawingModeOptions horizontal value={geometryMode} onChange={onGeometryModeChange} />
              {ENABLE_STANDARD_TURNS_PER_CYCLE && geometryMode === 'standard-trace' ? (
                <div className="rounded-xl px-2.5 py-2" style={desktopSideSectionStyle}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                      Number Meaning
                    </span>
                    <InfoTip text="This only changes Standard mode. Beats / Turn is the original behavior. Turns / Cycle makes each number mean rotations during one shared loop." />
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
                          className={compactButtonStyle}
                          style={{
                            background: selected ? 'rgba(0, 255, 170, 0.12)' : 'rgba(255, 255, 255, 0.045)',
                            border: `1px solid ${selected ? 'rgba(0, 255, 170, 0.28)' : 'rgba(255, 255, 255, 0.1)'}`,
                            color: selected ? '#00FFAA' : 'rgba(255, 255, 255, 0.66)',
                          }}
                          title={mode === 'turns-per-cycle' ? 'Use rotations per shared cycle' : 'Use beats per turn'}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <p className="desktop-orbit-description text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.42)' }}>
                {modeDescription}
              </p>
              {quickOrbitControls.length > 0 && (
                <div
                  data-guide="desktop-orbits"
                  className="w-full rounded-2xl px-2.5 py-2.5"
                  style={desktopSideSectionStyle}
                >
                  {!desktopOrbitPanelOpen ? <button type="button" className="w-full py-2 text-[10px] text-white/65" onClick={() => setDesktopOrbitPanelOpen(true)}>Edit Orbit</button> : null}
                  {(
                    <div className="mt-2">
                      <div
                        className="space-y-2"
                      >
                        {(() => {
 const orbit = quickOrbitControls.find(orbit => orbit.id === selectedDesktopOrbitId) ?? quickOrbitControls[0];
 return orbit ? <RadialMenu embedded defaultAllOrbits={selectedDesktopOrbitId == null} selectionRequestVersion={desktopEditRequest?.version} x={0} y={0} orbitId={orbit.id} orbitColor={orbit.color} orbitPulseCount={orbit.pulseCount}
 orbitPulseMax={1000} orbitOptions={quickOrbitControls} onSelectOrbit={setSelectedDesktopOrbitId} onAdd={onAddOrbit} addDisabled={!canAddDesktopOrbit}
 colorEditingLocked={lockedFeatures.colorEditing} onLockedFeature={() => onLockedFeature?.('color-editing')}
 onChangePulseCount={onSetQuickOrbit} onChangeColor={(id,color) => onOrbitColorChange?.(id,color)}
 onDelete={id => { if (geometryMode !== 'standard-trace' || canDeleteDesktopOrbit) onDeleteOrbit(id); }} onClose={() => setDesktopOrbitPanelOpen(false)} /> : null;
})()}
                      </div>

                    </div>
                  )}
                </div>
              )}
</div>

            </DesktopSidePanel>
            <DesktopSidePanel side="right" open={desktopSettingsPanelOpen} onOpen={() => setDesktopSettingsPanelOpen(true)}>
            <div data-canvas-quick-settings data-guide="desktop-tools" className="desktop-inspector">
              <div><DesktopInspectorTabs soundLocked={lockedFeatures.soundEditing} canvasLocked={lockedFeatures.canvasOptions} title="Orbit" value={desktopUtilityAudioOpen ? 'sound' : desktopUtilityOverlayOpen ? 'overlay' : desktopUtilityCanvasOpen ? 'canvas' : null}
 onCollapse={() => setDesktopSettingsPanelOpen(false)} onChange={tab => {
 if(tab === 'sound' && lockedFeatures.soundEditing) { onLockedFeature?.('sound-editing'); return; }
 if(tab === 'canvas' && lockedFeatures.canvasOptions) { onLockedFeature?.('canvas-options'); return; }
 closeDesktopUtilitySections();
 setDesktopUtilityAudioOpen(tab === 'sound');setDesktopUtilityOverlayOpen(tab === 'overlay');setDesktopUtilityCanvasOpen(tab === 'canvas');
 }} /></div>


              {(
                <div className="space-y-2 border-t border-white/8 pt-2">




                  {renderStandardUtilitySection({
                    label: 'Read Aids',
                    descriptor: 'Choose how much of the construction process stays visible on the canvas.',
                    active: desktopUtilityOverlayOpen,
                    color: '#FFB86B',
                    title: 'Open read aids',
                    info: 'Trace shows the memory of movement. Orbits shows the moving bodies. Markers shows the starting ticks. Impacts shows the return flashes. Alignments highlights shared returns. Sun adds a glowing center to orbit around. Turn them down when you want the final form to read cleaner.',
                    onToggle: () => toggleDesktopUtilitySection('overlay'),
                    children: (
                      <div className={standardUtilityGroupClass}>
                        <OrbitReadAids
                          guidePrefix="desktop"
                          geometryMode={geometryMode}
                          traceAura={traceAura}
                          outlineOnly={outlineOnly}
                          onToggleOutline={onToggleOutline}
                          onToggleTraceAura={onToggleTraceAura}
                          counts={quickOrbitControls.map(orbit => orbit.pulseCount)}
                          numberMode={geometryMode === 'sweep' ? 'sweep' : ENABLE_STANDARD_TURNS_PER_CYCLE ? standardTimingMode : DEFAULT_ORBIT_COUNT_MODE}
                          trace={traceMode}
                          markers={showStartMarkers}
                          alignments={showAlignments}
                          onToggleAlignments={onToggleAlignments}
                          orbits={showPlanets}
                          onToggleOrbits={onTogglePlanets}
                          impacts={showImpactMarkers}
                          sun={showCenterSun}
                          ratioLabels={showRatioLabels}
                          onToggleTrace={onToggleTrace}
                          onToggleMarkers={onToggleStartMarkers}
                          onToggleImpacts={onToggleImpactMarkers}
                          onToggleSun={onToggleCenterSun}
                          onToggleRatioLabels={onToggleRatioLabels}
                        /><section aria-label="Motion" className="mt-3">
                          <h3 className="mb-1.5 text-[9px] font-mono font-medium uppercase tracking-[0.14em] text-white/40">Motion</h3>
                          <div className="grid grid-cols-2 gap-1.5">
                            <ReadAidOption icon={<RotateCcw size={13} />} onClick={onReverseDirections}>Reverse</ReadAidOption>
                            <ReadAidOption indicator icon={<RotateCw size={13} />} active={allClockwise} onClick={onAllClockwise}>Clockwise</ReadAidOption>
                            <ReadAidOption indicator icon={<ArrowLeftRight size={13} />} active={!allClockwise} onClick={onAlternateDirections}>Alternate</ReadAidOption>
                          </div>
                        </section>
                      </div>
                    ),
                  })}

                  {renderStandardUtilitySection({
                    label: 'Canvas',
                    descriptor: 'Tune the stage so dense ratios stay readable instead of washing out.',
                    active: desktopUtilityCanvasOpen,
                    color: '#88CCFF',
                    title: 'Open canvas controls',
                    info: 'Canvas settings only affect the visual environment: contrast, atmosphere, glow, grid, and axes. They do not change timing or sound.',
                    locked: lockedFeatures.canvasOptions,
                    lockedFeature: 'canvas-options',
                    onToggle: () => toggleDesktopUtilitySection('canvas'),
                    children: (
                      (<>{canvasColorControls}{canvasDisplayControls}</>)
                    ),
                  })}

                  {renderStandardUtilitySection({
                    label: 'Sound',
                    descriptor: 'Decide whether the motion sounds raw or resolves into a musical key.',
                    active: desktopUtilityAudioOpen,
                    color: '#88CCFF',
                    title: 'Open sound controls',
                    info: 'Original keeps the orbit tones direct. In Key maps them into the selected root and note family so complex motion feels more harmonic.',
                    locked: lockedFeatures.soundEditing,
                    lockedFeature: 'sound-editing',
                    onToggle: () => toggleDesktopUtilitySection('audio'),
                    children: (
                      <>
                        <OrbitSoundOptions settings={harmonySettings} onChange={onHarmonyChange} orbits={audioOrbits} muted={muted} onToggleMute={onToggleMute} onOrbitChange={onOrbitMixChange} />
                      </>
                    ),
                  })}
                </div>
              )}
            </div>
            </DesktopSidePanel>
          </div>
        ) : null}
      </div>

      {isMobile ? (
        <div className="px-3 pointer-events-auto">
          <div
            className="rounded-2xl border p-3 space-y-3"
            style={{
              background: 'linear-gradient(to top, rgba(17, 17, 22, 0.95), rgba(17, 17, 22, 0.76))',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className={mobilePanelTitleClass} style={mobilePanelTitleStyle}>
              Playback
            </div>
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={onTogglePlay}
                className={mobileIconButtonStyle}
                style={{
                  background: playing ? 'rgba(255, 51, 102, 0.2)' : 'rgba(0, 255, 170, 0.2)',
                  border: `1px solid ${playing ? 'rgba(255, 51, 102, 0.4)' : 'rgba(0, 255, 170, 0.4)'}`,
                  color: playing ? '#FF3366' : '#00FFAA',
                }}
                title={playing ? 'Pause motion and freeze the current state' : 'Start playback and let the system run continuously'}
              >
                {playing ? <Pause size={20} /> : <Play size={20} />}
                <span className="text-[10px] font-mono uppercase tracking-wider">{playing ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={onStepForward}
                className={mobileIconButtonStyle}
                style={{
                  background: 'rgba(51, 136, 255, 0.16)',
                  border: '1px solid rgba(51, 136, 255, 0.32)',
                  color: '#3388FF',
                }}
                title="Advance the orbit motion by one small step while paused"
              >
                <SkipForward size={20} />
                <span className="text-[10px] font-mono uppercase tracking-wider">Step</span>
              </button>
              <button
                onClick={onReset}
                className={mobileIconButtonStyle}
                style={{
                  background: 'rgba(255, 170, 0, 0.15)',
                  border: '1px solid rgba(255, 170, 0, 0.3)',
                  color: '#FFAA00',
                }}
                title="Reset motion back to the beginning and clear all traces"
              >
                <RotateCcw size={20} />
                <span className="text-[10px] font-mono uppercase tracking-wider">Reset</span>
              </button>
              <button
                onClick={onTogglePresentation}
                className={mobileIconButtonStyle}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}
                title="Enter fullscreen mode"
              >
                <Maximize2 size={18} />
                <span className="text-[10px] font-mono uppercase tracking-wider">Fullscreen</span>
              </button>
              <button
                onClick={onOpenSidebar}
                className={mobileIconButtonStyle}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}
                title="Open menu"
              >
                <Menu size={20} />
                <span className="text-[10px] font-mono uppercase tracking-wider">Menu</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} style={{ color: 'rgba(244,250,255,0.72)', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }} />
                  <span className={mobilePanelSubtitleClass} style={mobilePanelSubtitleStyle}>
                    Tempo
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-white">
                  <div className="w-9">
                    <EditableTempoValue
                      value={anchorTempoBpm}
                      min={ORBIT_TEMPO_MIN_BPM}
                      max={anchorTempoMaxBpm}
                      onCommit={onSpeedChange}
                      className="text-[10px] font-mono"
                      ariaLabel="Type exact orbit tempo"
                    />
                  </div>
                  <span>BPM · {anchorLabel}</span>
                </div>
              </div>
              <input
                type="range"
                min={String(ORBIT_TEMPO_MIN_BPM)}
                max={String(anchorTempoMaxBpm)}
                step="1"
                value={anchorTempoSliderValue}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                onPointerDown={(event) =>
                  handleTouchSliderPointerDown(event, 'mobile-speed', (value) => onSpeedChange(value))
                }
                onPointerMove={(event) =>
                  handleTouchSliderPointerMove(event, 'mobile-speed', (value) => onSpeedChange(value))
                }
                onPointerUp={() => clearTouchSlider('mobile-speed')}
                onPointerCancel={() => clearTouchSlider('mobile-speed')}
                onBlur={() => clearTouchSlider('mobile-speed')}
                data-dragging={activeTouchSlider === 'mobile-speed'}
                className="touch-slider w-full cursor-pointer"
                style={{
                  background: 'transparent',
                  WebkitAppearance: 'none',
                  ['--slider-accent' as string]: '#00FFAA',
                }}
                title={`Anchor tempo (${ORBIT_TEMPO_MIN_BPM} to ${anchorTempoMaxBpm} BPM)`}
              />
            </div>

            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={onToggleTrace}
                className="px-3 py-2 rounded-lg text-[10px] font-mono font-light transition-all duration-200 active:scale-95"
                style={{
                  background: traceMode ? 'rgba(0, 255, 170, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${traceMode ? 'rgba(0, 255, 170, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: traceMode ? '#00FFAA' : 'rgba(255, 255, 255, 0.5)',
                }}
                title="Toggle trace drawing"
              >
                {traceMode ? 'Trace On' : 'Trace Off'}
              </button>
              <button
                onClick={onClearTraces}
                className="px-3 py-2 rounded-lg text-[10px] font-mono font-light transition-all duration-200 active:scale-95"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: 'rgba(255, 255, 255, 0.75)',
                }}
                title="Clear trace history only. Keep the current orbits, speed, and motion state."
              >
                CLEAR
              </button>
              <button
                onClick={() => {
                  if (lockedFeatures.soundEditing) {
                    onLockedFeature?.('sound-editing');
                    return;
                  }
                  setAudioMixOpen((open) => !open);
                }}
                className="relative overflow-hidden px-3 py-2 rounded-lg text-[10px] font-mono font-light transition-all duration-200 active:scale-95"
                style={getLockedStyle({
                  background: muted ? 'rgba(255, 51, 102, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${muted ? 'rgba(255, 51, 102, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: muted ? '#FF7799' : 'rgba(255, 255, 255, 0.6)',
                }, lockedFeatures.soundEditing)}
                title={lockedFeatures.soundEditing ? 'Upgrade for sound controls' : 'Open audio controls'}
              >
                {muted ? 'MUTED' : 'AUDIO'}
                {lockedFeatures.soundEditing ? lockBadge : null}
              </button>
              <button
                onClick={onTogglePlanets}
                className="px-3 py-2 rounded-lg text-[10px] font-mono font-light transition-all duration-200 active:scale-95"
                style={{
                  background: showPlanets ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.12)',
                  border: `1px solid ${showPlanets ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.22)'}`,
                  color: 'rgba(255, 255, 255, 0.75)',
                }}
                title={showPlanets ? 'Hide moving planets and nodes' : 'Show moving planets and nodes'}
              >
                {showPlanets ? 'ORBITS ON' : 'ORBITS OFF'}
              </button>
              <button
                onClick={onToggleHelp}
                className="px-3 py-2 rounded-lg text-[10px] font-mono font-light transition-all duration-200 active:scale-95"
                style={{
                  background: showHelp ? 'rgba(0, 255, 170, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${showHelp ? 'rgba(0, 255, 170, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: showHelp ? '#00FFAA' : 'rgba(255, 255, 255, 0.6)',
                }}
                title="Open guide"
              >
                {guideLabel.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      ) : (
      <DesktopTransport mode="orbit" playing={playing} muted={muted} tempo={anchorTempoBpm} min={ORBIT_TEMPO_MIN_BPM} max={anchorTempoMaxBpm} tempoLabel="BPM" onTempo={onSpeedChange}
 onPlay={onTogglePlay} onRestart={onReset} onRandom={onRandomPattern} onRandomPlus={onRandomPatternPlus} onRemix={onRemixPattern}
 randomPlusLocked={lockedFeatures.randomPlus} remixLocked={lockedFeatures.remix} onAudio={() => setAudioMixOpen(open => !open)} onFullscreen={onTogglePresentation} onGuide={onToggleHelp} onMenu={onOpenSidebar} />
      )}

      {/* Custom range input styling */}
      <style>{`
        input[type='range']:not(.touch-slider)::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00FFAA;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 255, 170, 0.6);
          transition: all 0.2s;
        }
        input[type='range']:not(.touch-slider)::-webkit-slider-thumb:hover {
          width: 18px;
          height: 18px;
          box-shadow: 0 0 12px rgba(0, 255, 170, 0.8);
        }
        input[type='range']:not(.touch-slider)::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00FFAA;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(0, 255, 170, 0.6);
          transition: all 0.2s;
        }
        input[type='range']:not(.touch-slider)::-moz-range-thumb:hover {
          width: 18px;
          height: 18px;
          box-shadow: 0 0 12px rgba(0, 255, 170, 0.8);
        }
      `}</style>
    </div>
  );
}
