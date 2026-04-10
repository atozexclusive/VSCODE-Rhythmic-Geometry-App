import { NOTE_NAMES, SCALE_PRESETS } from './audioEngine';
import type { RiffCycleSoundSettings } from './riffCycleStudy';

let audioContext: AudioContext | null = null;

type FilterType = 'lowpass' | 'highpass' | 'bandpass';

interface VoiceOptions {
  type: OscillatorType;
  frequency: number;
  gain: number;
  attack: number;
  release: number;
  filterFrequency: number;
  filterType?: FilterType;
  filterQ?: number;
  sweepTo?: number;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

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

function mapRegisterMultiplier(register: RiffCycleSoundSettings['register']): number {
  if (register === 'mid-low') {
    return 1.16;
  }
  if (register === 'wide') {
    return 1.34;
  }
  return 1;
}

function mapRiffPitch(
  baseFrequency: number,
  sound: RiffCycleSoundSettings,
  phraseIndex: number,
  accented: boolean,
): number {
  if (sound.pitchMode === 'free') {
    return clamp(baseFrequency * mapRegisterMultiplier(sound.register), 70, 1600);
  }

  const scale = SCALE_PRESETS[sound.scaleName];
  const rootSemitone = NOTE_NAMES.indexOf(sound.rootNote);
  const registerBaseMidi =
    sound.register === 'wide' ? 48 : sound.register === 'mid-low' ? 43 : 36;
  const accentShift =
    accented ? (sound.accentPush === 'strong' ? 2 : 1) : 0;
  const degreeSource = Math.max(0, phraseIndex) + accentShift;
  const degree = degreeSource % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  const midi = clamp(registerBaseMidi + rootSemitone + scale.intervals[degree] + octave * 12, 28, 84);
  return midiToFrequency(midi);
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
  if (options.sweepTo != null) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, options.sweepTo),
      now + Math.max(0.01, options.release * 0.7),
    );
  }
  filter.type = options.filterType ?? 'lowpass';
  filter.frequency.setValueAtTime(options.filterFrequency, now);
  filter.Q.setValueAtTime(options.filterQ ?? 0.55, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(options.gain, now + options.attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + options.release);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + options.release + 0.06);
}

function triggerArchitecturalRiff(
  frequency: number,
  gain: number,
  accented: boolean,
  accentPush: RiffCycleSoundSettings['accentPush'],
): void {
  withVoice({
    type: accented ? 'sawtooth' : 'triangle',
    frequency,
    gain: clamp(gain + (accented ? 0.035 : 0), 0.02, 0.24),
    attack: 0.004,
    release: accented ? 0.13 : 0.095,
    filterFrequency: accented ? 1020 : 720,
  });

  if (accented) {
    withVoice({
      type: 'square',
      frequency: clamp(frequency * (accentPush === 'strong' ? 2.5 : 2.2), 180, 2200),
      gain: clamp(gain * (accentPush === 'strong' ? 0.52 : 0.42), 0.018, 0.09),
      attack: 0.0015,
      release: accentPush === 'strong' ? 0.055 : 0.045,
      filterFrequency: 1800,
      filterType: 'highpass',
      filterQ: 0.8,
    });
  }
}

function triggerPaletteRiff(
  palette: RiffCycleSoundSettings['palette'],
  frequency: number,
  gain: number,
  accented: boolean,
  accentPush: RiffCycleSoundSettings['accentPush'],
): void {
  if (palette === 'architectural') {
    triggerArchitecturalRiff(frequency, gain, accented, accentPush);
    return;
  }

  if (palette === 'deep-architectural') {
    withVoice({
      type: accented ? 'sawtooth' : 'triangle',
      frequency: frequency * 0.92,
      gain: clamp(gain + (accented ? 0.04 : 0.015), 0.025, 0.26),
      attack: 0.003,
      release: accented ? 0.14 : 0.11,
      filterFrequency: accented ? 880 : 560,
    });
    withVoice({
      type: 'sine',
      frequency: clamp(frequency * 0.49, 42, 240),
      gain: clamp(gain * 0.32, 0.012, 0.05),
      attack: 0.004,
      release: accented ? 0.16 : 0.12,
      filterFrequency: 320,
    });
    return;
  }

  if (palette === 'muted-djent') {
    withVoice({
      type: 'triangle',
      frequency: frequency * 0.86,
      gain: clamp(gain + (accented ? 0.05 : 0.025), 0.024, 0.24),
      attack: 0.0018,
      release: accented ? 0.105 : 0.08,
      filterFrequency: accented ? 740 : 440,
      sweepTo: frequency * 0.58,
    });
    withVoice({
      type: 'square',
      frequency: clamp(frequency * 2.8, 220, 2200),
      gain: clamp(gain * (accented ? 0.3 : 0.18), 0.01, 0.055),
      attack: 0.001,
      release: 0.028,
      filterFrequency: 1350,
      filterType: 'highpass',
      filterQ: 0.9,
    });
    return;
  }

  if (palette === 'dry-synth') {
    withVoice({
      type: accented ? 'sawtooth' : 'square',
      frequency: frequency * 1.05,
      gain: clamp(gain + (accented ? 0.03 : 0.012), 0.02, 0.22),
      attack: 0.003,
      release: accented ? 0.11 : 0.08,
      filterFrequency: accented ? 1300 : 980,
      filterQ: 0.72,
    });
    return;
  }

  if (palette === 'metal-tick') {
    withVoice({
      type: accented ? 'square' : 'triangle',
      frequency: frequency * 1.12,
      gain: clamp(gain + (accented ? 0.025 : 0.01), 0.018, 0.18),
      attack: 0.0015,
      release: accented ? 0.08 : 0.055,
      filterFrequency: accented ? 2400 : 1800,
      filterType: 'highpass',
      filterQ: 0.82,
    });
    return;
  }

  withVoice({
    type: accented ? 'triangle' : 'sine',
    frequency: frequency * 0.82,
    gain: clamp(gain + (accented ? 0.035 : 0.02), 0.025, 0.24),
    attack: 0.004,
    release: accented ? 0.16 : 0.12,
    filterFrequency: accented ? 640 : 420,
  });
}

