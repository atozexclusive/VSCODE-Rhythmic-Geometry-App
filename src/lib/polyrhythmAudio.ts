import { getStudySectionLayers } from './polyrhythmStudy';
import { SCALE_PRESETS } from './audioEngine';
import { getStudyInstrumentSample, getStudyInstrumentLevel, isStudyInstrument, type StudyInstrument } from './studyInstruments';
import { getStudyPitch, getStudySequencePitches } from './studyPitch';
import { type StudyLayerVoice, getPlaybackStepIndex, type PolyrhythmSoundSettings, type PolyrhythmStudy } from './polyrhythmStudy';

let audioContext: AudioContext | null = null;
let masterBus: StudyOutputBus | null = null;
let recordingDestination: MediaStreamAudioDestinationNode | null = null;
const activeSamples = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>();
const activeVoices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();

// Raise quiet Study voices before limiting; speakers and exports share this mix.
const STUDY_INPUT_GAIN = 4;
const STUDY_OUTPUT_GAIN = 0.75;
interface StudyOutputBus { input: GainNode; output: GainNode; reverb?: ConvolverNode }
const outputBuses = new WeakMap<AudioNode, StudyOutputBus>();

interface VoiceOptions {
  type: OscillatorType;
  frequency: number;
  gain: number;
  attack: number;
  smoothAttack?: boolean;
  release: number;
  filterFrequency: number;
  filterType?: BiquadFilterType;
  filterQ?: number;
  atTime?: number;
}

interface VoiceTarget {
  context: AudioContext;
  destination?: AudioNode;
  outputToSpeakers: boolean;
  reverbAmount?: number;
}

const reverbImpulseCache = new WeakMap<AudioContext, AudioBuffer>();

function getReverbImpulse(context: AudioContext): AudioBuffer {
  const cached = reverbImpulseCache.get(context);
  if (cached) {
    return cached;
  }
  const duration = 1.8;
  const frameCount = Math.floor(context.sampleRate * duration);
  const impulse = context.createBuffer(2, frameCount, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < frameCount; index += 1) {
      const decay = Math.pow(1 - index / frameCount, 2.8);
      data[index] = (Math.random() * 2 - 1) * decay;
    }
  }
  reverbImpulseCache.set(context, impulse);
  return impulse;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (audioContext?.state === 'closed') {
    audioContext = null;
    masterBus = null;
    recordingDestination = null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getStudyOutputBus(context: AudioContext, destination: AudioNode): StudyOutputBus {
  const cached = outputBuses.get(destination);
  if (cached) return cached;
  const input = context.createGain();
  input.gain.value = STUDY_INPUT_GAIN;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 6;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.12;
  const output = context.createGain();
  output.gain.value = STUDY_OUTPUT_GAIN;
  input.connect(limiter);
  limiter.connect(output);
  output.connect(destination);
  const bus = { input, output };
  outputBuses.set(destination, bus);
  return bus;
}

function getMasterOutput(context: AudioContext): AudioNode {
  if (!masterBus) {
    masterBus = getStudyOutputBus(context, context.destination);
    if (recordingDestination) masterBus.output.connect(recordingDestination);
  }
  return masterBus.input;
}

function withVoice(options: VoiceOptions, target?: VoiceTarget): void {
  const context = target?.context ?? getAudioContext();
  if (!context) {
    return;
  }

  const now = options.atTime ?? context.currentTime;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.frequency, now);

  filter.type = options.filterType ?? 'lowpass';
  filter.frequency.setValueAtTime(options.filterFrequency, now);
  filter.Q.setValueAtTime(options.filterQ ?? 0.7, now);

  if (options.smoothAttack) {
    // A raised-cosine fade has a gentle slope at both ends. The old
    // exponential rise concentrated almost the entire attack at its peak.
    gainNode.gain.setValueAtTime(0, now);
    for (let step = 1; step <= 16; step += 1) {
      const progress = step / 16;
      const level = options.gain * (1 - Math.cos(Math.PI * progress)) / 2;
      gainNode.gain.linearRampToValueAtTime(level, now + options.attack * progress);
    }
  } else {
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(options.gain, now + options.attack);
  }
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + options.release);

  oscillator.connect(filter);
  filter.connect(gainNode);
  const connectOutput = (node: AudioNode) => {
    if (target?.outputToSpeakers ?? true) {
      node.connect(getMasterOutput(context));
    }
    if (target?.destination) {
      node.connect(getStudyOutputBus(context, target.destination).input);
    }
  };
  connectOutput(gainNode);

  const reverbAmount = clamp(target?.reverbAmount ?? 0, 0, 1);
  if (reverbAmount > 0.001) {
    const convolver = context.createConvolver();
    const wetGain = context.createGain();
    convolver.buffer = getReverbImpulse(context);
    wetGain.gain.setValueAtTime(reverbAmount * 0.55, now);
    gainNode.connect(convolver);
    convolver.connect(wetGain);
    connectOutput(wetGain);
  }

  oscillator.start(now);
  oscillator.stop(now + options.release + 0.04);
  const activeVoice = { oscillator, gain: gainNode };
  activeVoices.add(activeVoice);
  oscillator.addEventListener('ended', () => {
    activeVoices.delete(activeVoice);
  }, { once: true });
}

