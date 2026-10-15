import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPolyrhythmLayer, mirrorLayerSteps } from '../src/lib/polyrhythmStudy.ts';

test('Study mirror reverses hits and accents together without changing layer timing or mutating the source', () => {
  const layer = createPolyrhythmLayer(5, { activeSteps: [true, false, true, true, false], accents: [true, false, false, true, false], rotationOffset: 72 });
  const original = structuredClone(layer);
  const mirrored = mirrorLayerSteps(layer);
  assert.deepEqual(mirrored.activeSteps, [false, true, true, false, true]);
  assert.deepEqual(mirrored.accents, [false, true, false, false, true]);
  assert.equal(mirrored.rotationOffset, original.rotationOffset);
  assert.equal(mirrored.gain, original.gain);
  assert.deepEqual(layer, original);
  assert.deepEqual(mirrorLayerSteps(mirrored), original);
});
