// ============================================================
// Orbital Polymeter — Radial Context Menu
// Appears on long-press of an orbit for quick actions
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  NOTE_NAMES,
  SCALE_PRESETS,
  type HarmonySettings,
  type RootNote,
  type ScaleName,
} from '../lib/audioEngine';
import { useIsMobile } from '../hooks/use-mobile';

interface RadialMenuProps {
  x: number;
  y: number;
  orbitId: string;
  orbitColor: string;
  orbitDegree?: number;
  orbitRegister?: -1 | 0 | 1;
  harmonySettings: HarmonySettings;
  onChangeColor: (orbitId: string, color: string) => void;
  onChangeHarmony: (updates: Partial<HarmonySettings>) => void;
  onChangeOrbitRole: (
    orbitId: string,
    updates: { harmonyDegree?: number; harmonyRegister?: -1 | 0 | 1 },
  ) => void;
  onDelete: (orbitId: string) => void;
  onClose: () => void;
}

const QUICK_COLORS = [
  '#00FFAA', '#32CD32', '#72F1B8', '#44FF88',
  '#3388FF', '#88CCFF', '#00CCFF', '#7D89FF',
  '#FF3366', '#FF4488', '#FF0088', '#FF7799',
  '#FFAA00', '#FFCC00', '#FF6600', '#AA44FF',
];

