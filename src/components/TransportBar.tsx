// ============================================================
// Orbital Polymeter — Transport Control Bar
// Play/Pause, Tempo, Trace Toggle, Reset, Sidebar Menu
// ============================================================

import { useCallback, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Play, Pause, RotateCcw, Menu, Zap, SkipForward, Volume2, VolumeX, CircleHelp, Maximize2, Minimize2, Shuffle, ChevronDown, ChevronUp, Palette, Trash2 } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { type GeometryMode } from '../lib/geometry';
import { ORBIT_TEMPO_MIN_BPM, getOrbitTempoMaxBpm, orbitSpeedMultiplierToTempoBpm, type OrbitTempoMode } from '../lib/orbitalEngine';
import { NOTE_NAMES, SCALE_PRESETS, getFriendlyScaleLabel, type RootNote, type ScaleName, type TonePreset } from '../lib/audioEngine';
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

interface TransportBarProps {
  playing: boolean;
  speedMultiplier: number;
  baseBpm: number;
  anchorLabel: string;
  anchorPulseCount: number;
  tempoMode: OrbitTempoMode;
  traceMode: boolean;
  showPlanets: boolean;
  muted: boolean;
  allClockwise: boolean;
  presentationMode: boolean;
  geometryMode: GeometryMode;
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
  onReverseDirections: () => void;
  onAllClockwise: () => void;
  onAlternateDirections: () => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onClearTraces: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleTrace: () => void;
  onTogglePlanets: () => void;
  onToggleMute: () => void;
  onToggleHelp: () => void;
  onToggleTutorial: () => void;
  onTogglePresentation: () => void;
  onRandomPattern: () => void;
  onRemixPattern: () => void;
  onRandomPatternPlus: () => void;
  onSoundModeChange: (tonePreset: TonePreset) => void;
  onRootNoteChange: (rootNote: RootNote) => void;
  onScaleChange: (scaleName: ScaleName) => void;
  onCanvasDisplayChange: (settings: Partial<CanvasDisplaySettings>) => void;
  onAddOrbit: () => void;
  onDeleteOrbit: (orbitId: string) => void;
  onReset: () => void;
  onOpenSidebar: () => void;
}

