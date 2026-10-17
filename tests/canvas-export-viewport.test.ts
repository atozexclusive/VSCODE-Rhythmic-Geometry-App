import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCanvasExportViewport } from '../src/lib/canvasExportViewport';

test('phone video exports preserve live star and stroke size at every output resolution', () => {
  for (const resolution of [1, 2, 4]) {
    const live = { width: 390, height: 700 };
    const output = { width: 1080 * resolution, height: 1920 * resolution };
    const view = getCanvasExportViewport(live, output);
    assert.equal(view.width, live.width);
    assert.equal(Math.round(view.width * view.scale), output.width);
    assert.equal(Math.round(view.height * view.scale), output.height);
    // A one-unit star keeps the same apparent size when the export is viewed at live width.
    assert.ok(Math.abs(view.scale * live.width / output.width - 1) < 1e-10);
  }
});

test('landscape, square, and portrait exports use uniform scaling without changing aspect', () => {
  for (const live of [{ width: 1440, height: 900 }, { width: 390, height: 700 }]) {
    for (const output of [{ width: 1920, height: 1080 }, { width: 1080, height: 1080 }, { width: 1080, height: 1920 }]) {
      const view = getCanvasExportViewport(live, output);
      assert.equal(Math.min(view.width, view.height), Math.min(live.width, live.height));
      assert.ok(Math.abs(view.width / view.height - output.width / output.height) < 1e-10);
      assert.equal(Math.round(view.width * view.scale), output.width);
      assert.equal(Math.round(view.height * view.scale), output.height);
    }
  }
});

test('a canvas without a measured live size still produces a valid export', () => {
  assert.deepEqual(getCanvasExportViewport({ width: 0, height: 0 }, { width: 1080, height: 1920 }), { width: 1080, height: 1920, scale: 1 });
});
