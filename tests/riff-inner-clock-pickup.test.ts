import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RIFF_DISPLAY_SETTINGS, getEffectiveInnerClockMode, getInnerClockRiffProgress,
  getInnerClockPickupSteps, normalizeCanvasDisplaySettings,
} from '../src/lib/canvasDisplayThemes';
import {
  createRiffCycleStudy, setRiffSequenceEnabled, addRiffSequenceCell,
  getRiffSequenceStateAtReferenceProgress, getReferenceStepsPerBar,
  createReferenceMeter, createRiffPhrase, createRiffCycleSoundSettings,
} from '../src/lib/riffCycleStudy';
import { createRiffCycleExportAudioStream } from '../src/lib/riffCycleAudio';

const settings = normalizeCanvasDisplaySettings({
  ...DEFAULT_RIFF_DISPLAY_SETTINGS,
  innerClockAutomation: { enabled: true, pickup: true, cycleBars: 8, modes: ['minimal', 'full'] },
});

test('eight-bar pickup holds cell A and starts its first step on the full-mode downbeat', () => {
  const study = addRiffSequenceCell(setRiffSequenceEnabled(createRiffCycleStudy(), true));
  const stepsPerBar = getReferenceStepsPerBar(study.reference);
  const pickupSteps = 8 * stepsPerBar;
  assert.equal(getInnerClockPickupSteps(settings, stepsPerBar), pickupSteps);
  for (let step = 0; step < pickupSteps; step++) {
    const progress = getInnerClockRiffProgress(settings, step, stepsPerBar);
    assert.equal(progress, 0);
    assert.equal(getEffectiveInnerClockMode(settings, step, stepsPerBar), 'minimal');
    assert.equal(getRiffSequenceStateAtReferenceProgress(study, progress)?.cell.label, 'A');
  }
  assert.equal(getInnerClockRiffProgress(settings, pickupSteps, stepsPerBar), 0);
  assert.equal(getEffectiveInnerClockMode(settings, pickupSteps, stepsPerBar), 'full');
  assert.equal(getInnerClockRiffProgress(settings, pickupSteps + 3.25, stepsPerBar), 3.25);
  // A pickup runs once, rather than returning to Minimal on the next automation cycle.
  assert.equal(getEffectiveInnerClockMode(settings, pickupSteps * 2, stepsPerBar), 'full');
  assert.equal(getInnerClockRiffProgress(settings, 0, stepsPerBar), 0); // Restart repeats pickup.
});

test('pickup settings persist; ordinary bar automation and manual Minimal retain their timing', () => {
  const restored = normalizeCanvasDisplaySettings(JSON.parse(JSON.stringify(settings)));
  assert.equal(getInnerClockPickupSteps(restored, 16), 128);
  const ordinary = normalizeCanvasDisplaySettings({ ...settings, innerClockAutomation: { ...settings.innerClockAutomation!, pickup: false } });
  assert.equal(getInnerClockRiffProgress(ordinary, 100, 16), 100);
  assert.equal(getEffectiveInnerClockMode(ordinary, 256, 16), 'minimal');
  const manual = normalizeCanvasDisplaySettings({ ...settings, innerClock: 'minimal', innerClockAutomation: { ...settings.innerClockAutomation!, enabled: false } });
  assert.equal(getInnerClockRiffProgress(manual, 100, 16), 100);
  assert.equal(getEffectiveInnerClockMode(manual, 100, 16), 'minimal');
});

class Param {
  value = 0;
  setValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime() {} linearRampToValueAtTime() {}
}
class AudioNodeMock {
  frequency = new Param(); gain = new Param(); Q = new Param();
  started = -1;
  connect() {} disconnect() {} stop() {}
  start(at: number) { this.started = at; }
}
class Context {
  static current: Context;
  state = 'running'; currentTime = 0;
  destination = new AudioNodeMock(); oscillators: AudioNodeMock[] = [];
  constructor() { Context.current = this; }
  createGain() { return new AudioNodeMock(); }
  createBiquadFilter() { return new AudioNodeMock(); }
  createOscillator() { const node = new AudioNodeMock(); this.oscillators.push(node); return node; }
  createMediaStreamDestination() { return { stream: {} }; }
}

test('export keeps meter audio in the pickup and schedules the riff only after its eight bars', () => {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: Context } });
  try {
    const study = createRiffCycleStudy({
      reference: createReferenceMeter({ numerator: 4, denominator: 4, subdivision: 16, bpm: 120 }),
      riff: createRiffPhrase(7, { activeSteps: [true, false, false, false, false, false, false], accents: Array(7).fill(false) }),
      soundSettings: createRiffCycleSoundSettings({ palette: 'dry-synth', pitchMode: 'free', reverbAmount: 0, referenceReverbAmount: 0 }),
      referenceSoundEnabled: false, backbeatSoundEnabled: false, subdivisionSoundEnabled: false,
      showAlignmentMarkers: false,
    });
    createRiffCycleExportAudioStream(study, 18, 0, settings);
    const notes = Context.current.oscillators;
    assert.ok(notes.length > 0);
    assert.ok(notes.every(node => node.started >= 16.12 - 1e-9));
    assert.ok(notes.some(node => Math.abs(node.started - 16.12) < 1e-9));
    Context.current.state = 'closed';
    study.referenceSoundEnabled = true;
    study.riff.soundEnabled = false;
    createRiffCycleExportAudioStream(study, 18, 0, settings);
    assert.ok(Context.current.oscillators.some(node => Math.abs(node.started - 0.12) < 1e-9));
    assert.ok(Context.current.oscillators.some(node => node.started > 0.12 && node.started < 16.12));
    Context.current.state = 'closed';
  } finally {
    if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
