/**
 * Separate sampled synth instruments; the original Study oscillator patches stay intact.
 * Original DSP, informed by musician-led Serum recipes:
 * mysticalankar.com/blogs/blog/create-a-mellow-rhodes-sound-using-xfer-serum
 * allblu.co/post/how-to-make-a-rhodes-piano-in-serum
 * mysticalankar.com/blogs/blog/pop-edm-pluck-synth-serum-tutorial-sound-design
 * These are browser-native instruments, not Serum presets or sampled commercial assets.
 */
export type StudyInstrument = 'chorus-keys' | 'atmosphere-synth' | 'muted-pluck' | 'stereo-pluck';
const TAU = Math.PI * 2;
const buffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x));

export function isStudyInstrument(palette: string): palette is StudyInstrument {
  return palette === 'chorus-keys' || palette === 'atmosphere-synth' || palette === 'muted-pluck' || palette === 'stereo-pluck';
}

/** Smooth attack and damped release, with a longer body than the old ping voices. */
function amplitude(time: number, duration: number, attack: number, decay: number): number {
  const onset = time < attack ? 0.5 - 0.5 * Math.cos(Math.PI * time / attack) : 1;
  const end = Math.max(0, (time - (duration - 0.2)) / 0.2);
  return onset * Math.exp(-Math.max(0, time - attack) / decay)
    * (end > 0 ? 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, end)) : 1);
}

// A short, filtered room/ensemble layer is baked into each note. No feedback,
// global chorus processor, or extra oscillators are needed during playback.
function addEnsemble(left: Float32Array, right: Float32Array, sampleRate: number, wet: number): void {
  const dryLeft = left.slice();
  const dryRight = right.slice();
  for (let i = 0; i < left.length; i++) {
    const t = i / sampleRate;
    const delayL = (0.012 + 0.0012 * Math.sin(TAU * 0.31 * t)) * sampleRate;
    const delayR = (0.017 + 0.0012 * Math.sin(TAU * 0.29 * t + 1.3)) * sampleRate;
    const read = (data: Float32Array, at: number) => {
      if (at < 0) return 0;
      const index = Math.floor(at);
      return data[index] + (data[Math.min(index + 1, data.length - 1)] - data[index]) * (at - index);
    };
    left[i] = (dryLeft[i] + wet * read(dryRight, i - delayL)) / (1 + wet);
    right[i] = (dryRight[i] + wet * read(dryLeft, i - delayR)) / (1 + wet);
  }
}

/** Render dark unison keys into stereo PCM. */
export function renderStudyInstrument(
  instrument: StudyInstrument, frequency: number, sampleRate: number, accented = false,
): [Float32Array, Float32Array] {
  if (instrument === 'atmosphere-synth') return renderAtmosphericInstrument(frequency, sampleRate, accented);
  if (instrument === 'muted-pluck' || instrument === 'stereo-pluck') return renderPluck(instrument, frequency, sampleRate, accented);
  const duration = 1.1;
  const length = Math.ceil(duration * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  // Seven low-detune voices, using a dark saw/triangle harmonic blend. A
  // separate brightness decay closes the timbre before the amplitude tail.
  const detunes = [-7, -4, -2, 0, 2, 4, 7];
  const envelopes = new Float32Array(length);
  const brightness = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    envelopes[i] = amplitude(t, duration, 0.025, 0.26);
    brightness[i] = 1.25 + (accented ? 2.8 : 1.9) * Math.exp(-t / 0.13);
  }
  for (let harmonic = 1; harmonic <= 10; harmonic++) {
    const triangle = harmonic % 2 ? (harmonic % 4 === 1 ? 1 : -1) / (harmonic * harmonic) : 0;
    const weight = harmonic === 1 ? 1 : 0.3 / harmonic + 0.7 * triangle;
    const levels = new Float32Array(length);
    for (let i = 0; i < length; i++) levels[i] = weight * envelopes[i] / Math.sqrt(1 + (harmonic / brightness[i]) ** 4);
    for (let voice = 0; voice < detunes.length; voice++) {
      const hz = frequency * 2 ** (detunes[voice] / 1200);
      if (hz * harmonic >= sampleRate * 0.42) continue;
      const position = voice / (detunes.length - 1);
      const panL = Math.cos(position * Math.PI / 2) / 4.5;
      const panR = Math.sin(position * Math.PI / 2) / 4.5;
      const step = TAU * hz * harmonic / sampleRate;
      const sinStep = Math.sin(step), cosStep = Math.cos(step);
      let sin = Math.sin(voice * 0.37), cos = Math.cos(voice * 0.37);
      for (let i = 0; i < length; i++) {
        left[i] += sin * levels[i] * panL;
        right[i] += sin * levels[i] * panR;
        const nextSin = sin * cosStep + cos * sinStep;
        cos = cos * cosStep - sin * sinStep;
        sin = nextSin;
      }
    }
  }
  addEnsemble(left, right, sampleRate, 0.12);
  // A fixed trim preserves dynamics between notes; no peak normalization or
  // clipping distortion. Fade all stereo delay tails fully to zero as well.
  const trim = 0.72;
  const fadeSamples = Math.ceil(sampleRate * 0.035);
  for (let i = 0; i < length; i++) {
    const tail = i >= length - fadeSamples ? 0.5 - 0.5 * Math.cos(Math.PI * (length - 1 - i) / fadeSamples) : 1;
    left[i] *= trim * tail;
    right[i] *= trim * tail;
  }
  left[0] = right[0] = left[length - 1] = right[length - 1] = 0;
  return [left, right];
}

