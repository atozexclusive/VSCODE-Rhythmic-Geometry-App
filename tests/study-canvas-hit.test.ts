import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultPolyrhythmStudy, createPolyrhythmLayer, getLayerStepPoints } from '../src/lib/polyrhythmStudy.ts';
import { findPolyrhythmHit, getPolyrhythmCanvasMetrics } from '../src/lib/polyrhythmLayout.ts';

for (const mobile of [true, false]) {
  test(`Study nodes take priority over layer menus, including silent nodes with overlays off (${mobile ? 'touch' : 'desktop'})`, () => {
    const study = createDefaultPolyrhythmStudy();
    study.layers = [createPolyrhythmLayer(3, { activeSteps: [true, false, true] })];
    study.showInactiveSteps = false;
    study.showStepLabels = false;
    const metrics = getPolyrhythmCanvasMetrics(study, 403, 580, mobile);
    for (const point of getLayerStepPoints(study.layers[0], metrics.centerX, metrics.centerY, metrics.scale)) {
      for (const offset of [0, mobile ? 20 : 12]) {
        const hit = findPolyrhythmHit(study, metrics, point.x - offset, point.y, study.layers[0].id);
        assert.equal(hit?.stepIndex, point.index);
      }
    }
    assert.equal(findPolyrhythmHit(study, metrics, metrics.centerX - study.layers[0].radius * metrics.scale, metrics.centerY)?.stepIndex, null);
    assert.equal(findPolyrhythmHit(study, metrics, 2, 2), null);
  });
}
