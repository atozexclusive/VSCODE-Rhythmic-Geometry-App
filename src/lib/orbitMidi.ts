import {
  NOTE_NAMES,
  SCALE_PRESETS,
  type HarmonySettings,
} from './audioEngine';
import type { Orbit } from './orbitalEngine';

const MIDI_PPQ = 480;

export interface OrbitMidiExportOptions {
  bars: 4 | 8 | 16;
}

interface TimedMidiEvent {
  tick: number;
  order: number;
  bytes: number[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function encodeVariableLength(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];

  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}

function pushUint16(bytes: number[], value: number): void {
  bytes.push((value >> 8) & 0xff, value & 0xff);
}

function pushUint32(bytes: number[], value: number): void {
  bytes.push((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
}

function textEventBytes(metaType: number, text: string): number[] {
  const encoded = Array.from(new TextEncoder().encode(text));
  return [0xff, metaType, ...encodeVariableLength(encoded.length), ...encoded];
}

function buildTrackChunk(events: TimedMidiEvent[]): Uint8Array {
  const sorted = [...events].sort((a, b) => (a.tick === b.tick ? a.order - b.order : a.tick - b.tick));
  const trackBytes: number[] = [];
  let previousTick = 0;

  sorted.forEach((event) => {
    const delta = Math.max(0, event.tick - previousTick);
    trackBytes.push(...encodeVariableLength(delta), ...event.bytes);
    previousTick = event.tick;
  });

  trackBytes.push(...encodeVariableLength(0), 0xff, 0x2f, 0x00);

  const chunk: number[] = [0x4d, 0x54, 0x72, 0x6b];
  pushUint32(chunk, trackBytes.length);
  chunk.push(...trackBytes);
  return new Uint8Array(chunk);
}

function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(Math.max(1, frequency) / 440));
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
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }
  return h;
}

function originalOrbitMidiNote(color: string): number {
  const pentatonic = [
    261.63, 293.66, 329.63, 392.0, 440.0,
    523.25, 587.33, 659.25, 783.99, 880.0,
    1046.5, 1174.66, 1318.51, 1567.98, 1760.0,
  ];
  const index = Math.floor(colorToHue(color) * (pentatonic.length - 1));
  return clamp(frequencyToMidi(pentatonic[Math.min(index, pentatonic.length - 1)]), 48, 96);
}

function quantizedOrbitMidiNote(
  orbit: Orbit,
  harmony: HarmonySettings,
  orbitIndex: number,
): number {
  const scale = SCALE_PRESETS[harmony.scaleName];
  const rootSemitone = NOTE_NAMES.indexOf(harmony.rootNote);
  const baseMidi = 60 + rootSemitone;

  let degreeSource = 0;
  if (harmony.manualOrbitRoles && typeof orbit.harmonyDegree === 'number') {
    const register = orbit.harmonyRegister ?? 0;
    degreeSource = Math.max(0, orbit.harmonyDegree) + register * scale.intervals.length;
  } else if (harmony.mappingMode === 'orbit-index') {
    degreeSource = orbitIndex;
  } else if (harmony.mappingMode === 'pulse-count') {
    degreeSource = Math.max(0, orbit.pulseCount - 2);
  } else if (harmony.mappingMode === 'radius') {
    degreeSource = Math.max(0, Math.round((orbit.radius - 40) / 30));
  } else {
    degreeSource = Math.floor(colorToHue(orbit.color) * scale.intervals.length * 3);
  }

  const degree = ((degreeSource % scale.intervals.length) + scale.intervals.length) % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  return clamp(baseMidi + octave * 12 + scale.intervals[degree], 28, 96);
}

function getOrbitMidiNote(
  orbit: Orbit,
  harmony: HarmonySettings,
  orbitIndex: number,
): number {
  return harmony.tonePreset === 'original'
    ? originalOrbitMidiNote(orbit.color)
    : quantizedOrbitMidiNote(orbit, harmony, orbitIndex);
}

export function buildOrbitMidiFile(
  orbits: Orbit[],
  harmony: HarmonySettings,
  bpm: number,
  options: OrbitMidiExportOptions,
): Uint8Array {
  const totalBars = options.bars;
  const totalBeats = totalBars * 4;
  const totalTicks = totalBeats * MIDI_PPQ;
  const noteLengthTicks = Math.round(MIDI_PPQ * 0.25);
  const events: TimedMidiEvent[] = [];

  events.push({
    tick: 0,
    order: 0,
    bytes: textEventBytes(0x03, `Orbit Merged ${totalBars} Bars`),
  });

  const microsPerQuarter = Math.round(60000000 / Math.max(20, bpm));
  events.push({
    tick: 0,
    order: 0,
    bytes: [
      0xff,
      0x51,
      0x03,
      (microsPerQuarter >> 16) & 0xff,
      (microsPerQuarter >> 8) & 0xff,
      microsPerQuarter & 0xff,
    ],
  });

  events.push({
    tick: 0,
    order: 0,
    bytes: [0xff, 0x58, 0x04, 4, 2, 24, 8],
  });

  for (let barIndex = 0; barIndex < totalBars; barIndex += 1) {
    events.push({
      tick: barIndex * 4 * MIDI_PPQ,
      order: 0,
      bytes: textEventBytes(0x06, `Bar ${barIndex + 1}`),
    });
  }

  orbits.forEach((orbit, orbitIndex) => {
    const pulseCount = Math.max(1, orbit.pulseCount);
    const note = getOrbitMidiNote(orbit, harmony, orbitIndex);
    const velocity = clamp(86 + ((orbitIndex % 4) * 6), 72, 112);

    events.push({
      tick: 0,
      order: 0,
      bytes: textEventBytes(0x01, `Orbit ${orbitIndex + 1} · ${pulseCount} pulses`),
    });

    for (let beat = 0; beat < totalBeats; beat += pulseCount) {
      const tick = Math.round(beat * MIDI_PPQ);
      events.push({
        tick,
        order: 2,
        bytes: [0x90, note, velocity],
      });
      events.push({
        tick: Math.min(totalTicks, tick + noteLengthTicks),
        order: 1,
        bytes: [0x80, note, 0],
      });
    }
  });

  const header: number[] = [0x4d, 0x54, 0x68, 0x64];
  pushUint32(header, 6);
  pushUint16(header, 0);
  pushUint16(header, 1);
  pushUint16(header, MIDI_PPQ);

  const trackChunk = buildTrackChunk(events);
  return new Uint8Array([...header, ...trackChunk]);
}
