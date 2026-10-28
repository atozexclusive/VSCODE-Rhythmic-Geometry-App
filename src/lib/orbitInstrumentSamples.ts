
// Independent Orbit voices: low-register, non-resonant unison with diffuse tails.
// IDs remain stable so saved scenes keep their instrument selection.
export const ORBIT_DESIGNED_INSTRUMENTS = [
  ['orbit-keys', 'Nebula Keys'],
  ['dusk-synth', 'Dusk Synth'],
] as const;
export type OrbitDesignedInstrument = typeof ORBIT_DESIGNED_INSTRUMENTS[number][0];
export function isOrbitDesignedInstrument(value: string | undefined): value is OrbitDesignedInstrument {
  return ORBIT_DESIGNED_INSTRUMENTS.some(([id]) => id === value);
}

const TAU = Math.PI * 2;
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

const programs = {
  'dusk-synth': { durations: [1.35, 0.72, 0.34], attack: 0.032, decay: 0.5, octave: 0.25, spread: 3, warmth: 1.35, space: 0.12 },
  'orbit-keys': { durations: [1.65, 0.85, 0.38], attack: 0.045, decay: 0.58, octave: 0.25, spread: 5, warmth: 1.5, space: 0.2 },
} as const;
const spectra = {
  'dusk-synth': [1, 0.3, 0.12, 0.08, 0.025, 0.018, 0.009, 0.004],
  'orbit-keys': [1, 0.24, 0.18, 0.045, 0.045, 0.02, 0.015, 0.006],
} as const;

// Dense passages shorten the tail, while keeping a rounded onset and stable pitch.
export function getOrbitInstrumentDuration(instrument: OrbitDesignedInstrument, speed: number): number {
  return programs[instrument].durations[speed >= 7 ? 2 : speed >= 3 ? 1 : 0];
}

/** Dark additive unison: only harmonic partials, no FM strike, pitch sweep,
 * resonant filter spike, or shortened Study-patch attack. Independent slow
 * timbre movement and stereo diffusion follow the evolving-pad approach:
 * https://www.syntorial.com/tutorials/synth-quickie-evolving-pad/
 */
export function renderOrbitInstrument(
  instrument: OrbitDesignedInstrument, frequency: number, sampleRate: number, speed = 1, phaseOffset = 0,
): [Float32Array, Float32Array] {
  const [dryL, dryR, wetL, wetR] = renderOrbitInstrumentLayers(instrument, frequency, sampleRate, speed, phaseOffset);
  for (let i = 0; i < dryL.length; i++) { dryL[i] += wetL[i]; dryR[i] += wetR[i]; }
  return [dryL, dryR];
}

