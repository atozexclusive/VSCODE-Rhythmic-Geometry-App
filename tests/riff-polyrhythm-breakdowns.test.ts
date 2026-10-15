import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RIFF_CYCLE_PRESETS, RIFF_POLYRHYTHM_BREAKDOWNS, cloneRiffCycleStudy,
  getReferenceStepsPerBar, getRiffSequenceTimeline, getResetStepCount, setRiffSequenceEnabled,
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

test('the Pro folder contains all fourteen requested scenes in numerical order and distinct colors', () => {
  assert.deepEqual(RIFF_POLYRHYTHM_BREAKDOWNS.map((preset) => preset.name), cases.map(({ first, second }) => `${first} against ${second}`));
  assert.equal(new Set(RIFF_POLYRHYTHM_BREAKDOWNS.map((preset) => preset.study.riff.color)).size, 14);
  for (const preset of RIFF_POLYRHYTHM_BREAKDOWNS) {
    assert.equal(preset.pro, true);
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
