import type { GeometryMode } from '../lib/geometry';

export const ORBIT_DRAWING_MODES = [
  { key: 'standard-trace', label: 'Standard', color: '#00FFAA', description: 'Clean forms. Balanced motion.' },
  { key: 'interference-trace', label: 'Interference', color: '#88CCFF', description: 'Woven textures. Shifting patterns.' },
  { key: 'sweep', label: 'Sweep', color: '#FFAA00', description: 'Flowing shapes. Radial energy.' },
] as const;

export default function OrbitModeGlyph({ mode, size = 18 }: { mode: GeometryMode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {mode === 'standard-trace' ? (
        <>
          <circle cx={12} cy={12} r={8.5} />
          <circle cx={12} cy={12} r={1.7} fill="currentColor" stroke="none" />
        </>
      ) : mode === 'interference-trace' ? (
        <>
          <path d="M3 17C7 17 7 6 12 6S17 18 21 18" />
          <path d="M3 7C8 7 8 18 13 18S17 6 21 6" />
          <circle cx={3} cy={17} r={1.2} fill="currentColor" stroke="none" />
          <circle cx={21} cy={6} r={1.2} fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          {[0, 60, 120].map((angle) => <ellipse key={angle} cx={12} cy={12} rx={4.3} ry={9} transform={`rotate(${angle} 12 12)`} />)}
          <circle cx={12} cy={12} r={1.4} fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
