// ============================================================
// Orbital Polymeter — Transport Control Bar
// Play/Pause, Speed Multiplier, Trace Toggle, Reset, Sidebar Menu
// ============================================================

import { Play, Pause, RotateCcw, Menu, Zap } from 'lucide-react';

interface TransportBarProps {
  playing: boolean;
  speedMultiplier: number;
  traceMode: boolean;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleTrace: () => void;
  onReset: () => void;
  onOpenSidebar: () => void;
}

export default function TransportBar({
  playing,
  speedMultiplier,
  traceMode,
  onTogglePlay,
  onSpeedChange,
  onToggleTrace,
  onReset,
  onOpenSidebar,
}: TransportBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-20 z-30 pointer-events-none"
      style={{
        background: 'linear-gradient(to top, rgba(17, 17, 22, 0.95), rgba(17, 17, 22, 0.7))',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="h-full flex items-center justify-between px-6 pointer-events-auto">
        {/* Left: Play/Pause + Reset */}
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="p-3 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: playing
                ? 'rgba(255, 51, 102, 0.2)'
                : 'rgba(0, 255, 170, 0.2)',
              border: `1px solid ${playing ? 'rgba(255, 51, 102, 0.4)' : 'rgba(0, 255, 170, 0.4)'}`,
              color: playing ? '#FF3366' : '#00FFAA',
            }}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-3 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: 'rgba(255, 170, 0, 0.15)',
              border: '1px solid rgba(255, 170, 0, 0.3)',
              color: '#FFAA00',
            }}
            title="Reset all orbits and traces"
          >
            <RotateCcw size={20} />
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
            max="50.0"
            step="0.1"
            value={speedMultiplier}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: 'linear-gradient(to right, rgba(0, 255, 170, 0.3), rgba(255, 51, 102, 0.3))',
              WebkitAppearance: 'none',
            }}
            title="Speed multiplier (0.1x to 50.0x)"
          />
          <span
            className="text-xs font-mono font-light"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          >
            50.0×
          </span>
        </div>

        {/* Right: Trace Toggle + Sidebar Menu */}
        <div className="flex items-center gap-3">
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