export function silencePolyrhythmAudio(): void {
  const context = getAudioContext();
  if (!context) {
    activeVoices.clear();
    return;
  }

  const now = context.currentTime;
  activeSamples.forEach(({ gain }) => {
    gain.gain.cancelAndHoldAtTime(now);
    gain.gain.linearRampToValueAtTime(0, now + 0.025);
  });
  activeVoices.forEach(({ oscillator, gain }) => {
    try {
      gain.gain.cancelAndHoldAtTime(now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      oscillator.stop(now + 0.03);
    } catch {
      // The voice may already have reached its scheduled stop time.
    }
  });
}

function triggerPalettePulse(
  palette: PolyrhythmSoundSettings['palette'],
  frequency: number,
  gain: number,
  atTime?: number,
  target?: VoiceTarget,
): void {
  if (palette === 'study-pulse') {
    withVoice({
      type: 'triangle',
      frequency,
      gain,
      attack: 0.01,
      release: 0.18,
      filterFrequency: 1800,
      atTime,
    }, target);
    return;
  }

  if (palette === 'wood') {
    withVoice({
      type: 'triangle',
      frequency: frequency * 0.92,
      gain: clamp(gain * 0.96, 0.01, 0.24),
      attack: 0.01,
      smoothAttack: true,
      release: 0.13,
      filterFrequency: 980,
      filterQ: 0.6,
      atTime,
    }, target);
    return;
  }

  if (palette === 'soft-synth') {
    withVoice({
      type: 'sine',
      frequency,
      gain: clamp(gain * 0.92, 0.01, 0.2),
      attack: 0.018,
      smoothAttack: true,
      release: 0.2,
      filterFrequency: 1500,
      atTime,
    }, target);
    return;
  }

  if (palette === 'chime') {
    const level = clamp(gain * 0.7, 0.008, 0.11);
    withVoice({
      type: 'sine',
      frequency,
      gain: level,
      attack: 0.008,
      release: 1.45,
      filterFrequency: 3400,
      filterQ: 0.4,
      atTime,
    }, target);
    withVoice({
      type: 'sine',
      frequency: clamp(frequency * 2.01, 120, 4800),
      gain: level * 0.31,
      attack: 0.005,
      release: 1.08,
      filterFrequency: 4800,
      filterQ: 0.35,
      atTime,
    }, target);
    withVoice({
      type: 'sine',
      frequency: clamp(frequency * 3.98, 180, 6200),
      gain: level * 0.1,
      attack: 0.004,
      release: 0.76,
      filterFrequency: 6000,
      filterQ: 0.3,
      atTime,
    }, target);
    return;
  }

  if (palette === 'warm-synth') {
    const level = clamp(gain * 0.74, 0.008, 0.105);
    withVoice({
      type: 'triangle',
      frequency,
      gain: level,
      attack: 0.032,
      release: 1.12,
      filterFrequency: 1250,
      filterQ: 0.45,
      atTime,
    }, target);
    withVoice({
      type: 'sine',
      frequency: clamp(frequency * 0.5, 42, 800),
      gain: level * 0.26,
      attack: 0.04,
      release: 1.26,
      filterFrequency: 720,
      filterQ: 0.38,
      atTime,
    }, target);
    return;
  }

  if (palette === 'meditation-pad') {
    const level = clamp(gain * 0.68, 0.008, 0.095);
    withVoice({
      type: 'triangle',
      frequency,
      gain: level,
      attack: 0.038,
      release: 1.72,
      filterFrequency: 1380,
      filterQ: 0.38,
      atTime,
    }, target);
    withVoice({
      type: 'sine',
      frequency: clamp(frequency * 1.5, 110, 3600),
      gain: level * 0.3,
      attack: 0.052,
      release: 1.9,
      filterFrequency: 2100,
      filterQ: 0.3,
      atTime,
    }, target);
    return;
  }

  if (palette === 'crystal-bell') {
    const level = clamp(gain * 0.64, 0.007, 0.09);
    withVoice({
      type: 'sine',
      frequency,
      gain: level,
      attack: 0.006,
      release: 1.58,
      filterFrequency: 3900,
      filterQ: 0.32,
      atTime,
    }, target);
    withVoice({
      type: 'sine',
      frequency: clamp(frequency * 2.67, 150, 5200),
      gain: level * 0.24,
      attack: 0.004,
      release: 1.1,
      filterFrequency: 5200,
      filterQ: 0.28,
      atTime,
    }, target);
    return;
  }

  if (palette === 'ambient-bloom') {
    const level = clamp(gain * 0.65, 0.007, 0.092);
    withVoice({
      type: 'sine',
      frequency,
      gain: level,
      attack: 0.024,
      release: 1.42,
      filterFrequency: 1650,
      filterQ: 0.3,
      atTime,
    }, target);
    withVoice({
      type: 'triangle',
      frequency: clamp(frequency * 2, 140, 4200),
      gain: level * 0.2,
      attack: 0.045,
      release: 1.66,
      filterFrequency: 2500,
      filterQ: 0.25,
      atTime,
    }, target);
    return;
  }

  withVoice({
    type: 'square',
    frequency: frequency * 1.12,
    gain: clamp(gain * 0.82, 0.01, 0.2),
    attack: 0.003,
    release: 0.07,
    filterFrequency: 2600,
    filterType: 'highpass',
    filterQ: 0.82,
    atTime,
  }, target);
}

function triggerAccentLayer(
  palette: PolyrhythmSoundSettings['palette'],
  frequency: number,
  gain: number,
  atTime?: number,
  target?: VoiceTarget,
): void {
  const brightPalette = palette === 'bright-marker';
  const woodPalette = palette === 'wood';
  const smoothAttack = woodPalette || palette === 'soft-synth';
  withVoice({
    type: woodPalette ? 'triangle' : brightPalette ? 'square' : 'triangle',
    frequency: clamp(frequency * (woodPalette ? 1.72 : 2.35), 190, 3200),
    gain: clamp(gain * (brightPalette ? 0.36 : 0.46), 0.01, 0.085),
    attack: smoothAttack ? (woodPalette ? 0.008 : 0.012) : 0.002,
    smoothAttack,
    release: woodPalette ? 0.095 : 0.082,
    filterFrequency: brightPalette ? 4200 : 3100,
    filterType: brightPalette ? 'highpass' : 'bandpass',
    filterQ: brightPalette ? 1.05 : 1.55,
    atTime,
  }, target);
}

export function resumePolyrhythmAudio(): void {
  const context = getAudioContext();
  if (context && context.state !== 'running' && context.state !== 'closed') {
    void context.resume().catch(() => {});
  }
}

export function getPolyrhythmAudioRecordingStream(): MediaStream | null {
  const context = getAudioContext();
  if (!context || typeof context.createMediaStreamDestination !== 'function') {
    return null;
  }

  if (!recordingDestination) {
    recordingDestination = context.createMediaStreamDestination();
    if (masterBus) {
      masterBus.output.connect(recordingDestination);
    }
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => {});
  }

  return recordingDestination.stream;
}

