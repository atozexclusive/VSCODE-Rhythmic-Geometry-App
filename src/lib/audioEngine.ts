// ============================================================
// Orbital Polymeter — Audio Engine
// Every rotation triggers audio. At high speeds, transitions
// from discrete beeps to sustained chord tones.
// ============================================================

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let triggerCount = 0;
let triggerWindowStart = 0;
let currentTriggerRate = 0; // triggers per second

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

export type RootNote = typeof NOTE_NAMES[number];
export type ScaleName = keyof typeof SCALE_PRESETS;
export type HarmonyMappingMode = 'orbit-index' | 'pulse-count' | 'radius' | 'color-hue';
export type TonePreset = 'original' | 'scale-quantized';

export interface HarmonySettings {
  tonePreset: TonePreset;
  rootNote: RootNote;
  scaleName: ScaleName;
  mappingMode: HarmonyMappingMode;
  manualOrbitRoles: boolean;
}

export interface ResonanceVoice {
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
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
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

  const degree = degreeSource % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  const midi = Math.min(96, baseMidi + octave * 12 + scale.intervals[degree]);
  return midiToFrequency(midi);
}

function voiceToFrequency(
  voice: ResonanceVoice,
  harmony: HarmonySettings,
): number {
  if (harmony.tonePreset === 'original') {
    return originalColorFrequency(voice.color);
  }

  return quantizedFrequency(voice, harmony);
}

/**
 * Track trigger rate to determine audio mode.
 */
function updateTriggerRate(): void {
  const now = performance.now();
  triggerCount++;
  if (now - triggerWindowStart > 500) {
    currentTriggerRate = (triggerCount / (now - triggerWindowStart)) * 1000;
    triggerCount = 0;
    triggerWindowStart = now;
  }
}

/**
 * Play a resonance beep. Adapts based on speed:
 * - Normal (< 3x): Clean, short sine beep
 * - Fast (3x-6x): Shorter beep, reduced volume
 * - Very fast (> 6x): Sustained tone that fades, like a chord
 */
export function playResonanceBeep(
  voice: ResonanceVoice,
  harmony: HarmonySettings = DEFAULT_HARMONY_SETTINGS,
  volume: number = 0.15,
  speedMultiplier: number = 1.0,
): void {
  try {
    const ctx = getAudioContext();
    const master = getMasterGain();
    const now = ctx.currentTime;
    const freq = voiceToFrequency(voice, harmony);

    updateTriggerRate();

    // Very fast: sustained chord tone
    if (speedMultiplier > 6.0) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      // Volume drops with speed — becomes ambient
      const chordVol = Math.max(0.01, volume * 0.3 / Math.sqrt(speedMultiplier / 6));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(chordVol, now + 0.01);
      // Long sustain, gentle release
      gain.gain.setValueAtTime(chordVol, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.42);
      return;
    }

    // Fast: shorter beep, reduced volume
    if (speedMultiplier > 3.0) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = ctx.createGain();
      const fastVol = volume * (3.0 / speedMultiplier);
      const duration = Math.max(0.03, 0.08 / (speedMultiplier / 3));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(fastVol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

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
    gain.gain.linearRampToValueAtTime(volume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.1);
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

/**
 * Stop all audio and reset.
 */
export function stopAllAudio(): void {
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
    masterGain = null;
  }
  triggerCount = 0;
  triggerWindowStart = 0;
  currentTriggerRate = 0;
}
