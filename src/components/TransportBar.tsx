// ============================================================
// Orbital Polymeter — Transport Control Bar
// Play/Pause, Speed Multiplier, Trace Toggle, Reset, Sidebar Menu
// ============================================================

import { Play, Pause, RotateCcw, Menu, Zap, SkipForward, Eraser, Volume2, VolumeX, CircleHelp, Maximize2, Minimize2 } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { type GeometryMode } from '../lib/geometry';
import { NOTE_NAMES, SCALE_PRESETS, type RootNote, type ScaleName, type TonePreset } from '../lib/audioEngine';
import InfoTip from './InfoTip';

interface TransportBarProps {
  playing: boolean;
  speedMultiplier: number;
  traceMode: boolean;
  muted: boolean;
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
  }>;
  onAdjustQuickOrbit: (orbitId: string, delta: number) => void;
  onSetQuickOrbit: (orbitId: string, pulseCount: number) => void;
  onGeometryModeChange: (mode: GeometryMode) => void;
  onReverseDirections: () => void;
  onAllClockwise: () => void;
  onAlternateDirections: () => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onClearTraces: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleTrace: () => void;
  onToggleMute: () => void;
  onToggleHelp: () => void;
  onTogglePresentation: () => void;
  onSoundModeChange: (tonePreset: TonePreset) => void;
  onRootNoteChange: (rootNote: RootNote) => void;
  onScaleChange: (scaleName: ScaleName) => void;
  onReset: () => void;
  onOpenSidebar: () => void;
}

export default function TransportBar({
  playing,
  speedMultiplier,
  traceMode,
  muted,
  presentationMode,
  geometryMode,
  showHelp,
  tonePreset,
  rootNote,
  scaleName,
  quickOrbitControls,
  onAdjustQuickOrbit,
  onSetQuickOrbit,
  onGeometryModeChange,
  onReverseDirections,
  onAllClockwise,
  onAlternateDirections,
  onTogglePlay,
  onStepForward,
  onClearTraces,
  onSpeedChange,
  onToggleTrace,
  onToggleMute,
  onToggleHelp,
  onTogglePresentation,
  onSoundModeChange,
  onRootNoteChange,
  onScaleChange,
  onReset,
  onOpenSidebar,
}: TransportBarProps) {
  const isMobile = useIsMobile();
  const iconButtonStyle = "px-3 py-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex flex-col items-center gap-1 min-w-[64px]";
  const mobileIconButtonStyle = "px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 flex flex-col items-center gap-1 min-w-[56px]";
  const directionButtonStyle = `rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${isMobile ? 'px-3 py-2' : 'px-3 py-2 hover:scale-105'}`;
  const compactButtonStyle = `rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${isMobile ? 'px-2 py-2' : 'px-2 py-1.5 hover:scale-105'}`;
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

  if (presentationMode) {
    return (
      <div
        className={`fixed z-30 pointer-events-auto ${isMobile ? 'left-3 right-3 bottom-4' : 'left-1/2 bottom-5 -translate-x-1/2'}`}
      >
        <div
          className={`rounded-2xl border ${isMobile ? 'px-3 py-3' : 'px-4 py-3'} flex items-center gap-2`}
          style={{
            background: 'rgba(17, 17, 22, 0.74)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.28)',
          }}
        >
          <div className="px-2 py-1 rounded-lg text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.04)' }}>
            {minimalModeLabel}
          </div>
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
              className="px-3 py-2 flex flex-col items-center gap-2 rounded-xl border"
              style={{
                marginLeft: 8,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                background: 'rgba(17, 17, 22, 0.22)',
                backdropFilter: 'blur(8px)',
                transform: 'translateY(-4px)',
              }}
            >
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
              <div
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
              {geometryMode !== 'standard-trace' && (
                <div
                  className="flex items-center gap-2 rounded-lg border px-2 py-1.5"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {quickOrbitControls.map((orbit) => (
                    <div
                      key={orbit.id}
                      className="flex items-center gap-1"
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {orbit.label}
                      </span>
                      <button
                        onClick={() => onAdjustQuickOrbit(orbit.id, -1)}
                        className="w-6 h-6 rounded-md text-[11px] font-mono"
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
                        className="w-10 rounded-md border text-center text-[10px] font-mono focus:outline-none"
                        style={{
                          color: 'rgba(255, 255, 255, 0.82)',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                        }}
                      />
                      <button
                        onClick={() => onAdjustQuickOrbit(orbit.id, 1)}
                        className="w-6 h-6 rounded-md text-[11px] font-mono"
                        style={{ color: 'rgba(255, 255, 255, 0.75)', background: 'rgba(255, 255, 255, 0.06)' }}
                        title={`Raise ${orbit.label} pulse count`}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="px-3 py-2 flex items-center justify-center gap-2 rounded-xl border"
              style={{
                marginRight: 8,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                background: 'rgba(17, 17, 22, 0.22)',
                backdropFilter: 'blur(8px)',
                transform: 'translateY(-4px)',
              }}
            >
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
                <span className="text-[10px] font-mono uppercase tracking-wider">View</span>
              </button>
              <button
                onClick={onOpenSidebar}
                className={mobileIconButtonStyle}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.6)',
                }}
                title="Open sidebar"
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

            <div className="grid grid-cols-4 gap-2">
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
                {traceMode ? 'TRACE ON' : 'TRACE OFF'}
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
        <div className="flex items-center gap-3">
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
            className={iconButtonStyle}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: 'rgba(255, 255, 255, 0.75)',
            }}
            title="Clear trace history only. Keep the current orbits, speed, and motion state."
          >
            <Eraser size={20} />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Clear
            </span>
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className={iconButtonStyle}
            style={{
              background: 'rgba(255, 170, 0, 0.15)',
              border: '1px solid rgba(255, 170, 0, 0.3)',
              color: '#FFAA00',
            }}
            title="Reset motion back to the beginning and clear all traces"
          >
            <RotateCcw size={20} />
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Reset
            </span>
          </button>
        </div>

        {/* Center: Speed Multiplier */}
        <div className="flex items-center gap-4 flex-1 mx-8">
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

        {/* Right: Trace Toggle + Sidebar Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className="px-3 py-2 rounded-lg text-xs font-mono font-light transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: muted ? 'rgba(255, 51, 102, 0.18)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${muted ? 'rgba(255, 51, 102, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: muted ? '#FF7799' : 'rgba(255, 255, 255, 0.6)',
            }}
            title={muted ? 'Unmute audio' : 'Mute audio'}
          >
            <span className="flex items-center gap-2">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{muted ? 'Muted' : 'Audio'}</span>
            </span>
          </button>

          {/* Trace Toggle */}
          <button
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
            {traceMode ? '● TRACE' : '○ TRACE'}
          </button>
          {!isMobile && <InfoTip text="Trace keeps drawing motion history so the structure can accumulate over time." />}

          <button
            onClick={onTogglePresentation}
            className="px-3 py-2 rounded-lg text-xs font-mono font-light transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.6)',
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
            className="px-3 py-2 rounded-lg text-xs font-mono font-light transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: showHelp ? 'rgba(0, 255, 170, 0.16)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showHelp ? 'rgba(0, 255, 170, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: showHelp ? '#00FFAA' : 'rgba(255, 255, 255, 0.6)',
            }}
            title="Show quick help"
          >
            <span className="flex items-center gap-2">
              <CircleHelp size={16} />
              <span>Help</span>
            </span>
          </button>

          {/* Sidebar Menu */}
          <button
            onClick={onOpenSidebar}
            className="p-3 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
            title="Open sidebar"
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