/** Independent envelope/filter cycles follow Joe Hanley's evolving-pad recipe:
 * syntorial.com/tutorials/synth-quickie-evolving-pad/
 * Durations are adapted to rhythmic Study playback, keeping a gentle audible onset.
 */
function renderAtmosphericInstrument(
  frequency: number, sampleRate: number, accented: boolean,
): [Float32Array, Float32Array] {
  const duration = 1.9;
  const attack = 0.065;
  const releaseStart = 0.55;
  const length = Math.ceil(duration * sampleRate);
  const left = new Float32Array(length), right = new Float32Array(length);
  const envelope = new Float32Array(length), cutoff = new Float32Array(length);
  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const body = Math.exp(-Math.max(0, t - attack) / 1.2);
    const release = t > releaseStart ? 1 - ease((t - releaseStart) / (duration - releaseStart)) : 1;
    envelope[i] = ease(t / attack) * body * release;
    cutoff[i] = 3.4 + 1.2 * Math.sin(TAU * 0.37 * t + 0.4);
    if (accented) cutoff[i] *= 1.12;
  }
  const detunes = [-10, -4, 0, 4, 10];
  for (let harmonic = 1; harmonic <= 12; harmonic++) {
    const weight = 1 / harmonic ** 1.55;
    const levels = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Timbre evolves at a different rate from cutoff, without detuning the note.
      const motion = harmonic === 1 ? 1 : 0.8 + 0.2 * Math.sin(TAU * 0.13 * t + harmonic * 0.63);
      levels[i] = weight * envelope[i] * motion / Math.sqrt(1 + (harmonic / cutoff[i]) ** 6);
    }
    for (let voice = 0; voice < detunes.length; voice++) {
      const hz = frequency * 2 ** (detunes[voice] / 1200);
      if (hz * harmonic >= sampleRate * 0.42) continue;
      const position = voice / (detunes.length - 1);
      const norm = 3.7;
      const gainL = Math.cos(position * Math.PI / 2) / norm;
      const gainR = Math.sin(position * Math.PI / 2) / norm;
      const step = TAU * hz * harmonic / sampleRate;
      const sinStep = Math.sin(step), cosStep = Math.cos(step);
      let sin = Math.sin(voice * 0.61), cos = Math.cos(voice * 0.61);
      for (let i = 0; i < length; i++) {
        left[i] += sin * levels[i] * gainL;
        right[i] += sin * levels[i] * gainR;
        const nextSin = sin * cosStep + cos * sinStep;
        cos = cos * cosStep - sin * sinStep;
        sin = nextSin;
      }
    }
  }
  addEnsemble(left, right, sampleRate, 0.22);
  // Quiet stereo reflections give dimension even with the user's Reverb at zero.
  const dryLeft = left.slice(), dryRight = right.slice();
  const taps = [0.053, 0.109];
  for (let i = 0; i < length; i++) {
    let l = dryLeft[i], r = dryRight[i];
    for (let tap = 0; tap < taps.length; tap++) {
      const atL = i - Math.round(taps[tap] * sampleRate);
      const atR = i - Math.round((taps[tap] + 0.017) * sampleRate);
      if (atL >= 0) l += dryRight[atL] * (tap ? 0.07 : 0.12);
      if (atR >= 0) r += dryLeft[atR] * (tap ? 0.07 : 0.12);
    }
    const tail = 1 - ease((i / sampleRate - duration + 0.08) / 0.08);
    left[i] = l * 0.66 * tail;
    right[i] = r * 0.66 * tail;
  }
  left[0] = right[0] = left[length - 1] = right[length - 1] = 0;
  return [left, right];
}

