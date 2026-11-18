import type { GeometryMode } from './geometry';
import type { RootNote } from './audioEngine';

export const SYMMETRY_GROUPS = ['Rosettes', 'Petals', 'Stars', 'Mandalas'] as const;
export type SymmetryGroup = typeof SYMMETRY_GROUPS[number];

export interface SymmetrySceneDefinition {
  id: string;
  name: string;
  group: SymmetryGroup;
  description: string;
  geometryMode: GeometryMode;
  counts: number[];
  radii: number[];
  directions: Array<1 | -1>;
  colors: string[];
  root: RootNote;
}

export const SYMMETRY_SCENES: SymmetrySceneDefinition[] = [
  { id: 'symmetry_silk_rosette', name: 'Silk Rosette', group: 'Rosettes', description: 'Seven looping folds in rose and lavender.', geometryMode: 'interference-trace', counts: [2, 5], radii: [118, 174], directions: [1, -1], colors: ['#FF9BCB', '#C3ABFF'], root: 'D' },
  { id: 'symmetry_rose_window', name: 'Rose Window', group: 'Rosettes', description: 'Interlaced loops with a warm stained-glass glow.', geometryMode: 'interference-trace', counts: [3, 5], radii: [108, 180], directions: [1, 1], colors: ['#FFC894', '#FF9AAE'], root: 'F' },
  { id: 'symmetry_indigo_lace', name: 'Indigo Lace', group: 'Rosettes', description: 'Eleven fine loops woven into a cool blue rosette.', geometryMode: 'interference-trace', counts: [3, 8], radii: [105, 180], directions: [1, -1], colors: ['#91CBFF', '#B5A2FF'], root: 'A' },
  { id: 'symmetry_five_petals', name: 'Five Petals', group: 'Petals', description: 'A luminous five-petal flower, open at its center.', geometryMode: 'interference-trace', counts: [1, 4], radii: [140, 140], directions: [1, -1], colors: ['#FFA5CB', '#FFC1E4'], root: 'C' },
  { id: 'symmetry_lotus', name: 'Lotus', group: 'Petals', description: 'Seven long petals in mint and soft turquoise.', geometryMode: 'interference-trace', counts: [1, 6], radii: [138, 156], directions: [1, -1], colors: ['#8CF0C6', '#80DAED'], root: 'F' },
  { id: 'symmetry_clover', name: 'Clover', group: 'Petals', description: 'Four generous leaves with a quiet green heart.', geometryMode: 'interference-trace', counts: [1, 3], radii: [138, 150], directions: [1, -1], colors: ['#A8E98B', '#83E5BC'], root: 'G' },
  { id: 'symmetry_starlight', name: 'Starlight', group: 'Stars', description: 'Five crisp points connected by sweeping curves.', geometryMode: 'interference-trace', counts: [1, 4], radii: [54, 216], directions: [1, -1], colors: ['#FFE09D', '#FFD166'], root: 'C' },
  { id: 'symmetry_frost_star', name: 'Frost Star', group: 'Stars', description: 'Six icy points with a delicate inward curve.', geometryMode: 'interference-trace', counts: [1, 5], radii: [44, 220], directions: [1, -1], colors: ['#A9E8FF', '#96BFFF'], root: 'D' },
  { id: 'symmetry_silver_crown', name: 'Silver Crown', group: 'Stars', description: 'Eight fine tips around a pale violet crown.', geometryMode: 'interference-trace', counts: [1, 7], radii: [32, 224], directions: [1, -1], colors: ['#D6D7FF', '#BCA6FF'], root: 'A' },
  { id: 'symmetry_jade_mandala', name: 'Jade Mandala', group: 'Mandalas', description: 'Three nested rhythms form an airy emerald weave.', geometryMode: 'standard-trace', counts: [3, 4, 6], radii: [100, 180, 260], directions: [1, -1, 1], colors: ['#8BE3B3', '#83DDE5', '#B0E7C6'], root: 'G' },
  { id: 'symmetry_prism_mandala', name: 'Prism Mandala', group: 'Mandalas', description: 'Three interlocking voices build a richly colored web.', geometryMode: 'standard-trace', counts: [3, 5, 8], radii: [90, 170, 250], directions: [1, -1, 1], colors: ['#9ACBFF', '#E5A5E9', '#B2A1FF'], root: 'D' },
  { id: 'symmetry_golden_mandala', name: 'Golden Mandala', group: 'Mandalas', description: 'Four concentric rhythms weave a golden ceremonial wheel.', geometryMode: 'standard-trace', counts: [4, 6, 9, 12], radii: [75, 135, 195, 255], directions: [1, -1, 1, -1], colors: ['#FFE2A2', '#FFC18B', '#F2ABA5', '#FFD166'], root: 'F' },
];

/** Fit the same periodic paths used by Orbit into a complete, uncropped preview. */
export function createSymmetryPreview(scene: SymmetrySceneDefinition): string {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const cycle = scene.counts.reduce((a, b) => a / gcd(a, b) * b, 1);
  const interference = scene.geometryMode === 'interference-trace';
  const bound = interference ? scene.radii.reduce((a, b) => a + b, 0) : Math.max(...scene.radii);
  const scale = 65 / bound;
  const point = (index: number, beat: number) => {
    const angle = beat / scene.counts[index] * Math.PI * 2 * scene.directions[index] - Math.PI / 2;
    return [Math.cos(angle) * scene.radii[index] * scale, Math.sin(angle) * scene.radii[index] * scale];
  };
  let paths = '';
  if (interference) {
    const path = Array.from({ length: 1601 }, (_, i) => {
      const points = scene.counts.map((_, index) => point(index, i / 1600 * cycle));
      const x = 80 - points[0][0] + points[1][0];
      const y = 80 - points[0][1] + points[1][1];
      return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join('');
    paths = `<path d="${path}" stroke="${scene.colors[1]}" stroke-width="4" opacity=".13"/><path d="${path}" stroke="${scene.colors[0]}" stroke-width="1.2" opacity=".95"/>`;
  } else {
    for (let sample = 0; sample <= 720; sample++) {
      const points = scene.counts.map((_, index) => point(index, sample / 720 * cycle));
      for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
        paths += `<path d="M${(80 + points[a][0]).toFixed(1)},${(80 + points[a][1]).toFixed(1)}L${(80 + points[b][0]).toFixed(1)},${(80 + points[b][1]).toFixed(1)}" stroke="${scene.colors[a]}" stroke-width=".5" opacity=".13"/>`;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><radialGradient id="bg"><stop stop-color="${scene.colors[0]}" stop-opacity=".13"/><stop offset="1" stop-color="#090c14"/></radialGradient></defs><rect width="160" height="160" fill="#090c14"/><rect width="160" height="160" fill="url(#bg)"/><g fill="none">${paths}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
