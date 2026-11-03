import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceRiffPlaybackClock } from '../src/lib/riffPlaybackClock';

const makeClock = () => ({ referenceProgress: 0, lastTimestamp: 1000 as number | null, previousReferenceStep: 0, wasPlaying: false });

test('Play starts at the existing position without consuming paused time', () => {
  const clock = makeClock();
  assert.equal(advanceRiffPlaybackClock(clock, 1250, 10, true), true);
  assert.equal(clock.referenceProgress, 0);
  assert.equal(clock.previousReferenceStep, -1);
  // The renderer anchors the first interval after first-use audio/drawing work.
  clock.lastTimestamp = 1450;
  assert.equal(advanceRiffPlaybackClock(clock, 1470, 10, true), false);
  assert.equal(clock.referenceProgress, 0.2);
  advanceRiffPlaybackClock(clock, 1490, 10, true);
  assert.equal(clock.referenceProgress, 0.4);
});

test('Restart with no timestamp holds step one; resume preserves the paused position', () => {
  const clock = makeClock();
  clock.wasPlaying = true;
  clock.lastTimestamp = null;
  assert.equal(advanceRiffPlaybackClock(clock, 2000, 10, true), true);
  assert.equal(clock.referenceProgress, 0);
  advanceRiffPlaybackClock(clock, 2020, 10, true);
  advanceRiffPlaybackClock(clock, 2500, 10, false);
  assert.equal(clock.referenceProgress, 0.2);
  assert.equal(advanceRiffPlaybackClock(clock, 3000, 10, true), true);
  assert.equal(clock.referenceProgress, 0.2);
});

test('Normal step and loop boundaries advance evenly without resetting the clock', () => {
  const clock = { ...makeClock(), referenceProgress: 95.9, wasPlaying: true };
  assert.equal(advanceRiffPlaybackClock(clock, 1020, 10, true), false);
  assert.ok(Math.abs(clock.referenceProgress - 96.1) < 1e-9);
  advanceRiffPlaybackClock(clock, 1010, 10, true);
  assert.ok(Math.abs(clock.referenceProgress - 96.1) < 1e-9);
});
