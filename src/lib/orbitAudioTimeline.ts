import { computeOrbitRotations, getOrbitCyclePulseCount, normalizeOrbitCountMode, type EngineState, type OrbitCountMode } from './orbitalEngine';
import { getGeometryModeOrbits, type GeometryMode, type InterferenceSettings } from './geometry';

export interface OrbitAudioExportOptions {
  geometryMode?: GeometryMode;
  interferenceSettings?: Partial<InterferenceSettings>;
}

/** The same home-crossing periods and source orbits that the canvas plays. */
export function getOrbitAudioExportPlan(state: EngineState, countMode?: OrbitCountMode, options: OrbitAudioExportOptions = {}) {
  const mode = options.geometryMode ?? 'standard-trace';
  const active = new Set(getGeometryModeOrbits(state.orbits, mode, options.interferenceSettings).map((orbit) => orbit.id));
  const beatsPerSecond = state.baseBPM / 60 * state.speedMultiplier;
  const cyclePulseCount = getOrbitCyclePulseCount(state.orbits);
  const effectiveCountMode = normalizeOrbitCountMode(countMode);
  if (!Number.isFinite(beatsPerSecond) || beatsPerSecond <= 0) return [];
  return state.orbits.flatMap((orbit, orbitIndex) => {
    if (!active.has(orbit.id) || orbit.soundEnabled === false || orbit.volume === 0) return [];
    const rotationsPerBeat = mode === 'sweep'
      ? Math.max(1, Math.abs(orbit.pulseCount)) * 10 / 48
      : computeOrbitRotations(1, orbit.pulseCount, effectiveCountMode, cyclePulseCount);
    return [{ orbit, orbitIndex, secondsPerHit: 1 / (rotationsPerBeat * beatsPerSecond) }];
  });
}