function triggerReferencePalette(sound: RiffCycleSoundSettings): void {
  if (sound.palette === 'metal-tick') {
    withVoice({
      type: 'square',
      frequency: 1760,
      gain: 0.05,
      attack: 0.0015,
      release: 0.035,
      filterFrequency: 2600,
      filterType: 'highpass',
      filterQ: 0.8,
    });
    return;
  }

  if (sound.palette === 'low-pulse' || sound.palette === 'deep-architectural') {
    withVoice({
      type: 'square',
      frequency: 1440,
      gain: 0.05,
      attack: 0.002,
      release: 0.05,
      filterFrequency: 2200,
    });
    return;
  }

  triggerReferencePulse();
}

function triggerBackbeatPalette(sound: RiffCycleSoundSettings): void {
  if (sound.palette === 'muted-djent') {
    withVoice({
      type: 'square',
      frequency: 980,
      gain: 0.095,
      attack: 0.0015,
      release: 0.09,
      filterFrequency: 1500,
      filterType: 'highpass',
      filterQ: 0.8,
    });
    return;
  }

  if (sound.palette === 'metal-tick') {
    withVoice({
      type: 'triangle',
      frequency: 960,
      gain: 0.1,
      attack: 0.0015,
      release: 0.075,
      filterFrequency: 1850,
      filterType: 'highpass',
      filterQ: 0.7,
    });
    return;
  }

  if (sound.palette === 'low-pulse') {
    withVoice({
      type: 'triangle',
      frequency: 620,
      gain: 0.1,
      attack: 0.002,
      release: 0.13,
      filterFrequency: 1200,
    });
    return;
  }

  triggerBackbeatAccent();
}

export function resumeRiffCycleAudio(): void {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    void context.resume().catch(() => {});
  }
}

export function triggerReferencePulse(sound?: RiffCycleSoundSettings): void {
  if (sound && sound.palette !== 'architectural') {
    triggerReferencePalette(sound);
    return;
  }

  withVoice({
    type: 'square',
    frequency: 1660,
    gain: 0.055,
    attack: 0.002,
    release: 0.045,
    filterFrequency: 3000,
  });
}

export function triggerBackbeatAccent(sound?: RiffCycleSoundSettings): void {
  if (sound && sound.palette !== 'architectural') {
    triggerBackbeatPalette(sound);
    return;
  }

  withVoice({
    type: 'triangle',
    frequency: 820,
    gain: 0.11,
    attack: 0.002,
    release: 0.12,
    filterFrequency: 1760,
  });
}

export function triggerRiffPulse(options: {
  frequency: number;
  gain: number;
  accented: boolean;
  phraseIndex: number;
  sound: RiffCycleSoundSettings;
}): void {
  const frequency = mapRiffPitch(
    options.frequency,
    options.sound,
    options.phraseIndex,
    options.accented,
  );
  triggerPaletteRiff(
    options.sound.palette,
    frequency,
    options.gain,
    options.accented,
    options.sound.accentPush,
  );
}

export function triggerResetCue(sound?: RiffCycleSoundSettings): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;

  if (sound?.palette === 'muted-djent' || sound?.palette === 'low-pulse') {
    withVoice({
      type: 'triangle',
      frequency: sound.palette === 'low-pulse' ? 180 : 260,
      gain: 0.04,
      attack: 0.002,
      release: 0.09,
      filterFrequency: sound.palette === 'low-pulse' ? 420 : 780,
    });
    return;
  }

  withVoice({
    type: 'triangle',
    frequency: 420,
    gain: 0.045,
    attack: 0.002,
    release: 0.08,
    filterFrequency: 1200,
  });

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = sound?.palette === 'metal-tick' ? 'triangle' : 'square';
  oscillator.frequency.setValueAtTime(sound?.palette === 'metal-tick' ? 1520 : 1240, now);
  oscillator.frequency.exponentialRampToValueAtTime(sound?.palette === 'metal-tick' ? 1020 : 760, now + 0.06);
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(sound?.palette === 'metal-tick' ? 980 : 680, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.03, now + 0.004);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.11);
}
