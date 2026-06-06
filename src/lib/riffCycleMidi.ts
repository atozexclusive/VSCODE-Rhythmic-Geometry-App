import { NOTE_NAMES, SCALE_PRESETS } from './audioEngine';
import {
  getEffectiveRiffStepStateAtReferenceStep,
  getLandingSlotAtReferenceStep,
  getReferenceStepsPerBeat,
  getReferenceStepsPerBar,
  getResetBarCount,
  isPhraseRestartAtReferenceStep,
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
      frequencyToMidi(study.riff.pitchHz * getRegisterMultiplier(study.soundSettings.register)),
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
  const accentShift = accented
    ? study.soundSettings.accentPush === 'strong'
      ? 2
      : 1
    : 0;
  const degreeSource = Math.max(0, phraseIndex) + accentShift;
  const degree = degreeSource % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  return clamp(registerBaseMidi + rootSemitone + scale.intervals[degree] + octave * 12, 28, 84);
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

export function buildRiffCycleMidiFile(
  study: RiffCycleStudy,
  mode: RiffMidiExportMode = 'cycle',
): Uint8Array {
  const stepsPerBeat = getReferenceStepsPerBeat(study.reference);
  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  const ticksPerStep = Math.max(1, Math.round(MIDI_PPQ / Math.max(1, stepsPerBeat)));
  const exportBarCount =
    mode === 'cycle'
      ? getResetBarCount(study.riff) ?? study.reference.barCountForDisplay
      : Math.max(1, Math.ceil(study.riff.stepCount / stepsPerBar));
  const exportStepCount =
    mode === 'cycle'
      ? Math.max(1, exportBarCount * stepsPerBar)
      : Math.max(1, study.riff.stepCount);
  const noteLengthTicks = Math.max(30, Math.floor(ticksPerStep * 0.78));
  const events: TimedMidiEvent[] = [];

  events.push({
    tick: 0,
    order: 0,
    bytes: textEventBytes(
      0x03,
      `${study.name || 'Riff Cycle'} ${mode === 'cycle' ? 'Rendered Cycle' : 'Pattern Only'}`,
    ),
  });

  events.push({
    tick: 0,
    order: 0,
    bytes: [0xff, 0x51, 0x03, ...(() => {
      const microsPerQuarter = Math.round(60000000 / Math.max(20, study.reference.bpm));
      return [(microsPerQuarter >> 16) & 0xff, (microsPerQuarter >> 8) & 0xff, microsPerQuarter & 0xff];
    })()],
  });

  events.push({
    tick: 0,
    order: 0,
    bytes: [
      0xff,
      0x58,
      0x04,
      clamp(Math.round(study.reference.numerator), 1, 32),
      Math.round(Math.log2(study.reference.denominator)),
      24,
      8,
    ],
  });

  for (let barIndex = 0; barIndex < exportBarCount; barIndex += 1) {
    events.push({
      tick: barIndex * stepsPerBar * ticksPerStep,
      order: 0,
      bytes: textEventBytes(0x06, `Bar ${barIndex + 1}`),
    });
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
      events.push({
        tick,
        order: 0,
        bytes: textEventBytes(0x06, 'Ending Start'),
      });
    }

    if (referenceStep > 0 && isPhraseRestartAtReferenceStep(study, referenceStep)) {
      events.push({
        tick,
        order: 0,
        bytes: textEventBytes(0x06, 'Phrase Restart'),
      });
    }

    if (!stepState.active) {
      continue;
    }

    const midiNote = getRenderedRiffMidiNote(study, stepState.phraseIndex, stepState.accented);
    const velocity = stepState.accented ? 116 : stepState.overridden ? 102 : 88;

    events.push({
      tick,
      order: 2,
      bytes: [0x90, midiNote, velocity],
    });
    events.push({
      tick: tick + noteLengthTicks,
      order: 1,
      bytes: [0x80, midiNote, 0],
    });
  }

  events.push({
    tick: exportStepCount * ticksPerStep,
    order: 0,
    bytes: textEventBytes(0x06, mode === 'cycle' ? 'Cycle Return' : 'Pattern End'),
  });

  const header: number[] = [0x4d, 0x54, 0x68, 0x64];
  pushUint32(header, 6);
  pushUint16(header, 0);
  pushUint16(header, 1);
  pushUint16(header, MIDI_PPQ);

  const trackChunk = buildTrackChunk(events);
  return new Uint8Array([...header, ...trackChunk]);
}
