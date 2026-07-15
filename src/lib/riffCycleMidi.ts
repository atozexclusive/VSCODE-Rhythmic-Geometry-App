import { NOTE_NAMES, SCALE_PRESETS } from './audioEngine';
import {
  getEffectiveRiffStepStateAtReferenceStep,
  getEffectiveResetBarCount,
  getLandingSlotAtReferenceStep,
  getReferenceStepsPerBeat,
  getReferenceStepsPerBar,
  isPhraseRestartAtReferenceStep,
  RIFF_MAX_METER_NUMERATOR,
  type RiffCycleStudy,
  type RiffCycleSoundSettings,
} from './riffCycleStudy';

const MIDI_PPQ = 480;
export type RiffMidiExportMode = 'pattern' | 'cycle';

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

function getRegisterMultiplier(register: RiffCycleSoundSettings['register']): number {
  if (register === 'mid-low') {
    return 1.16;
  }
  if (register === 'wide') {
    return 1.34;
  }
  return 1;
}

function getRenderedRiffMidiNote(
  study: RiffCycleStudy,
  phraseIndex: number,
  accented: boolean,
): number {
  if (study.soundSettings.pitchMode === 'free') {
    return clamp(
      frequencyToMidi(study.riff.pitchHz * getRegisterMultiplier(study.soundSettings.register)) +
        (accented ? 1 : 0),
      28,
      84,
    );
  }

  const scale = SCALE_PRESETS[study.soundSettings.scaleName];
  const rootSemitone = NOTE_NAMES.indexOf(study.soundSettings.rootNote);
  const registerBaseMidi =
    study.soundSettings.register === 'wide'
      ? 48
      : study.soundSettings.register === 'mid-low'
        ? 43
        : 36;
  const degreeSource = Math.max(0, phraseIndex);
  const degree = degreeSource % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  return clamp(
    registerBaseMidi + rootSemitone + scale.intervals[degree] + octave * 12 + (accented ? 1 : 0),
    28,
    84,
  );
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

function createTrackNameEvent(name: string): TimedMidiEvent {
  return {
    tick: 0,
    order: 0,
    bytes: textEventBytes(0x03, name),
  };
}

function createNoteEvents(
  tick: number,
  channel: number,
  note: number,
  velocity: number,
  lengthTicks: number,
  order = 2,
): TimedMidiEvent[] {
  const statusOn = 0x90 | clamp(channel, 0, 15);
  const statusOff = 0x80 | clamp(channel, 0, 15);
  return [
    {
      tick,
      order,
      bytes: [statusOn, clamp(note, 0, 127), clamp(velocity, 1, 127)],
    },
    {
      tick: tick + Math.max(1, lengthTicks),
      order: order - 1,
      bytes: [statusOff, clamp(note, 0, 127), 0],
    },
  ];
}

function getPulseLayerStepActive(study: RiffCycleStudy, referenceStep: number): boolean {
  const groupSize = Math.max(1, Math.round(study.pulseLayerGroupSize || 1));
  const stepIndex = ((referenceStep % groupSize) + groupSize) % groupSize;
  return study.pulseLayerSteps?.[stepIndex] ?? true;
}

function getRiffCycleBoundarySteps(
  study: RiffCycleStudy,
  mode: RiffMidiExportMode,
  exportStepCount: number,
): number[] {
  if (mode === 'pattern') {
    return [0, exportStepCount];
  }

  const boundaries = [0];
  for (let referenceStep = 1; referenceStep < exportStepCount; referenceStep += 1) {
    if (isPhraseRestartAtReferenceStep(study, referenceStep)) {
      boundaries.push(referenceStep);
    }
  }
  boundaries.push(exportStepCount);
  return [...new Set(boundaries)].sort((a, b) => a - b);
}

export function buildRiffCycleMidiFile(
  study: RiffCycleStudy,
  mode: RiffMidiExportMode = 'cycle',
): Uint8Array {
  const stepsPerBeat = getReferenceStepsPerBeat(study.reference);
  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  const ticksPerStep = Math.max(1, Math.round(MIDI_PPQ / Math.max(1, stepsPerBeat)));
  const exportBarCount =
    mode === 'cycle'
      ? getEffectiveResetBarCount(study) ?? study.reference.barCountForDisplay
      : Math.max(1, Math.ceil(study.riff.stepCount / stepsPerBar));
  const exportStepCount =
    mode === 'cycle'
      ? Math.max(1, exportBarCount * stepsPerBar)
      : Math.max(1, study.riff.stepCount);
  const noteLengthTicks = Math.max(30, Math.floor(ticksPerStep * 0.78));
  const metronomeNoteLengthTicks = Math.max(24, Math.floor(ticksPerStep * 0.42));
  const subdivisionNoteLengthTicks = Math.max(18, Math.floor(ticksPerStep * 0.34));
  const conductorEvents: TimedMidiEvent[] = [];
  const riffEvents: TimedMidiEvent[] = [createTrackNameEvent('Riff MIDI')];
  const metronomeEvents: TimedMidiEvent[] = [createTrackNameEvent('Metronome MIDI')];
  const subdivisionEvents: TimedMidiEvent[] = [createTrackNameEvent('Subdivision MIDI')];
  const cycleMarkerEvents: TimedMidiEvent[] = [createTrackNameEvent('Cycle Markers MIDI')];

  conductorEvents.push({
    tick: 0,
    order: 0,
    bytes: textEventBytes(
      0x03,
      `${study.name || 'Riff Cycle'} ${mode === 'cycle' ? 'Rendered Cycle' : 'Pattern Only'} Lanes`,
    ),
  });

  conductorEvents.push({
    tick: 0,
    order: 0,
    bytes: [0xff, 0x51, 0x03, ...(() => {
      const microsPerQuarter = Math.round(60000000 / Math.max(20, study.reference.bpm));
      return [(microsPerQuarter >> 16) & 0xff, (microsPerQuarter >> 8) & 0xff, microsPerQuarter & 0xff];
    })()],
  });

  conductorEvents.push({
    tick: 0,
    order: 0,
    bytes: [
      0xff,
      0x58,
      0x04,
      clamp(Math.round(study.reference.numerator), 1, RIFF_MAX_METER_NUMERATOR),
      Math.round(Math.log2(study.reference.denominator)),
      24,
      8,
    ],
  });

  for (let barIndex = 0; barIndex < exportBarCount; barIndex += 1) {
    conductorEvents.push({
      tick: barIndex * stepsPerBar * ticksPerStep,
      order: 0,
      bytes: textEventBytes(0x06, `Bar ${barIndex + 1}`),
    });
  }

  const cycleBoundarySteps = getRiffCycleBoundarySteps(study, mode, exportStepCount);
  for (let index = 0; index < cycleBoundarySteps.length - 1; index += 1) {
    const startStep = cycleBoundarySteps[index];
    const endStep = cycleBoundarySteps[index + 1];
    const startTick = startStep * ticksPerStep;
    const endTick = endStep * ticksPerStep;
    if (endTick <= startTick) {
      continue;
    }

    const cycleLabel = mode === 'cycle' ? `Pattern ${index + 1}` : 'Pattern';
    conductorEvents.push({
      tick: startTick,
      order: 0,
      bytes: textEventBytes(0x06, `${cycleLabel} Start`),
    });
    conductorEvents.push({
      tick: endTick,
      order: 0,
      bytes: textEventBytes(0x06, `${cycleLabel} End`),
    });
    cycleMarkerEvents.push(
      ...createNoteEvents(
        startTick,
        1,
        84,
        index % 2 === 0 ? 70 : 58,
        endTick - startTick,
        2,
      ),
    );
  }

  for (let referenceStep = 0; referenceStep < exportStepCount; referenceStep += 1) {
    const tick = referenceStep * ticksPerStep;
    const stepState =
      mode === 'cycle'
        ? getEffectiveRiffStepStateAtReferenceStep(study, referenceStep)
        : {
            phraseIndex: referenceStep % study.riff.stepCount,
            active: Boolean(study.riff.activeSteps[referenceStep % study.riff.stepCount]),
            accented: Boolean(study.riff.accents[referenceStep % study.riff.stepCount]),
            landingSlot: null,
            overridden: false,
          };
    const landingSlot =
      mode === 'cycle' ? getLandingSlotAtReferenceStep(study, referenceStep) : null;
    const previousLandingSlot =
      mode === 'cycle' && referenceStep > 0
        ? getLandingSlotAtReferenceStep(study, referenceStep - 1)
        : null;

    if (mode === 'cycle' && landingSlot === 0 && previousLandingSlot == null) {
      conductorEvents.push({
        tick,
        order: 0,
        bytes: textEventBytes(0x06, 'Ending Start'),
      });
    }

    if (referenceStep > 0 && isPhraseRestartAtReferenceStep(study, referenceStep)) {
      conductorEvents.push({
        tick,
        order: 0,
        bytes: textEventBytes(0x06, 'Phrase Restart'),
      });
    }

    if (referenceStep % stepsPerBeat === 0) {
      const isDownbeat = referenceStep % stepsPerBar === 0;
      metronomeEvents.push(
        ...createNoteEvents(
          tick,
          9,
          isDownbeat ? 76 : 77,
          isDownbeat ? 112 : 86,
          metronomeNoteLengthTicks,
          3,
        ),
      );
    }

    if (getPulseLayerStepActive(study, referenceStep)) {
      const groupSize = Math.max(1, Math.round(study.pulseLayerGroupSize || stepsPerBar));
      const isGroupStart = referenceStep % groupSize === 0;
      subdivisionEvents.push(
        ...createNoteEvents(
          tick,
          9,
          isGroupStart ? 38 : 37,
          isGroupStart ? 84 : 62,
          subdivisionNoteLengthTicks,
          4,
        ),
      );
    }

    if (stepState.active) {
      const midiNote = getRenderedRiffMidiNote(study, stepState.phraseIndex, stepState.accented);
      const velocity = stepState.accented ? 116 : stepState.overridden ? 102 : 88;
      riffEvents.push(...createNoteEvents(tick, 0, midiNote, velocity, noteLengthTicks));
    }
  }

  conductorEvents.push({
    tick: exportStepCount * ticksPerStep,
    order: 0,
    bytes: textEventBytes(0x06, mode === 'cycle' ? 'Cycle Return' : 'Pattern End'),
  });

  const header: number[] = [0x4d, 0x54, 0x68, 0x64];
  pushUint32(header, 6);
  pushUint16(header, 1);
  pushUint16(header, 5);
  pushUint16(header, MIDI_PPQ);

  return new Uint8Array([
    ...header,
    ...buildTrackChunk(conductorEvents),
    ...buildTrackChunk(riffEvents),
    ...buildTrackChunk(metronomeEvents),
    ...buildTrackChunk(subdivisionEvents),
    ...buildTrackChunk(cycleMarkerEvents),
  ]);
}
