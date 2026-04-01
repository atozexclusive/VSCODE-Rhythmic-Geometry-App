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

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-52 rounded-2xl border p-3"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        background: 'rgba(17, 17, 22, 0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(255,255,255,0.1)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: orbitColor, boxShadow: `0 0 10px ${orbitColor}88` }}
          />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Orbit Color
          </span>
        </div>
        <button
          onClick={() => {
            onDelete(orbitId);
            onClose();
          }}
          onMouseEnter={() => setHoveredColor('DELETE')}
          onMouseLeave={() => setHoveredColor(null)}
          className="w-8 h-8 rounded-lg text-red-400 flex items-center justify-center transition-all"
          style={{
            background: hoveredColor === 'DELETE' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${hoveredColor === 'DELETE' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.08)'}`,
          }}
          title="Delete orbit"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
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
              className="h-10 rounded-xl transition-all"
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
    </div>
  );
}