export default function TransportBar({
  playing,
  speedMultiplier,
  baseBpm,
  anchorLabel,
  anchorPulseCount,
  tempoMode,
  traceMode,
  showPlanets,
  muted,
  allClockwise,
  presentationMode,
  geometryMode,
  showHelp,
  tonePreset,
  rootNote,
  scaleName,
  canvasDisplaySettings,
  quickOrbitControls,
  onAdjustQuickOrbit,
  onSetQuickOrbit,
  onOpenOrbitEditor,
  onGeometryModeChange,
  onReverseDirections,
  onAllClockwise,
  onAlternateDirections,
  onTogglePlay,
  onStepForward,
  onClearTraces,
  onSpeedChange,
  onToggleTrace,
  onTogglePlanets,
  onToggleMute,
  onToggleHelp,
  onToggleTutorial,
  onTogglePresentation,
  onRandomPattern,
  onRemixPattern,
  onRandomPatternPlus,
  onSoundModeChange,
  onRootNoteChange,
  onScaleChange,
  onCanvasDisplayChange,
  onAddOrbit,
  onDeleteOrbit,
  onReset,
  onOpenSidebar,
}: TransportBarProps) {
  const isMobile = useIsMobile();
  const [desktopOrbitPanelOpen, setDesktopOrbitPanelOpen] = useState(false);
  const [desktopSettingsPanelOpen, setDesktopSettingsPanelOpen] = useState(false);
  const [desktopUtilityPlaybackOpen, setDesktopUtilityPlaybackOpen] = useState(false);
  const [desktopUtilityDirectionOpen, setDesktopUtilityDirectionOpen] = useState(false);
  const [desktopUtilityOverlayOpen, setDesktopUtilityOverlayOpen] = useState(false);
  const [desktopUtilityCanvasOpen, setDesktopUtilityCanvasOpen] = useState(false);
  const [desktopUtilityAudioOpen, setDesktopUtilityAudioOpen] = useState(false);
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
  const modeDescription =
    geometryMode === 'standard-trace'
      ? 'Connects all active orbits into a shared string-art field.'
      : geometryMode === 'interference-trace'
        ? 'Traces one live path from the relationship between the selected orbits.'
        : 'Plots a finite sampled figure from the selected orbits.';
  const minimalModeLabel =
    geometryMode === 'standard-trace'
      ? 'Standard'
      : geometryMode === 'interference-trace'
        ? 'Interference'
        : 'Sweep';
  const cyclePresentationMode = () => {
    onGeometryModeChange(
      geometryMode === 'standard-trace'
        ? 'interference-trace'
        : geometryMode === 'interference-trace'
          ? 'sweep'
          : 'standard-trace',
    );
  };

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
  const togglePresentationDirections = () => {
    if (allClockwise) {
      onAlternateDirections();
      return;
    }
    onAllClockwise();
  };
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
  const getStandardUtilitySectionStyle = (active: boolean, color: string): CSSProperties => ({
    background: active
      ? `linear-gradient(180deg, ${color}1c, rgba(255,255,255,0.03))`
      : 'rgba(255,255,255,0.03)',
    borderColor: active ? `${color}2e` : 'rgba(255,255,255,0.08)',
    boxShadow: active ? `0 0 0 1px ${color}14 inset, 0 12px 28px rgba(0,0,0,0.22)` : 'none',
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
  }: {
    label: string;
    descriptor: string;
    active: boolean;
    color: string;
    info: string;
    title: string;
    onToggle: () => void;
    children: ReactNode;
  }) => (
    <div className="rounded-2xl border" style={getStandardUtilitySectionStyle(active, color)}>
      <button
        type="button"
        onClick={onToggle}
        className="relative flex w-full items-center justify-center px-12 py-2.5 text-center"
        title={title}
      >
        <div className="flex min-w-0 flex-col items-center">
          <div
            className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em]"
            style={{
              color: active ? color : 'rgba(255,255,255,0.72)',
              textShadow: active ? `0 0 12px ${color}38` : 'none',
            }}
          >
            {label}
          </div>
        </div>
        <div
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border text-white/56"
          style={{
            background: active ? `${color}1f` : 'rgba(255,255,255,0.04)',
            borderColor: active ? `${color}38` : 'rgba(255,255,255,0.08)',
            color: active ? color : 'rgba(255,255,255,0.56)',
          }}
        >
          {active ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {active ? (
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

  if (presentationMode) {
    return (
      <div
        className={`fixed z-30 pointer-events-auto ${isMobile ? 'left-3 right-3' : 'left-1/2 bottom-5 -translate-x-1/2'}`}
        style={
          isMobile
            ? { bottom: 'max(12px, calc(env(safe-area-inset-bottom) + 8px))' }
            : undefined
        }
      >
        <div
          className={`rounded-2xl border ${isMobile ? 'px-3 py-3' : 'px-4 py-3'} ${isMobile ? 'flex flex-wrap items-center justify-center gap-2' : 'flex items-center gap-2'}`}
          style={{
            background: 'rgba(17, 17, 22, 0.74)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.28)',
          }}
        >
          {isMobile ? (
            <>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  onClick={cyclePresentationMode}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.16em] transition-all duration-200 active:scale-95"
                  style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  title="Change geometry mode"
                >
                  {minimalModeLabel}
                </button>
                <button
                  onClick={onTogglePlay}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{
                    background: playing ? 'rgba(255, 51, 102, 0.18)' : 'rgba(0, 255, 170, 0.18)',
                    border: `1px solid ${playing ? 'rgba(255, 51, 102, 0.35)' : 'rgba(0, 255, 170, 0.35)'}`,
                    color: playing ? '#FF3366' : '#00FFAA',
                  }}
                  title={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  onClick={onReset}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{ background: 'rgba(255, 170, 0, 0.14)', border: '1px solid rgba(255, 170, 0, 0.28)', color: '#FFAA00' }}
                  title="Reset"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={onRandomPattern}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{ background: 'rgba(51, 136, 255, 0.14)', border: '1px solid rgba(51, 136, 255, 0.28)', color: '#88CCFF' }}
                  title="Random pattern"
                >
                  <Shuffle size={18} />
                </button>
                <button
                  onClick={onRemixPattern}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{ background: 'rgba(0, 255, 170, 0.14)', border: '1px solid rgba(0, 255, 170, 0.28)', color: '#00FFAA' }}
                  title="Refresh the current setup with new color, direction, sound, and speed"
                >
                  <Zap size={18} />
                </button>
                <button
                  onClick={onRandomPatternPlus}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{ background: 'rgba(255, 170, 0, 0.14)', border: '1px solid rgba(255, 170, 0, 0.28)', color: '#FFAA00' }}
                  title="Extended random pattern"
                >
                  <Shuffle size={18} />
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  onClick={togglePresentationDirections}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{
                    background: allClockwise ? 'rgba(51, 136, 255, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${allClockwise ? 'rgba(51, 136, 255, 0.28)' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: allClockwise ? '#88CCFF' : 'rgba(255, 255, 255, 0.74)',
                  }}
                  title={allClockwise ? 'Switch to alternating directions' : 'Set all directions clockwise'}
                >
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <RotateCcw
                      size={13}
                      className="absolute"
                      style={{ transform: allClockwise ? 'translateX(-4px) scaleX(-1)' : 'translateX(-4px)' }}
                    />
                    <RotateCcw
                      size={13}
                      className="absolute"
                      style={allClockwise ? { transform: 'translateX(4px) scaleX(-1)' } : { transform: 'translateX(4px) scaleX(-1)' }}
                    />
                  </span>
                </button>
                <button
                  onClick={onToggleMute}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{
                    background: muted ? 'rgba(255, 51, 102, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${muted ? 'rgba(255, 51, 102, 0.28)' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: muted ? '#FF7799' : 'rgba(255, 255, 255, 0.74)',
                  }}
                  title={muted ? 'Unmute audio' : 'Mute audio'}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  onClick={onTogglePresentation}
                  className="h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.75)' }}
                  title="Exit presentation mode"
                >
                  <Minimize2 size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={cyclePresentationMode}
                className="px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.16em] transition-all duration-200 active:scale-95"
                style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                title="Change geometry mode"
              >
                {minimalModeLabel}
              </button>
              <button
                onClick={onTogglePlay}
                className={`${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
                style={{
                  background: playing ? 'rgba(255, 51, 102, 0.18)' : 'rgba(0, 255, 170, 0.18)',
                  border: `1px solid ${playing ? 'rgba(255, 51, 102, 0.35)' : 'rgba(0, 255, 170, 0.35)'}`,
                  color: playing ? '#FF3366' : '#00FFAA',
                }}
                title={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
          {!isMobile && (
            <button
              onClick={onStepForward}
              className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
              style={{ background: 'rgba(51, 136, 255, 0.14)', border: '1px solid rgba(51, 136, 255, 0.28)', color: '#88CCFF' }}
              title="Step"
            >
              <SkipForward size={18} />
            </button>
          )}
          <button
            onClick={onReset}
            className={`${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
            style={{ background: 'rgba(255, 170, 0, 0.14)', border: '1px solid rgba(255, 170, 0, 0.28)', color: '#FFAA00' }}
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={onRandomPattern}
            className={`${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
            style={{ background: 'rgba(51, 136, 255, 0.14)', border: '1px solid rgba(51, 136, 255, 0.28)', color: '#88CCFF' }}
            title="Random pattern"
          >
            <Shuffle size={18} />
          </button>
          <button
            onClick={onRemixPattern}
            className={`${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
            style={{ background: 'rgba(0, 255, 170, 0.14)', border: '1px solid rgba(0, 255, 170, 0.28)', color: '#00FFAA' }}
            title="Refresh the current setup with new color, direction, sound, and speed"
          >
            <Zap size={18} />
          </button>
          <button
            onClick={onRandomPatternPlus}
            className={`${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
            style={{ background: 'rgba(255, 170, 0, 0.14)', border: '1px solid rgba(255, 170, 0, 0.28)', color: '#FFAA00' }}
            title="Extended random pattern"
          >
            <Shuffle size={18} />
          </button>
          <div className={isMobile ? 'w-2 shrink-0' : 'w-3 shrink-0'} />
          <div className="ml-auto flex items-center gap-2">
          <button
            onClick={togglePresentationDirections}
            className={`${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
            style={{
              background: allClockwise ? 'rgba(51, 136, 255, 0.14)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${allClockwise ? 'rgba(51, 136, 255, 0.28)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: allClockwise ? '#88CCFF' : 'rgba(255, 255, 255, 0.74)',
            }}
            title={allClockwise ? 'Switch to alternating directions' : 'Set all directions clockwise'}
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <RotateCcw
                size={13}
                className="absolute"
                style={{ transform: allClockwise ? 'translateX(-4px) scaleX(-1)' : 'translateX(-4px)' }}
              />
              <RotateCcw
                size={13}
                className="absolute"
                style={{ transform: allClockwise ? 'translateX(4px) scaleX(-1)' : 'translateX(4px) scaleX(-1)' }}
              />
            </span>
          </button>
          <button
            onClick={onToggleMute}
            className={`${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
            style={{
              background: muted ? 'rgba(255, 51, 102, 0.14)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${muted ? 'rgba(255, 51, 102, 0.28)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: muted ? '#FF7799' : 'rgba(255, 255, 255, 0.74)',
            }}
            title={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            onClick={onTogglePresentation}
            className={`${isMobile ? 'h-11 w-11' : 'h-10 w-10'} rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95`}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.75)' }}
            title="Exit presentation mode"
          >
            <Minimize2 size={18} />
          </button>
          </div>
          </>
          )}
        </div>
      </div>
    );
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
      <div className={`pointer-events-auto ${isMobile ? 'px-3' : 'px-3 lg:px-6 pt-3'}`}>
        {!isMobile ? (
          <div className="pointer-events-none mb-2">
            <div
              data-guide="desktop-geometry"
              className="pointer-events-auto fixed left-6 bottom-[6.75rem] z-30 w-[min(420px,calc(100vw-1.5rem))] px-3.5 py-3.5 flex flex-col gap-3 rounded-[1.5rem] border"
              style={{
                ...desktopGeometryPanelStyle,
                transform: 'translateY(-4px)',
              }}
            >
              <div className="relative flex items-start justify-center gap-3">
                <div className="min-w-0 flex-1 text-center">
                  <div
                    className="text-[10px] font-mono uppercase tracking-[0.2em]"
                    style={desktopGeometryGlowLabelStyle}
                  >
                    Geometry Mode
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Select how the rhythm field is interpreted.
                  </div>
                </div>
                <div className="absolute right-0 top-0">
                  <InfoTip text="Choose how Orbit turns the same rhythm layers into shape: Standard connects all layers, Interference derives a moving relationship point, and Sweep draws fixed-radius sweep figures." />
                </div>
              </div>
              <div
                className="flex flex-wrap items-center justify-center gap-2 rounded-xl px-2 py-2"
                style={desktopSideSectionStyle}
              >
                <button
                  onClick={() => onGeometryModeChange('standard-trace')}
                  className={compactButtonStyle}
                  style={{
                    background: geometryMode === 'standard-trace' ? 'rgba(0, 255, 170, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${geometryMode === 'standard-trace' ? 'rgba(0, 255, 170, 0.28)' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: geometryMode === 'standard-trace' ? '#00FFAA' : 'rgba(255, 255, 255, 0.72)',
                  }}
                  title="Use the original connector-based trace geometry"
                >
                  Standard
                </button>
                <button
                  onClick={() => onGeometryModeChange('interference-trace')}
                  className={compactButtonStyle}
                  style={{
                    background: geometryMode === 'interference-trace' ? 'rgba(51, 136, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${geometryMode === 'interference-trace' ? 'rgba(51, 136, 255, 0.28)' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: geometryMode === 'interference-trace' ? '#88CCFF' : 'rgba(255, 255, 255, 0.72)',
                  }}
                  title="Use the derived interference-point trace geometry"
                >
                  Interference
                </button>
                <button
                  onClick={() => onGeometryModeChange('sweep')}
                  className={compactButtonStyle}
                  style={{
                    background: geometryMode === 'sweep' ? 'rgba(255, 170, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${geometryMode === 'sweep' ? 'rgba(255, 170, 0, 0.28)' : 'rgba(255, 255, 255, 0.12)'}`,
                    color: geometryMode === 'sweep' ? '#FFAA00' : 'rgba(255, 255, 255, 0.72)',
                  }}
                  title="Use the original-style fixed-radius sweep geometry"
                >
                  Sweep
                </button>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.42)' }}>
                {modeDescription}
              </p>
              {quickOrbitControls.length > 0 && (
                <div
                  className="w-full rounded-2xl px-2.5 py-2.5"
                  style={desktopSideSectionStyle}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDesktopOrbitPanelOpen((open) => !open)}
                      className="flex min-w-0 flex-1 items-center justify-between rounded-lg px-2 py-1.5 text-left transition-all duration-200 hover:bg-white/5"
                      title="Open orbit controls"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="text-[10px] font-mono uppercase tracking-wider" style={desktopGlowLabelStyle}>
                          Orbits
                        </span>
                        <span className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.36)' }}>
                          {geometryMode === 'standard-trace'
                            ? 'Adjust pulse counts without opening the menu.'
                            : geometryMode === 'interference-trace' && quickOrbitControls.length > 3
                              ? 'Shape the active orbit quartet from the main bar.'
                              : geometryMode === 'interference-trace' && quickOrbitControls.length > 2
                                ? 'Shape the active orbit triad from the main bar.'
                                : geometryMode === 'interference-trace'
                                  ? 'Add one more orbit to unlock the next orbit mode.'
                              : geometryMode === 'sweep' && quickOrbitControls.length > 3
                                ? 'Shape the active orbit quartet from the main bar.'
                                : geometryMode === 'sweep' && quickOrbitControls.length > 2
                                  ? 'Shape the active orbit triad from the main bar.'
                                  : geometryMode === 'sweep'
                                    ? 'Add one more orbit to unlock the next orbit mode.'
                                    : 'Shape the active driver orbits from the main bar.'}
                        </span>
                      </div>
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-md"
                        style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {desktopOrbitPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </button>
                    <InfoTip
                      text={
                        geometryMode === 'standard-trace'
                          ? 'Open orbit controls to adjust each layer pulse count, color, and active orbit list.'
                          : 'Open orbit controls to adjust the layers driving the current derived shape.'
                      }
                    />
                  </div>
                  {desktopOrbitPanelOpen ? (
                    <div className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                      <div
                        className="space-y-2 overflow-y-auto pr-1"
                        style={{ maxHeight: 'min(320px, calc(100vh - 18rem))' }}
                      >
                        {quickOrbitControls.map((orbit) => (
                          <div
                            key={orbit.id}
                            className="rounded-lg border px-2 py-2"
                            style={{
                              borderColor: 'rgba(255, 255, 255, 0.08)',
                              background: 'rgba(255, 255, 255, 0.02)',
                            }}
                          >
                            <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenOrbitEditor(orbit.id)}
                                  className="text-[10px] font-mono uppercase tracking-wider"
                                  style={{ color: orbit.color }}
                                  title={`Edit ${orbit.label} color`}
                                >
                                  {orbit.label}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenOrbitEditor(orbit.id)}
                                  className="flex h-6 w-6 items-center justify-center rounded-md"
                                  style={{
                                    color: orbit.color,
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                  }}
                                  title={`Open ${orbit.label} color picker`}
                                  aria-label={`Open ${orbit.label} color picker`}
                                >
                                  <Palette size={12} />
                                </button>
                              </div>
                              <div className="flex min-w-[14.5rem] items-center justify-center gap-2.5">
                                <button
                                  onClick={() => onAdjustQuickOrbit(orbit.id, -1)}
                                  className="h-8 w-10 rounded-md text-[12px] font-mono"
                                  style={{ color: 'rgba(255, 255, 255, 0.75)', background: 'rgba(255, 255, 255, 0.06)' }}
                                  title={`Lower ${orbit.label} pulse count`}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max="1000"
                                  value={orbit.pulseCount}
                                  onChange={(e) => onSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
                                  onFocus={(e) => e.currentTarget.select()}
                                  className="h-8 w-32 rounded-md border text-center text-[11px] font-mono focus:outline-none"
                                  style={{
                                    color: 'rgba(255, 255, 255, 0.82)',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    borderColor: 'rgba(255, 255, 255, 0.08)',
                                  }}
                                />
                                <button
                                  onClick={() => onAdjustQuickOrbit(orbit.id, 1)}
                                  className="h-8 w-10 rounded-md text-[12px] font-mono"
                                  style={{ color: 'rgba(255, 255, 255, 0.75)', background: 'rgba(255, 255, 255, 0.06)' }}
                                  title={`Raise ${orbit.label} pulse count`}
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex justify-end pr-1">
                                {orbit.canDelete ?? geometryMode === 'standard-trace' ? (
                                  <button
                                    onClick={() => onDeleteOrbit(orbit.id)}
                                    disabled={geometryMode === 'standard-trace' && !canDeleteDesktopOrbit}
                                    className="flex h-8 w-10 items-center justify-center rounded-md text-[11px] font-mono disabled:opacity-35 disabled:cursor-not-allowed"
                                    style={{ color: 'rgba(255, 120, 150, 0.92)', background: 'rgba(255, 70, 110, 0.08)' }}
                                    title={geometryMode === 'standard-trace' && !canDeleteDesktopOrbit ? 'Keep at least one orbit' : `Delete ${orbit.label}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max={geometryMode === 'standard-trace' ? 32 : 100}
                              value={orbit.pulseCount}
                              onChange={(e) => onSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
                              className="touch-slider w-full cursor-pointer"
                              style={{
                                ['--slider-accent' as string]: orbit.color,
                              }}
                              title={`${orbit.label} pulse slider`}
                            />
                          </div>
                        ))}
                      </div>
                      {geometryMode === 'standard-trace' || geometryMode === 'sweep' || geometryMode === 'interference-trace' ? (
                        <div className="mt-2 flex justify-end border-t pt-2" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                          <button
                            onClick={onAddOrbit}
                            disabled={!canAddDesktopOrbit}
                            className="rounded-md px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider disabled:opacity-35 disabled:cursor-not-allowed"
                            style={{
                              color: '#00FFAA',
                              background: 'rgba(0, 255, 170, 0.08)',
                              border: '1px solid rgba(0, 255, 170, 0.18)',
                            }}
                            title={
                              geometryMode === 'sweep'
                                ? canAddDesktopOrbit
                                  ? quickOrbitControls.length > 2
                                    ? 'Add a fourth sweep orbit'
                                    : 'Add a third sweep orbit'
                                  : 'Orbit quartet is already active'
                                : geometryMode === 'interference-trace'
                                  ? canAddDesktopOrbit
                                    ? quickOrbitControls.length > 2
                                      ? 'Add a fourth orbit'
                                      : 'Add a third orbit'
                                    : 'Orbit quartet is already active'
                                  : canAddDesktopOrbit
                                    ? 'Add another orbit'
                                    : 'Maximum of 6 orbits'
                            }
                          >
                            {geometryMode === 'sweep'
                              ? 'Add Orbit'
                              : geometryMode === 'interference-trace'
                                ? 'Add Orbit'
                                : 'Add Orbit'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div
              data-guide="desktop-direction"
              className="pointer-events-auto fixed right-6 bottom-[6.75rem] z-30 w-[min(340px,calc(100vw-1.5rem))] shrink-0 px-3.5 py-3.5 flex flex-col gap-3 rounded-[1.5rem] border"
              style={{
                ...desktopTopPanelStyle,
                transform: 'translateY(-4px)',
              }}
            >
              <div className="relative flex min-h-[32px] items-center justify-end gap-1.5 px-0.5">
                <div
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[11px] font-mono font-semibold uppercase tracking-[0.22em]"
                  style={desktopGlowLabelStyle}
                >
                  Utility
                </div>
                <div className="flex items-center gap-1.5">
                  <InfoTip text="Open quick utility controls for orbit direction behavior and the current sound mode." />
                  <button
                    type="button"
                    onClick={() => setDesktopSettingsPanelOpen((open) => !open)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 active:scale-[0.96]"
                    style={{
                      background: desktopSettingsPanelOpen ? 'rgba(136, 204, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                      borderColor: desktopSettingsPanelOpen ? 'rgba(136, 204, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                      color: desktopSettingsPanelOpen ? '#88CCFF' : 'rgba(255, 255, 255, 0.58)',
                      boxShadow: desktopSettingsPanelOpen
                        ? '0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 0 1px rgba(136,204,255,0.14), 0 0 18px rgba(255,255,255,0.08)'
                        : 'none',
                    }}
                    title={desktopSettingsPanelOpen ? 'Close utility controls' : 'Open utility controls'}
                  >
                    {desktopSettingsPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {!desktopSettingsPanelOpen ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onAllClockwise}
                    className={desktopUtilityButtonStyle}
                    style={{
                      background: allClockwise ? 'rgba(114,241,184,0.16)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${allClockwise ? 'rgba(114,241,184,0.28)' : 'rgba(255,255,255,0.1)'}`,
                      color: allClockwise ? '#72F1B8' : 'rgba(255,255,255,0.72)',
                      boxShadow: allClockwise ? '0 0 0 1px rgba(114,241,184,0.16) inset' : 'none',
                    }}
                    title="Set every orbit to clockwise"
                  >
                    Clockwise
                  </button>
                  <button
                    type="button"
                    onClick={onAlternateDirections}
                    className={desktopUtilityButtonStyle}
                    style={{
                      background: !allClockwise ? 'rgba(127,215,255,0.14)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${!allClockwise ? 'rgba(127,215,255,0.24)' : 'rgba(255,255,255,0.1)'}`,
                      color: !allClockwise ? '#7FD7FF' : 'rgba(255,255,255,0.72)',
                      boxShadow: !allClockwise ? '0 0 0 1px rgba(127,215,255,0.16) inset' : 'none',
                    }}
                    title="Restore alternating clockwise and counterclockwise directions"
                  >
                    Alternate
                  </button>
                </div>
              ) : null}

              {desktopSettingsPanelOpen ? (
                <div className="space-y-2 border-t border-white/8 pt-2">
                  {renderStandardUtilitySection({
                    label: 'Playback',
                    descriptor: 'Manual step and trace reset controls.',
                    active: desktopUtilityPlaybackOpen,
                    color: '#72F1B8',
                    title: 'Open playback utilities',
                    info: 'Playback utilities advance the field manually or clear accumulated trace history without changing the pattern.',
                    onToggle: () => setDesktopUtilityPlaybackOpen((open) => !open),
                    children: (
                      <div className={standardUtilityGroupClass}>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={onStepForward}
                            className={standardUtilityButtonClass}
                            style={getStandardUtilityPillStyle(true, '#88CCFF', 'rgba(136,204,255,0.14)')}
                            title="Advance the geometry by one small step while paused"
                          >
                            Step
                          </button>
                          <button
                            type="button"
                            onClick={onClearTraces}
                            className={standardUtilityButtonClass}
                            style={getStandardUtilityPillStyle(false, '#FFFFFF')}
                            title="Clear accumulated trace history"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ),
                  })}

                  {renderStandardUtilitySection({
                    label: 'Motion',
                    descriptor: 'Set how orbit directions move together.',
                    active: desktopUtilityDirectionOpen,
                    color: '#7FD7FF',
                    title: 'Open motion controls',
                    info: 'Motion controls choose how every orbit rotates: flip all directions, make every orbit clockwise, or restore alternating directions.',
                    onToggle: () => setDesktopUtilityDirectionOpen((open) => !open),
                    children: (
                      <div className={standardUtilityGroupClass}>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={onReverseDirections}
                            className={standardUtilityButtonClass}
                            style={getStandardUtilityPillStyle(false, '#FFFFFF')}
                            title="Flip every orbit to the opposite direction"
                          >
                            Reverse
                          </button>
                          <button
                            type="button"
                            onClick={onAllClockwise}
                            className={standardUtilityButtonClass}
                            style={getStandardUtilityPillStyle(allClockwise, '#72F1B8', 'rgba(114,241,184,0.16)')}
                            title="Set every orbit to clockwise"
                          >
                            Clockwise
                          </button>
                          <button
                            type="button"
                            onClick={onAlternateDirections}
                            className={standardUtilityButtonClass}
                            style={getStandardUtilityPillStyle(!allClockwise, '#7FD7FF', 'rgba(127,215,255,0.14)')}
                            title="Restore alternating clockwise and counterclockwise directions"
                          >
                            Alternate
                          </button>
                        </div>
                      </div>
                    ),
                  })}

                  {renderStandardUtilitySection({
                    label: 'Overlays',
                    descriptor: 'Show or hide drawing guides on the field.',
                    active: desktopUtilityOverlayOpen,
                    color: '#FFB86B',
                    title: 'Open overlay controls',
                    info: 'Overlays change visible trace and marker guides without changing rhythm or sound.',
                    onToggle: () => setDesktopUtilityOverlayOpen((open) => !open),
                    children: (
                      <div className={standardUtilityGroupClass}>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={onToggleTrace}
                            data-guide="desktop-trace"
                            className={standardUtilityButtonClass}
                            style={getStandardUtilityPillStyle(traceMode, '#72F1B8', 'rgba(114,241,184,0.16)')}
                            title="Toggle motion history drawing"
                          >
                            {traceMode ? 'Trace On' : 'Trace Off'}
                          </button>
                          <button
                            type="button"
                            onClick={onTogglePlanets}
                            data-guide="desktop-markers"
                            className={standardUtilityButtonClass}
                            style={getStandardUtilityPillStyle(showPlanets, '#88CCFF', 'rgba(136,204,255,0.14)')}
                            title={showPlanets ? 'Hide orbit markers' : 'Show orbit markers'}
                          >
                            {showPlanets ? 'Markers On' : 'Markers Off'}
                          </button>
                        </div>
                      </div>
                    ),
                  })}

                  {renderStandardUtilitySection({
                    label: 'Canvas',
                    descriptor: 'Adjust background, atmosphere, glow, and grid.',
                    active: desktopUtilityCanvasOpen,
                    color: '#88CCFF',
                    title: 'Open canvas controls',
                    info: 'Canvas controls change the background, atmosphere, and glow without changing the rhythm.',
                    onToggle: () => setDesktopUtilityCanvasOpen((open) => !open),
                    children: (
                      <>
                        <div className={standardUtilityGroupClass}>
                          <div className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-white/64">
                            Background
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {CANVAS_DISPLAY_THEME_OPTIONS.map((option) => {
                              const selected = canvasDisplaySettings.theme === option.id;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => onCanvasDisplayChange({ theme: option.id as CanvasDisplayThemeId })}
                                  className={standardUtilityButtonClass}
                                  style={getStandardUtilityPillStyle(selected, '#88CCFF', 'rgba(136,204,255,0.16)')}
                                  title={option.label}
                                >
                                  {option.shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className={standardUtilityGroupClass}>
                            <div className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-white/64">
                              Effects
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {CANVAS_ATMOSPHERE_OPTIONS.map((option) => {
                                const selected = canvasDisplaySettings.atmosphere === option.id;
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onCanvasDisplayChange({ atmosphere: option.id as CanvasAtmosphereId })}
                                    className={`${standardUtilityButtonClass} px-1.5 text-[8px]`}
                                    style={getStandardUtilityPillStyle(selected, '#72F1B8', 'rgba(114,241,184,0.14)')}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className={standardUtilityGroupClass}>
                            <div className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-white/64">
                              Glow
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {CANVAS_GLOW_OPTIONS.map((option) => {
                                const selected = canvasDisplaySettings.glow === option.id;
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onCanvasDisplayChange({ glow: option.id as CanvasGlowLevel })}
                                    className={`${standardUtilityButtonClass} px-1 text-[8px]`}
                                    style={getStandardUtilityPillStyle(selected, '#FFFFFF', 'rgba(255,255,255,0.12)')}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className={standardUtilityGroupClass}>
                          <div className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-white/64">
                            Grid
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => onCanvasDisplayChange({ squareGrid: true })}
                              className={standardUtilityButtonClass}
                              style={getStandardUtilityPillStyle(canvasDisplaySettings.squareGrid !== false, '#88CCFF', 'rgba(136,204,255,0.16)')}
                              title="Show the square background grid"
                            >
                              Grid On
                            </button>
                            <button
                              type="button"
                              onClick={() => onCanvasDisplayChange({ squareGrid: false })}
                              className={standardUtilityButtonClass}
                              style={getStandardUtilityPillStyle(canvasDisplaySettings.squareGrid === false, '#FFFFFF', 'rgba(255,255,255,0.12)')}
                              title="Hide the square background grid"
                            >
                              Grid Off
                            </button>
                            <button
                              type="button"
                              onClick={() => onCanvasDisplayChange({ centerAxes: true })}
                              className={standardUtilityButtonClass}
                              style={getStandardUtilityPillStyle(canvasDisplaySettings.centerAxes !== false, '#88CCFF', 'rgba(136,204,255,0.16)')}
                              title="Show the center X and Y axis lines"
                            >
                              Axes On
                            </button>
                            <button
                              type="button"
                              onClick={() => onCanvasDisplayChange({ centerAxes: false })}
                              className={standardUtilityButtonClass}
                              style={getStandardUtilityPillStyle(canvasDisplaySettings.centerAxes === false, '#FFFFFF', 'rgba(255,255,255,0.12)')}
                              title="Hide the center X and Y axis lines"
                            >
                              Axes Off
                            </button>
                          </div>
                        </div>
                      </>
                    ),
                  })}

                  {renderStandardUtilitySection({
                    label: 'Sound',
                    descriptor: 'Choose original tones or keyed harmony.',
                    active: desktopUtilityAudioOpen,
                    color: '#88CCFF',
                    title: 'Open sound controls',
                    info: 'Sound switches between the original tone palette and keyed harmony. In Key uses the selected root and note family.',
                    onToggle: () => setDesktopUtilityAudioOpen((open) => !open),
                    children: (
                      <>
                        <div className={standardUtilityGroupClass}>
                          <div className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-white/64">
                            Sound Mode
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => onSoundModeChange('original')}
                              className={standardUtilityButtonClass}
                              style={getStandardUtilityPillStyle(tonePreset === 'original', '#FFFFFF', 'rgba(255,255,255,0.12)')}
                              title="Use the original raw tone palette"
                            >
                              Original
                            </button>
                            <button
                              type="button"
                              onClick={() => onSoundModeChange('scale-quantized')}
                              className={standardUtilityButtonClass}
                              style={getStandardUtilityPillStyle(tonePreset === 'scale-quantized', '#72F1B8', 'rgba(114,241,184,0.16)')}
                              title="Keep orbit notes inside the selected key and note family"
                            >
                              In Key
                            </button>
                          </div>
                        </div>
                        {tonePreset === 'scale-quantized' ? (
                          <div className={standardUtilityGroupClass}>
                            <div className="grid grid-cols-[74px,1fr] gap-2">
                              <div>
                                <div className="mb-1 text-[8px] font-mono uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                                  Key
                                </div>
                                <select
                                  value={rootNote}
                                  onChange={(e) => onRootNoteChange(e.target.value as RootNote)}
                                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-2 py-2 text-[10px] font-mono text-white outline-none"
                                  title="Global key center"
                                >
                                  {NOTE_NAMES.map((note) => (
                                    <option key={note} value={note} style={{ background: '#181820' }}>{note}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <div className="mb-1 text-[8px] font-mono uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                                  Note Family
                                </div>
                                <select
                                  value={scaleName}
                                  onChange={(e) => onScaleChange(e.target.value as ScaleName)}
                                  className="w-full min-w-0 rounded-xl border border-white/8 bg-white/[0.04] px-2 py-2 text-[10px] font-mono text-white outline-none"
                                  title="Global note family"
                                >
                                  {Object.entries(SCALE_PRESETS).map(([name]) => (
                                    <option key={name} value={name} style={{ background: '#181820' }}>{getFriendlyScaleLabel(name as ScaleName)}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ),
                  })}
                </div>
              ) : null}
            </div>
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
                title="Advance the geometry by one small step while paused"
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
                title="Enter presentation mode"
              >
                <Maximize2 size={18} />
                <span className="text-[10px] font-mono uppercase tracking-wider">Present</span>
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
                  <Zap size={14} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  <span className="text-[11px] font-mono" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Tempo
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono"
                  style={{
                    color: '#ffffff',
                    textShadow: '0 0 12px rgba(255,255,255,0.38)',
                  }}
                >
                  {anchorTempoBpm} BPM · {anchorLabel}
                </span>
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
                title="Toggle trace mode (sweep geometry)"
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
                onClick={onToggleMute}
                className="px-3 py-2 rounded-lg text-[10px] font-mono font-light transition-all duration-200 active:scale-95"
                style={{
                  background: muted ? 'rgba(255, 51, 102, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${muted ? 'rgba(255, 51, 102, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: muted ? '#FF7799' : 'rgba(255, 255, 255, 0.6)',
                }}
                title={muted ? 'Unmute audio' : 'Mute audio'}
              >
                {muted ? 'MUTED' : 'AUDIO'}
              </button>
              <button
                onClick={onTogglePlanets}
                className="px-3 py-2 rounded-lg text-[10px] font-mono font-light transition-all duration-200 active:scale-95"
                style={{
                  background: showPlanets ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.12)',
                  border: `1px solid ${showPlanets ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.22)'}`,
                  color: 'rgba(255, 255, 255, 0.75)',
                }}
                title={showPlanets ? 'Hide orbit markers' : 'Show orbit markers'}
              >
                {showPlanets ? 'MARKERS ON' : 'MARKERS OFF'}
              </button>
              <button
                onClick={onToggleHelp}
                className="px-3 py-2 rounded-lg text-[10px] font-mono font-light transition-all duration-200 active:scale-95"
                style={{
                  background: showHelp ? 'rgba(0, 255, 170, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${showHelp ? 'rgba(0, 255, 170, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: showHelp ? '#00FFAA' : 'rgba(255, 255, 255, 0.6)',
                }}
                title="Show quick help"
              >
                HELP
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div
        className="mx-3 lg:mx-6 mb-4 lg:mb-6 flex flex-wrap items-center justify-center xl:justify-between gap-3 rounded-[1.45rem] border px-3.5 py-2.5 pointer-events-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(17,17,22,0.94), rgba(17,17,22,0.84))',
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Left: Playback + Reset + Generators */}
        <div
          data-guide="desktop-playback"
          className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-[1.45rem]"
          style={desktopDockPanelStyle}
        >
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={desktopDockButtonStyle}
            style={{
              background: playing
                ? 'rgba(255,51,102,0.18)'
                : 'rgba(114,241,184,0.16)',
              border: `1px solid ${playing ? 'rgba(255,51,102,0.3)' : 'rgba(114,241,184,0.28)'}`,
              color: playing ? '#FF3366' : '#72F1B8',
              boxShadow: `0 0 0 1px ${playing ? 'rgba(255,51,102,0.16)' : 'rgba(114,241,184,0.16)'} inset`,
            }}
            title={playing ? 'Pause motion and freeze the current state' : 'Start playback and let the system run continuously'}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            <span>
              {playing ? 'Pause' : 'Play'}
            </span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className={desktopUtilityButtonStyle}
            style={{
              background: 'rgba(255,170,0,0.12)',
              border: '1px solid rgba(255,170,0,0.22)',
              color: '#FFAA00',
              boxShadow: '0 0 0 1px rgba(255,170,0,0.14) inset',
            }}
            title="Restart motion back to the beginning and clear all traces"
          >
            <span className="flex items-center gap-2">
              <RotateCcw size={15} />
              <span>Restart</span>
            </span>
          </button>

          <button
            onClick={onRandomPattern}
            className={desktopDockButtonStyle}
            style={{
              background: 'rgba(127,215,255,0.14)',
              border: '1px solid rgba(127,215,255,0.24)',
              color: '#7FD7FF',
              boxShadow: '0 0 0 1px rgba(127,215,255,0.16) inset',
            }}
            title="Generate a curated random pattern with fresh ratios, color, motion, and sound"
          >
            <Shuffle size={15} />
            <span>
              Random
            </span>
          </button>

          <button
            onClick={onRemixPattern}
            className={desktopDockButtonStyle}
            style={{
              background: 'rgba(182,160,255,0.14)',
              border: '1px solid rgba(182,160,255,0.3)',
              color: '#B6A0FF',
              boxShadow: '0 0 0 1px rgba(182,160,255,0.16) inset',
            }}
            title="Refresh the current setup with new color, direction, sound, and speed"
          >
            <Zap size={15} />
            <span>
              Remix
            </span>
          </button>

          <button
            onClick={onRandomPatternPlus}
            className={desktopDockButtonStyle}
            style={{
              background: 'rgba(255,170,0,0.12)',
              border: '1px solid rgba(255,170,0,0.22)',
              color: '#FFAA00',
              boxShadow: '0 0 0 1px rgba(255,170,0,0.14) inset',
            }}
            title="Generate an extended curated random pattern with values up to 100"
          >
            <Shuffle size={15} />
            <span>
              Random+
            </span>
          </button>

        </div>

        {/* Center: Tempo */}
        <div
          data-guide="desktop-speed"
          className="mx-0 xl:mx-3 flex min-w-[420px] max-w-[860px] flex-[1_1_680px] items-center gap-3 lg:gap-4 rounded-2xl px-3 lg:px-4 py-2.5"
          style={desktopTempoPanelStyle}
        >
          <div className="shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(244,250,255,0.82)', textShadow: '0 0 10px rgba(127,215,255,0.14)' }}>
              Tempo
            </div>
            <div className="text-[9px] font-mono uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
              {anchorLabel}
            </div>
          </div>
          <input
            type="range"
            min={String(ORBIT_TEMPO_MIN_BPM)}
            max={String(anchorTempoMaxBpm)}
            step="1"
            value={anchorTempoSliderValue}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="touch-slider min-w-0 flex-1 cursor-pointer"
            style={{
              ['--slider-accent' as string]: '#ffffff',
            }}
            title={`Anchor tempo (${ORBIT_TEMPO_MIN_BPM} to ${anchorTempoMaxBpm} BPM)`}
          />
          <div className="w-[52px] shrink-0 text-right">
            <div
              className="text-[18px] font-light leading-none text-white"
              style={{
                textShadow: '0 0 12px rgba(255,255,255,0.38)',
              }}
            >
              {anchorTempoBpm}
            </div>
            <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.34)' }}>
              BPM
            </div>
          </div>
        </div>

        {/* Right: Audio + Present + Help + Menu */}
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-[1.45rem]" style={desktopDockPanelStyle}>
          <button
            data-guide="desktop-audio"
            onClick={onToggleMute}
            className={desktopUtilityButtonStyle}
            style={{
              background: muted ? 'rgba(255,255,255,0.04)' : 'rgba(127,215,255,0.14)',
              border: `1px solid ${muted ? 'rgba(255,255,255,0.1)' : 'rgba(127,215,255,0.24)'}`,
              color: muted ? 'rgba(255,255,255,0.72)' : '#7FD7FF',
              boxShadow: muted ? 'none' : '0 0 0 1px rgba(127,215,255,0.16) inset',
            }}
            title={muted ? 'Unmute audio' : 'Mute audio'}
          >
            <span className="flex items-center gap-2">
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span>{muted ? 'Unmute' : 'Mute'}</span>
            </span>
          </button>

          <button
            data-guide="desktop-present"
            onClick={onTogglePresentation}
            className={desktopUtilityButtonStyle}
            style={{
              background: presentationMode ? 'rgba(114,241,184,0.16)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${presentationMode ? 'rgba(114,241,184,0.28)' : 'rgba(255,255,255,0.1)'}`,
              color: presentationMode ? '#72F1B8' : 'rgba(255,255,255,0.72)',
              boxShadow: presentationMode ? '0 0 0 1px rgba(114,241,184,0.16) inset' : 'none',
            }}
            title="Enter presentation mode"
          >
            <span className="flex items-center gap-2">
              <Maximize2 size={15} />
              <span>Present</span>
            </span>
          </button>

          <button
            onClick={onToggleHelp}
            className={desktopUtilityButtonStyle}
            style={{
              background: showHelp ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showHelp ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)'}`,
              color: showHelp ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.72)',
            }}
            title="Show quick help"
          >
            <span className="flex items-center gap-2">
              <CircleHelp size={15} />
              <span>Help</span>
            </span>
          </button>

          <button
            onClick={onToggleTutorial}
            className={desktopUtilityButtonStyle}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.72)',
            }}
            title="Open guided tutorial"
          >
            <span>Tutorial</span>
          </button>

          {/* Menu */}
          <button
            data-guide="desktop-menu"
            onClick={onOpenSidebar}
            className={desktopDockSquareButtonStyle}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.72)',
            }}
            title="Open menu"
          >
            <Menu size={17} />
          </button>
        </div>
      </div>
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
