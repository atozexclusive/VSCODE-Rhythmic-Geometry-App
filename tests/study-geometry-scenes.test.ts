import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGeometryStudy, countActiveSteps } from '../src/lib/polyrhythmStudy';
test('geometry studies remain symmetric, editable, and musical across their design families', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const study = createGeometryStudy();
    seen.add(study.name);
    assert.ok(study.bpm >= 54 && study.bpm <= 82);
    assert.ok(study.layers.length >= 3 && study.layers.length <= 4);
    for (const layer of study.layers) {
      const indices = layer.activeSteps.flatMap((hit, index) => hit ? [index] : []);
      const gaps = indices.map((step, index) => (indices[(index + 1) % indices.length] - step + layer.beatCount) % layer.beatCount);
      assert.ok(gaps.every(gap => gap === layer.beatCount / countActiveSteps(layer)));
      assert.equal(layer.noteSequence?.length, indices.length);
      assert.ok(layer.soundEnabled && layer.label && layer.gain <= 0.085);
    }
  }
  assert.equal(seen.size, 5);
});
