// ============================================================
// Orbital Polymeter — Double-Precision Rotation Engine
// All math uses IEEE 754 double-precision (native JS number)
// Phase is computed deterministically from elapsed time,
// NOT accumulated per-frame deltas, to prevent drift.
// Bulletproof beat-counting ensures every rotation triggers.
// ============================================================

export interface Orbit {
  id: string;
  pulseCount: number;       // 1-1000 timing count, interpreted by OrbitCountMode
  radius: number;           // px from center
  direction: 1 | -1;        // 1 = CW, -1 = CCW
  color: string;            // hex color
  harmonyDegree?: number;   // optional manual scale degree
  harmonyRegister?: -1 | 0 | 1; // optional register offset for scale mode
  phase: number;            // current angle in radians [0, 2π)
  lastTriggerBeat: number;  // last beat index that fired (prevents double-trigger)
}

export interface EngineState {
  orbits: Orbit[];
  playing: boolean;
  speedMultiplier: number;  // derived from anchor BPM / base BPM
  elapsedBeats: number;     // master beat counter (double-precision)
  lastTimestamp: number;     // last RAF timestamp in ms
  baseBPM: number;          // anchor-orbit tempo when speedMultiplier is 1.0
}

// Two-pi constant (double precision)
const TAU: number = 2.0 * Math.PI;
export const DEFAULT_BASE_BPM = 120.0;
export const DEFAULT_ORBIT_TEMPO_BPM = 20;
export const ORBIT_TEMPO_MIN_BPM = 10;
export const ORBIT_TEMPO_MAX_BPM = 1000;
export const CYCLE_ORBIT_TEMPO_MAX_BPM = 240;
export const SWEEP_ORBIT_TEMPO_MAX_BPM = 3000;
export type OrbitTempoMode = 'standard' | 'cycle' | 'sweep';
export type OrbitCountMode = 'beats-per-turn' | 'turns-per-cycle';
export const DEFAULT_ORBIT_COUNT_MODE: OrbitCountMode = 'beats-per-turn';
export const ENABLE_STANDARD_TURNS_PER_CYCLE = false;
const SWEEP_TEMPO_TURNS_PER_COMPLETION = 10;
const SWEEP_TEMPO_COMPLETION_BEATS = 48;

export function getOrbitTempoMaxBpm(tempoMode: OrbitTempoMode = 'standard'): number {
  if (ENABLE_STANDARD_TURNS_PER_CYCLE && tempoMode === 'cycle') {
    return CYCLE_ORBIT_TEMPO_MAX_BPM;
  }
  return tempoMode === 'sweep' ? SWEEP_ORBIT_TEMPO_MAX_BPM : ORBIT_TEMPO_MAX_BPM;
}

export function normalizeOrbitCountMode(value: unknown): OrbitCountMode {
  return ENABLE_STANDARD_TURNS_PER_CYCLE && value === 'turns-per-cycle'
    ? 'turns-per-cycle'
    : DEFAULT_ORBIT_COUNT_MODE;
}

export function getOrbitCyclePulseCount(orbits: Array<{ pulseCount: number }>): number {
  return Math.max(1, ...orbits.map((orbit) => Math.max(1, orbit.pulseCount)));
}

export function clampOrbitTempoBpm(
  tempoBpm: number,
  tempoMode: OrbitTempoMode = 'standard',
): number {
  return Math.max(ORBIT_TEMPO_MIN_BPM, Math.min(getOrbitTempoMaxBpm(tempoMode), tempoBpm));
}

export function orbitTempoBpmToSpeedMultiplier(
  tempoBpm: number,
  baseBpm: number = DEFAULT_BASE_BPM,
  anchorPulseCount: number = 1,
  tempoMode: OrbitTempoMode = 'standard',
): number {
  const pulseCount = Math.max(1, anchorPulseCount);
  const anchorRotationsPerMasterBeat =
    tempoMode === 'sweep'
      ? (pulseCount * SWEEP_TEMPO_TURNS_PER_COMPLETION) / SWEEP_TEMPO_COMPLETION_BEATS
      : ENABLE_STANDARD_TURNS_PER_CYCLE && tempoMode === 'cycle'
        ? 1
      : 1 / pulseCount;
  return clampOrbitTempoBpm(tempoBpm, tempoMode) / (Math.max(1, baseBpm) * anchorRotationsPerMasterBeat);
}

