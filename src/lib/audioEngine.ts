// ============================================================
// Orbital Polymeter — Audio Engine
// Every rotation triggers audio. At high speeds, transitions
// from discrete beeps to sustained chord tones.
// ============================================================

import { computeOrbitRotations, getOrbitCyclePulseCount, type EngineState, type OrbitCountMode } from './orbitalEngine';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let outputLimiter: DynamicsCompressorNode | null = null;
let recordingDestination: MediaStreamAudioDestinationNode | null = null;
let triggerCount = 0;
let triggerWindowStart = 0;
let currentTriggerRate = 0; // triggers per second
const lastAudibleTriggerByVoice = new Map<number, number>();
let muted = false;

const MASTER_GAIN_CEILING = 0.62;
const DENSE_TRIGGER_RATE = 35;
const VERY_DENSE_TRIGGER_RATE = 85;
const EXTREME_TRIGGER_RATE = 150;

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const SCALE_PRESETS = {
  majorPentatonic: { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  aeolian: { label: 'Aeolian', intervals: [0, 2, 3, 5, 7, 8, 10] },
  lydian: { label: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  wholeTone: { label: 'Whole Tone', intervals: [0, 2, 4, 6, 8, 10] },
  diminished: { label: 'Diminished', intervals: [0, 2, 3, 5, 6, 8, 9, 11] },
  chromatic: { label: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
} as const;

export const FRIENDLY_SCALE_LABELS = {
  majorPentatonic: 'Open Major',
  minorPentatonic: 'Blues Minor',
  dorian: 'Minor Color',
  aeolian: 'Dark Minor',
  lydian: 'Bright Major',
  wholeTone: 'Dreamy Whole Tone',
  diminished: 'Tense Symmetry',
  chromatic: 'All Notes',
} as const;

export type RootNote = typeof NOTE_NAMES[number];
export type ScaleName = keyof typeof SCALE_PRESETS;
export type HarmonyMappingMode = 'orbit-index' | 'pulse-count' | 'radius' | 'color-hue';
export type TonePreset = 'original' | 'scale-quantized';
export const ORBIT_SOUND_PALETTES = [
  ['standard', 'Standard'], ['soft-pad', 'Soft Pad'], ['warm-pad', 'Warm Pad'],
  ['bell', 'Bell'], ['pluck', 'Pluck'], ['organ', 'Organ'], ['bass', 'Soft Bass'],
] as const;
export type OrbitSoundPalette = typeof ORBIT_SOUND_PALETTES[number][0];
export type OrbitNoteMotion = 'fixed' | 'ascending' | 'descending' | 'up-down' | 'arpeggio';

export function getFriendlyScaleLabel(
  scaleName: ScaleName,
  options?: { includeTheory?: boolean },
) {
  const beginner = FRIENDLY_SCALE_LABELS[scaleName] ?? SCALE_PRESETS[scaleName].label;
  return options?.includeTheory === false
    ? beginner
    : `${beginner} (${SCALE_PRESETS[scaleName].label})`;
}

export interface HarmonySettings {
  soundPalette?: OrbitSoundPalette;
  noteMotion?: OrbitNoteMotion;
  pitchSpacing?: 'standard' | 'close' | 'wide';
  octaveShift?: number;
  arpeggioOctaves?: number;
  reverbAmount?: number; // shared by every Orbit layer
  tonePreset: TonePreset;
  rootNote: RootNote;
  scaleName: ScaleName;
  mappingMode: HarmonyMappingMode;
  manualOrbitRoles: boolean;
}

export interface ResonanceVoice {
  hitIndex?: number;
  volume?: number;
  reverbAmount?: number;
  soundEnabled?: boolean;
  orbitIndex: number;
  pulseCount: number;
  radius: number;
  color: string;
  harmonyDegree?: number;
  harmonyRegister?: -1 | 0 | 1;
}

export const DEFAULT_HARMONY_SETTINGS: HarmonySettings = {
  tonePreset: 'original',
  rootNote: 'C',
  scaleName: 'majorPentatonic',
  mappingMode: 'color-hue',
  manualOrbitRoles: false,
};

function getAudioContext(): AudioContext {
  if (audioCtx?.state === 'closed') {
    audioCtx = null;
    masterGain = null;
    outputLimiter = null;
    recordingDestination = null;
  }

  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = MASTER_GAIN_CEILING;
    outputLimiter = audioCtx.createDynamicsCompressor();
    outputLimiter.threshold.value = -18;
    outputLimiter.knee.value = 18;
    outputLimiter.ratio.value = 12;
    outputLimiter.attack.value = 0.003;
    outputLimiter.release.value = 0.12;
    masterGain.connect(outputLimiter);
    outputLimiter.connect(audioCtx.destination);
    if (recordingDestination) {
      outputLimiter.connect(recordingDestination);
    }
  }
  if (audioCtx.state !== 'running' && audioCtx.state !== 'closed') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getMasterGain(): GainNode {
  getAudioContext();
  return masterGain!;
}

function colorToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return h;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function originalColorFrequency(hex: string): number {
  const pentatonic = [
    261.63, 293.66, 329.63, 392.0, 440.0,
    523.25, 587.33, 659.25, 783.99, 880.0,
    1046.5, 1174.66, 1318.51, 1567.98, 1760.0,
  ];
  const idx = Math.floor(colorToHue(hex) * (pentatonic.length - 1));
  return pentatonic[Math.min(idx, pentatonic.length - 1)];
}

function quantizedFrequency(
  voice: ResonanceVoice,
  harmony: HarmonySettings,
): number {
  const scale = SCALE_PRESETS[harmony.scaleName];
  const rootSemitone = NOTE_NAMES.indexOf(harmony.rootNote);
  const baseMidi = 60 + rootSemitone;

  let degreeSource = 0;
  if (harmony.manualOrbitRoles && typeof voice.harmonyDegree === 'number') {
    const register = voice.harmonyRegister ?? 0;
    degreeSource = Math.max(0, voice.harmonyDegree) + register * scale.intervals.length;
  } else if (harmony.mappingMode === 'orbit-index') {
    degreeSource = voice.orbitIndex;
  } else if (harmony.mappingMode === 'pulse-count') {
    degreeSource = Math.max(0, voice.pulseCount - 2);
  } else if (harmony.mappingMode === 'radius') {
    degreeSource = Math.max(0, Math.round((voice.radius - 40) / 30));
  } else {
    degreeSource = Math.floor(colorToHue(voice.color) * scale.intervals.length * 3);
  }

  if (harmony.pitchSpacing === 'close') degreeSource = voice.orbitIndex % scale.intervals.length;
  if (harmony.pitchSpacing === 'wide') degreeSource = voice.orbitIndex * scale.intervals.length;
  const span = scale.intervals.length * Math.max(1, Math.min(3, Math.round(harmony.arpeggioOctaves ?? 1)));
  const hit = Math.max(0, Math.floor(voice.hitIndex ?? 0));
  const motion = harmony.noteMotion ?? 'fixed';
  if (motion === 'ascending') degreeSource += hit % span;
  if (motion === 'descending') degreeSource += span - 1 - hit % span;
  if (motion === 'up-down') {
    const phase = hit % Math.max(1, 2 * (span - 1));
    degreeSource += phase < span ? phase : 2 * (span - 1) - phase;
  }
  if (motion === 'arpeggio') degreeSource += (hit * 2) % span;
  const degree = ((degreeSource % scale.intervals.length) + scale.intervals.length) % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  const midi = Math.min(96, baseMidi + octave * 12 + scale.intervals[degree]);
  return midiToFrequency(midi);
}

export function voiceToFrequency(
  voice: ResonanceVoice,
  harmony: HarmonySettings,
): number {
  const octave = Math.max(-2, Math.min(2, Math.round(harmony.octaveShift ?? 0)));
  const useScale = harmony.tonePreset !== 'original' || (harmony.noteMotion != null && harmony.noteMotion !== 'fixed') || (harmony.pitchSpacing != null && harmony.pitchSpacing !== 'standard');
  const frequency = useScale ? quantizedFrequency(voice, harmony) : originalColorFrequency(voice.color);
  return Math.max(20, Math.min(12000, frequency * 2 ** octave));
}

/**
 * Track trigger rate to determine audio mode.
 */
function updateTriggerRate(): number {
  const now = performance.now();
  if (triggerWindowStart <= 0) {
    triggerWindowStart = now;
  }
  triggerCount++;
  const elapsed = Math.max(1, now - triggerWindowStart);
  const instantaneousRate = (triggerCount / Math.max(100, elapsed)) * 1000;
  if (elapsed > 500) {
    currentTriggerRate = instantaneousRate;
    triggerCount = 0;
    triggerWindowStart = now;
  }
  return Math.max(currentTriggerRate, instantaneousRate);
}

function getTriggerRateGain(triggerRate: number): number {
  if (triggerRate >= EXTREME_TRIGGER_RATE) {
    return 0.08;
  }
  if (triggerRate >= VERY_DENSE_TRIGGER_RATE) {
    return 0.16;
  }
  if (triggerRate >= DENSE_TRIGGER_RATE) {
    return 0.34;
  }
  return 1;
}

function shouldDropDenseTrigger(triggerRate: number, voiceKey: number): boolean {
  const now = performance.now();
  const minGapMs =
    triggerRate >= EXTREME_TRIGGER_RATE
      ? 24
      : triggerRate >= VERY_DENSE_TRIGGER_RATE
        ? 14
        : triggerRate >= DENSE_TRIGGER_RATE
          ? 7
          : 0;

  const lastAudibleTriggerAt = lastAudibleTriggerByVoice.get(voiceKey) ?? 0;
  if (minGapMs <= 0 || now - lastAudibleTriggerAt >= minGapMs) {
    lastAudibleTriggerByVoice.set(voiceKey, now);
    return false;
  }

  return true;
}

/**
 * Play a resonance beep. Adapts based on speed:
 * - Normal (< 3x): Clean, short sine beep
 * - Fast (3x-6x): Shorter beep, reduced volume
 * - Very fast (> 6x): Sustained tone that fades, like a chord
 */
// Each destination owns its mixer graph, so export effects stay isolated from live audio.
const orbitMixGraphs = new WeakMap<AudioNode, {
  reverb: ConvolverNode;
  layers: Map<number, { input: GainNode; send: GainNode }>;
}>();
function getOrbitVoiceOutput(ctx: AudioContext, destination: AudioNode, voice: ResonanceVoice): GainNode {
  let graph = orbitMixGraphs.get(destination);
  if (!graph) {
    const reverb = ctx.createConvolver();
    const length = Math.floor(ctx.sampleRate * 1.6);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    reverb.buffer = impulse;
    reverb.connect(destination);
    graph = { reverb, layers: new Map() };
    orbitMixGraphs.set(destination, graph);
  }
  const volume = Number.isFinite(voice.volume) ? Math.max(0, Math.min(1, voice.volume!)) : 1;
  const reverb = Number.isFinite(voice.reverbAmount) ? Math.max(0, Math.min(1, voice.reverbAmount!)) : 0;
  let layer = graph.layers.get(voice.orbitIndex);
  if (!layer) {
    const input = ctx.createGain();
    const send = ctx.createGain();
    input.gain.value = voice.soundEnabled === false ? 0 : volume;
    send.gain.value = reverb * 0.65;
    input.connect(destination);
    input.connect(send);
    send.connect(graph.reverb);
    layer = { input, send };
    graph.layers.set(voice.orbitIndex, layer);
  }
  layer.input.gain.setTargetAtTime(voice.soundEnabled === false ? 0 : volume, ctx.currentTime, 0.01);
  layer.send.gain.setTargetAtTime(reverb * 0.65, ctx.currentTime, 0.01);
  return layer.input;
}

export function updateOrbitAudioMix(orbits: EngineState['orbits'], reverbAmount = 0): void {
  if (!audioCtx || !masterGain) return;
  orbits.forEach((orbit, orbitIndex) => getOrbitVoiceOutput(audioCtx!, masterGain!, { ...orbit, orbitIndex, reverbAmount }));
}

function scheduleOrbitInstrument(ctx: AudioContext, destination: AudioNode, frequency: number,
  palette: OrbitSoundPalette | undefined, volume: number, atTime: number, speed: number): boolean {
  if (!palette || palette === 'standard') return false;
  const presets: Record<Exclude<OrbitSoundPalette, 'standard'>, { attack: number; duration: number; partials: Array<[OscillatorType, number, number, number]> }> = {
    'soft-pad': { attack: 0.09, duration: 1.1, partials: [['sine', 1, 0.6, -4], ['triangle', 1, 0.4, 4]] },
    'warm-pad': { attack: 0.06, duration: 0.9, partials: [['triangle', 1, 0.65, -3], ['sine', 0.5, 0.35, 3]] },
    bell: { attack: 0.003, duration: 0.9, partials: [['sine', 1, 0.75, 0], ['sine', 2.76, 0.25, 0]] },
    pluck: { attack: 0.003, duration: 0.22, partials: [['triangle', 1, 0.8, 0], ['sine', 2, 0.2, 0]] },
    organ: { attack: 0.015, duration: 0.45, partials: [['sine', 1, 0.6, 0], ['sine', 2, 0.25, 0], ['sine', 4, 0.15, 0]] },
    bass: { attack: 0.008, duration: 0.3, partials: [['sine', 0.5, 0.7, 0], ['triangle', 1, 0.3, 0]] },
  };
  const preset = presets[palette];
  if (!preset) return false;
  const compression = Math.max(1, speed / 2);
  const duration = Math.max(0.06, preset.duration / compression);
  const attack = Math.min(preset.attack, duration / 3);
  for (const [type, ratio, weight, detune] of preset.partials) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.min(12000, frequency * ratio), atTime);
    oscillator.detune.setValueAtTime(detune, atTime);
    gain.gain.setValueAtTime(0, atTime);
    gain.gain.linearRampToValueAtTime(volume * weight / Math.sqrt(compression), atTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + duration);
    gain.gain.linearRampToValueAtTime(0, atTime + duration + 0.012);
    oscillator.connect(gain); gain.connect(destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(atTime); oscillator.stop(atTime + duration + 0.02);
  }
  return true;
}

export function playResonanceBeep(
  voice: ResonanceVoice,
  harmony: HarmonySettings = DEFAULT_HARMONY_SETTINGS,
  volume: number = 0.15,
  speedMultiplier: number = 1.0,
): void {
  if (muted) {
    return;
  }
  try {
    const ctx = getAudioContext();
    const master = getOrbitVoiceOutput(ctx, getMasterGain(), { ...voice, reverbAmount: harmony.reverbAmount ?? 0 });
    if (voice.soundEnabled === false || voice.volume === 0) return;
    const now = ctx.currentTime;
    const freq = voiceToFrequency(voice, harmony);

    const triggerRate = updateTriggerRate();
    if (shouldDropDenseTrigger(triggerRate, voice.orbitIndex)) {
      return;
    }
    const safetyGain = getTriggerRateGain(triggerRate);
    const safeVolume = Math.min(volume, 0.12) * safetyGain;
    if (scheduleOrbitInstrument(ctx, master, freq, harmony.soundPalette, safeVolume, now, Math.max(speedMultiplier, triggerRate / 12))) return;

    // Very fast: sustained chord tone
    if (speedMultiplier > 6.0 || triggerRate >= VERY_DENSE_TRIGGER_RATE) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      const speedFactor = Math.max(speedMultiplier / 6, triggerRate / VERY_DENSE_TRIGGER_RATE, 1);
      const chordVol = Math.max(0.003, safeVolume * 0.3 / Math.sqrt(speedFactor));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(chordVol, now + 0.01);
      // Long sustain, gentle release
      gain.gain.setValueAtTime(chordVol, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      gain.gain.linearRampToValueAtTime(0, now + 0.415);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.42);
      return;
    }

    // Fast: shorter beep, reduced volume
    if (speedMultiplier > 3.0 || triggerRate >= DENSE_TRIGGER_RATE) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      const speedFactor = Math.max(speedMultiplier / 3, triggerRate / DENSE_TRIGGER_RATE, 1);
      const fastVol = safeVolume / speedFactor;
      const duration = Math.max(0.018, 0.08 / speedFactor);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(fastVol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      gain.gain.linearRampToValueAtTime(0, now + duration + 0.006);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.01);
      return;
    }

    // Normal: clean, crisp sine beep
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(safeVolume, now + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    gain.gain.linearRampToValueAtTime(0, now + 0.105);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.11);
  } catch {
    // Silently fail if audio context is unavailable
  }
}