function triggerStudyKeys(instrument: StudyInstrument, frequency: number, gain: number, accented: boolean, atTime: number | undefined, target: VoiceTarget): void {
  const context = target.context;
  const buses: StudyOutputBus[] = [];
  if (target.outputToSpeakers) {
    getMasterOutput(context);
    buses.push(masterBus!);
  }
  if (target.destination) buses.push(getStudyOutputBus(context, target.destination));
  const sample = getStudyInstrumentSample(context, instrument, frequency, accented);
  const source = context.createBufferSource();
  const output = context.createGain();
  source.buffer = sample.buffer;
  source.playbackRate.value = sample.playbackRate;
  output.gain.value = gain * getStudyInstrumentLevel(instrument);
  source.connect(output);
  const sends: GainNode[] = [];
  for (const bus of buses) {
    output.connect(bus.input);
    if ((target.reverbAmount ?? 0) > 0.001) {
      if (!bus.reverb) {
        bus.reverb = context.createConvolver();
        bus.reverb.buffer = getReverbImpulse(context);
        bus.reverb.connect(bus.input);
      }
      const send = context.createGain();
      send.gain.value = (target.reverbAmount ?? 0) * 0.24;
      output.connect(send); send.connect(bus.reverb); sends.push(send);
    }
  }
  const voice = { source, gain: output };
  activeSamples.add(voice);
  source.onended = () => {
    activeSamples.delete(voice);
    source.disconnect(); output.disconnect(); sends.forEach(send => send.disconnect());
  };
  source.start(Math.max(atTime ?? 0, context.currentTime + 0.008));
}

