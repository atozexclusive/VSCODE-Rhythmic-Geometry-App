/** Original Orbit voice informed by Mirko Ruta's documented modular approach:
 * https://www.ruta-sound.com/modular — slowly modulated tone, a stable dry body,
 * and parallel stereo effects. This is not a recreation of his private patches.
 * Wavetable-style spectral morphing is rendered as band-limited harmonics.
 */
const TAU = Math.PI * 2;
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

export type AstralInstrument = 'astral-veil' | 'lunar-silk' | 'prism-tide';
export function isAstralInstrument(value: string): value is AstralInstrument {
  return value === 'astral-veil' || value === 'lunar-silk' || value === 'prism-tide';
}
const profiles = {
  'astral-veil': {
    durations: [2.6, 1.25, 0.58], attack: 0.045, bodyDecay: 0.75, breathDecay: 1.1, bloom: 2.2,
    fundamental: 0.82, harmonics: 0.32, harmonicSlope: 1.4, warmth: 3.2, treble: 1800,
    forms: [760, 130, 0.19, 380, 0.22, 1260, 180, 0.13, 440, 0.16],
    detune: 4, panStart: 0.28, panStep: 0.22, taps: [0.079, 0.131, 0.211],
    wet: [0.18, 0.13, 0.09], skew: 0.027, wetCutoff: 1600,
    diffuseL: [0.017, 0.031], diffuseR: [0.023, 0.037], trim: 0.82,
  },
  'lunar-silk': {
    durations: [3.1, 1.45, 0.66], attack: 0.06, bodyDecay: 1, breathDecay: 1.45, bloom: 2.5,
    fundamental: 0.9, harmonics: 0.28, harmonicSlope: 1.6, warmth: 2.8, treble: 1500,
    forms: [520, 100, 0.15, 330, 0.2, 960, 120, 0.11, 410, 0.13],
    detune: 6, panStart: 0.22, panStep: 0.28, taps: [0.097, 0.163, 0.257],
    wet: [0.23, 0.16, 0.1], skew: 0.033, wetCutoff: 1200,
    diffuseL: [0.023, 0.041], diffuseR: [0.029, 0.043], trim: 0.78,
  },
  'prism-tide': {
    durations: [2.15, 1, 0.46], attack: 0.032, bodyDecay: 0.65, breathDecay: 0.85, bloom: 2.1,
    fundamental: 0.78, harmonics: 0.4, harmonicSlope: 1.45, warmth: 3.5, treble: 1700,
    forms: [890, 160, 0.31, 350, 0.18, 1420, 140, 0.17, 400, 0.12],
    detune: 5, panStart: 0.26, panStep: 0.24, taps: [0.063, 0.109, 0.181],
    wet: [0.16, 0.12, 0.08], skew: 0.021, wetCutoff: 1450,
    diffuseL: [0.013, 0.029], diffuseR: [0.019, 0.033], trim: 0.84,
  },
} as const;

export function getAstralDuration(speed: number, instrument: AstralInstrument = 'astral-veil'): number {
  return profiles[instrument].durations[speed >= 7 ? 2 : speed >= 3 ? 1 : 0];
}

// A pair of short all-pass stages smears the wet signal without feedback gain
// buildup. The dry voice retains the location and rhythm of each Orbit impact.
function diffuse(input: Float32Array, sampleRate: number, times: number[]): Float32Array {
  let output = input;
  for (const time of times) {
    const delay = Math.max(1, Math.round(time * sampleRate));
    const next = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      next[i] = -0.48 * output[i];
      if (i >= delay) next[i] += output[i - delay] + 0.48 * next[i - delay];
    }
    output = next;
  }
  return output;
}

