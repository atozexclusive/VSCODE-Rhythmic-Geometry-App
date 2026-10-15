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