function prepareStudyKeys(context: AudioContext, study: PolyrhythmStudy): void {
  if (!study.soundEnabled) return;
  const groups = [study.layers, ...(study.chainEnabled ? study.chainCells ?? [] : []).map(cell => cell.layers)];
  for (const layers of groups) layers.forEach((layer, index) => {
    if (!layer.soundEnabled || (layer.voice && layer.voice !== 'standard')) return;
    const sound = { ...study.soundSettings, ...layer.soundSettings };
    if (!isStudyInstrument(sound.palette)) return;
    const noteCount = layer.noteSequence?.length ?? ((!sound.noteOrder || sound.noteOrder === 'standard')
      ? 1 : SCALE_PRESETS[sound.scaleName].intervals.length * 2);
    for (let hit = 0; hit < noteCount; hit++) {
      const frequencies = getStudySequencePitches(layer.noteSequence, sound, hit)
        ?? [getStudyPitch(layer.pitchHz, sound, index, hit)];
      for (const frequency of frequencies) {
        getStudyInstrumentSample(context, sound.palette, frequency, false);
        if (layer.accents?.some(Boolean)) getStudyInstrumentSample(context, sound.palette, frequency, true);
      }
    }
  });
}

/** Warm composed keys before starting the transport; this schedules no sound. */
export function preparePolyrhythmNotePhrases(study: PolyrhythmStudy): void {
  if (!study.layers.some(layer => layer.noteSequence?.length)) return;
  const context = getAudioContext();
  if (context) prepareStudyKeys(context, study);
}

export async function preparePolyrhythmAudioRecording(study: PolyrhythmStudy): Promise<MediaStream | null> {
  const context = getAudioContext();
  if (!context) return null;
  if (context.state === 'suspended') await context.resume();
  getMasterOutput(context);
  prepareStudyKeys(context, study);
  return getPolyrhythmAudioRecordingStream();
}

const drumNoiseCache = new WeakMap<AudioContext, AudioBuffer>();