/** Four discrete channels let the live mixer control space without resynthesis. */
export function renderOrbitInstrumentLayers(
  instrument: OrbitDesignedInstrument, frequency: number, sampleRate: number, speed = 1, phaseOffset = 0,
): [Float32Array, Float32Array, Float32Array, Float32Array] {
  const program = programs[instrument];
  const duration = getOrbitInstrumentDuration(instrument, speed);
  const length = Math.ceil(duration * sampleRate);
  const left = new Float32Array(length), right = new Float32Array(length);
  const fundamental = frequency * program.octave;
  const attack = Math.min(program.attack, duration * 0.16);
  const decay = program.decay * duration / program.durations[0];
  const envelope = new Float32Array(length), brightness = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    envelope[i] = ease(t / attack) * Math.exp(-Math.max(0, t - attack) / decay)
      * (1 - ease((t - duration * 0.55) / (duration * 0.45)));
    // Slow spectral breathing instead of a bright percussive filter envelope.
    brightness[i] = program.warmth + 0.3 * Math.sin(TAU * 0.23 * t + 0.4);
  }
  for (let harmonic = 1; harmonic <= 8; harmonic++) {
    const weight = spectra[instrument][harmonic - 1];
    const levels = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const hz = fundamental * harmonic;
      // Absolute treble damping also keeps the highest color notes mellow.
      const motion = harmonic === 1 ? 1 : 0.88 + 0.12 * Math.sin(TAU * 0.17 * i / sampleRate + harmonic * 0.7);
      levels[i] = weight * motion * envelope[i] / Math.sqrt(1 + (harmonic / brightness[i]) ** 6)
        / Math.sqrt(1 + (hz / 1050) ** 4);
    }
    for (let voice = 0; voice < 5; voice++) {
      const detune = (voice - 2) * program.spread / 2;
      const hz = fundamental * 2 ** (detune / 1200);
      if (hz * harmonic >= sampleRate * 0.42) continue;
      // Restrained width keeps a solid center and survives mono phone playback.
      const pan = 0.2 + voice * 0.15;
      const gainL = Math.cos(pan * Math.PI / 2) / 4.2;
      const gainR = Math.sin(pan * Math.PI / 2) / 4.2;
      const step = TAU * hz * harmonic / sampleRate;
      const sinStep = Math.sin(step), cosStep = Math.cos(step);
      const phase = voice * 0.41 * harmonic + phaseOffset;
      let sin = Math.sin(phase), cos = Math.cos(phase);
      for (let i = 0; i < length; i++) {
        left[i] += sin * levels[i] * gainL;
        right[i] += sin * levels[i] * gainR;
        const nextSin = sin * cosStep + cos * sinStep;
        cos = cos * cosStep - sin * sinStep;
        sin = nextSin;
      }
    }
  }
  // Keep the filtered cross-channel reflections separate from the dry body.
  const dryL = left.slice(), dryR = right.slice();
  const taps = [0.043, 0.071, 0.113, 0.173, 0.251, 0.337];
  const delayScale = Math.min(1, duration / 1.3);
  const delays = taps.map((time, tap) => ({
    left: Math.round(time * delayScale * sampleRate),
    right: Math.round((time + 0.019) * delayScale * sampleRate),
    level: program.space * (1 - tap / 8) / 3,
  }));
  let lowL = 0, lowR = 0;
  let inputL = 0, inputR = 0, highL = 0, highR = 0;
  const filter = 1 - Math.exp(-TAU * 850 / sampleRate);
  const highPass = Math.exp(-TAU * 20 / sampleRate);
  for (let i = 0; i < length; i++) {
    let reflectionsL = 0, reflectionsR = 0;
    for (const { left: delayL, right: delayR, level } of delays) {
      const atL = i - delayL;
      const atR = i - delayR;
      if (atL >= 0) reflectionsL += dryR[atL] * level;
      if (atR >= 0) reflectionsR += dryL[atR] * level;
    }
    lowL += filter * (reflectionsL - lowL);
    lowR += filter * (reflectionsR - lowR);
    const sumL = dryL[i] + lowL, sumR = dryR[i] + lowR;
    highL = highPass * (highL + sumL - inputL);
    highR = highPass * (highR + sumR - inputR);
    inputL = sumL; inputR = sumR;
    const fade = 1 - ease((i / sampleRate - duration * 0.82) / (duration * 0.18));
    left[i] = highL * 0.75 * fade;
    right[i] = highR * 0.75 * fade;
  }
  // Attenuate only: never boost a weak attack or noise into a hard transient.
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const trim = Math.min(1, 0.68 / Math.max(peak, 1e-9));
  let dryInputL = 0, dryInputR = 0, dryHighL = 0, dryHighR = 0;
  for (let i = 0; i < length; i++) {
    const l = dryL[i], r = dryR[i];
    dryHighL = highPass * (dryHighL + l - dryInputL);
    dryHighR = highPass * (dryHighR + r - dryInputR);
    dryInputL = l; dryInputR = r;
    const fade = 1 - ease((i / sampleRate - duration * 0.82) / (duration * 0.18));
    dryL[i] = dryHighL * 0.75 * fade * trim;
    dryR[i] = dryHighR * 0.75 * fade * trim;
    left[i] = left[i] * trim - dryL[i];
    right[i] = right[i] * trim - dryR[i];
  }
  for (const channel of [dryL, dryR, left, right]) channel[0] = channel[length - 1] = 0;
  return [dryL, dryR, left, right];
}

