// ============================================================
// Orbital Polymeter — Radial Context Menu
// Appears on long-press of an orbit for quick actions
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface RadialMenuProps {
  x: number;
  y: number;
  orbitId: string;
  orbitColor: string;
  onChangeColor: (orbitId: string, color: string) => void;
  onDelete: (orbitId: string) => void;
  onClose: () => void;
}

const QUICK_COLORS = [
  '#00FFAA', '#FF3366', '#3388FF', '#FFAA00',
  '#AA44FF', '#FF6600', '#00CCFF', '#FF0088',
];

export default function RadialMenu({
  x,
  y,
  orbitId,
  orbitColor,
  onChangeColor,
  onDelete,
  onClose,
}: RadialMenuProps) {
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

  const TAU = 2 * Math.PI;
  const RADIUS = 70;
  const items = QUICK_COLORS.length + 1; // colors + delete

  return (
    <div
      ref={menuRef}
      className="fixed z-[100]"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Center indicator */}
      <div
        className="absolute w-6 h-6 rounded-full"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: orbitColor,
          boxShadow: `0 0 16px ${orbitColor}88`,
        }}
      />

      {/* Color options arranged in a circle */}
      {QUICK_COLORS.map((color, i) => {
        const angle = (i / items) * TAU - Math.PI / 2;
        const px = Math.cos(angle) * RADIUS;
        const py = Math.sin(angle) * RADIUS;
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
            className="absolute w-9 h-9 rounded-full transition-all"
            style={{
              left: `calc(50% + ${px}px)`,
              top: `calc(50% + ${py}px)`,
              transform: `translate(-50%, -50%) scale(${isActive || isHovered ? 1.25 : 1})`,
              backgroundColor: color,
              boxShadow: isActive ? `0 0 16px ${color}AA` : isHovered ? `0 0 12px ${color}66` : `0 0 8px ${color}44`,
              border: isActive ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
            }}
          />
        );
      })}

      {/* Delete button */}
      {(() => {
        const angle = (QUICK_COLORS.length / items) * TAU - Math.PI / 2;
        const px = Math.cos(angle) * RADIUS;
        const py = Math.sin(angle) * RADIUS;
        const isDeleteHovered = hoveredColor === 'DELETE';
        return (
          <button
            onClick={() => {
              onDelete(orbitId);
              onClose();
            }}
            onMouseEnter={() => setHoveredColor('DELETE')}
            onMouseLeave={() => setHoveredColor(null)}
            onTouchStart={() => setHoveredColor('DELETE')}
            onTouchEnd={() => setHoveredColor(null)}
            className="absolute w-9 h-9 rounded-full text-red-400 flex items-center justify-center text-sm transition-all"
            style={{
              left: `calc(50% + ${px}px)`,
              top: `calc(50% + ${py}px)`,
              transform: `translate(-50%, -50%) scale(${isDeleteHovered ? 1.25 : 1})`,
              backgroundColor: isDeleteHovered ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${isDeleteHovered ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.3)'}`,
              boxShadow: isDeleteHovered ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none',
            }}
          >
            <Trash2 size={16} />
          </button>
        );
      })()}
    </div>
  );
}
