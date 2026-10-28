/** A small cached halo keeps blur work off the full-resolution animation canvas. */
const MAX_AURA_EDGE = 512;
const AURA_UPDATE_MS = 100;
interface AuraCache {
  canvas: HTMLCanvasElement;
  sourceWidth: number;
  sourceHeight: number;
  revision: number;
  updatedAt: number;
}
const caches = new WeakMap<HTMLCanvasElement, AuraCache>();
export function getOrbitAuraSize(width: number, height: number) {
  const scale = Math.min(0.5, MAX_AURA_EDGE / Math.max(1, width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
export function invalidateOrbitTraceAura(trace: HTMLCanvasElement): void { caches.delete(trace); }
export function drawOrbitTraceAura(ctx: CanvasRenderingContext2D, trace: HTMLCanvasElement, now: number, revision: number): void {
  if (trace.width <= 0 || trace.height <= 0) return;
  let cache = caches.get(trace);
  const resized = !cache || cache.sourceWidth !== trace.width || cache.sourceHeight !== trace.height;
  if (resized) {
    const size = getOrbitAuraSize(trace.width, trace.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    cache = { canvas, sourceWidth: trace.width, sourceHeight: trace.height, revision: -1, updatedAt: -Infinity };
    caches.set(trace, cache);
  }
  if (!cache) return;
  if (cache.revision !== revision && (resized || now - cache.updatedAt >= AURA_UPDATE_MS)) {
    const glow = cache.canvas.getContext('2d');
    if (glow) {
      glow.clearRect(0, 0, cache.canvas.width, cache.canvas.height);
      glow.save();
      glow.filter = 'blur(2px) brightness(2)';
      glow.drawImage(trace, 0, 0, cache.canvas.width, cache.canvas.height);
      glow.restore();
      cache.revision = revision; cache.updatedAt = now;
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.8;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(cache.canvas, 0, 0, trace.width, trace.height);
  ctx.restore();
}
