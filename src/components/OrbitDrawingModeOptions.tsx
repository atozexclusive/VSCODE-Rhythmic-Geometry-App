import OrbitModeGlyph, { ORBIT_DRAWING_MODES } from './OrbitModeGlyph';
import type { GeometryMode } from '../lib/geometry';

export default function OrbitDrawingModeOptions({ value, onChange, horizontal = false }: { horizontal?: boolean; value: GeometryMode; onChange: (mode: GeometryMode) => void }) {
  return <div className={horizontal ? "desktop-drawing-mode-row" : "space-y-1"}>{ORBIT_DRAWING_MODES.map(mode => {
    const active = value === mode.key;
    return <button key={mode.key} type="button" onClick={() => onChange(mode.key)}
      className="flex h-9 w-full items-center gap-2 rounded-xl px-2.5 text-left text-[8px] font-mono uppercase tracking-[0.12em] transition-colors"
      style={{ color: active ? mode.color : 'rgba(255,255,255,.56)', background: active ? `${mode.color}15` : 'transparent', border: `1px solid ${active ? `${mode.color}36` : 'transparent'}` }} aria-pressed={active}>
      <OrbitModeGlyph mode={mode.key} size={14} /><span>{mode.label}</span>
    </button>;
  })}</div>;
}
