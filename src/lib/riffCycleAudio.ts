import { NOTE_NAMES, SCALE_PRESETS } from './audioEngine';
import {
  getEffectiveRiffStepStateAtReferenceStep,
  getReferenceStepsPerBar,
  getReferenceStepsPerSecond,
  getResetStepCount,
  isBackbeatStep,
  isForcedResetAtReferenceStep,
  isReferenceBeatStart,
  type RiffCycleSoundSettings,
  type RiffCycleStudy,
} from './riffCycleStudy';

let audioContext: AudioContext | null = null;
let recordingDestination: MediaStreamAudioDestinationNode | null = null;

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

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (audioContext?.state === 'closed') {
    audioContext = null;
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
  if (target?.outputToSpeakers ?? true) {
    gainNode.connect(context.destination);
  }
  if (target?.destination) {
    gainNode.connect(target.destination);
  }
  if (recordingDestination) {
    gainNode.connect(recordingDestination);
  }
  oscillator.start(now);
  oscillator.stop(now + options.release + 0.06);
}

function triggerArchitecturalRiff(
  frequency: number,
  gain: number,
  accented: boolean,
  accentPush: RiffCycleSoundSettings['accentPush'],
  atTime?: number,
  target?: VoiceTarget,
): void {
  withVoice({
    type: accented ? 'sawtooth' : 'triangle',
    frequency,
    gain: clamp(gain + (accented ? 0.035 : 0), 0.02, 0.24),
    attack: 0.004,
    release: accented ? 0.13 : 0.095,
    filterFrequency: accented ? 1020 : 720,
    atTime,
  }, target);

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
      atTime,
    }, target);
  }
}

function triggerPaletteRiff(
  palette: RiffCycleSoundSettings['palette'],
  frequency: number,
  gain: number,
  accented: boolean,
  accentPush: RiffCycleSoundSettings['accentPush'],
  atTime?: number,
  target?: VoiceTarget,
): void {
  if (palette === 'architectural') {
    triggerArchitecturalRiff(frequency, gain, accented, accentPush, atTime, target);
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
      atTime,
    }, target);
    withVoice({
      type: 'sine',
      frequency: clamp(frequency * 0.49, 42, 240),
      gain: clamp(gain * 0.32, 0.012, 0.05),
      attack: 0.004,
      release: accented ? 0.16 : 0.12,
      filterFrequency: 320,
      atTime,
    }, target);
    return;
  }

  if (palette === 'muted-djent') {
    withVoice({
      type: accented ? 'sawtooth' : 'triangle',
      frequency: frequency * 0.86,
      gain: clamp(gain + (accented ? 0.075 : 0.025), 0.024, 0.28),
      attack: 0.0018,
      release: accented ? 0.13 : 0.08,
      filterFrequency: accented ? 980 : 440,
      filterQ: accented ? 1.05 : 0.72,
      sweepTo: frequency * (accented ? 0.48 : 0.58),
      atTime,
    }, target);
    withVoice({
      type: 'square',
      frequency: clamp(frequency * (accented ? 4.15 : 2.8), 220, 3600),
      gain: clamp(gain * (accented ? 0.52 : 0.18), 0.01, 0.085),
      attack: 0.001,
      release: accented ? 0.045 : 0.028,
      filterFrequency: accented ? 2450 : 1350,
      filterType: 'highpass',
      filterQ: accented ? 1.25 : 0.9,
      atTime,
    }, target);
    if (accented) {
      withVoice({
        type: 'triangle',
        frequency: clamp(frequency * 0.43, 55, 190),
        gain: clamp(gain * (accentPush === 'strong' ? 0.48 : 0.36), 0.015, 0.07),
        attack: 0.002,
        release: 0.075,
        filterFrequency: 360,
        filterQ: 0.68,
        atTime,
      }, target);
    }
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
      atTime,
    }, target);
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
      atTime,
    }, target);
    return;
  }

  withVoice({
    type: accented ? 'triangle' : 'sine',
    frequency: frequency * 0.82,
    gain: clamp(gain + (accented ? 0.035 : 0.02), 0.025, 0.24),
    attack: 0.004,
    release: accented ? 0.16 : 0.12,
    filterFrequency: accented ? 640 : 420,
    atTime,
  }, target);
}

function triggerReferencePalette(sound: RiffCycleSoundSettings, gain = 0.055, atTime?: number, target?: VoiceTarget): void {
  if (sound.palette === 'metal-tick') {
    withVoice({
      type: 'square',
      frequency: 1760,
      gain: clamp(gain * 0.91, 0, 0.2),
      attack: 0.0015,
      release: 0.035,
      filterFrequency: 2600,
      filterType: 'highpass',
      filterQ: 0.8,
      atTime,
    }, target);
    return;
  }

  if (sound.palette === 'low-pulse' || sound.palette === 'deep-architectural') {
    withVoice({
      type: 'square',
      frequency: 1440,
      gain: clamp(gain * 0.91, 0, 0.2),
      attack: 0.002,
      release: 0.05,
      filterFrequency: 2200,
      atTime,
    }, target);
    return;
  }

  triggerReferencePulse(undefined, gain, atTime, target);
}