// Short amplitude and brightness envelopes follow the Serum pluck recipe above.
// The onset remains rounded to avoid clicks; no pitch drops or metallic partials.
function renderPluck(
  instrument: 'muted-pluck' | 'stereo-pluck', frequency: number, sampleRate: number, accented: boolean,
): [Float32Array, Float32Array] {
  const wide = instrument === 'stereo-pluck';
  const duration = wide ? 0.72 : 0.52;
  const length = Math.ceil(duration * sampleRate);
  const left = new Float32Array(length), right = new Float32Array(length);
  const detunes = wide ? [-8, -3, 0, 3, 8] : [-2, 0, 2];
  const envelope = new Float32Array(length), brightness = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    envelope[i] = amplitude(t, duration, wide ? 0.009 : 0.007, wide ? 0.15 : 0.105);
    brightness[i] = 1.1 + (accented ? 3.2 : 2.3) * Math.exp(-t / (wide ? 0.085 : 0.055));
  }
  for (let harmonic = 1; harmonic <= 9; harmonic++) {
    const weight = harmonic === 1 ? 1 : wide ? 0.75 / harmonic ** 1.4 : (harmonic % 2 ? 0.7 : 0.2) / harmonic ** 1.8;
    const levels = new Float32Array(length);
    for (let i = 0; i < length; i++) levels[i] = weight * envelope[i] / Math.sqrt(1 + (harmonic / brightness[i]) ** 4);
    for (let voice = 0; voice < detunes.length; voice++) {
      const hz = frequency * 2 ** (detunes[voice] / 1200);
      if (hz * harmonic >= sampleRate * 0.42) continue;
      const position = voice / (detunes.length - 1);
      const norm = wide ? 3.4 : 2.2;
      const gainL = Math.cos(position * Math.PI / 2) / norm;
      const gainR = Math.sin(position * Math.PI / 2) / norm;
      const step = TAU * hz * harmonic / sampleRate;
      const sinStep = Math.sin(step), cosStep = Math.cos(step);
      let sin = Math.sin(voice * 0.31), cos = Math.cos(voice * 0.31);
      for (let i = 0; i < length; i++) {
        left[i] += sin * levels[i] * gainL;
        right[i] += sin * levels[i] * gainR;
        const nextSin = sin * cosStep + cos * sinStep;
        cos = cos * cosStep - sin * sinStep;
        sin = nextSin;
      }
    }
  }
  addEnsemble(left, right, sampleRate, wide ? 0.12 : 0.055);
  const fadeSamples = Math.ceil(sampleRate * 0.025);
  for (let i = 0; i < length; i++) {
    const tail = i >= length - fadeSamples ? 0.5 - 0.5 * Math.cos(Math.PI * (length - 1 - i) / fadeSamples) : 1;
    left[i] *= 0.82 * tail; right[i] *= 0.82 * tail;
  }
  left[0] = right[0] = left[length - 1] = right[length - 1] = 0;
  return [left, right];
}

export function getStudyInstrumentLevel(instrument: StudyInstrument): number {
  return instrument === 'chorus-keys' ? 1.1 : instrument === 'atmosphere-synth' ? 0.95 : 1.35;
}

export function getStudyInstrumentSample(
  context: BaseAudioContext, instrument: StudyInstrument, frequency: number, accented: boolean,
): { buffer: AudioBuffer; playbackRate: number } {
  let cache = buffers.get(context);
  if (!cache) { cache = new Map(); buffers.set(context, cache); }
  // Minor-third multisamples keep timbre and decay consistent across registers.
  const midi = clamp(Math.round((69 + 12 * Math.log2(frequency / 440)) / 3) * 3, 36, 96);
  const rootHz = 440 * 2 ** ((midi - 69) / 12);
  const key = `${instrument}:${midi}:${accented}`;
  let buffer = cache.get(key);
  if (!buffer) {
    const channels = renderStudyInstrument(instrument, rootHz, context.sampleRate, accented);
    buffer = context.createBuffer(2, channels[0].length, context.sampleRate);
    buffer.getChannelData(0).set(channels[0]);
    buffer.getChannelData(1).set(channels[1]);
    cache.set(key, buffer);
  }
  return { buffer, playbackRate: frequency / rootHz };
}
