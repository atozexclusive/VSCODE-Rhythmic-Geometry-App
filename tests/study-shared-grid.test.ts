import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultPolyrhythmStudy, createPolyrhythmLayer, setStudySharedGrid, cloneStudy, getSharedCycleStepCount, getLayerStepPoints, toggleLayerStep } from '../src/lib/polyrhythmStudy';
import { getPolyrhythmCanvasMetrics, findPolyrhythmHit } from '../src/lib/polyrhythmLayout';

function example() {
  return { ...createDefaultPolyrhythmStudy(), sharedGridEnabled: false, ensembleView: false,
    layers: [3, 3, 4].map((count, index) => createPolyrhythmLayer(count, {
      radius: 180 - index * 20, activeSteps: Array(count).fill(true), accents: Array.from({length: count}, (_, i) => i === 1),
    })),
  };
}

test('3, 3 and 4 become three editable 12-step layers with unchanged hits and accents', () => {
  const original = example();
  const shared = setStudySharedGrid(original, true);
  assert.equal(shared.sharedGridEnabled, true);
  assert.deepEqual(shared.layers.map(layer => layer.beatCount), [12, 12, 12]);
  shared.layers.forEach((layer, index) => {
    const old = original.layers[index];
    assert.equal(layer.id, old.id);
    assert.equal(layer.gain, old.gain);
    assert.equal(layer.rotationOffset, old.rotationOffset);
    assert.equal(layer.activeSteps.filter(Boolean).length, old.beatCount);
    old.activeSteps.forEach((active, step) => {
      assert.equal(layer.activeSteps[step * 12 / old.beatCount], active);
      assert.equal(layer.accents[step * 12 / old.beatCount], old.accents[step]);
    });
  });
  assert.deepEqual(setStudySharedGrid(shared, false).layers.map(layer => layer.activeSteps), original.layers.map(layer => layer.activeSteps));
});

test('new subdivisions are real touch targets and survive turning Shared Grid off', () => {
  const shared = setStudySharedGrid(example(), true);
  const layer = shared.layers[0];
  const metrics = getPolyrhythmCanvasMetrics(shared, 390, 650, true);
  const point = getLayerStepPoints(layer, metrics.centerX, metrics.centerY, metrics.scale)[1];
  const hit = findPolyrhythmHit(shared, metrics, point.x, point.y, layer.id);
  assert.equal(hit?.layerId, layer.id);
  assert.equal(hit?.stepIndex, 1);
  shared.layers[0] = toggleLayerStep(layer, 1);
  const restored = setStudySharedGrid(shared, false);
  assert.equal(restored.layers[0].activeSteps[1], true);
  assert.equal(restored.layers[0].beatCount, 12);
  assert.deepEqual(restored.layers.slice(1).map(layer => layer.beatCount), [3, 4]);
});

test('shared grid supports larger LCMs, restores after cloning, and rejects explosive grids', () => {
  const original = example();
  original.layers = [3, 5, 7].map(count => createPolyrhythmLayer(count));
  const shared = setStudySharedGrid(original, true);
  assert.equal(getSharedCycleStepCount(shared.layers), 105);
  assert.ok(shared.layers.every(layer => layer.beatCount === 105));
  assert.deepEqual(setStudySharedGrid(cloneStudy(shared), false).layers.map(layer => layer.beatCount), [3, 5, 7]);
  original.layers = [61, 59].map(count => createPolyrhythmLayer(count));
  assert.throws(() => setStudySharedGrid(original, true), RangeError);
});