function triggerBackbeatPalette(sound: RiffCycleSoundSettings, gain = 0.11, atTime?: number, target?: VoiceTarget): void {
  if (sound.palette === 'muted-djent') {
    withVoice({
      type: 'square',
      frequency: 980,
      gain: clamp(gain * 0.86, 0, 0.24),
      attack: 0.0015,
      release: 0.09,
      filterFrequency: 1500,
      filterType: 'highpass',
      filterQ: 0.8,
      atTime,
    }, target);
    return;
  }

  if (sound.palette === 'metal-tick') {
    withVoice({
      type: 'triangle',
      frequency: 960,
      gain: clamp(gain * 0.91, 0, 0.24),
      attack: 0.0015,
      release: 0.075,
      filterFrequency: 1850,
      filterType: 'highpass',
      filterQ: 0.7,
      atTime,
    }, target);
    return;
  }

  if (sound.palette === 'low-pulse') {
    withVoice({
      type: 'triangle',
      frequency: 620,
      gain: clamp(gain * 0.91, 0, 0.24),
      attack: 0.002,
      release: 0.13,
      filterFrequency: 1200,
      atTime,
    }, target);
    return;
  }

  triggerBackbeatAccent(undefined, gain, atTime, target);
}

export function resumeRiffCycleAudio(): void {
  const context = getAudioContext();
  if (context && context.state !== 'running' && context.state !== 'closed') {
    void context.resume().catch(() => {});
  }
}

export function getRiffCycleAudioRecordingStream(): MediaStream | null {
  const context = getAudioContext();
  if (!context || typeof context.createMediaStreamDestination !== 'function') {
    return null;
  }

  if (!recordingDestination) {
    recordingDestination = context.createMediaStreamDestination();
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => {});
  }

  return recordingDestination.stream;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function getFreeResolutionStepCount(study: RiffCycleStudy): number {
  const phraseSteps = Math.max(1, Math.round(study.riff.stepCount || 1));
  const stepsPerBar = Math.max(1, getReferenceStepsPerBar(study.reference));
  return Math.max(1, phraseSteps / gcd(phraseSteps, stepsPerBar)) * stepsPerBar;
}

function isFreeResolutionAtReferenceStep(study: RiffCycleStudy, referenceStep: number): boolean {
  if (getResetStepCount(study) != null || referenceStep <= 0) {
    return false;
  }
  return referenceStep % getFreeResolutionStepCount(study) === 0;
}

function isExportBarMarkerCueStep(study: RiffCycleStudy, referenceStep: number): boolean {
  const markerInterval = study.barMarkerInterval ?? 'none';
  if (markerInterval === 'none') {
    return false;
  }

  if (markerInterval === 'pattern') {
    const riffStepCount = Math.max(1, Math.round(study.riff.stepCount || 1));
    const resetStepCount = getResetStepCount(study);
    const stepWithinReturn =
      resetStepCount == null
        ? referenceStep
        : ((referenceStep % resetStepCount) + resetStepCount) % resetStepCount;
    return stepWithinReturn % riffStepCount === 0;
  }

  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  if (stepsPerBar <= 0 || referenceStep % stepsPerBar !== 0) {
    return false;
  }
  const barIndex = Math.floor(referenceStep / stepsPerBar);
  return barIndex % markerInterval === 0;
}

export function createRiffCycleExportAudioStream(
  study: RiffCycleStudy,
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
  const scheduleStartTime = context.currentTime + 0.12 + Math.max(0, prerollSeconds);
  const stepsPerSecond = getReferenceStepsPerSecond(study.reference);
  const totalSteps = Math.ceil(Math.max(0, durationSeconds - Math.max(0, prerollSeconds)) * stepsPerSecond) + 1;

  for (let referenceStep = 0; referenceStep <= totalSteps; referenceStep += 1) {
    const atTime = scheduleStartTime + referenceStep / stepsPerSecond;
    if (study.soundEnabled && study.referenceSoundEnabled && study.referenceGain > 0 && isReferenceBeatStart(study, referenceStep)) {
      triggerReferencePulse(study.soundSettings, study.referenceGain, atTime, target);
    }
    if (study.soundEnabled && study.backbeatSoundEnabled && study.referenceGain > 0 && isBackbeatStep(study, referenceStep)) {
      triggerBackbeatAccent(study.soundSettings, study.referenceGain * 2, atTime, target);
    }
    if (
      study.soundEnabled &&
      study.subdivisionSoundEnabled &&
      study.subdivisionGain > 0 &&
      study.pulseLayerEnabled &&
      (study.pulseLayerSteps?.[
        ((referenceStep % getReferenceStepsPerBar(study.reference)) +
          getReferenceStepsPerBar(study.reference)) %
          getReferenceStepsPerBar(study.reference)
      ] ?? true)
    ) {
      triggerSubdivisionPulse(study.soundSettings, study.subdivisionGain, atTime, target);
    }
    if (
      study.soundEnabled &&
      study.showAlignmentMarkers &&
      isExportBarMarkerCueStep(study, referenceStep)
    ) {
      triggerBarMarkerCue(study.soundSettings, atTime, target);
    }

    const riffStepState = getEffectiveRiffStepStateAtReferenceStep(study, referenceStep);
    if (study.soundEnabled && study.riff.soundEnabled && riffStepState.active) {
      triggerRiffPulse({
        frequency: study.riff.pitchHz,
        gain: study.riff.gain,
        accented: riffStepState.accented,
        phraseIndex: riffStepState.phraseIndex,
        sound: study.soundSettings,
        atTime,
        target,
      });
    }

    if (
      study.soundEnabled &&
      (isForcedResetAtReferenceStep(study, referenceStep) ||
        isFreeResolutionAtReferenceStep(study, referenceStep))
    ) {
      triggerResetCue(study.soundSettings, atTime, target);
    }
  }

  return destination.stream;
}