function triggerStudyDrum(voice: StudyLayerVoice, gain: number, atTime: number | undefined, target: VoiceTarget, tune = 0): void {
  const tuning = 2 ** (tune / 12);
  if (voice === 'wood-block') {
    triggerPalettePulse('wood', 680 * tuning, gain, atTime, target);
    return;
  }
  const context = target.context;
  const now = atTime ?? context.currentTime;
  // Short modal percussion: no samples, long tails, or per-hit effect graphs.
  if (voice === 'clave' || voice === 'cascara' || voice === 'cowbell') {
    const partials = voice === 'clave'
      ? [{ hz: 2300, level: 0.85, decay: 0.038 }, { hz: 3600, level: 0.18, decay: 0.018 }]
      : voice === 'cascara'
        ? [{ hz: 860, level: 0.5, decay: 0.045 }, { hz: 1470, level: 0.32, decay: 0.032 }, { hz: 2380, level: 0.12, decay: 0.019 }]
        : [{ hz: 540, level: 0.62, decay: 0.15 }, { hz: 800, level: 0.36, decay: 0.11 }];
    for (const partial of partials) withVoice({
      type: voice === 'cowbell' ? 'square' : 'sine', frequency: partial.hz * tuning,
      gain: gain * partial.level, attack: 0.0025, release: partial.decay,
      filterFrequency: voice === 'cowbell' ? 2800 : 6500, atTime: now,
    }, target);
    return;
  }
  if (voice === 'kick' || voice === 'tom') {
    const kick = voice === 'kick';
    withVoice({ type: 'sine', frequency: (kick ? 65 : 150) * tuning, gain, attack: 0.003,
      release: kick ? 0.23 : 0.2, filterFrequency: kick ? 350 : 850, atTime: now }, target);
    withVoice({ type: 'triangle', frequency: (kick ? 120 : 230) * tuning, gain: gain * 0.2,
      attack: 0.002, release: 0.045, filterFrequency: 900, atTime: now }, target);
    return;
  }
  let noise = drumNoiseCache.get(context);
  if (!noise) {
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    drumNoiseCache.set(context, noise);
  }
  const source = context.createBufferSource();
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = voice === 'snare' || voice === 'shaker' ? 'bandpass' : 'highpass';
  filter.frequency.value = voice === 'snare' ? 1900 : voice === 'shaker' ? 7200 : 6500;
  filter.Q.value = 0.7;
  const output = context.createGain();
  const duration = voice === 'cymbal' ? 0.6 : voice === 'hi-hat' ? 0.075 : voice === 'shaker' ? 0.105 : 0.15;
  output.gain.setValueAtTime(0, now);
  output.gain.linearRampToValueAtTime(gain * (voice === 'snare' ? 1 : 0.65), now + (voice === 'shaker' ? 0.012 : 0.003));
  output.gain.exponentialRampToValueAtTime(0.00001, now + duration);
  source.connect(filter);
  filter.connect(output);
  const buses: StudyOutputBus[] = [];
  if (target.outputToSpeakers) buses.push(getStudyOutputBus(context, context.destination));
  if (target.destination) buses.push(getStudyOutputBus(context, target.destination));
  const sends: GainNode[] = [];
  for (const bus of buses) {
    output.connect(bus.input);
    if ((target.reverbAmount ?? 0) > 0.001) {
      if (!bus.reverb) {
        bus.reverb = context.createConvolver();
        bus.reverb.buffer = getReverbImpulse(context);
        bus.reverb.connect(bus.input);
      }
      const send = context.createGain();
      send.gain.value = (target.reverbAmount ?? 0) * 0.24;
      output.connect(send);
      send.connect(bus.reverb);
      sends.push(send);
    }
  }
  const activeSample = { source, gain: output };
  activeSamples.add(activeSample);
  source.onended = () => {
    activeSamples.delete(activeSample);
    source.disconnect();
    filter.disconnect();
    output.disconnect();
    sends.forEach((send) => send.disconnect());
  };
  source.start(now);
  source.stop(now + duration + 0.01);
  if (voice === 'snare') {
    withVoice({ type: 'triangle', frequency: 185, gain: gain * 0.35, attack: 0.003,
      release: 0.09, filterFrequency: 750, atTime: now }, target);
  }
}

