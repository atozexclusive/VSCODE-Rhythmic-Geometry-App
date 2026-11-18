import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareCanvasRecordingFrames, recordMediaRecorderForDuration } from '../src/lib/videoExport.ts';

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


test('recording duration and playback begin after the encoder emits start', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const previousWindow = globalThis.window;
  Object.assign(globalThis, { window: { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout } });
  let starts = 0;
  const recorder = {
    state: 'inactive', onstart: undefined as (() => void) | undefined,
    onstop: undefined as (() => void) | undefined,
    start() { this.state = 'recording'; },
    stop() { this.state = 'inactive'; this.onstop?.(); },
  };
  try {
    const done = recordMediaRecorderForDuration(recorder as unknown as MediaRecorder, 2, () => { starts++; });
    t.mock.timers.tick(750);
    assert.equal(starts, 0);
    recorder.onstart?.();
    assert.equal(starts, 1);
    t.mock.timers.tick(1999);
    assert.equal(recorder.state, 'recording', 'encoder initialization cannot shorten the clip');
    t.mock.timers.tick(1);
    await done;
    assert.equal(recorder.state, 'inactive');
  } finally { Object.assign(globalThis, { window: previousWindow }); }
});
