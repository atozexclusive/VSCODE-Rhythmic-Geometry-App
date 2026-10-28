import type { OrbitCountMode } from './orbitalEngine';

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

// Match the visible orbits' actual rotation periods, including Sweep's clock.
export function getOrbitHomeCycleBeats(
  counts: number[],
  mode: OrbitCountMode | 'sweep',
  cyclePulseCount = Math.max(1, ...counts),
): number | null {
  if (!counts.length || counts.some((count) => !Number.isSafeInteger(count) || count <= 0)) return null;
  if (mode !== 'beats-per-turn') {
    const divisor = counts.reduce(gcd);
    return (mode === 'sweep' ? 48 / 10 : cyclePulseCount) / divisor;
  }
  const cycle = counts.reduce((a, b) => (a / gcd(a, b)) * b, 1);
  return Number.isSafeInteger(cycle) ? cycle : null;
}

export function crossedOrbitHome(previous: number, current: number, cycle: number | null): boolean {
  if (!cycle || previous < 0 || current <= previous) return false;
  // Catch crossings between frames without requiring a rendered phase of zero.
  return Math.floor(current / cycle + 1e-9) > Math.floor(previous / cycle + 1e-9);
}

/** Canvas-only reading labels: larger labels follow faster rings in beats-per-turn mode. */
export function getOrbitCanvasNumbers(counts: number[], mode: OrbitCountMode | 'sweep'): number[] {
  if (mode !== 'beats-per-turn') return counts.slice();
  const ranked = counts.map((count, index) => ({ count, index })).sort((a, b) => a.count - b.count);
  const labels = counts.slice();
  ranked.forEach((entry, index) => { labels[entry.index] = ranked[ranked.length - 1 - index].count; });
  return labels;
}

/** Exact explanatory counts, separate from the floating-point playback clock. */
export function getOrbitTurnExplanation(counts: number[], mode: OrbitCountMode | 'sweep') {
  if (!counts.length || counts.some(count => !Number.isSafeInteger(count) || count <= 0)) return null;
  const divisor = (a: bigint, b: bigint): bigint => {
    while (b) [a, b] = [b, a % b];
    return a;
  };
  const values = counts.map(BigInt);
  if (mode === 'beats-per-turn') {
    const sharedBeats = values.reduce((a, b) => a / divisor(a, b) * b, 1n);
    return { sharedBeats: sharedBeats.toString(), turns: values.map(value => (sharedBeats / value).toString()) };
  }
  const commonDivisor = values.reduce(divisor);
  return { sharedBeats: null, turns: values.map(value => (value / commonDivisor).toString()) };
}
