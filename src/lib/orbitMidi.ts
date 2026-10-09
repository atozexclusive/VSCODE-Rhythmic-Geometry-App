import {
  voiceToFrequency,
  type HarmonySettings,
} from './audioEngine';
import {
  DEFAULT_ORBIT_COUNT_MODE,
  ENABLE_STANDARD_TURNS_PER_CYCLE,
  type Orbit,
  type OrbitCountMode,
} from './orbitalEngine';

const MIDI_PPQ = 480;

export interface OrbitMidiExportOptions {
  bars: 4 | 8 | 16;
  countMode?: OrbitCountMode;
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

export function buildOrbitMidiFile(
  orbits: Orbit[],
  harmony: HarmonySettings,
  bpm: number,
  anchorPulseCount: number,
  options: OrbitMidiExportOptions,
): Uint8Array {
  const totalBars = options.bars;
  const totalBeats = totalBars * 4;
  const totalTicks = totalBeats * MIDI_PPQ;
  const countMode = options.countMode ?? DEFAULT_ORBIT_COUNT_MODE;
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
    if (orbit.soundEnabled === false || orbit.volume === 0) return;
    const pulseCount = Math.max(1, orbit.pulseCount);
    const useCycleCount = ENABLE_STANDARD_TURNS_PER_CYCLE && countMode === 'turns-per-cycle';
    const intervalBeats =
      useCycleCount
        ? Math.max(1, anchorPulseCount) / pulseCount
        : pulseCount / Math.max(1, anchorPulseCount);

    const velocity = clamp(Math.round((86 + ((orbitIndex % 4) * 6)) * (orbit.volume ?? 1)), 1, 112);
    const noteLengthTicks = Math.max(24, Math.min(Math.round(intervalBeats * MIDI_PPQ * 0.8), Math.round(MIDI_PPQ * 0.6)));
    const countLabel = useCycleCount ? 'turns/cycle' : 'beats/turn';

    events.push({
      tick: 0,
      order: 0,
      bytes: textEventBytes(0x01, `Orbit ${orbitIndex + 1} · ${pulseCount} ${countLabel}`),
    });

    let hitIndex = 0;
    for (let beat = 0; beat < totalBeats; beat += intervalBeats, hitIndex++) {
      const note = clamp(frequencyToMidi(voiceToFrequency({ ...orbit, orbitIndex, hitIndex }, harmony)), 0, 127);
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
