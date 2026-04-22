import { NOTE_NAMES, SCALE_PRESETS } from './audioEngine';
import type { PolyrhythmLayer, PolyrhythmSoundSettings, PolyrhythmStudy } from './polyrhythmStudy';

const MIDI_PPQ = 480;
const CYCLE_BEATS = 4;

export type PolyrhythmMidiExportMode = 'per-layer' | 'merged' | 'selected-layer';

interface TimedMidiEvent {
  tick: number;
  order: number;
  bytes: number[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(Math.max(1, frequency) / 440));
}

function encodeVariableLength(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes = [] as number[];

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

function getRegisterMultiplier(register: PolyrhythmSoundSettings['register']): number {
  return register === 'wide' ? 1.2 : 1;
}

function getLayerMidiNote(
  layer: PolyrhythmLayer,
  sound: PolyrhythmSoundSettings,
  layerIndex: number,
): number {
  if (sound.pitchMode === 'free') {
    return clamp(frequencyToMidi(layer.pitchHz * getRegisterMultiplier(sound.register)), 32, 92);
  }

  const scale = SCALE_PRESETS[sound.scaleName];
  const rootSemitone = NOTE_NAMES.indexOf(sound.rootNote);
  const baseMidi = sound.register === 'wide' ? 50 : 43;
  const degreeSource = layerIndex * 2 + Math.max(0, Math.round((layer.beatCount - 3) / 3));
  const degree = degreeSource % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  return clamp(baseMidi + rootSemitone + scale.intervals[degree] + octave * 12, 32, 92);
}

function getLayerEvents(
  layer: PolyrhythmLayer,
  layerIndex: number,
  note: number,
): TimedMidiEvent[] {
  const totalTicksPerCycle = MIDI_PPQ * CYCLE_BEATS;
  const offsetFraction = (((layer.rotationOffset / 360) % 1) + 1) % 1;
  const stepTicks = totalTicksPerCycle / Math.max(1, layer.beatCount);
  const noteLengthTicks = Math.max(30, Math.floor(stepTicks * 0.78));
  const events: TimedMidiEvent[] = [];

  layer.activeSteps.forEach((active, stepIndex) => {
    if (!active) {
      return;
    }

    const stepFraction = (((stepIndex / layer.beatCount) + offsetFraction) % 1 + 1) % 1;
    const tick = Math.round(stepFraction * totalTicksPerCycle);
    const velocity = clamp(Math.round(layer.gain * 1000), 48, 110);
    const channel = clamp(layerIndex, 0, 15);

    events.push({
      tick,
      order: 2,
      bytes: [0x90 + channel, note, velocity],
    });
    events.push({
      tick: tick + noteLengthTicks,
      order: 1,
      bytes: [0x80 + channel, note, 0],
    });
  });

  return events;
}

function buildConductorTrack(study: PolyrhythmStudy, label: string): Uint8Array {
  const events: TimedMidiEvent[] = [
    {
      tick: 0,
      order: 0,
      bytes: textEventBytes(0x03, `${study.name || 'Polyrhythm Study'} ${label}`),
    },
    {
      tick: 0,
      order: 0,
      bytes: [
        0xff,
        0x51,
        0x03,
        ...(() => {
          const microsPerQuarter = Math.round(60000000 / Math.max(20, study.bpm));
          return [
            (microsPerQuarter >> 16) & 0xff,
            (microsPerQuarter >> 8) & 0xff,
            microsPerQuarter & 0xff,
          ];
        })(),
      ],
    },
    {
      tick: 0,
      order: 0,
      bytes: [0xff, 0x58, 0x04, 4, 2, 24, 8],
    },
    {
      tick: 0,
      order: 0,
      bytes: textEventBytes(0x06, 'Shared Cycle Start'),
    },
  ];

  return buildTrackChunk(events);
}

function buildHeaderChunk(trackCount: number): Uint8Array {
  const header: number[] = [0x4d, 0x54, 0x68, 0x64];
  pushUint32(header, 6);
  pushUint16(header, 1);
  pushUint16(header, trackCount);
  pushUint16(header, MIDI_PPQ);
  return new Uint8Array(header);
}

export function buildPolyrhythmMidiFile(
  study: PolyrhythmStudy,
  mode: PolyrhythmMidiExportMode = 'per-layer',
  selectedLayerId?: string | null,
): Uint8Array {
  const activeLayers = study.layers.filter((layer) => layer.activeSteps.some(Boolean));
  const selectedLayer =
    (selectedLayerId
      ? study.layers.find((layer) => layer.id === selectedLayerId)
      : null) ??
    study.layers[0] ??
    null;

  const layersToExport =
    mode === 'selected-layer'
      ? selectedLayer
        ? [selectedLayer]
        : []
      : activeLayers;

  const tracks: Uint8Array[] = [];
  const label =
    mode === 'per-layer' ? 'Per Layer MIDI' : mode === 'merged' ? 'Merged MIDI' : 'Selected Layer MIDI';
  tracks.push(buildConductorTrack(study, label));

  if (mode === 'merged') {
    const mergedEvents: TimedMidiEvent[] = [
      {
        tick: 0,
        order: 0,
        bytes: textEventBytes(0x03, `${study.name || 'Polyrhythm Study'} Merged`),
      },
    ];

    layersToExport.forEach((layer) => {
      const layerIndex = study.layers.findIndex((entry) => entry.id === layer.id);
      const note = getLayerMidiNote(layer, study.soundSettings, Math.max(0, layerIndex));
      mergedEvents.push(...getLayerEvents(layer, Math.max(0, layerIndex), note));
    });

    tracks.push(buildTrackChunk(mergedEvents));
  } else {
    layersToExport.forEach((layer) => {
      const layerIndex = study.layers.findIndex((entry) => entry.id === layer.id);
      const note = getLayerMidiNote(layer, study.soundSettings, Math.max(0, layerIndex));
      const events: TimedMidiEvent[] = [
        {
          tick: 0,
          order: 0,
          bytes: textEventBytes(
            0x03,
            `Layer ${Math.max(0, layerIndex) + 1} · ${layer.beatCount} steps`,
          ),
        },
      ];
      events.push(...getLayerEvents(layer, Math.max(0, layerIndex), note));
      tracks.push(buildTrackChunk(events));
    });
  }

  const header = buildHeaderChunk(tracks.length);
  return new Uint8Array([...
    header,
    ...tracks.flatMap((track) => Array.from(track)),
  ]);
}
