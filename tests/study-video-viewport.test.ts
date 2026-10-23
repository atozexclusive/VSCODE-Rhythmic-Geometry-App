import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStudyVideoViewport } from '../src/lib/studyVideoViewport';

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
