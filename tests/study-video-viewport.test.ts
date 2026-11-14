import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPolyrhythmEnsembleMetrics } from '../src/lib/polyrhythmLayout';
import { createDefaultPolyrhythmStudy } from '../src/lib/polyrhythmStudy';
import { getStudyVideoViewport, getStudyEnsembleExportFrame } from '../src/lib/studyVideoViewport';

test('Study portrait videos use the live mobile visual units at full output resolution', () => {
  const viewport = getStudyVideoViewport({ width: 390, height: 580 }, { width: 1080, height: 1920 });
  assert.equal(viewport.width, 390);
  assert.equal(Math.round(viewport.width * viewport.scale), 1080);
  assert.equal(Math.round(viewport.height * viewport.scale), 1920);
});

test('Study landscape videos preserve aspect and the live short-edge scale', () => {
  for (const live of [{ width: 390, height: 580 }, { width: 1280, height: 800 }]) {
    const viewport = getStudyVideoViewport(live, { width: 1920, height: 1080 });
    assert.equal(viewport.height, Math.min(live.width, live.height));
    assert.ok(Math.abs(viewport.width / viewport.height - 16 / 9) < 1e-12);
    assert.equal(Math.round(viewport.width * viewport.scale), 1920);
    assert.equal(Math.round(viewport.height * viewport.scale), 1080);
  }
});

test('six-way portrait video composition reserves social-overlay room without changing other layouts', () => {
  for (const [width, height] of [[390, 693], [1080, 1920], [720, 1280]]) {
    const frame = getStudyEnsembleExportFrame(width, height, 6);
    assert.ok(frame.x >= width * 0.04);
    assert.ok(frame.y >= height * 0.1);
    assert.ok(frame.x + frame.width <= width * 0.91);
    assert.ok(frame.y + frame.height <= height * 0.85);
    assert.ok(frame.width >= width * 0.8);
    for (const layers of [1, 2, 3, 4, 5]) assert.deepEqual(getStudyEnsembleExportFrame(width, height, layers), { x: 0, y: 0, width, height });
  }
  assert.deepEqual(getStudyEnsembleExportFrame(1920, 1080, 6), { x: 0, y: 0, width: 1920, height: 1080 });
});

test('export panels give the artwork more room without entering the title row', () => {
  const study = createDefaultPolyrhythmStudy();
  for (const [width, height] of [[145, 150], [190, 195], [320, 340]]) {
    const live = getPolyrhythmEnsembleMetrics(study, width, height, true);
    const exported = getPolyrhythmEnsembleMetrics(study, width, height, true, true);
    const radius = Math.max(...study.layers.map(layer => layer.radius)) * exported.scale;
    assert.ok(exported.scale > live.scale);
    assert.ok(exported.centerY - radius >= 42 - 1e-8);
    assert.ok(exported.centerY + radius <= height - 18 + 1e-8);
  }
});