/**
 * Resume audio context (must be called from user gesture).
 */
export function resumeAudio(): void {
  getAudioContext();
}

export function getAudioRecordingStream(): MediaStream | null {
  const ctx = getAudioContext();
  if (typeof ctx.createMediaStreamDestination !== 'function') {
    return null;
  }

  if (!recordingDestination) {
    recordingDestination = ctx.createMediaStreamDestination();
    if (outputLimiter) {
      outputLimiter.connect(recordingDestination);
    }
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }

  return recordingDestination.stream;
}

interface ExportAudioTarget {
  context: AudioContext;
  destination: AudioNode;
}

function scheduleResonanceBeep(
  voice: ResonanceVoice,
  harmony: HarmonySettings,
  volume: number,
  speedMultiplier: number,
  atTime: number,
  target: ExportAudioTarget,
): void {
  const ctx = target.context;
  const output = getOrbitVoiceOutput(ctx, target.destination, { ...voice, reverbAmount: harmony.reverbAmount ?? 0 });
  if (voice.soundEnabled === false || voice.volume === 0) return;
  const freq = voiceToFrequency(voice, harmony);
  const safeVolume = Math.min(volume, 0.12);
  if (scheduleOrbitInstrument(ctx, output, freq, harmony.soundPalette, safeVolume, atTime, speedMultiplier)) return;

  if (speedMultiplier > 6.0) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, atTime);

    const gain = ctx.createGain();
    const speedFactor = Math.max(speedMultiplier / 6, 1);
    const chordVol = Math.max(0.003, safeVolume * 0.3 / Math.sqrt(speedFactor));
    gain.gain.setValueAtTime(0, atTime);
    gain.gain.linearRampToValueAtTime(chordVol, atTime + 0.01);
    gain.gain.setValueAtTime(chordVol, atTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + 0.4);
    gain.gain.linearRampToValueAtTime(0, atTime + 0.415);

    osc.connect(gain);
    gain.connect(output);
    osc.start(atTime);
    osc.stop(atTime + 0.42);
    return;
  }

  if (speedMultiplier > 3.0) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, atTime);

    const gain = ctx.createGain();
    const speedFactor = Math.max(speedMultiplier / 3, 1);
    const fastVol = safeVolume / speedFactor;
    const duration = Math.max(0.018, 0.08 / speedFactor);
    gain.gain.setValueAtTime(0, atTime);
    gain.gain.linearRampToValueAtTime(fastVol, atTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + duration);
    gain.gain.linearRampToValueAtTime(0, atTime + duration + 0.006);

    osc.connect(gain);
    gain.connect(output);
    osc.start(atTime);
    osc.stop(atTime + duration + 0.01);
    return;
  }

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, atTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, atTime);
  gain.gain.linearRampToValueAtTime(safeVolume, atTime + 0.007);
  gain.gain.exponentialRampToValueAtTime(0.0001, atTime + 0.09);
  gain.gain.linearRampToValueAtTime(0, atTime + 0.105);

  osc.connect(gain);
  gain.connect(output);
  osc.start(atTime);
  osc.stop(atTime + 0.11);
}

