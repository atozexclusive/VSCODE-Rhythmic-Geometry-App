import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addRiffSequenceCell,
  RIFF_CATALOG_PRESETS,
  cloneRiffCycleStudy,
  createRiffCycleStudy,
  setRiffSequenceEnabled,
  toggleRiffSequenceCellAccent,
  toggleRiffSequenceCellStep,
  toggleRiffStep,
  updateRiffSequenceCellStepCount,
  updateRiffStepCount,
} from '../src/lib/riffCycleStudy';

test('first enable copies the current riff after edits, without sharing its hit arrays', () => {
  let study = createRiffCycleStudy();
  study = updateRiffStepCount(study, 9);
  study = toggleRiffStep(study, 1);
  const enabled = setRiffSequenceEnabled(study, true);
  assert.equal(enabled.riffCells[0].stepCount, 9);
  assert.deepEqual(enabled.riffCells[0].activeSteps, study.riff.activeSteps);
  assert.deepEqual(enabled.riffCells[0].accents, study.riff.accents);
  assert.notEqual(enabled.riffCells[0].activeSteps, study.riff.activeSteps);
  assert.equal(study.riffSequenceInitialized, false);
  assert.equal(enabled.riffSequenceInitialized, true);
});

test('off/on preserves edited cells, accents, added cells, and the original standalone riff', () => {
  let study = setRiffSequenceEnabled(createRiffCycleStudy(), true);
  const standalone = structuredClone(study.riff);
  study = updateRiffSequenceCellStepCount(study, 'A', 11);
  study = toggleRiffSequenceCellStep(study, 'A', 2);
  study = toggleRiffSequenceCellAccent(study, 'A', 3);
  study = addRiffSequenceCell(study);
  const cells = structuredClone(study.riffCells);
  const sequence = [...study.riffSequence];
  const disabled = setRiffSequenceEnabled(study, false);
  assert.deepEqual(disabled.riff, standalone);
  // Editing the standalone riff while the sequencer is off must not replace A.
  const editedStandalone = updateRiffStepCount(toggleRiffStep(disabled, 1), 7);
  const reopened = setRiffSequenceEnabled(editedStandalone, true);
  assert.deepEqual(reopened.riffCells, cells);
  assert.deepEqual(reopened.riffSequence, sequence);
  assert.deepEqual(reopened.riff, editedStandalone.riff);
  assert.deepEqual(setRiffSequenceEnabled(reopened, true).riffCells, cells);
});

test('saving and restoring a disabled sequencer retains its initialization and edits', () => {
  let study = setRiffSequenceEnabled(createRiffCycleStudy(), true);
  study = updateRiffSequenceCellStepCount(study, 'A', 13);
  study = toggleRiffSequenceCellAccent(study, 'A', 4);
  study = setRiffSequenceEnabled(study, false);
  const restored = cloneRiffCycleStudy(createRiffCycleStudy(JSON.parse(JSON.stringify(study))));
  assert.deepEqual(setRiffSequenceEnabled(restored, true).riffCells, study.riffCells);
});

test('older saved scenes with existing cells are preserved even without an initialization flag', () => {
  let study = setRiffSequenceEnabled(createRiffCycleStudy(), true);
  study = updateRiffSequenceCellStepCount(study, 'A', 13);
  study = setRiffSequenceEnabled(study, false);
  delete study.riffSequenceInitialized;
  const restored = cloneRiffCycleStudy(study);
  assert.deepEqual(setRiffSequenceEnabled(restored, true).riffCells, study.riffCells);
  assert.deepEqual(setRiffSequenceEnabled(createRiffCycleStudy(study), true).riffCells, study.riffCells);
});

test('turning an unused sequencer off does not prevent its first copy', () => {
  let study = setRiffSequenceEnabled(createRiffCycleStudy(), false);
  study = updateRiffStepCount(study, 15);
  assert.equal(setRiffSequenceEnabled(study, true).riffCells[0].stepCount, 15);
});

test('bundled standalone scenes seed A from the latest riff instead of their placeholder cells', () => {
  for (const preset of RIFF_CATALOG_PRESETS.filter(entry => !entry.study.riffSequenceInitialized)) {
    let study = cloneRiffCycleStudy(preset.study);
    study = toggleRiffStep(updateRiffStepCount(study, 27), 1);
    study.riff.color = '#7FD7FF';
    study.reference.numerator = 3;
    study.reference.denominator = 8;
    study.reference.subdivision = 12;
    const enabled = setRiffSequenceEnabled(study, true);
    const first = enabled.riffCells[0];
    assert.equal(first.stepCount, study.riff.stepCount, preset.id);
    assert.deepEqual(first.activeSteps, study.riff.activeSteps, preset.id);
    assert.deepEqual(first.accents, study.riff.accents, preset.id);
    assert.equal(first.color, study.riff.color);
    assert.equal(first.numerator, 3);
    assert.equal(first.denominator, 8);
    assert.equal(first.subdivision, 12);
    const edited = toggleRiffSequenceCellStep(enabled, first.label, 4);
    const reopened = setRiffSequenceEnabled(setRiffSequenceEnabled(edited, false), true);
    assert.deepEqual(reopened.riffCells, edited.riffCells, preset.id);
  }
  assert.ok(RIFF_CATALOG_PRESETS.some(entry => !entry.study.riffSequenceInitialized));
});

test('bundled authored sequences keep their saved cells and order', () => {
  for (const preset of RIFF_CATALOG_PRESETS.filter(entry => entry.study.riffSequenceInitialized)) {
    const original = cloneRiffCycleStudy(preset.study);
    const study = toggleRiffStep(original, 1);
    const enabled = setRiffSequenceEnabled(study, true);
    assert.deepEqual(enabled.riffCells, original.riffCells, preset.id);
    assert.deepEqual(enabled.riffSequence, original.riffSequence, preset.id);
  }
});