export function renderAstralInstrument(
  frequency: number, sampleRate: number, speed: number, phaseOffset: number, instrument: AstralInstrument = 'astral-veil',
): [Float32Array, Float32Array] {
  const profile = profiles[instrument];
  const [a, depthA, rateA, widthA, levelA, b, depthB, rateB, widthB, levelB] = profile.forms;
  const duration = getAstralDuration(speed, instrument);
  const length = Math.ceil(duration * sampleRate);
  const left = new Float32Array(length), right = new Float32Array(length);
  // A low-mid center rather than the bright bell register of the input palette.
  const fundamental = frequency * 0.5;
  const timeScale = duration / profile.durations[0];
  const attack = Math.min(profile.attack, duration * 0.12);
  const body = new Float32Array(length), breath = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const release = 1 - ease((t - duration * 0.5) / (duration * 0.5));
    body[i] = ease(t / attack) * Math.exp(-Math.max(0, t - attack) / (profile.bodyDecay * timeScale)) * release;
    // The upper texture blooms after the body: no sharp high-frequency strike.
    breath[i] = ease(t / (attack * profile.bloom)) * Math.exp(-t / (profile.breathDecay * timeScale)) * release;
  }
  for (let harmonic = 1; harmonic <= 16; harmonic++) {
    const hz = fundamental * harmonic;
    const levels = new Float32Array(length);
    const bodyWeight = harmonic === 1 ? profile.fundamental : profile.harmonics / harmonic ** profile.harmonicSlope / Math.sqrt(1 + (harmonic / profile.warmth) ** 6);
    const treble = 1 / Math.sqrt(1 + (hz / profile.treble) ** 8);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Broad, gently moving spectral shapes add air without a ringing peak.
      const formantA = a + depthA * Math.sin(TAU * rateA * t + 0.4);
      const formantB = b + depthB * Math.sin(TAU * rateB * t + 1.1);
      const airWeight = harmonic === 1 ? 0 : (levelA * Math.exp(-(((hz - formantA) / widthA) ** 2))
        + levelB * Math.exp(-(((hz - formantB) / widthB) ** 2))) / harmonic ** 0.25;
      levels[i] = (bodyWeight * body[i] + airWeight * breath[i]) * treble;
    }
    for (let voice = 0; voice < 3; voice++) {
      const hz = fundamental * 2 ** ((voice - 1) * profile.detune / 1200);
      if (hz * harmonic >= sampleRate * 0.42) continue;
      const pan = profile.panStart + voice * profile.panStep;
      const l = Math.cos(pan * Math.PI / 2) / 2.7;
      const r = Math.sin(pan * Math.PI / 2) / 2.7;
      const step = TAU * hz * harmonic / sampleRate;
      const sinStep = Math.sin(step), cosStep = Math.cos(step);
      const phase = phaseOffset + voice * 0.39 * harmonic;
      let sin = Math.sin(phase), cos = Math.cos(phase);
      for (let i = 0; i < length; i++) {
        left[i] += sin * levels[i] * l;
        right[i] += sin * levels[i] * r;
        const nextSin = sin * cosStep + cos * sinStep;
        cos = cos * cosStep - sin * sinStep;
        sin = nextSin;
      }
    }
  }
  // Filtered delays are parallel sends. Diffusion makes them a soft halo rather
  // than extra rhythmic clicks; none of these tails can retrigger a note.
  const wetL = new Float32Array(length), wetR = new Float32Array(length);
  const scale = Math.min(1, duration / 1.4);
  const taps = profile.taps.map((time, index) => ({
    left: Math.round(time * scale * sampleRate),
    right: Math.round((time + profile.skew) * scale * sampleRate),
    level: profile.wet[index],
  }));
  const filter = 1 - Math.exp(-TAU * profile.wetCutoff / sampleRate);
  let lowL = 0, lowR = 0;
  for (let i = 0; i < length; i++) {
    let l = 0, r = 0;
    for (const tap of taps) {
      if (i >= tap.left) l += right[i - tap.left] * tap.level;
      if (i >= tap.right) r += left[i - tap.right] * tap.level;
    }
    lowL += filter * (l - lowL); lowR += filter * (r - lowR);
    wetL[i] = lowL; wetR[i] = lowR;
  }
  const spaceL = diffuse(wetL, sampleRate, profile.diffuseL.map(time => time * scale));
  const spaceR = diffuse(wetR, sampleRate, profile.diffuseR.map(time => time * scale));
  const highPass = Math.exp(-TAU * 28 / sampleRate);
  let inputL = 0, inputR = 0, highL = 0, highR = 0, peak = 0;
  for (let i = 0; i < length; i++) {
    const l = left[i] + spaceL[i], r = right[i] + spaceR[i];
    highL = highPass * (highL + l - inputL); highR = highPass * (highR + r - inputR);
    inputL = l; inputR = r;
    const fade = 1 - ease((i / sampleRate - duration * 0.8) / (duration * 0.2));
    left[i] = highL * profile.trim * fade; right[i] = highR * profile.trim * fade;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const trim = Math.min(1, 0.68 / Math.max(peak, 1e-9));
  for (let i = 0; i < length; i++) { left[i] *= trim; right[i] *= trim; }
  left[0] = right[0] = left[length - 1] = right[length - 1] = 0;
  return [left, right];
}
