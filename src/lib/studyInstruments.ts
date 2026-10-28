/**
 * Separate sampled synth instruments; the original Study oscillator patches stay intact.
 * Original DSP, informed by musician-led Serum recipes:
 * mysticalankar.com/blogs/blog/create-a-mellow-rhodes-sound-using-xfer-serum
 * allblu.co/post/how-to-make-a-rhodes-piano-in-serum
 * mysticalankar.com/blogs/blog/pop-edm-pluck-synth-serum-tutorial-sound-design
 * These are browser-native instruments, not Serum presets or sampled commercial assets.
 */
export type StudyInstrument = 'chorus-keys';
const TAU = Math.PI * 2;
const buffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x));

export function isStudyInstrument(palette: string): palette is StudyInstrument {
  return palette === 'chorus-keys';
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

export function getStudyInstrumentLevel(instrument: StudyInstrument): number {
  return 1.1;
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
