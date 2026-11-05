import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRiffCycleStudy, setRiffSequenceEnabled, setRiffSequenceBarsMode,
  setRiffSequenceBars, getResetStepCount, getEffectiveResetBarCount,
  getRiffSequenceTimeline, getRiffSequenceStateAtReferenceProgress, cloneRiffCycleStudy,
} from '../src/lib/riffCycleStudy';

function makeSequence() {
  const study = setRiffSequenceEnabled(createRiffCycleStudy(), true);
  const base = study.riffCells[0];
  study.riffCells = [7, 11].map((stepCount, index) => ({
    ...base, id: `cell-${index}`, label: index === 0 ? 'A' : 'B', stepCount,
    activeSteps: Array(stepCount).fill(true), accents: Array(stepCount).fill(false),
  }));
  study.riffSequence = ['A', 'B'];
  study.riffSequencePhrases = [{ id: 'phrase', entryCount: 2, repeatCount: 1 }];
  study.riffSequenceBars = 4;
  return study;
}

test('Per Cell exposes a whole-bar restart while retaining individual slot durations', () => {
  const study = setRiffSequenceBarsMode(makeSequence(), 'per-cell');
  assert.equal(getRiffSequenceTimeline(study).totalSteps, 18);
  assert.equal(getResetStepCount(study), 64);
  assert.equal(getEffectiveResetBarCount(study), 4);
  assert.equal(getRiffSequenceStateAtReferenceProgress(study, 7)?.cell.label, 'B');
  assert.equal(getRiffSequenceStateAtReferenceProgress(study, 63)?.cell.label, 'B');
  assert.equal(getRiffSequenceStateAtReferenceProgress(study, 64)?.cell.label, 'A');
  assert.equal(getRiffSequenceStateAtReferenceProgress(study, 64)?.localStep, 0);
  const updated = setRiffSequenceBars(study, 3);
  assert.equal(getResetStepCount(updated), 48);
  assert.equal(getRiffSequenceStateAtReferenceProgress(updated, 48)?.localStep, 0);
  assert.deepEqual(updated.riffSequenceEntryRepeats, study.riffSequenceEntryRepeats);
  assert.deepEqual(updated.riffSequenceEntryBars, study.riffSequenceEntryBars);
  assert.equal(getResetStepCount(cloneRiffCycleStudy(createRiffCycleStudy(JSON.parse(JSON.stringify(updated))))), 48);
});

test('legacy Per Cell scenes retain natural lengths until the restart is explicitly set', () => {
  const study = makeSequence();
  study.riffSequenceBarsMode = 'per-cell';
  assert.equal(getResetStepCount(study), 18);
  assert.equal(getResetStepCount(cloneRiffCycleStudy(study)), 18);
  assert.equal(getResetStepCount(setRiffSequenceBars(study, 2)), 32);
  const global = setRiffSequenceBarsMode(study, 'global');
  assert.equal(getResetStepCount(global), 64);
});
