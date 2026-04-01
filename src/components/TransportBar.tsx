// ============================================================
// Orbital Polymeter — Transport Control Bar
// Play/Pause, Speed Multiplier, Trace Toggle, Reset, Sidebar Menu
// ============================================================

import { Play, Pause, RotateCcw, Menu, Zap, SkipForward, Eraser } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { type GeometryMode } from '../lib/geometry';

interface TransportBarProps {
  playing: boolean;
  speedMultiplier: number;
  traceMode: boolean;
  geometryMode: GeometryMode;
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
  onReset: () => void;
  onOpenSidebar: () => void;
}

export default function TransportBar({
  playing,
  speedMultiplier,
  traceMode,
  geometryMode,
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
  onReset,
  onOpenSidebar,
}: TransportBarProps) {
  const isMobile = useIsMobile();
  const iconButtonStyle = "px-3 py-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex flex-col items-center gap-1 min-w-[64px]";
  const mobileIconButtonStyle = "px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 flex flex-col items-center gap-1 min-w-[56px]";
  const directionButtonStyle = `rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${isMobile ? 'px-3 py-2' : 'px-3 py-2 hover:scale-105'}`;
  const compactButtonStyle = `rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 active:scale-95 ${isMobile ? 'px-2 py-2' : 'px-2 py-1.5 hover:scale-105'}`;

  return (
    <div
      className={`z-30 pointer-events-none relative ${isMobile ? 'h-auto' : 'h-auto'}`}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        top: 'auto',
        paddingBottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : '0px',
      }}
    >
      <div className={`pointer-events-auto ${isMobile ? 'px-3 pt-3 space-y-2' : 'px-6 pt-3'}`}>
        {isMobile ? (
          <div
            className="w-full rounded-xl border px-3 py-2 space-y-2"
            style={{
              background: 'rgba(17, 17, 22, 0.88)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center gap-2 justify-between">
              <button
                onClick={() => onGeometryModeChange('standard-trace')}
                className={compactButtonStyle}
                style={{
                  background: geometryMode === 'standard-trace' ? 'rgba(0, 255, 170, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${geometryMode === 'standard-trace' ? 'rgba(0, 255, 170, 0.28)' : 'rgba(255, 255, 255, 0.12)'}`,
                  color: geometryMode === 'standard-trace' ? '#00FFAA' : 'rgba(255, 255, 255, 0.72)',
                }}
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
              >
                Interference
              </button>
            </div>
            <div className="flex items-center gap-2 justify-between">
              {quickOrbitControls.map((orbit) => (
                <div
                  key={orbit.id}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {orbit.label}
                  </span>
                  <button onClick={() => onAdjustQuickOrbit(orbit.id, -1)} className="w-6 h-6 rounded-md text-[11px] font-mono" style={{ color: 'rgba(255, 255, 255, 0.75)', background: 'rgba(255, 255, 255, 0.06)' }}>−</button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={orbit.pulseCount}
                    onChange={(e) => onSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
                    className="w-10 rounded-md border text-center text-[10px] font-mono focus:outline-none"
                    style={{
                      color: 'rgba(255, 255, 255, 0.82)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                    }}
                  />
                  <button onClick={() => onAdjustQuickOrbit(orbit.id, 1)} className="w-6 h-6 rounded-md text-[11px] font-mono" style={{ color: 'rgba(255, 255, 255, 0.75)', background: 'rgba(255, 255, 255, 0.06)' }}>+</button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-between">
              <button onClick={onReverseDirections} className={directionButtonStyle} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)', color: 'rgba(255, 255, 255, 0.78)' }}>Reverse</button>
              <button onClick={onAllClockwise} className={directionButtonStyle} style={{ background: 'rgba(0, 255, 170, 0.08)', border: '1px solid rgba(0, 255, 170, 0.2)', color: '#00FFAA' }}>All CW</button>
              <button onClick={onAlternateDirections} className={directionButtonStyle} style={{ background: 'rgba(51, 136, 255, 0.08)', border: '1px solid rgba(51, 136, 255, 0.2)', color: '#88CCFF' }}>Alternate</button>
            </div>
          </div>
        ) : (
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
              </div>
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
                      max="100"
                      value={orbit.pulseCount}
                      onChange={(e) => onSetQuickOrbit(orbit.id, parseInt(e.target.value) || 1)}
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
        )}
      </div>

      <div
        className={`${isMobile ? 'flex flex-col gap-3 px-3 py-3' : 'flex items-center justify-between px-6 py-3'} pointer-events-auto`}
        style={{
          background: 'linear-gradient(to top, rgba(17, 17, 22, 0.95), rgba(17, 17, 22, 0.7))',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Left: Playback + Step + Clear + Reset */}
        <div className={`flex items-center ${isMobile ? 'justify-between gap-2' : 'gap-3'}`}>
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={isMobile ? mobileIconButtonStyle : iconButtonStyle}
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
            className={isMobile ? mobileIconButtonStyle : iconButtonStyle}
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
            className={isMobile ? mobileIconButtonStyle : iconButtonStyle}
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
            className={isMobile ? mobileIconButtonStyle : iconButtonStyle}
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
        <div className={`flex items-center gap-4 ${isMobile ? 'w-full' : 'flex-1 mx-8'}`}>
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
        <div className={`flex items-center ${isMobile ? 'justify-between gap-2' : 'gap-3'}`}>
          {/* Trace Toggle */}
          <button
            onClick={onToggleTrace}
            className={`${isMobile ? 'flex-1' : ''} px-4 py-2 rounded-lg text-xs font-mono font-light transition-all duration-200 hover:scale-105 active:scale-95`}
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

          {/* Sidebar Menu */}
          <button
            onClick={onOpenSidebar}
            className={`${isMobile ? 'px-4 py-2' : 'p-3'} rounded-lg transition-all duration-200 hover:scale-110 active:scale-95`}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
            title="Open sidebar"
          >
            {isMobile ? (
              <span className="text-xs font-mono uppercase tracking-wider">Menu</span>
            ) : (
              <Menu size={20} />
            )}
          </button>
        </div>
      </div>

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
