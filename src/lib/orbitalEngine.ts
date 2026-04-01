// ============================================================
// Orbital Polymeter — Double-Precision Rotation Engine
// All math uses IEEE 754 double-precision (native JS number)
// Phase is computed deterministically from elapsed time,
// NOT accumulated per-frame deltas, to prevent drift.
// Bulletproof beat-counting ensures every rotation triggers.
// ============================================================

export interface Orbit {
  id: string;
  pulseCount: number;       // 2–100 integer beats per cycle
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
  speedMultiplier: number;  // 0.1 – 10.0
  elapsedBeats: number;     // master beat counter (double-precision)
  lastTimestamp: number;     // last RAF timestamp in ms
  baseBPM: number;          // reference tempo
}

// Two-pi constant (double precision)
const TAU: number = 2.0 * Math.PI;

/**
 * Create a fresh engine state.
 */
export function createEngineState(): EngineState {
  return {
    orbits: [],
    playing: false,
    speedMultiplier: 1.0,
    elapsedBeats: 0.0,
    lastTimestamp: -1.0,
    baseBPM: 120.0,
  };
}

/**
 * Deterministic phase for an orbit given elapsed master beats.
 * Each orbit completes one full rotation every `pulseCount` master beats.
 * Phase = (elapsedBeats / pulseCount) * TAU * direction   (mod TAU)
 *
 * Because we derive phase from the absolute elapsed counter
 * rather than accumulating deltas, there is zero drift.
 */
export function computePhase(
  elapsedBeats: number,
  pulseCount: number,
  direction: 1 | -1,
): number {
  const rotations: number = elapsedBeats / pulseCount;
  const frac: number = rotations - Math.floor(rotations);
  let angle: number = frac * TAU * direction;
  angle = ((angle % TAU) + TAU) % TAU;
  return angle;
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
): { x: number; y: number } {
  const phase = computePhase(elapsedBeats, orbit.pulseCount, orbit.direction);
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
): TriggerEvent[] {
  if (deltaBeats <= 0) {
    return [];
  }

  state.elapsedBeats += deltaBeats;

  const triggers: TriggerEvent[] = [];

  for (const orbit of state.orbits) {
    orbit.phase = computePhase(
      state.elapsedBeats,
      orbit.pulseCount,
      orbit.direction,
    );

    const totalRotations = state.elapsedBeats / orbit.pulseCount;
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
): TriggerEvent[] {
  state.lastTimestamp = -1.0;
  return advanceEngineByDeltaBeats(state, deltaBeats, centerX, centerY);
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
  return advanceEngineByDeltaBeats(state, deltaBeats, centerX, centerY);
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
