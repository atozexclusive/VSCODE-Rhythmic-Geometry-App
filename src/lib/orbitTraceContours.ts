import { computeOrbitRotations, type Orbit, type OrbitCountMode } from './orbitalEngine';

type Point = { x: number; y: number };
type MovingPoint = Point & { vx: number; vy: number };
const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;

/** Envelope of a moving connecting segment: the curve tangent to its neighboring positions. */
export function getOrbitEnvelopePoint(a: MovingPoint, b: MovingPoint): Point | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  const dvx = b.vx - a.vx, dvy = b.vy - a.vy;
  const denominator = cross(dx, dy, dvx, dvy);
  if (Math.abs(denominator) < 1e-9) return null;
  const fraction = cross(a.vx, a.vy, dx, dy) / denominator;
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) return null;
  return { x: a.x + fraction * dx, y: a.y + fraction * dy };
}
interface Pair {
  first: number; second: number; beat: number; until: number; step: number; previous: Point | null;
}
interface Cache { canvas: HTMLCanvasElement; signature: string; pairs: Pair[]; elapsed: number }
const caches = new WeakMap<HTMLCanvasElement, Cache>();
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;

export function invalidateOrbitTraceContours(source: HTMLCanvasElement): void { caches.delete(source); }

/** Follow the actual curve envelopes, rather than detecting pixels or hiding all geometry. */
export function drawOrbitTraceContours(
  output: CanvasRenderingContext2D, source: HTMLCanvasElement, orbits: Orbit[], elapsedBeats: number,
  width: number, height: number, cx: number, cy: number, scale: number,
  countMode: OrbitCountMode, cyclePulseCount: number, lineWidth = 1.1,
): void {
  const rates = orbits.map(orbit => computeOrbitRotations(1, orbit.pulseCount, countMode, cyclePulseCount));
  const signature = JSON.stringify([source.width, source.height, width, height, cx, cy, scale, countMode, cyclePulseCount, lineWidth,
    orbits.map(orbit => [orbit.id, orbit.radius, orbit.pulseCount, orbit.direction, orbit.color])]);
  let cache = caches.get(source);
  if (!cache || cache.signature !== signature || elapsedBeats < cache.elapsed) {
    const canvas = document.createElement('canvas');
    const downsample = Math.min(1, 1536 / Math.max(1, source.width, source.height));
    canvas.width = Math.max(1, Math.round(source.width * downsample));
    canvas.height = Math.max(1, Math.round(source.height * downsample));
    const pairs: Pair[] = [];
    for (let i = 0; i < orbits.length; i++) for (let j = i + 1; j < orbits.length; j++) {
      const divisor = gcd(orbits[i].pulseCount, orbits[j].pulseCount);
      // One pair repeats much sooner than the entire multi-orbit composition.
      const rotationsFirst = orbits[j].pulseCount / divisor;
      const period = rotationsFirst / rates[i];
      pairs.push({ first: i, second: j, beat: 0, until: period, step: 1 / (360 * Math.max(rates[i], rates[j])), previous: null });
    }
    cache = { canvas, signature, pairs, elapsed: 0 }; caches.set(source, cache);
  }
  const ctx = cache.canvas.getContext('2d');
  if (!ctx) return;
  cache.elapsed = elapsedBeats;
  ctx.setTransform(cache.canvas.width / width, 0, 0, cache.canvas.height / height, 0, 0);
  ctx.lineWidth = lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 0.8;
  const moving = (index: number, beat: number): MovingPoint => {
    const orbit = orbits[index], angularRate = rates[index] * Math.PI * 2 * orbit.direction;
    const angle = -Math.PI / 2 + beat * angularRate, radius = orbit.radius * scale;
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    return { x: cx + x, y: cy + y, vx: -y * angularRate, vy: x * angularRate };
  };
  // Bound initial catch-up and subsequent drawing work on mobile.
  const budget = Math.max(16, Math.floor(1200 / Math.max(1, cache.pairs.length)));
  for (const pair of cache.pairs) {
    const target = Math.min(Math.max(0, elapsedBeats), pair.until);
    if (pair.beat >= target) continue;
    ctx.strokeStyle = orbits[pair.first].color;
    ctx.beginPath();
    if (pair.previous) ctx.moveTo(pair.previous.x, pair.previous.y);
    for (let step = 0; step < budget && pair.beat < target; step++) {
      const beat = Math.min(target, pair.beat + pair.step);
      const point = getOrbitEnvelopePoint(moving(pair.first, beat), moving(pair.second, beat));
      if (point) {
        const maxJump = (orbits[pair.first].radius + orbits[pair.second].radius) * scale * 0.12;
        if (pair.previous && Math.hypot(point.x - pair.previous.x, point.y - pair.previous.y) < maxJump) ctx.lineTo(point.x, point.y);
        else ctx.moveTo(point.x, point.y);
      }
      pair.previous = point; pair.beat = beat;
    }
    ctx.stroke();
  }
  output.drawImage(cache.canvas, 0, 0, source.width, source.height);
}