export function triggerPolyrhythmPulse(options: {
  noteSequence?: number[][];
  voice?: StudyLayerVoice;
  layerSound?: Partial<Omit<PolyrhythmSoundSettings, 'rootNote' | 'scaleName'>>;
  drumTune?: number;
  frequency: number;
  gain: number;
  sound: PolyrhythmSoundSettings;
  layerIndex: number;
  beatCount: number;
  hitIndex?: number;
  accented?: boolean;
  atTime?: number;
  target?: VoiceTarget;
}): void {
  const sound = { ...options.sound, ...options.layerSound, rootNote: options.sound.rootNote, scaleName: options.sound.scaleName };
  const frequency = getStudyPitch(
    options.frequency,
    options.layerSound?.pitchMode === 'free' ? { ...sound, noteOrder: 'standard', register: 'tight' } : sound,
    options.layerIndex,
    options.hitIndex ?? 0,
  );
  const phrase = !options.voice || options.voice === 'standard'
    ? getStudySequencePitches(options.noteSequence, sound, options.hitIndex ?? 0) : null;
  if (phrase) {
    for (const note of phrase) triggerPolyrhythmPulse({
      ...options, noteSequence: undefined, frequency: note,
      gain: options.gain / Math.sqrt(phrase.length) * (phrase.length > 1 ? 0.8 : 1),
      sound: { ...sound, pitchMode: 'free', noteOrder: 'standard', register: 'tight', octaveShift: 0 },
      layerSound: { pitchMode: 'free', noteOrder: 'standard', register: 'tight', octaveShift: 0 },
    });
    return;
  }
  const peakGain = Math.max(0.008, Math.min(0.18, options.gain * (options.accented ? 1.18 : 0.82)));
  const context = options.target?.context ?? getAudioContext();
  const voiceTarget = context
    ? {
        context,
        destination: options.target?.destination,
        outputToSpeakers: options.target?.outputToSpeakers ?? true,
        reverbAmount: sound.reverbAmount ?? 0,
      }
    : options.target;
  if (options.voice && options.voice !== 'standard' && voiceTarget) {
    if (!Number.isFinite(options.gain) || options.gain <= 0) return;
    triggerStudyDrum(options.voice, peakGain, options.atTime, voiceTarget, options.drumTune);
    return;
  }
  if (isStudyInstrument(sound.palette) && voiceTarget) {
    if (!Number.isFinite(options.gain) || options.gain <= 0) return;
    triggerStudyKeys(sound.palette, frequency, peakGain, Boolean(options.accented), options.atTime, voiceTarget);
    return;
  }
  triggerPalettePulse(sound.palette, frequency, peakGain, options.atTime, voiceTarget);
  if (options.accented) {
    triggerAccentLayer(sound.palette, frequency, peakGain, options.atTime, voiceTarget);
  }
}

export function triggerPolyrhythmBarMarker(atTime?: number, target?: VoiceTarget): void {
  withVoice({
    type: 'triangle',
    frequency: 1046.5,
    gain: 0.075,
    attack: 0.003,
    release: 0.16,
    filterFrequency: 3200,
    atTime,
  }, target);
  withVoice({
    type: 'sine',
    frequency: 1568,
    gain: 0.025,
    attack: 0.002,
    release: 0.1,
    filterFrequency: 4200,
    atTime,
  }, target);
}