export default function RadialMenu({
  x,
  y,
  orbitId,
  orbitColor,
  orbitDegree,
  orbitRegister,
  harmonySettings,
  onChangeColor,
  onChangeHarmony,
  onChangeOrbitRole,
  onDelete,
  onClose,
}: RadialMenuProps) {
  const isMobile = useIsMobile();
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleTouchOutside = (e: TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouchOutside);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={`fixed z-[100] rounded-2xl border ${
        isMobile
          ? 'left-3 right-3 bottom-[max(92px,calc(env(safe-area-inset-bottom)+84px))] max-h-[68vh] overflow-y-auto px-4 py-4'
          : 'w-72 p-3'
      }`}
      style={{
        left: isMobile ? undefined : x,
        right: isMobile ? undefined : undefined,
        top: isMobile ? undefined : y,
        bottom: isMobile ? undefined : undefined,
        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
        background: 'rgba(17, 17, 22, 0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(255,255,255,0.1)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
      }}
    >
      {isMobile && (
        <div className="flex justify-center mb-3">
          <div
            className="h-1.5 w-10 rounded-full"
            style={{ background: 'rgba(255,255,255,0.14)' }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'} rounded-full`}
            style={{ backgroundColor: orbitColor, boxShadow: `0 0 10px ${orbitColor}88` }}
          />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Edit Orbit
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-[0.18em]"
              style={{
                color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Done
            </button>
          )}
          <button
            onClick={() => {
              onDelete(orbitId);
              onClose();
            }}
            onMouseEnter={() => setHoveredColor('DELETE')}
            onMouseLeave={() => setHoveredColor(null)}
            className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg text-red-400 flex items-center justify-center transition-all`}
            style={{
              background: hoveredColor === 'DELETE' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hoveredColor === 'DELETE' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}
            title="Delete orbit"
          >
            <Trash2 size={isMobile ? 17 : 15} />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Color
        </div>
      </div>
      <div className={`grid grid-cols-4 ${isMobile ? 'gap-2 mt-4' : 'gap-1.5 mt-3'}`}>
        {QUICK_COLORS.map((color) => {
          const isActive = color === orbitColor;
          const isHovered = color === hoveredColor;

          return (
            <button
              key={color}
              onClick={() => {
                onChangeColor(orbitId, color);
                onClose();
              }}
              onMouseEnter={() => setHoveredColor(color)}
              onMouseLeave={() => setHoveredColor(null)}
              onTouchStart={() => setHoveredColor(color)}
              onTouchEnd={() => setHoveredColor(null)}
              className={`${isMobile ? 'h-9' : 'h-8'} rounded-lg transition-all`}
              style={{
                backgroundColor: color,
                boxShadow: isActive ? `0 0 16px ${color}AA` : isHovered ? `0 0 12px ${color}66` : `0 0 8px ${color}44`,
                border: isActive ? '2px solid white' : '1px solid rgba(255,255,255,0.14)',
                transform: `scale(${isActive || isHovered ? 1.05 : 1})`,
              }}
              title={`Set orbit color to ${color}`}
            />
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Key & Scale
        </div>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-[72px,1fr]'} gap-2 mt-3`}>
          <select
            value={harmonySettings.rootNote}
            onChange={(e) => onChangeHarmony({ rootNote: e.target.value as RootNote })}
            className={`rounded-lg bg-white/5 border border-white/10 font-mono focus:outline-none ${isMobile ? 'px-3 py-3 text-[12px]' : 'px-2 py-2 text-[11px]'}`}
            style={{ color: 'rgba(255,255,255,0.82)' }}
          >
            {NOTE_NAMES.map((note) => (
              <option key={note} value={note} style={{ background: '#181820' }}>
                {note}
              </option>
            ))}
          </select>
          <select
            value={harmonySettings.scaleName}
            onChange={(e) => onChangeHarmony({ scaleName: e.target.value as ScaleName })}
            className={`rounded-lg bg-white/5 border border-white/10 font-mono focus:outline-none ${isMobile ? 'px-3 py-3 text-[12px]' : 'px-2 py-2 text-[11px]'}`}
            style={{ color: 'rgba(255,255,255,0.82)' }}
          >
            {Object.entries(SCALE_PRESETS).map(([scaleName, scale]) => (
              <option key={scaleName} value={scaleName} style={{ background: '#181820' }}>
                {scale.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
          Global for the whole system.
        </p>
      </div>

      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Orbit Role
          </div>
          <button
            onClick={() => onChangeHarmony({ manualOrbitRoles: !harmonySettings.manualOrbitRoles })}
            className={`${isMobile ? 'px-3 py-2' : 'px-2 py-1'} rounded-lg text-[10px] font-mono transition-all`}
            style={{
              background: harmonySettings.manualOrbitRoles ? 'rgba(0,255,170,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${harmonySettings.manualOrbitRoles ? 'rgba(0,255,170,0.28)' : 'rgba(255,255,255,0.1)'}`,
              color: harmonySettings.manualOrbitRoles ? '#00FFAA' : 'rgba(255,255,255,0.72)',
            }}
          >
            {harmonySettings.manualOrbitRoles ? 'Manual' : 'Auto'}
          </button>
        </div>

        {harmonySettings.tonePreset === 'scale-quantized' && harmonySettings.manualOrbitRoles ? (
          <>
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-[1fr,1fr]'} gap-3 mt-3`}>
              <div>
                <div className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  Scale degree
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onChangeOrbitRole(orbitId, { harmonyDegree: Math.max(0, (orbitDegree ?? 0) - 1) })}
                    className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg`}
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' }}
                  >
                    −
                  </button>
                  <div className={`flex-1 text-center font-mono ${isMobile ? 'text-[13px]' : 'text-[12px]'}`} style={{ color: 'rgba(255,255,255,0.82)' }}>
                    {(orbitDegree ?? 0) + 1}
                  </div>
                  <button
                    onClick={() => onChangeOrbitRole(orbitId, { harmonyDegree: Math.min(7, (orbitDegree ?? 0) + 1) })}
                    className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg`}
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <div className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  Register
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { label: 'Low', value: -1 as const },
                    { label: 'Mid', value: 0 as const },
                    { label: 'High', value: 1 as const },
                  ]).map((option) => (
                    <button
                      key={option.label}
                      onClick={() => onChangeOrbitRole(orbitId, { harmonyRegister: option.value })}
                      className="px-2 py-2 rounded-lg text-[10px] font-mono"
                      style={{
                        background: (orbitRegister ?? 0) === option.value ? 'rgba(0,255,170,0.12)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${(orbitRegister ?? 0) === option.value ? 'rgba(0,255,170,0.28)' : 'rgba(255,255,255,0.1)'}`,
                        color: (orbitRegister ?? 0) === option.value ? '#00FFAA' : 'rgba(255,255,255,0.72)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[10px] mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Manual roles let this orbit choose its own place in the key.
            </p>
          </>
        ) : (
          <p className="text-[10px] mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
            Turn on manual roles to set this orbit directly.
          </p>
        )}
      </div>
    </div>
  );
}
