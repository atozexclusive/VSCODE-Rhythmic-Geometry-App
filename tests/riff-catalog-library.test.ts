import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RIFF_SCENE_CATALOG } from '../src/lib/sceneCatalog';
import { RIFF_CATALOG_PRESETS, RIFF_CYCLE_PRESETS, cloneRiffCycleStudy } from '../src/lib/riffCycleStudy';

test('main-site scenes appear once in Riff, with five Standard and six Pro entries', () => {
  assert.equal(RIFF_CATALOG_PRESETS.length, RIFF_SCENE_CATALOG.length);
  assert.equal(RIFF_CATALOG_PRESETS.filter((scene) => !scene.pro).length, 5);
  assert.equal(RIFF_CATALOG_PRESETS.filter((scene) => scene.pro).length, 6);
  assert.equal(new Set(RIFF_CYCLE_PRESETS.map((scene) => scene.id)).size, RIFF_CYCLE_PRESETS.length);
  for (const scene of RIFF_SCENE_CATALOG) {
    const preset = RIFF_CATALOG_PRESETS.find((entry) => entry.id === `catalog-${scene.id}`)!;
    assert.ok(RIFF_CYCLE_PRESETS.includes(preset));
    assert.equal(preset.pro, scene.tier === 'pro');
    assert.equal(preset.catalogTier, scene.tier);
    assert.equal(preset.collection, undefined);
    assert.equal(preset.name, scene.name);
    assert.equal(preset.description, scene.description);
  }
});

for (const scene of RIFF_SCENE_CATALOG) {
  test(`${scene.name}: library version preserves the original rhythm, sound, and sequence`, () => {
    const original = JSON.parse(readFileSync(new URL(`../public${scene.downloadUrl}`, import.meta.url), 'utf8')).study;
    const preset = RIFF_CATALOG_PRESETS.find((entry) => entry.id === `catalog-${scene.id}`)!;
    const study = preset.study;
    assert.equal(study.playing, false);
    for (const key of ['numerator', 'denominator', 'subdivision', 'bpm']) assert.equal(study.reference[key], original.reference[key]);
    for (const key of ['stepCount', 'pitchHz', 'gain', 'resetMode', 'resetBars', 'rotationOffset']) assert.equal(study.riff[key], original.riff[key]);
    assert.deepEqual(study.riff.activeSteps, original.riff.activeSteps);
    assert.deepEqual(study.riff.accents, original.riff.accents);
    for (const [key, value] of Object.entries(original.soundSettings)) assert.equal(study.soundSettings[key], value);
    assert.equal(study.riffSequenceEnabled, original.riffSequenceEnabled);
    if (original.riffSequenceEnabled) {
      assert.deepEqual(study.riffSequence, original.riffSequence);
      original.riffCells.forEach((cell, index) => {
        assert.deepEqual(study.riffCells[index].activeSteps, cell.activeSteps);
        assert.deepEqual(study.riffCells[index].accents, cell.accents);
        assert.equal(study.riffCells[index].stepCount, cell.stepCount);
      });
    }
    const copy = cloneRiffCycleStudy(study);
    copy.riff.activeSteps[0] = !copy.riff.activeSteps[0];
    assert.deepEqual(study.riff.activeSteps, original.riff.activeSteps);
  });
}