export function createOrbitExportAudioStream(
  state: EngineState,
  harmony: HarmonySettings,
  durationSeconds: number,
  prerollSeconds = 0,
  countMode?: OrbitCountMode,
): MediaStream | null {
  const ctx = getAudioContext();
  if (typeof ctx.createMediaStreamDestination !== 'function') {
    return null;
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }

  const destination = ctx.createMediaStreamDestination();
  const target = {
    context: ctx,
    destination,
  };
  const startTime = ctx.currentTime + 0.12 + Math.max(0, prerollSeconds);
  const audibleDuration = Math.max(0, durationSeconds - Math.max(0, prerollSeconds));
  const beatsPerSecond = (state.baseBPM / 60.0) * state.speedMultiplier;
  const cyclePulseCount = getOrbitCyclePulseCount(state.orbits);

  if (beatsPerSecond <= 0) {
    return destination.stream;
  }

  state.orbits.forEach((orbit, orbitIndex) => {
    let rotationIndex = 0;
    while (true) {
      const triggerBeat =
        countMode === 'turns-per-cycle'
          ? (rotationIndex * cyclePulseCount) / Math.max(1, orbit.pulseCount)
          : rotationIndex * Math.max(1, orbit.pulseCount);
      const seconds = triggerBeat / beatsPerSecond;
      if (seconds > audibleDuration) {
        break;
      }
      if (computeOrbitRotations(triggerBeat, orbit.pulseCount, countMode, cyclePulseCount) >= rotationIndex) {
        scheduleResonanceBeep(
          {
            orbitIndex,
            hitIndex: rotationIndex,
            pulseCount: orbit.pulseCount,
            radius: orbit.radius,
            color: orbit.color,
            harmonyDegree: orbit.harmonyDegree,
            harmonyRegister: orbit.harmonyRegister,
            volume: orbit.volume, reverbAmount: orbit.reverbAmount, soundEnabled: orbit.soundEnabled,
          },
          harmony,
          0.12,
          state.speedMultiplier,
          startTime + seconds,
          target,
        );
      }
      rotationIndex += 1;
    }
  });

  return destination.stream;
}

export function toggleAudioMute(): boolean {
  muted = !muted;
  return muted;
}

export function getAudioMuted(): boolean {
  return muted;
}

/**
 * Stop all audio and reset.
 */
export function stopAllAudio(): void {
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
    masterGain = null;
    outputLimiter = null;
    recordingDestination = null;
  }
  triggerCount = 0;
  triggerWindowStart = 0;
  currentTriggerRate = 0;
  lastAudibleTriggerByVoice.clear();
}
