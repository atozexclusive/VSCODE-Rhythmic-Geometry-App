import { NOTE_NAMES, SCALE_PRESETS } from './audioEngine';
import type { PolyrhythmSoundSettings } from './polyrhythmStudy';

let audioContext: AudioContext | null = null;

interface VoiceOptions {
  type: OscillatorType;
  frequency: number;
  gain: number;
  attack: number;
  release: number;
  filterFrequency: number;
  filterType?: BiquadFilterType;
  filterQ?: number;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function withVoice(options: VoiceOptions): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
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
  gainNode.connect(context.destination);

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
): void {
  if (palette === 'study-pulse') {
    withVoice({
      type: 'triangle',
      frequency,
      gain,
      attack: 0.01,
      release: 0.18,
      filterFrequency: 1800,
    });
    return;
  }

  if (palette === 'glass-tick') {
    withVoice({
      type: 'triangle',
      frequency: frequency * 1.25,
      gain: clamp(gain * 1.18, 0.012, 0.24),
      attack: 0.004,
      release: 0.09,
      filterFrequency: 2400,
      filterType: 'highpass',
      filterQ: 0.8,
    });
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
    });
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
    });
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
  });
}

export function resumePolyrhythmAudio(): void {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    void context.resume().catch(() => {});
  }
}

export function triggerPolyrhythmPulse(options: {
  frequency: number;
  gain: number;
  sound: PolyrhythmSoundSettings;
  layerIndex: number;
  beatCount: number;
}): void {
  const frequency = mapLayerPitch(
    options.frequency,
    options.sound,
    options.layerIndex,
    options.beatCount,
  );
  const peakGain = Math.max(0.01, Math.min(0.28, options.gain));
  triggerPalettePulse(options.sound.palette, frequency, peakGain);
}