export function createPolyrhythmExportAudioStream(
  study: PolyrhythmStudy,
  durationSeconds: number,
  prerollSeconds = 0,
): MediaStream | null {
  const context = getAudioContext();
  if (!context || typeof context.createMediaStreamDestination !== 'function') {
    return null;
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => {});
  }

  const destination = context.createMediaStreamDestination();
  const target: VoiceTarget = {
    context,
    destination,
    outputToSpeakers: false,
  };
  getStudyOutputBus(context, destination);
  prepareStudyKeys(context, study);
  const startTime = context.currentTime + 0.12 + Math.max(0, prerollSeconds);
  const cyclesPerSecond = study.bpm / 60 / (study.cycleBeats ?? 4);
  const audibleDuration = Math.max(0, durationSeconds - Math.max(0, prerollSeconds));

  if (study.soundEnabled && study.barMarkerSoundEnabled && cyclesPerSecond > 0) {
    const barsPerSecond = study.bpm / 240;
    const barCount = Math.ceil(audibleDuration * barsPerSecond);
    for (let barIndex = 0; barIndex <= barCount; barIndex += 1) {
      const seconds = barIndex / barsPerSecond;
      if (seconds <= audibleDuration) {
        triggerPolyrhythmBarMarker(startTime + seconds, target);
      }
    }
  }

  const chainCells = study.chainEnabled && study.chainCells?.length
    ? study.chainCells
    : null;
  const chainPhrases = chainCells
    ? study.chainPhrases?.length
      ? study.chainPhrases
      : chainCells.map((cell) => ({ id: cell.id, cellId: cell.id, bars: cell.bars, enabledLayerIndices: undefined }))
    : null;
  const chainBarCount = chainPhrases?.reduce(
    (total, phrase) => total + Math.max(1, Math.round(phrase.bars || 1)),
    0,
  ) ?? 0;
  const layersForCycle = (cycleIndex: number) => {
    if (!chainCells || chainBarCount <= 0) {
      return study.layers;
    }
    let barInChain = cycleIndex % chainBarCount;
    for (const phrase of chainPhrases ?? []) {
      const phraseBars = Math.max(1, Math.round(phrase.bars || 1));
      if (barInChain < phraseBars) {
        return getStudySectionLayers(chainCells.find((cell) => cell.id === phrase.cellId)?.layers ?? study.layers, phrase);
      }
      barInChain -= phraseBars;
    }
    return chainCells[0]?.layers ?? study.layers;
  };

  if (study.soundEnabled && cyclesPerSecond > 0) {
    const noteOrderHits = new Map<string, number>();
    const barsPerCycle = (study.cycleBeats ?? 4) / 4;
    const barCount = Math.ceil(audibleDuration * study.bpm / 240);
    for (let barIndex = 0; barIndex <= barCount; barIndex += 1) {
      const cycleIndex = Math.floor(barIndex / barsPerCycle);
      layersForCycle(barIndex).forEach((layer, layerIndex) => {
        if (!layer.soundEnabled) {
          return;
        }
        const beatCount = Math.max(1, Math.round(layer.beatCount || 1));
      for (let stepIndex = 0; stepIndex < beatCount; stepIndex += 1) {
        const progress = stepIndex / beatCount;
        const playbackStep = getPlaybackStepIndex(layer, progress);
        if (!layer.activeSteps[playbackStep]) {
          continue;
        }
        const absoluteBars = (cycleIndex + progress) * barsPerCycle;
        if (absoluteBars < barIndex || absoluteBars >= barIndex + 1) continue;
        const seconds = (cycleIndex + progress) / cyclesPerSecond;
        if (seconds > audibleDuration) {
          continue;
        }
        const hitIndex = noteOrderHits.get(layer.id) ?? 0;
        noteOrderHits.set(layer.id, hitIndex + 1);
        triggerPolyrhythmPulse({
          hitIndex,
          voice: layer.voice,
          noteSequence: layer.noteSequence,
          layerSound: layer.soundSettings,
          drumTune: layer.drumTune,
          frequency: layer.pitchHz,
          gain: layer.gain,
          sound: study.soundSettings,
          layerIndex,
          beatCount,
          accented: Boolean(layer.accents?.[playbackStep]),
          atTime: startTime + seconds,
          target,
        });
      }
      });
    }
  }

  return destination.stream;
}
