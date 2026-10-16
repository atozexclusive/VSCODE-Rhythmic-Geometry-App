import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRandomPolyrhythmStudy, getSharedCycleStepCount } from '../src/lib/polyrhythmStudy.ts';

function withSeed<T>(seed: number, run: () => T): T {
  const original = Math.random;
  let state = seed >>> 0;
  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  try { return run(); } finally { Math.random = original; }
}

for (const intensity of ['random', 'plus'] as const) {
  test(`Study ${intensity} produces broad, playable variety on bounded shared grids`, () => withSeed(47821, () => {
    const families = new Set<string>();
    const patterns = new Set<string>();
    const palettes = new Set<string>();
    const layerCounts = new Set<number>();
    const displays = new Set<string>();
    let rests = 0;
    let accents = 0;
    let shiftedLayers = 0;
    let complete = 0;
    let gridStudies = 0;
    let smallStacks = 0;
    let previousFamily = '';
    for (let index = 0; index < 500; index += 1) {
      const study = createRandomPolyrhythmStudy(intensity);
      const counts = study.layers.map(layer => layer.beatCount);
      const family = [...counts].sort((a,b) => a-b).join(':');
      assert.notEqual(family, previousFamily, 'consecutive draws should not repeat the same count family');
      previousFamily = family;
      families.add(family);
      layerCounts.add(study.layers.length);
      displays.add(study.displayStyle);
      palettes.add(study.soundSettings.palette);
      patterns.add(study.layers.map(layer => layer.activeSteps.map(Number).join('')).join(':'));
      assert.equal(new Set(counts).size, counts.length);
      assert.ok(study.layers.length >= 2 && study.layers.length <= (intensity === 'plus' ? 5 : 3));
      const shared = getSharedCycleStepCount(study.layers);
      assert.ok(shared <= (intensity === 'plus' ? 168 : 96));
      assert.ok(Number.isFinite(study.bpm) && study.bpm >= 58 && study.bpm <= 110);
      assert.equal(study.showStepLabels, false);
      if (study.layers.every(layer => layer.activeSteps.every(Boolean) && layer.rotationOffset === 0)) complete += 1;
      if (study.layers.length <= 3) smallStacks += 1;
      const gridReference = study.layers.find(layer => layer.beatCount === shared && layer.activeSteps.every(Boolean) && layer.gain < 0.06);
      if (gridReference) {
        gridStudies += 1;
        assert.ok(shared <= (intensity === 'plus' ? 36 : 24));
        assert.ok(study.layers.every(layer => layer.rotationOffset === 0 && layer.activeSteps.every(Boolean)));
        assert.ok(study.bpm <= 88);
      }
      for (const [layerIndex, layer] of study.layers.entries()) {
        assert.ok(layer.beatCount >= 2 && layer.beatCount <= (intensity === 'plus' ? 36 : 24));
        if (layer.beatCount > (intensity === 'plus' ? 20 : 12)) assert.equal(layer, gridReference);
        assert.equal(layer.activeSteps.length, layer.beatCount);
        assert.equal(layer.accents.length, layer.beatCount);
        assert.ok(layer.activeSteps.filter(Boolean).length >= 2);
        for (let step = 0; step < layer.beatCount; step += 1) assert.ok(!layer.accents[step] || layer.activeSteps[step]);
        rests += Number(layer.activeSteps.includes(false));
        accents += Number(layer.accents.includes(true));
        shiftedLayers += Number(layer.rotationOffset !== 0);
        const gridPhase = layer.rotationOffset / 360 * shared;
        assert.ok(Math.abs(gridPhase - Math.round(gridPhase)) < 0.000001);
        if (layerIndex === 0) assert.equal(layer.rotationOffset, 0);
      }
    }
    assert.ok(families.size > (intensity === 'plus' ? 80 : 50), `${families.size} count families`);
    assert.ok(patterns.size > 150, `${patterns.size} rhythm patterns`);
    assert.ok(rests > 80);
    assert.ok(accents > 150);
    assert.ok(palettes.size >= (intensity === 'plus' ? 7 : 2));
    assert.equal(layerCounts.size, intensity === 'plus' ? 4 : 2);
    assert.equal(displays.size, intensity === 'plus' ? 2 : 1);
    assert.ok(shiftedLayers > 0 && shiftedLayers < (intensity === 'plus' ? 180 : 60));
    assert.ok(complete > (intensity === 'plus' ? 180 : 240), `${complete} complete polyrhythms`);
    assert.ok(gridStudies > 50, `${gridStudies} shared-cycle reference studies`);
    assert.ok(smallStacks > (intensity === 'plus' ? 320 : 460), `${smallStacks} smaller stacks`);
  }));
}

test('Study random generation terminates even if the random source keeps repeating', () => {
  const original = Math.random;
  Math.random = () => 0.1;
  try {
    for (let i = 0; i < 10; i += 1) assert.ok(createRandomPolyrhythmStudy().layers.length >= 2);
  } finally { Math.random = original; }
});
