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
  if (target?.outputToSpeakers ?? true) {
    gainNode.connect(getMasterOutput(context));
  }
  if (target?.destination) {
    gainNode.connect(target.destination);
  }
  if (recordingDestination && !(target?.outputToSpeakers ?? true)) {
    gainNode.connect(recordingDestination);
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
  beatCount: number,
): number {
  if (sound.pitchMode === 'free') {
    return clamp(baseFrequency * mapRegisterMultiplier(sound.register), 90, 1400);
  }

  const scale = SCALE_PRESETS[sound.scaleName];
  const rootSemitone = NOTE_NAMES.indexOf(sound.rootNote);
  const baseMidi = sound.register === 'wide' ? 50 : 43;
  const degreeSource = layerIndex * 2 + Math.max(0, Math.round((beatCount - 3) / 3));
  const degree = degreeSource % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  return midiToFrequency(clamp(baseMidi + rootSemitone + scale.intervals[degree] + octave * 12, 32, 92));
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
    options.beatCount,
  );
  const peakGain = Math.max(0.008, Math.min(0.18, options.gain * (options.accented ? 1.18 : 0.82)));
  triggerPalettePulse(options.sound.palette, frequency, peakGain, options.atTime, options.target);
  if (options.accented) {
    triggerAccentLayer(options.sound.palette, frequency, peakGain, options.atTime, options.target);
  }
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