export function orbitSpeedMultiplierToTempoBpm(
  speedMultiplier: number,
  baseBpm: number = DEFAULT_BASE_BPM,
  anchorPulseCount: number = 1,
  tempoMode: OrbitTempoMode = 'standard',
): number {
  const pulseCount = Math.max(1, anchorPulseCount);
  const anchorRotationsPerMasterBeat =
    tempoMode === 'sweep'
      ? (pulseCount * SWEEP_TEMPO_TURNS_PER_COMPLETION) / SWEEP_TEMPO_COMPLETION_BEATS
      : ENABLE_STANDARD_TURNS_PER_CYCLE && tempoMode === 'cycle'
        ? 1
      : 1 / pulseCount;
  return Math.max(1, baseBpm) * speedMultiplier * anchorRotationsPerMasterBeat;
}

/**
 * Create a fresh engine state.
 */
export function createEngineState(): EngineState {
  return {
    orbits: [],
    playing: false,
    speedMultiplier: orbitTempoBpmToSpeedMultiplier(DEFAULT_ORBIT_TEMPO_BPM),
    elapsedBeats: 0.0,
    lastTimestamp: -1.0,
    baseBPM: DEFAULT_BASE_BPM,
  };
}

/**
 * Deterministic phase for an orbit given elapsed master beats.
 * Default mode: each orbit completes one full rotation every `pulseCount` master beats.
 * Turns-per-cycle mode: `pulseCount` is rotations during one shared cycle.
 *
 * Because we derive phase from the absolute elapsed counter
 * rather than accumulating deltas, there is zero drift.
 */
export function computePhase(
  elapsedBeats: number,
  pulseCount: number,
  direction: 1 | -1,
  countMode: OrbitCountMode = DEFAULT_ORBIT_COUNT_MODE,
  cyclePulseCount: number = Math.max(1, pulseCount),
): number {
  const safePulseCount = Math.max(1, pulseCount);
  const safeCyclePulseCount = Math.max(1, cyclePulseCount);
  const rotations: number =
    ENABLE_STANDARD_TURNS_PER_CYCLE && countMode === 'turns-per-cycle'
      ? (elapsedBeats * safePulseCount) / safeCyclePulseCount
      : elapsedBeats / safePulseCount;
  const frac: number = rotations - Math.floor(rotations);
  let angle: number = frac * TAU * direction;
  angle = ((angle % TAU) + TAU) % TAU;
  return angle;
}

export function computeOrbitRotations(
  elapsedBeats: number,
  pulseCount: number,
  countMode: OrbitCountMode = DEFAULT_ORBIT_COUNT_MODE,
  cyclePulseCount: number = Math.max(1, pulseCount),
): number {
  const safePulseCount = Math.max(1, pulseCount);
  const safeCyclePulseCount = Math.max(1, cyclePulseCount);
  return ENABLE_STANDARD_TURNS_PER_CYCLE && countMode === 'turns-per-cycle'
    ? (elapsedBeats * safePulseCount) / safeCyclePulseCount
    : elapsedBeats / safePulseCount;
}

/**
 * Resonance point position on the circumference.
 * The resonance point is offset by the orbit's current phase
 * from the 12-o'clock position (−π/2 in standard math coords).
 */
export function resonancePosition(
  orbit: Orbit,
  centerX: number,
  centerY: number,
): { x: number; y: number } {
  const angle: number = -Math.PI / 2.0 + orbit.phase;
  return {
    x: centerX + orbit.radius * Math.cos(angle),
    y: centerY + orbit.radius * Math.sin(angle),
  };
}

/**
 * Deterministic resonance position for an orbit at an arbitrary beat time.
 * This lets the renderer sub-sample motion without depending on RAF cadence.
 */
export function resonancePositionAtBeats(
  orbit: Orbit,
  elapsedBeats: number,
  centerX: number,
  centerY: number,
  countMode: OrbitCountMode = DEFAULT_ORBIT_COUNT_MODE,
  cyclePulseCount: number = Math.max(1, orbit.pulseCount),
): { x: number; y: number } {
  const phase = computePhase(elapsedBeats, orbit.pulseCount, orbit.direction, countMode, cyclePulseCount);
  const angle: number = -Math.PI / 2.0 + phase;
  return {
    x: centerX + orbit.radius * Math.cos(angle),
    y: centerY + orbit.radius * Math.sin(angle),
  };
}

export interface TriggerEvent {
  orbitId: string;
  color: string;
  x: number;
  y: number;
  radius: number;
}

