import { NOTE_NAMES, SCALE_PRESETS } from './audioEngine';
import { getPlaybackStepIndex, type PolyrhythmSoundSettings, type PolyrhythmStudy } from './polyrhythmStudy';

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let outputLimiter: DynamicsCompressorNode | null = null;
let recordingDestination: MediaStreamAudioDestinationNode | null = null;

const MASTER_GAIN_CEILING = 0.5;

interface VoiceOptions {
  type: OscillatorType;
  frequency: number;
  gain: number;
  attack: number;
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
    masterGain = null;
    outputLimiter = null;
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

function getMasterOutput(context: AudioContext): AudioNode {
  if (!masterGain || !outputLimiter) {
    masterGain = context.createGain();
    masterGain.gain.value = MASTER_GAIN_CEILING;

    outputLimiter = context.createDynamicsCompressor();
    outputLimiter.threshold.value = -20;
    outputLimiter.knee.value = 18;
    outputLimiter.ratio.value = 14;
    outputLimiter.attack.value = 0.003;
    outputLimiter.release.value = 0.14;

    masterGain.connect(outputLimiter);
    outputLimiter.connect(context.destination);
    if (recordingDestination) {
      outputLimiter.connect(recordingDestination);
    }
  }

  return masterGain;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
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

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(options.gain, now + options.attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + options.release);

  oscillator.connect(filter);
  filter.connect(gainNode);
  const connectOutput = (node: AudioNode) => {
    if (target?.outputToSpeakers ?? true) {
      node.connect(getMasterOutput(context));
    }
    if (target?.destination) {
      node.connect(target.destination);
    }
    if (recordingDestination && !(target?.outputToSpeakers ?? true)) {
      node.connect(recordingDestination);
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
}

function mapRegisterMultiplier(register: PolyrhythmSoundSettings['register']): number {
  return register === 'wide' ? 1.2 : 1;
}

function mapLayerPitch(
  baseFrequency: number,
  sound: PolyrhythmSoundSettings,
  layerIndex: number,
): number {
  const octaveMultiplier = 2 ** sound.octaveShift;
  if (sound.pitchMode === 'free') {
    return clamp(baseFrequency * mapRegisterMultiplier(sound.register) * octaveMultiplier, 45, 2800);
  }

  const scale = SCALE_PRESETS[sound.scaleName];
  const rootSemitone = NOTE_NAMES.indexOf(sound.rootNote);
  const baseMidi = sound.register === 'wide' ? 50 : 43;
  // A layer's rhythm and pitch are independent: changing its step count must
  // never move it to another note in the selected scale.
  const degreeSource = layerIndex * 2;
  const degree = degreeSource % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  return midiToFrequency(clamp(
    baseMidi + rootSemitone + scale.intervals[degree] + octave * 12 + sound.octaveShift * 12,
    20,
    104,
  ));
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
      attack: 0.006,
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
      attack: 0.012,
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
  withVoice({
    type: woodPalette ? 'triangle' : brightPalette ? 'square' : 'triangle',
    frequency: clamp(frequency * (woodPalette ? 1.72 : 2.35), 190, 3200),
    gain: clamp(gain * (brightPalette ? 0.36 : 0.46), 0.01, 0.085),
    attack: 0.002,
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
    if (outputLimiter) {
      outputLimiter.connect(recordingDestination);
    }
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => {});
  }

  return recordingDestination.stream;
}

export function triggerPolyrhythmPulse(options: {
  frequency: number;
  gain: number;
  sound: PolyrhythmSoundSettings;
  layerIndex: number;
  beatCount: number;
  accented?: boolean;
  atTime?: number;
  target?: VoiceTarget;
}): void {
  const frequency = mapLayerPitch(
    options.frequency,
    options.sound,
    options.layerIndex,
  );
  const peakGain = Math.max(0.008, Math.min(0.18, options.gain * (options.accented ? 1.18 : 0.82)));
  const context = options.target?.context ?? getAudioContext();
  const voiceTarget = context
    ? {
        context,
        destination: options.target?.destination,
        outputToSpeakers: options.target?.outputToSpeakers ?? true,
        reverbAmount: options.sound.reverbAmount ?? 0,
      }
    : options.target;
  triggerPalettePulse(options.sound.palette, frequency, peakGain, options.atTime, voiceTarget);
  if (options.accented) {
    triggerAccentLayer(options.sound.palette, frequency, peakGain, options.atTime, voiceTarget);
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
  const startTime = context.currentTime + 0.12 + Math.max(0, prerollSeconds);
  const cyclesPerSecond = study.bpm / 60 / 4;
  const audibleDuration = Math.max(0, durationSeconds - Math.max(0, prerollSeconds));

  if (study.soundEnabled && study.barMarkerSoundEnabled && cyclesPerSecond > 0) {
    const cycleCount = Math.ceil(audibleDuration * cyclesPerSecond);
    for (let cycleIndex = 0; cycleIndex <= cycleCount; cycleIndex += 1) {
      const seconds = cycleIndex / cyclesPerSecond;
      if (seconds <= audibleDuration) {
        triggerPolyrhythmBarMarker(startTime + seconds, target);
      }
    }
  }

  study.layers.forEach((layer, layerIndex) => {
    if (!study.soundEnabled || !layer.soundEnabled || cyclesPerSecond <= 0) {
      return;
    }
    const beatCount = Math.max(1, Math.round(layer.beatCount || 1));
    const cycleCount = Math.ceil(audibleDuration * cyclesPerSecond) + 1;
    for (let cycleIndex = 0; cycleIndex <= cycleCount; cycleIndex += 1) {
      for (let stepIndex = 0; stepIndex < beatCount; stepIndex += 1) {
        const progress = stepIndex / beatCount;
        const playbackStep = getPlaybackStepIndex(layer, progress);
        if (!layer.activeSteps[playbackStep]) {
          continue;
        }
        const seconds = (cycleIndex + progress) / cyclesPerSecond;
        if (seconds > audibleDuration) {
          continue;
        }
        triggerPolyrhythmPulse({
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
    }
  });

  return destination.stream;
}
