import { type Orbit } from './orbitalEngine';

export const INTERFERENCE_TRACE_WEIGHTS = [-1, 1, 1, -1] as const;
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;

/** One full return of the same weighted orbit sum used by the live trace. */
export function sampleInterferenceOutline(orbits: readonly Pick<Orbit, 'radius' | 'pulseCount' | 'direction'>[]) {
  if (orbits.length < 2) return [];
  const counts = orbits.map(orbit => Math.max(1, Math.round(orbit.pulseCount)));
  const period = counts.reduce((a, b) => a / gcd(a, b) * b, 1);
  const fastestTurns = period / Math.min(...counts);
  const segments = Math.min(24000, Math.max(1024, Math.ceil(fastestTurns * 180)));
  return Array.from({ length: segments + 1 }, (_, index) => {
    const beat = period * index / segments;
    let x = 0, y = 0;
    orbits.forEach((orbit, i) => {
      const angle = -Math.PI / 2 + ((beat % counts[i]) / counts[i]) * Math.PI * 2 * orbit.direction;
      const radius = orbit.radius * (INTERFERENCE_TRACE_WEIGHTS[i] ?? 1);
      x += Math.cos(angle) * radius;
      y += Math.sin(angle) * radius;
    });
    return { x, y };
  });
}

const caches = new WeakMap<HTMLCanvasElement, { signature: string; canvas: HTMLCanvasElement }>();

/** Rasterize once per geometry/layout change; playback only composites one faint image. */
export function drawInterferenceOutline(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement,
  orbits: readonly Orbit[], width: number, height: number, cx: number, cy: number, scale: number, color: string) {
  if (orbits.length < 2) return;
  const signature = JSON.stringify([source.width, source.height, width, height, cx, cy, scale, color,
    orbits.map(orbit => [orbit.id, orbit.radius, orbit.pulseCount, orbit.direction])]);
  let cache = caches.get(source);
  if (!cache || cache.signature !== signature) {
    const canvas = document.createElement('canvas');
    const downsample = Math.min(1, 1536 / Math.max(source.width, source.height, 1));
    canvas.width = Math.max(1, Math.round(source.width * downsample));
    canvas.height = Math.max(1, Math.round(source.height * downsample));
    const outline = canvas.getContext('2d');
    if (!outline) return;
    outline.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    outline.strokeStyle = color;
    outline.lineWidth = 0.9;
    outline.lineJoin = 'round';
    outline.beginPath();
    sampleInterferenceOutline(orbits).forEach((point, index) => {
      if (index === 0) outline.moveTo(cx + point.x * scale, cy + point.y * scale);
      else outline.lineTo(cx + point.x * scale, cy + point.y * scale);
    });
    outline.closePath();
    outline.stroke();
    cache = { signature, canvas };
    caches.set(source, cache);
  }
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.shadowBlur = 0;
  ctx.drawImage(cache.canvas, 0, 0, width, height);
  ctx.restore();
}
