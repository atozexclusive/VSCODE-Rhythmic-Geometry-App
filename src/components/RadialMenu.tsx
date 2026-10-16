// ============================================================
// Orbital Polymeter — Radial Context Menu
// Appears on long-press of an orbit for quick actions
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Lock, Minus, Plus, Trash2 } from 'lucide-react';
import { type HarmonySettings } from '../lib/audioEngine';
import { useIsMobile } from '../hooks/use-mobile';

interface RadialMenuProps {
  x: number;
  y: number;
  orbitId: string;
  orbitColor: string;
  orbitPulseCount?: number;
  orbitPulseMax?: number;
  orbitDegree?: number;
  orbitRegister?: -1 | 0 | 1;
  orbitOptions?: Array<{ id: string; label: string; color: string }>;
  harmonySettings?: HarmonySettings;
  entityLabel?: 'Orbit' | 'Layer';
  radius?: number;
  onChangeRadius?: (id: string, radius: number) => void;
  colorEditingLocked?: boolean;
  onLockedFeature?: (feature: 'color-editing') => void;
  onSelectOrbit?: (orbitId: string) => void;
  onChangePulseCount?: (orbitId: string, pulseCount: number) => void;
  onChangeColor: (orbitId: string, color: string) => void;
  onChangeHarmony?: (updates: Partial<HarmonySettings>) => void;
  onChangeOrbitRole?: (
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
  orbitPulseCount,
  orbitPulseMax = 32,
  orbitOptions = [],
  entityLabel = 'Orbit',
  radius,
  onChangeRadius,
  colorEditingLocked = false,
  onLockedFeature,
  onSelectOrbit,
  onChangePulseCount,
  onChangeColor,
  onDelete,
  onClose,
}: RadialMenuProps) {
  const isMobile = useIsMobile();
  const docked = entityLabel === 'Layer';
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const selectedOrbitLabel =
    orbitOptions.find((orbit) => orbit.id === orbitId)?.label ?? entityLabel;
  const selectedOrbitNumber = Math.max(1, Math.round(orbitPulseCount ?? 1));
  const ratioSliderMax = Math.max(1, orbitPulseMax);
  const ratioSliderValue = Math.min(selectedOrbitNumber, ratioSliderMax);
  const mobileViewportWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
  const mobileViewportHeight = typeof window !== 'undefined' ? window.innerHeight : 760;
  const mobileMenuWidth = Math.min(350, mobileViewportWidth - 24);
  const mobileMenuLeft = Math.max(8, Math.min(x - mobileMenuWidth / 2, mobileViewportWidth - mobileMenuWidth - 8));
  const mobileMenuTop = Math.max(16, Math.min(y + 12, mobileViewportHeight - 400));
  const mobileSectionStyle = {
    borderColor: 'rgba(255,255,255,0.065)',
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.012))',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  };
  const mobileSectionTitleStyle = {
    color: 'rgba(244,250,255,0.78)',
    textShadow: '0 0 14px rgba(255,255,255,0.14)',
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (entityLabel === 'Layer' && e.target instanceof HTMLCanvasElement) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleTouchOutside = (e: TouchEvent) => {
      if (entityLabel === 'Layer' && e.target instanceof HTMLCanvasElement) return;
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
  }, [entityLabel, onClose]);

  return (
    <div
      ref={menuRef}
      data-orbit-quick-editor
      className={`fixed z-[100] border ${
        isMobile
          ? 'overflow-y-auto rounded-2xl p-2 pb-4 [scrollbar-width:none]'
          : 'w-72 overflow-y-auto rounded-2xl p-3 pb-5'
      }`}
      style={{
        left: docked ? (isMobile ? (mobileViewportWidth - mobileMenuWidth) / 2 : undefined) : isMobile ? mobileMenuLeft : x,
        width: isMobile ? mobileMenuWidth : undefined,
        maxHeight: docked ? Math.min(430, mobileViewportHeight - 32) : isMobile ? Math.min(430, mobileViewportHeight - mobileMenuTop - 16) : undefined,
        right: docked && !isMobile ? 16 : undefined,
        top: docked ? undefined : isMobile ? mobileMenuTop : y,
        bottom: docked ? 'max(12px, env(safe-area-inset-bottom))' : undefined,
        transform: isMobile || docked ? 'none' : 'translate(-50%, -50%)',
        background: isMobile
          ? `
            radial-gradient(circle at 12% 0%, ${orbitColor}14, transparent 30%),
            linear-gradient(180deg, rgba(18,20,30,0.56), rgba(9,10,16,0.46))
          `
          : `
            radial-gradient(circle at 12% 0%, ${orbitColor}18, transparent 34%),
            linear-gradient(180deg, rgba(17,17,22,0.88), rgba(12,12,18,0.84))
          `,
        backdropFilter: isMobile ? 'blur(24px) saturate(1.2)' : 'blur(18px) saturate(1.08)',
        borderColor: isMobile ? `${orbitColor}22` : 'rgba(255,255,255,0.1)',
        boxShadow: isMobile
          ? `0 16px 42px rgba(0,0,0,0.32), 0 0 28px ${orbitColor}0d, inset 0 1px 0 rgba(255,255,255,0.07)`
          : '0 18px 40px rgba(0,0,0,0.35)',
      }}
    >
      {isMobile && (
        <div className="flex justify-center mb-1.5">
          <div
            className="h-1.5 w-8 rounded-full"
            style={{ background: 'rgba(255,255,255,0.14)' }}
          />
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div
            className={`${isMobile ? 'w-3 h-3' : 'w-3 h-3'} rounded-full`}
            style={{ backgroundColor: orbitColor, boxShadow: `0 0 10px ${orbitColor}88` }}
          />
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Edit {entityLabel}
            </div>
            {isMobile ? (
              <div className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.16em]" style={{ color: orbitColor }}>
                {selectedOrbitLabel}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-mono uppercase tracking-[0.18em]"
              style={{
                color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              aria-label={`Close ${entityLabel.toLowerCase()} menu`}
              title={`Close ${entityLabel.toLowerCase()} menu`}
            >
              <ChevronUp size={13} />
            </button>
          )}
          <button
            onClick={() => {
              onDelete(orbitId);
              onClose();
            }}
            onMouseEnter={() => setHoveredColor('DELETE')}
            onMouseLeave={() => setHoveredColor(null)}
            className={`${isMobile ? 'h-7 w-7' : 'w-8 h-8'} rounded-lg text-red-400 flex items-center justify-center transition-all`}
            style={{
              background: hoveredColor === 'DELETE' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hoveredColor === 'DELETE' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}
            aria-label={`Delete ${entityLabel.toLowerCase()}`}
            title={`Delete ${entityLabel.toLowerCase()}`}
          >
            <Trash2 size={isMobile ? 14 : 15} />
          </button>
        </div>
      </div>

      {orbitOptions.length > 1 ? (
        <div className={`${isMobile ? 'mt-2 px-1' : 'mt-3 rounded-xl border p-2'}`} style={isMobile ? undefined : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.035)' }}>
          <div
            className="mb-1.5 text-[8px] font-mono uppercase tracking-[0.16em]"
            style={isMobile ? mobileSectionTitleStyle : { color: 'rgba(255,255,255,0.58)' }}
          >
            Quick Swap {entityLabel}
          </div>
          <div className={`flex ${isMobile ? 'gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]' : 'grid grid-cols-2 gap-2'}`}>
            {orbitOptions.map((orbit) => {
              const active = orbit.id === orbitId;
              const orbitIndex = orbitOptions.findIndex((option) => option.id === orbit.id);
              return (
                <button
                  key={orbit.id}
                  type="button"
                  onClick={() => onSelectOrbit?.(orbit.id)}
                  className={`${isMobile ? 'flex h-6 min-w-8 shrink-0 items-center justify-center rounded-lg px-2 text-[9px]' : 'rounded-xl px-3 py-2 text-[10px]'} border font-mono uppercase tracking-[0.13em] transition-all active:scale-[0.98]`}
                  style={{
                    background: active ? `${orbit.color}18` : 'rgba(255,255,255,0.035)',
                    borderColor: active ? `${orbit.color}44` : 'rgba(255,255,255,0.08)',
                    color: active ? orbit.color : 'rgba(255,255,255,0.58)',
                    boxShadow: active ? `0 0 0 1px ${orbit.color}18 inset, 0 0 20px ${orbit.color}10` : 'none',
                  }}
                >
                  {isMobile ? orbitIndex + 1 : orbit.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {onChangePulseCount ? (
        <div className={`${isMobile ? 'mt-1.5 rounded-lg border p-1.5' : 'mt-3 rounded-xl border p-2'}`} style={isMobile ? mobileSectionStyle : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.035)' }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <div
              className="text-[8px] font-mono uppercase tracking-[0.16em]"
              style={isMobile ? mobileSectionTitleStyle : { color: 'rgba(255,255,255,0.58)' }}
            >
              {entityLabel === 'Layer' ? 'Steps' : 'Orbits'}
            </div>
            <div
              className="rounded-lg border px-2 py-0.5 text-[10px] font-mono"
              style={{
                color: orbitColor,
                background: `${orbitColor}12`,
                borderColor: `${orbitColor}36`,
              }}
            >
              {selectedOrbitNumber}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangePulseCount(orbitId, selectedOrbitNumber - 1)}
              className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} shrink-0 rounded-lg border flex items-center justify-center transition active:scale-[0.96]`}
              style={{
                color: 'rgba(255,255,255,0.74)',
                background: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
              aria-label={`Lower ${selectedOrbitLabel} ${entityLabel === 'Layer' ? 'steps' : 'orbits'}`}
              title={`Lower ${selectedOrbitLabel}`}
            >
              <Minus size={isMobile ? 13 : 14} />
            </button>
            <input
              type="range"
              min="1"
              max={String(ratioSliderMax)}
              step="1"
              value={ratioSliderValue}
              onChange={(event) => onChangePulseCount(orbitId, parseInt(event.target.value, 10) || 1)}
              className="touch-slider rg-compact-slider orbit-count-slider min-w-0 flex-1"
              style={{ ['--slider-accent' as string]: orbitColor }}
              aria-label={`Set ${selectedOrbitLabel} ${entityLabel === 'Layer' ? 'steps' : 'orbits'}`}
            />
            <button
              type="button"
              onClick={() => onChangePulseCount(orbitId, selectedOrbitNumber + 1)}
              className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} shrink-0 rounded-lg border flex items-center justify-center transition active:scale-[0.96]`}
              style={{
                color: 'rgba(255,255,255,0.74)',
                background: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
              aria-label={`Raise ${selectedOrbitLabel} ${entityLabel === 'Layer' ? 'steps' : 'orbits'}`}
              title={`Raise ${selectedOrbitLabel}`}
            >
              <Plus size={isMobile ? 13 : 14} />
            </button>
          </div>
        </div>
      ) : null}

      {onChangeRadius && radius != null ? (
        <div className={`${isMobile ? 'mt-1.5 rounded-lg border p-1.5' : 'mt-3 rounded-xl border p-2'}`} style={isMobile ? mobileSectionStyle : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.035)' }}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <div
              className="text-[8px] font-mono uppercase tracking-[0.16em]"
              style={isMobile ? mobileSectionTitleStyle : { color: 'rgba(255,255,255,0.58)' }}
            >
              Radius
            </div>
            <div
              className="rounded-lg border px-2 py-0.5 text-[10px] font-mono"
              style={{
                color: orbitColor,
                background: `${orbitColor}12`,
                borderColor: `${orbitColor}36`,
              }}
            >
              {radius}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeRadius(orbitId, Math.max(70, radius - 2))}
              className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} shrink-0 rounded-lg border flex items-center justify-center transition active:scale-[0.96]`}
              style={{
                color: 'rgba(255,255,255,0.74)',
                background: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
              aria-label={`Lower ${selectedOrbitLabel} radius`}
              title={`Lower ${selectedOrbitLabel}`}
            >
              <Minus size={isMobile ? 13 : 14} />
            </button>
            <input
              type="range"
              min="70"
              max="320"
              step="2"
              value={radius}
              onChange={(event) => onChangeRadius(orbitId, parseInt(event.target.value, 10) || 70)}
              className="touch-slider rg-compact-slider orbit-count-slider min-w-0 flex-1"
              style={{ ['--slider-accent' as string]: orbitColor }}
              aria-label={`Set ${selectedOrbitLabel} radius`}
            />
            <button
              type="button"
              onClick={() => onChangeRadius(orbitId, Math.min(320, radius + 2))}
              className={`${isMobile ? 'h-6 w-6' : 'h-7 w-7'} shrink-0 rounded-lg border flex items-center justify-center transition active:scale-[0.96]`}
              style={{
                color: 'rgba(255,255,255,0.74)',
                background: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
              aria-label={`Raise ${selectedOrbitLabel} radius`}
              title={`Raise ${selectedOrbitLabel}`}
            >
              <Plus size={isMobile ? 13 : 14} />
            </button>
          </div>
        </div>
      ) : null}

      <div className={isMobile ? 'mt-1.5 rounded-lg border p-1.5' : 'mt-3'} style={isMobile ? mobileSectionStyle : undefined}>
        <div
          className="text-[10px] font-mono uppercase tracking-[0.2em]"
          style={isMobile ? mobileSectionTitleStyle : { color: 'rgba(255,255,255,0.45)' }}
        >
          Color
        </div>
        <div className={`grid ${isMobile ? 'mt-1.5 grid-cols-8 gap-1' : 'mt-3 grid-cols-4 gap-1.5'}`}>
          {QUICK_COLORS.map((color) => {
            const isActive = color === orbitColor;
            const isHovered = color === hoveredColor;

            return (
              <button
                key={color}
                onClick={() => {
                  if (colorEditingLocked) {
                    onLockedFeature?.('color-editing');
                    return;
                  }
                  onChangeColor(orbitId, color);
                  if (!isMobile) onClose();
                }}
                onMouseEnter={() => setHoveredColor(color)}
                onMouseLeave={() => setHoveredColor(null)}
                onTouchStart={() => setHoveredColor(color)}
                onTouchEnd={() => setHoveredColor(null)}
                className={`relative ${isMobile ? 'h-5' : 'h-8'} rounded-md transition-all`}
                style={{
                  background: colorEditingLocked
                    ? 'rgba(255,255,255,0.035)'
                    : `linear-gradient(160deg, rgba(255,255,255,0.32), transparent 48%, rgba(0,0,0,0.12)), ${color}`,
                  boxShadow: colorEditingLocked
                    ? 'none'
                    : isActive
                      ? `inset 0 1px 2px rgba(255,255,255,0.5), 0 0 14px ${color}BB, 0 0 5px ${color}88`
                      : isHovered ? `inset 0 1px 2px rgba(255,255,255,0.4), 0 0 14px ${color}99` : `inset 0 1px 2px rgba(255,255,255,0.35), 0 0 10px ${color}70`,
                  border: colorEditingLocked
                    ? '1px solid rgba(255,255,255,0.1)'
                    : isActive ? '2px solid white' : '1px solid rgba(255,255,255,0.14)',
                  transform: `scale(${isActive || isHovered ? 1.05 : 1})`,
                  filter: colorEditingLocked ? 'grayscale(0.65)' : undefined,
                }}
                aria-label={`Set ${entityLabel.toLowerCase()} color to ${color}`}
                aria-pressed={isActive}
                title={`Set ${entityLabel.toLowerCase()} color to ${color}`}
              >
                {colorEditingLocked ? (
                  <span className="pointer-events-none absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/14 bg-black/42 text-white/68">
                    <Lock size={9} strokeWidth={2.4} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>


    </div>
  );
}
