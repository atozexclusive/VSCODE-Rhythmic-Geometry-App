/**
 * Anchor motion when audio is scheduled, then interpolate on the monotonic
 * performance clock. Reading AudioContext.currentTime on every paint can turn
 * batched audio-clock updates into frozen frames followed by large jumps.
 */
export function createOrbitExportClock(
  prerollSeconds: number,
  startedAtMs = performance.now(),
  now: () => number = () => performance.now(),
): () => number {
  return () => (now() - startedAtMs) / 1000 - Math.max(0, prerollSeconds);
}