function advanceEngineByDeltaBeats(
  state: EngineState,
  deltaBeats: number,
  centerX: number,
  centerY: number,
  countMode: OrbitCountMode = DEFAULT_ORBIT_COUNT_MODE,
): TriggerEvent[] {
  if (deltaBeats <= 0) {
    return [];
  }

  state.elapsedBeats += deltaBeats;
  const cyclePulseCount = getOrbitCyclePulseCount(state.orbits);

  const triggers: TriggerEvent[] = [];

  for (const orbit of state.orbits) {
    orbit.phase = computePhase(
      state.elapsedBeats,
      orbit.pulseCount,
      orbit.direction,
      countMode,
      cyclePulseCount,
    );

    const totalRotations = computeOrbitRotations(
      state.elapsedBeats,
      orbit.pulseCount,
      countMode,
      cyclePulseCount,
    );
    const currentBeatIndex = Math.floor(totalRotations);

    if (currentBeatIndex > orbit.lastTriggerBeat) {
      const pos = resonancePosition(orbit, centerX, centerY);
      triggers.push({
        orbitId: orbit.id,
        color: orbit.color,
        x: pos.x,
        y: pos.y,
        radius: orbit.radius,
      });
      orbit.lastTriggerBeat = currentBeatIndex;
    }
  }

  return triggers;
}

export function stepEngineByBeats(
  state: EngineState,
  deltaBeats: number,
  centerX: number,
  centerY: number,
  countMode: OrbitCountMode = DEFAULT_ORBIT_COUNT_MODE,
): TriggerEvent[] {
  state.lastTimestamp = -1.0;
  return advanceEngineByDeltaBeats(state, deltaBeats, centerX, centerY, countMode);
}

/**
 * Advance the engine by one frame.
 * Returns a list of trigger events (resonance points crossing 12-o'clock).
 * Uses deterministic beat counting — EVERY rotation triggers, even at extreme speed.
 */
export function tick(
  state: EngineState,
  timestamp: number,
  centerX: number,
  centerY: number,
  countMode: OrbitCountMode = DEFAULT_ORBIT_COUNT_MODE,
): TriggerEvent[] {
  if (!state.playing) {
    state.lastTimestamp = timestamp;
    return [];
  }

  if (state.lastTimestamp < 0) {
    state.lastTimestamp = timestamp;
    return [];
  }

  // Delta time in seconds (double precision)
  const dtSeconds: number = (timestamp - state.lastTimestamp) / 1000.0;
  state.lastTimestamp = timestamp;

  // Cap delta to prevent huge jumps (e.g. tab was backgrounded)
  const cappedDt = Math.min(dtSeconds, 0.1);

  // Beats elapsed this frame
  const beatsPerSecond: number = (state.baseBPM / 60.0) * state.speedMultiplier;
  const deltaBeats: number = cappedDt * beatsPerSecond;
  return advanceEngineByDeltaBeats(state, deltaBeats, centerX, centerY, countMode);
}

/**
 * Reset all phase counters.
 */
export function resetEngine(state: EngineState): void {
  state.elapsedBeats = 0.0;
  state.lastTimestamp = -1.0;
  for (const orbit of state.orbits) {
    orbit.phase = 0.0;
    orbit.lastTriggerBeat = -1;
  }
}

/**
 * Generate a unique ID for orbits.
 */
export function generateOrbitId(): string {
  const webCrypto = globalThis.crypto;

  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }

  if (webCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);

    // Format RFC 4122 v4 UUID bytes when randomUUID is unavailable.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  return `orbit-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Preset orbit ratios for quick loading.
 */
export const PRESET_RATIOS: Record<string, number[]> = {
  'Classic 3:4:5:7': [3, 4, 5, 7],
  'Fibonacci': [2, 3, 5, 8],
  'Prime Series': [2, 3, 5, 7, 11],
  'Pentatonic': [3, 5, 7, 9, 11],
  'Harmonic': [2, 4, 6, 8],
  'Triplet': [3, 6, 9],
  'Minimal': [2, 3],
  'Extended': [2, 3, 4, 5, 6, 7, 8],
};

/**
 * Default orbit presets for initial demo.
 */
export const DEFAULT_ORBITS: Omit<Orbit, 'id' | 'phase' | 'lastTriggerBeat'>[] = [
  { pulseCount: 3,  radius: 90,  direction: 1,  color: '#00FFAA', harmonyDegree: 0, harmonyRegister: 0 },
  { pulseCount: 4,  radius: 150, direction: -1, color: '#FF3366', harmonyDegree: 2, harmonyRegister: 0 },
  { pulseCount: 5,  radius: 210, direction: 1,  color: '#3388FF', harmonyDegree: 4, harmonyRegister: 0 },
  { pulseCount: 7,  radius: 270, direction: -1, color: '#FFAA00', harmonyDegree: 1, harmonyRegister: 1 },
];

/**
 * Create a full Orbit from a partial definition.
 */
export function createOrbit(
  def: Omit<Orbit, 'id' | 'phase' | 'lastTriggerBeat'>,
): Orbit {
  return {
    ...def,
    id: generateOrbitId(),
    phase: 0.0,
    lastTriggerBeat: -1,
  };
}
