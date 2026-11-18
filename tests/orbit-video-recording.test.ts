import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrbitExportClock } from '../src/lib/orbitVideoRecording.ts';

test('motion advances evenly through preroll and an audio-clock stall', () => {
  let now = 5000;
  const elapsed = createOrbitExportClock(1, now, () => now);
  assert.equal(elapsed(), -1);
  now = 6000;
  assert.equal(elapsed(), 0);
  // Audio may report the same sample time for several UI frames. It is not
  // sampled again by this clock, so those frames still advance by 1/60 second.
  let previous = elapsed();
  for (let frame = 1; frame <= 60; frame++) {
    now = 6000 + frame * 1000 / 60;
    const current = elapsed();
    assert.ok(Math.abs(current - previous - 1 / 60) < 1e-10);
    previous = current;
  }
  now = 125000;
  assert.equal(elapsed(), 119, 'a two-minute export does not accumulate frame rounding error');
});
