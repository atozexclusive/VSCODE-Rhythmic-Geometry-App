// ============================================================
// Orbital Polymeter — Transport Control Bar
// Play/Pause, Speed Multiplier, Trace Toggle, Reset, Sidebar Menu
// ============================================================

import { useState } from 'react';
import { Play, Pause, RotateCcw, Menu, Zap, SkipForward, Eraser, Volume2, VolumeX, CircleHelp, Maximize2, Minimize2, Shuffle, ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { type GeometryMode } from '../lib/geometry';
import { NOTE_NAMES, SCALE_PRESETS, type RootNote, type ScaleName, type TonePreset } from '../lib/audioEngine';
import InfoTip from './InfoTip';

interface TransportBarProps {
  playing: boolean;
  speedMultiplier: number;
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
  quickOrbitControls: Array<{
    id: string;
    label: string;
    pulseCount: number;
    color: string;
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
  onTogglePresentation: () => void;
  onRandomPattern: () => void;
  onRemixPattern: () => void;
  onRandomPatternPlus: () => void;
  onSoundModeChange: (tonePreset: TonePreset) => void;
  onRootNoteChange: (rootNote: RootNote) => void;
  onScaleChange: (scaleName: ScaleName) => void;
  onAddOrbit: () => void;
  onDeleteOrbit: (orbitId: string) => void;
  onReset: () => void;
  onOpenSidebar: () => void;
}

export default function TransportBar({
  playing,
  speedMultiplier,
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
  onTogglePresentation,
  onRandomPattern,
  onRemixPattern,
  onRandomPatternPlus,
  onSoundModeChange,
  onRootNoteChange,
  onScaleChange,
  onAddOrbit,
  onDeleteOrbit,
  onReset,
  onOpenSidebar,
}: TransportBarProps) {
  const isMobile = useIsMobile();
  const [desktopOrbitPanelOpen, setDesktopOrbitPanelOpen] = useState(false);
  const iconButtonStyle = "px-3 py-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex flex-col items-center gap-1 min-w-[64px]";
  const mobileIconButtonStyle = "px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 flex flex-col items-center gap-1 min-w-[56px]";
  const directionButtonStyle = `rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${isMobile ? 'px-3 py-2' : 'px-3 py-2 hover:scale-105'}`;
  const compactButtonStyle = `rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${isMobile ? 'px-2 py-2' : 'px-2 py-1.5 hover:scale-105'}`;
  const desktopUtilityButtonStyle = "px-3 py-2 rounded-lg text-xs font-mono font-light transition-all duration-200 hover:bg-white/6 active:scale-95";
  const modeDescription =
    geometryMode === 'standard-trace'
      ? 'Connects all active orbits into a shared string-art field.'
      : geometryMode === 'interference-trace'
        ? 'Traces one live path from the relationship between the selected pair.'
      : 'Plots a finite sampled figure from the selected pair.';
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
  const togglePresentationDirections = () => {
    if (allClockwise) {
      onAlternateDirections();
      return;
    }
    onAllClockwise();
  };
  const canAddDesktopOrbit =
    (geometryMode === 'standard-trace' || (geometryMode === 'sweep' && quickOrbitControls.length < 3)) &&
    quickOrbitControls.length < 6;
  const canDeleteDesktopOrbit = geometryMode === 'standard-trace' && quickOrbitControls.length > 1;

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
      <div className={`pointer-events-auto ${isMobile ? 'px-3' : 'px-6 pt-3'}`}>
        {!isMobile ? (
          <div className="flex items-center justify-between gap-8 mb-2">
            <div
              data-guide="desktop-geometry"
              className="px-3 py-2 flex flex-col items-center gap-2 rounded-xl border"
              style={{
                marginLeft: 8,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                background: 'rgba(17, 17, 22, 0.22)',
                backdropFilter: 'blur(8px)',
                transform: 'translateY(-4px)',
              }}
            >
              <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Active Geometry
              </div>
              <div
                className="flex items-center gap-2 rounded-lg border px-2 py-1.5"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
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
              <p className="max-w-[380px] text-center text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.42)' }}>
                {modeDescription}
              </p>
              {quickOrbitControls.length > 0 && (
                <div
                  className="w-full rounded-lg border px-2 py-2"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <button
                    onClick={() => setDesktopOrbitPanelOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-all duration-200 hover:bg-white/5"
                    title={geometryMode === 'standard-trace' ? 'Open orbit controls' : 'Open pair controls'}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.46)' }}>
                        {geometryMode === 'standard-trace' ? 'Orbits' : 'Pair'}
                      </span>
                      <span className="text-[10px]" style={{ color: 'rgba(255, 255, 255, 0.36)' }}>
                        {geometryMode === 'standard-trace'
                          ? 'Adjust pulse counts without opening the menu.'
                          : geometryMode === 'sweep' && quickOrbitControls.length > 2
                            ? 'Shape the active sweep triad from the main bar.'
                            : geometryMode === 'sweep'
                              ? 'Add one more orbit to unlock triad sweep.'
                            : 'Shape the active driver pair from the main bar.'}
                      </span>
                    </div>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      {desktopOrbitPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  {desktopOrbitPanelOpen ? (
                    <div className="mt-2 border-t pt-2" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                      {quickOrbitControls.map((orbit) => (
                        <div
                          key={orbit.id}
                          className="rounded-lg border px-2 py-2"
                          style={{
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            background: 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
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
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onAdjustQuickOrbit(orbit.id, -1)}
                                className="h-6 w-6 rounded-md text-[11px] font-mono"
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
                                className="w-12 rounded-md border text-center text-[10px] font-mono focus:outline-none"
                                style={{
                                  color: 'rgba(255, 255, 255, 0.82)',
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  borderColor: 'rgba(255, 255, 255, 0.08)',
                                }}
                              />
                              <button
                                onClick={() => onAdjustQuickOrbit(orbit.id, 1)}
                                className="h-6 w-6 rounded-md text-[11px] font-mono"
                                style={{ color: 'rgba(255, 255, 255, 0.75)', background: 'rgba(255, 255, 255, 0.06)' }}
                                title={`Raise ${orbit.label} pulse count`}
                              >
                                +
                              </button>
                              {geometryMode === 'standard-trace' ? (
                                <button
                                  onClick={() => onDeleteOrbit(orbit.id)}
                                  disabled={!canDeleteDesktopOrbit}
                                  className="h-6 w-6 rounded-md text-[11px] font-mono disabled:opacity-35 disabled:cursor-not-allowed"
                                  style={{ color: 'rgba(255, 120, 150, 0.92)', background: 'rgba(255, 70, 110, 0.08)' }}
                                  title={canDeleteDesktopOrbit ? `Delete ${orbit.label}` : 'Keep at least one orbit'}
                                >
                                  ×
                                </button>
                              ) : geometryMode === 'sweep' && orbit.label === 'Sweep C' ? (
                                <button
                                  onClick={() => onDeleteOrbit(orbit.id)}
                                  className="h-6 w-6 rounded-md text-[11px] font-mono"
                                  style={{ color: 'rgba(255, 120, 150, 0.92)', background: 'rgba(255, 70, 110, 0.08)' }}
                                  title="Delete Sweep C orbit"
                                >
                                  ×
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
                            className="w-full cursor-pointer"
                            style={{ accentColor: orbit.color }}
                            title={`${orbit.label} pulse slider`}
                          />
                        </div>
                      ))}
                      </div>
                      {geometryMode === 'standard-trace' || geometryMode === 'sweep' ? (
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
                                  ? 'Add a third sweep orbit'
                                  : 'Sweep triad is already active'
                                : canAddDesktopOrbit
                                  ? 'Add another orbit'
                                  : 'Maximum of 6 orbits'
                            }
                          >
                            {geometryMode === 'sweep' ? 'Add Sweep Orbit' : 'Add Orbit'}
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
              className="px-3 py-2 flex flex-col items-center justify-center gap-2 rounded-xl border"
              style={{
                marginRight: 8,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                background: 'rgba(17, 17, 22, 0.22)',
                backdropFilter: 'blur(8px)',
                transform: 'translateY(-4px)',
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={onReverseDirections}
                  className={directionButtonStyle}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'rgba(255, 255, 255, 0.78)',
                  }}
                  title="Flip every orbit to the opposite direction"
                >
                  Reverse
                </button>
                <button
                  onClick={onAllClockwise}
                  className={directionButtonStyle}
                  style={{
                    background: 'rgba(0, 255, 170, 0.08)',
                    border: '1px solid rgba(0, 255, 170, 0.2)',
                    color: '#00FFAA',
                  }}
                  title="Set every orbit to clockwise"
                >
                  All CW
                </button>
                <button
                  onClick={onAlternateDirections}
                  className={directionButtonStyle}
                  style={{
                    background: 'rgba(51, 136, 255, 0.08)',
                    border: '1px solid rgba(51, 136, 255, 0.2)',
                    color: '#88CCFF',
                  }}
                  title="Restore alternating clockwise and counterclockwise directions"
                >
                  Alternate
                </button>
              </div>
              <div
                data-guide="desktop-sound"
                className="flex items-center gap-2 rounded-lg border px-2 py-1.5"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSoundModeChange(tonePreset === 'original' ? 'scale-quantized' : 'original')}
                    className={compactButtonStyle}
                    style={{
                      background: tonePreset === 'scale-quantized' ? 'rgba(0, 255, 170, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${tonePreset === 'scale-quantized' ? 'rgba(0, 255, 170, 0.28)' : 'rgba(255, 255, 255, 0.12)'}`,
                      color: tonePreset === 'scale-quantized' ? '#00FFAA' : 'rgba(255, 255, 255, 0.72)',
                    }}
                    title="Switch between the original sound palette and the scale-based harmony mode"
                  >
                    {tonePreset === 'original' ? 'Original Tones' : 'Keyed Harmony'}
                  </button>
                  <InfoTip text="Switch between the original tone palette and keyed harmony." />
                </div>
                {tonePreset === 'scale-quantized' && (
                  <>
                    <select
                      value={rootNote}
                      onChange={(e) => onRootNoteChange(e.target.value as RootNote)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono focus:outline-none"
                      style={{ color: 'rgba(255,255,255,0.82)' }}
                      title="Global key center"
                    >
                      {NOTE_NAMES.map((note) => (
                        <option key={note} value={note} style={{ background: '#181820' }}>{note}</option>
                      ))}
                    </select>
                    <select
                      value={scaleName}
                      onChange={(e) => onScaleChange(e.target.value as ScaleName)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono focus:outline-none"
                      style={{ color: 'rgba(255,255,255,0.82)' }}
                      title="Global scale"
                    >
                      {Object.entries(SCALE_PRESETS).map(([name, scale]) => (
                        <option key={name} value={name} style={{ background: '#181820' }}>{scale.label}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
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
                    Speed {speedMultiplier.toFixed(2)}×
                  </span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  10.0× max
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={speedMultiplier}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: 'linear-gradient(to right, rgba(0, 255, 170, 0.3), rgba(255, 51, 102, 0.3))',
                  WebkitAppearance: 'none',
                }}
                title="Speed multiplier (0.1x to 10.0x)"
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
        className="flex items-center justify-between px-6 py-3 pointer-events-auto"
        style={{
          background: 'linear-gradient(to top, rgba(17, 17, 22, 0.95), rgba(17, 17, 22, 0.7))',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Left: Playback + Step + Clear + Reset */}
        <div data-guide="desktop-playback" className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={iconButtonStyle}
            style={{
              background: playing
                ? 'rgba(255, 51, 102, 0.2)'
                : 'rgba(0, 255, 170, 0.2)',
              border: `1px solid ${playing ? 'rgba(255, 51, 102, 0.4)' : 'rgba(0, 255, 170, 0.4)'}`,
              color: playing ? '#FF3366' : '#00FFAA',
            }}
            title={playing ? 'Pause motion and freeze the current state' : 'Start playback and let the system run continuously'}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
            <span className="text-[10px] font-mono uppercase tracking-wider">
              {playing ? 'Pause' : 'Play'}
            </span>
          </button>

          <button
            onClick={onStepForward}
            className={iconButtonStyle}
            style={{
              background: 'rgba(51, 136, 255, 0.16)',
              border: '1px solid rgba(51, 136, 255, 0.32)',
              color: '#3388FF',
            }}
            title="Advance the geometry by one small step while paused"
          >
            <SkipForward size={20} />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Step
            </span>
          </button>

          <button
            onClick={onClearTraces}
            className={desktopUtilityButtonStyle}
            style={{
              background: 'rgba(255, 255, 255, 0.035)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.52)',
            }}
            title="Clear trace history only. Keep the current orbits, speed, and motion state."
          >
            <span className="flex items-center gap-2">
              <Eraser size={15} />
              <span>Clear</span>
            </span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className={desktopUtilityButtonStyle}
            style={{
              background: 'rgba(255, 170, 0, 0.08)',
              border: '1px solid rgba(255, 170, 0, 0.14)',
              color: 'rgba(255, 196, 96, 0.78)',
            }}
            title="Reset motion back to the beginning and clear all traces"
          >
            <span className="flex items-center gap-2">
              <RotateCcw size={15} />
              <span>Reset</span>
            </span>
          </button>

          <button
            onClick={onRandomPattern}
            className={iconButtonStyle}
            style={{
              background: 'rgba(51, 136, 255, 0.16)',
              border: '1px solid rgba(51, 136, 255, 0.32)',
              color: '#88CCFF',
            }}
            title="Generate a curated random pattern with fresh ratios, color, motion, and sound"
          >
            <Shuffle size={20} />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Random
            </span>
          </button>

          <button
            onClick={onRemixPattern}
            className={iconButtonStyle}
            style={{
              background: 'rgba(0, 255, 170, 0.14)',
              border: '1px solid rgba(0, 255, 170, 0.28)',
              color: '#00FFAA',
            }}
            title="Refresh the current setup with new color, direction, sound, and speed"
          >
            <Zap size={20} />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Remix
            </span>
          </button>

          <button
            onClick={onRandomPatternPlus}
            className={iconButtonStyle}
            style={{
              background: 'rgba(255, 170, 0, 0.14)',
              border: '1px solid rgba(255, 170, 0, 0.28)',
              color: '#FFAA00',
            }}
            title="Generate an extended curated random pattern with values up to 100"
          >
            <Shuffle size={20} />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Random+
            </span>
          </button>
        </div>

        {/* Center: Speed Multiplier */}
        <div data-guide="desktop-speed" className="flex items-center gap-4 flex-1 mx-8">
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
            <span
              className="text-xs font-mono font-light"
              style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            >
              {speedMultiplier.toFixed(2)}×
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="10.0"
            step="0.1"
            value={speedMultiplier}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: 'linear-gradient(to right, rgba(0, 255, 170, 0.3), rgba(255, 51, 102, 0.3))',
              WebkitAppearance: 'none',
            }}
            title="Speed multiplier (0.1x to 10.0x)"
          />
          <span
            className="text-xs font-mono font-light"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          >
            10.0×
          </span>
        </div>

        {/* Right: Trace Toggle + Menu */}
        <div className="flex items-center gap-3">
          <button
            data-guide="desktop-audio"
            onClick={onToggleMute}
            className={desktopUtilityButtonStyle}
            style={{
              background: muted ? 'rgba(255, 51, 102, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${muted ? 'rgba(255, 51, 102, 0.22)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: muted ? '#FF7799' : 'rgba(255, 255, 255, 0.58)',
            }}
            title={muted ? 'Unmute audio' : 'Mute audio'}
          >
            <span className="flex items-center gap-2">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{muted ? 'Muted' : 'Audio'}</span>
            </span>
          </button>

          <button
            data-guide="desktop-markers"
            onClick={onTogglePlanets}
            className={desktopUtilityButtonStyle}
            style={{
              background: showPlanets ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${showPlanets ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.14)'}`,
              color: 'rgba(255, 255, 255, 0.62)',
            }}
            title={showPlanets ? 'Hide orbit markers' : 'Show orbit markers'}
          >
            <span className="flex items-center gap-2">
              <Zap size={16} />
              <span>{showPlanets ? 'Markers' : 'Markers Off'}</span>
            </span>
          </button>

          {/* Trace Toggle */}
          <button
            data-guide="desktop-trace"
            onClick={onToggleTrace}
            className="px-4 py-2 rounded-lg text-xs font-mono font-light transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: traceMode
                ? 'rgba(0, 255, 170, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${traceMode ? 'rgba(0, 255, 170, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: traceMode ? '#00FFAA' : 'rgba(255, 255, 255, 0.5)',
            }}
            title="Toggle trace mode (sweep geometry)"
          >
            {traceMode ? '● Trace' : '○ Trace'}
          </button>
          {!isMobile && <InfoTip text="Trace keeps drawing motion history so the structure can accumulate over time." />}

          <button
            data-guide="desktop-present"
            onClick={onTogglePresentation}
            className={desktopUtilityButtonStyle}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.58)',
            }}
            title="Enter presentation mode"
          >
            <span className="flex items-center gap-2">
              <Maximize2 size={16} />
              <span>Present</span>
            </span>
          </button>

          <button
            onClick={onToggleHelp}
            className={desktopUtilityButtonStyle}
            style={{
              background: showHelp ? 'rgba(0, 255, 170, 0.1)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${showHelp ? 'rgba(0, 255, 170, 0.22)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: showHelp ? '#00FFAA' : 'rgba(255, 255, 255, 0.58)',
            }}
            title="Show quick help"
          >
            <span className="flex items-center gap-2">
              <CircleHelp size={16} />
              <span>Help</span>
            </span>
          </button>

          {/* Menu */}
          <button
            data-guide="desktop-menu"
            onClick={onOpenSidebar}
            className="p-3 rounded-lg transition-all duration-200 hover:bg-white/6 active:scale-95"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.58)',
            }}
            title="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
      )}

      {/* Custom range input styling */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00FFAA;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 255, 170, 0.6);
          transition: all 0.2s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          width: 18px;
          height: 18px;
          box-shadow: 0 0 12px rgba(0, 255, 170, 0.8);
        }
        input[type='range']::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00FFAA;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(0, 255, 170, 0.6);
          transition: all 0.2s;
        }
        input[type='range']::-moz-range-thumb:hover {
          width: 18px;
          height: 18px;
          box-shadow: 0 0 12px rgba(0, 255, 170, 0.8);
        }
      `}</style>
    </div>
  );
}
