import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_NAMES, SCALE_PRESETS } from '../src/lib/audioEngine';
import {
  RIFF_CYCLE_PRESETS, RIFF_POLYRHYTHM_BREAKDOWNS, RIFF_STANDARD_POLYRHYTHM_BREAKDOWNS, cloneRiffCycleStudy,
  getReferenceStepsPerBar, getReferenceStepsPerSecond, getRiffSequenceTimeline, getResetStepCount, setRiffSequenceEnabled,
} from '../src/lib/riffCycleStudy';

const cases = [
  { first: 2, second: 3, subdivision: 8, positions: [0, 3] },
  { first: 3, second: 2, subdivision: 12, positions: [0, 2, 4] },
  { first: 3, second: 4, subdivision: 12, positions: [0, 4, 8] },
  { first: 3, second: 5, subdivision: 12, positions: [0, 5, 10] },
  { first: 3, second: 7, subdivision: 12, positions: [0, 7, 14] },
  { first: 3, second: 8, subdivision: 12, positions: [0, 8, 16] },
  { first: 4, second: 3, subdivision: 16, positions: [0, 3, 6, 9] },
  { first: 4, second: 5, subdivision: 16, positions: [0, 5, 10, 15] },
  { first: 4, second: 7, subdivision: 16, positions: [0, 7, 14, 21] },
  { first: 5, second: 2, subdivision: 20, positions: [0, 2, 4, 6, 8] },
  { first: 5, second: 3, subdivision: 20, positions: [0, 3, 6, 9, 12] },
  { first: 5, second: 4, subdivision: 20, positions: [0, 4, 8, 12, 16] },
  { first: 5, second: 6, subdivision: 20, positions: [0, 6, 12, 18, 24] },
  { first: 5, second: 7, subdivision: 20, positions: [0, 7, 14, 21, 28] },
];
const positions = (mask: boolean[]) => mask.flatMap((value, index) => value ? [index] : []);

test('the complete folder contains all fourteen requested scenes in numerical order and distinct colors', () => {
  assert.deepEqual(RIFF_POLYRHYTHM_BREAKDOWNS.map((preset) => preset.name), cases.map(({ first, second }) => `${first} against ${second}`));
  assert.equal(new Set(RIFF_POLYRHYTHM_BREAKDOWNS.map((preset) => preset.study.riff.color)).size, 14);
  for (const preset of RIFF_POLYRHYTHM_BREAKDOWNS) {
    assert.equal(preset.pro, !['2 against 3', '3 against 4', '4 against 3'].includes(preset.name));
    assert.equal(preset.collection, 'polyrhythm-breakdowns');
    assert.ok(RIFF_CYCLE_PRESETS.includes(preset));
  }
});

for (const [index, expected] of cases.entries()) {
  test(`${expected.first} against ${expected.second}: completed cover and correct grid, accent, and isolated stages`, () => {
    const { study } = RIFF_POLYRHYTHM_BREAKDOWNS[index];
    const count = expected.first * expected.second;
    assert.equal(study.reference.numerator, expected.second);
    assert.equal(study.reference.denominator, 4);
    assert.equal(study.reference.subdivision, expected.subdivision);
    assert.equal(getReferenceStepsPerBar(study.reference), count);
    assert.equal(study.riff.stepCount, count);
    assert.equal(study.riffSequenceEnabled, true);
    assert.deepEqual(positions(study.riff.activeSteps), expected.positions);
    const [a, b, c] = study.riffCells;
    assert.equal(a.activeSteps.filter(Boolean).length, count);
    assert.deepEqual(positions(a.accents), [0]);
    assert.equal(b.activeSteps.filter(Boolean).length, count);
    assert.deepEqual(positions(b.accents), expected.positions);
    assert.deepEqual(positions(c.activeSteps), expected.positions);
    assert.deepEqual(c.accents, c.activeSteps);
    for (const cell of study.riffCells) {
      assert.equal(cell.stepCount, count);
      assert.equal(cell.numerator, expected.second);
      assert.equal(cell.subdivision, expected.subdivision);
      assert.equal(cell.color, study.riff.color);
    }
    const enabled = setRiffSequenceEnabled(cloneRiffCycleStudy(JSON.parse(JSON.stringify(study))), true);
    assert.deepEqual(enabled.riffCells, study.riffCells);
    const timeline = getRiffSequenceTimeline(enabled);
    assert.deepEqual(timeline.entries.map((entry) => entry.cell.label), ['A', 'A', 'B', 'B', 'C', 'C']);
    assert.equal(timeline.totalSteps, count * 6);
    assert.equal(getResetStepCount(enabled), timeline.totalSteps);
    assert.notEqual(enabled.riffCells[0].activeSteps, study.riffCells[0].activeSteps);
  });
}


test('breakdowns have varied, bounded musical profiles that survive saving', () => {
  const tempos = [116, 100, 92, 88, 84, 90, 82, 78, 76, 80, 76, 72, 70, 68];
  const palettes = new Set<string>();
  const keys = new Set<string>();
  const scales = new Set<string>();
  for (const [index, { study }] of RIFF_POLYRHYTHM_BREAKDOWNS.entries()) {
    const sound = study.soundSettings;
    palettes.add(sound.palette);
    keys.add(sound.rootNote);
    scales.add(sound.scaleName);
    assert.equal(study.reference.bpm, tempos[index]);
    assert.equal(sound.pitchMode, 'keyed');
    assert.ok(NOTE_NAMES.includes(sound.rootNote));
    assert.ok(SCALE_PRESETS[sound.scaleName]);
    assert.ok(['up-down', 'arpeggio'].includes(sound.noteOrder!));
    assert.ok((sound.reverbAmount ?? 0) <= 0.2);
    assert.ok(study.riff.gain >= 0.09 && study.riff.gain <= 0.14);
    // Grid attacks stay readable, including all five subdivisions per beat.
    const attacksPerSecond = getReferenceStepsPerSecond(study.reference);
    assert.ok(attacksPerSecond >= 3.8 && attacksPerSecond <= 6.7);
    const restored = cloneRiffCycleStudy(JSON.parse(JSON.stringify(study)));
    assert.deepEqual(restored.soundSettings, sound);
    assert.equal(restored.reference.bpm, study.reference.bpm);
    assert.equal(restored.riff.gain, study.riff.gain);
  }
  assert.equal(palettes.size, 5);
  assert.equal(keys.size, 7);
  assert.equal(scales.size, 4);
});


test('Standard includes exactly the three free breakdowns, with their complete sequencers and sound profiles', () => {
  assert.deepEqual(RIFF_STANDARD_POLYRHYTHM_BREAKDOWNS.map((preset) => preset.name), [
    '2 against 3', '3 against 4', '4 against 3',
  ]);
  assert.equal(RIFF_POLYRHYTHM_BREAKDOWNS.filter((preset) => preset.pro).length, 11);
  assert.equal(new Set(RIFF_CYCLE_PRESETS.map((preset) => preset.id)).size, RIFF_CYCLE_PRESETS.length);
  for (const preset of RIFF_STANDARD_POLYRHYTHM_BREAKDOWNS) {
    assert.equal(preset.pro, false);
    assert.equal(preset.study.riffSequenceEnabled, true);
    assert.equal(preset.study.riffCells.length, 3);
    assert.deepEqual(preset.study.riffSequence, ['A', 'B', 'C']);
    assert.ok(RIFF_CYCLE_PRESETS.includes(preset));
    assert.ok(RIFF_POLYRHYTHM_BREAKDOWNS.includes(preset));
  }
});