export function triggerReferencePulse(sound?: RiffCycleSoundSettings, gain = 0.055, atTime?: number, target?: VoiceTarget): void {
  if (gain <= 0) {
    return;
  }
  if (sound && sound.palette !== 'architectural') {
    triggerReferencePalette(sound, gain, atTime, target);
    return;
  }

  withVoice({
    type: 'square',
    frequency: 1660,
    gain: clamp(gain, 0, 0.2),
    attack: 0.002,
    release: 0.045,
    filterFrequency: 3000,
    atTime,
  }, target);
}

export function triggerBackbeatAccent(sound?: RiffCycleSoundSettings, gain = 0.11, atTime?: number, target?: VoiceTarget): void {
  if (gain <= 0) {
    return;
  }
  if (sound && sound.palette !== 'architectural') {
    triggerBackbeatPalette(sound, gain, atTime, target);
    return;
  }

  withVoice({
    type: 'triangle',
    frequency: 820,
    gain: clamp(gain, 0, 0.24),
    attack: 0.002,
    release: 0.12,
    filterFrequency: 1760,
    atTime,
  }, target);
}

export function triggerSubdivisionPulse(sound?: RiffCycleSoundSettings, gain?: number, atTime?: number, target?: VoiceTarget): void {
  const metal = sound?.palette === 'metal-tick';
  const baseGain = gain ?? (metal ? 0.018 : 0.014);
  if (baseGain <= 0) {
    return;
  }
  withVoice({
    type: metal ? 'square' : 'triangle',
    frequency: metal ? 2480 : 2140,
    gain: clamp(baseGain, 0, 0.12),
    attack: 0.0015,
    release: metal ? 0.024 : 0.032,
    filterFrequency: metal ? 3600 : 3000,
    filterType: 'highpass',
    filterQ: 0.74,
    atTime,
  }, target);
}

export function triggerBarMarkerCue(sound?: RiffCycleSoundSettings, atTime?: number, target?: VoiceTarget): void {
  const softLowPalette = sound?.palette === 'low-pulse' || sound?.palette === 'deep-architectural';
  withVoice({
    type: sound?.palette === 'metal-tick' ? 'triangle' : 'sine',
    frequency: softLowPalette ? 460 : sound?.palette === 'metal-tick' ? 1120 : 760,
    gain: softLowPalette ? 0.018 : 0.014,
    attack: 0.004,
    release: softLowPalette ? 0.11 : 0.082,
    filterFrequency: softLowPalette ? 820 : 1320,
    filterType: sound?.palette === 'metal-tick' ? 'highpass' : 'bandpass',
    filterQ: 0.72,
    atTime,
  }, target);
}

export function triggerRiffPulse(options: {
  frequency: number;
  gain: number;
  accented: boolean;
  phraseIndex: number;
  sound: RiffCycleSoundSettings;
  atTime?: number;
  target?: VoiceTarget;
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
    options.atTime,
    options.target,
  );
}

export function triggerResetCue(sound?: RiffCycleSoundSettings, atTime?: number, target?: VoiceTarget): void {
  const context = target?.context ?? getAudioContext();
  if (!context) {
    return;
  }

  const now = atTime ?? context.currentTime;

  if (sound?.palette === 'muted-djent' || sound?.palette === 'low-pulse') {
    withVoice({
      type: 'triangle',
      frequency: sound.palette === 'low-pulse' ? 180 : 260,
      gain: 0.04,
      attack: 0.002,
      release: 0.09,
      filterFrequency: sound.palette === 'low-pulse' ? 420 : 780,
      atTime: now,
    }, target);
    return;
  }

  withVoice({
    type: 'triangle',
    frequency: 420,
    gain: 0.045,
    attack: 0.002,
    release: 0.08,
    filterFrequency: 1200,
    atTime: now,
  }, target);

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
  if (target?.outputToSpeakers ?? true) {
    gainNode.connect(context.destination);
  }
  if (target?.destination) {
    gainNode.connect(target.destination);
  }
  if (recordingDestination) {
    gainNode.connect(recordingDestination);
  }
  oscillator.start(now);
  oscillator.stop(now + 0.11);
}
