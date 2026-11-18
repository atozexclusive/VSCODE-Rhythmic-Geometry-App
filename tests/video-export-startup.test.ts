import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareCanvasRecordingFrames } from '../src/lib/videoExport.ts';

test('export preparation waits for painted frames before starting recording clocks', async () => {
  const previous = globalThis.requestAnimationFrame;
  let timestamp = 1000;
  let frames = 0;
  globalThis.requestAnimationFrame = (callback) => {
    frames++;
    timestamp += 16;
    queueMicrotask(() => callback(timestamp));
    return frames;
  };
  try {
    await prepareCanvasRecordingFrames();
    assert.ok(frames >= 17, 'a single resize frame is not sufficient preparation');
    assert.ok(timestamp < 1400, 'preparation should finish promptly at 60fps');
  } finally {
    globalThis.requestAnimationFrame = previous;
  }
});
