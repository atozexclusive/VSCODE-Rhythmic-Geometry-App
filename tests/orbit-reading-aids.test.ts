import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossedOrbitHome, getOrbitHomeCycleBeats } from '../src/lib/orbitReadingAids.ts';

test('home means every orbit has completed whole turns, including opposite directions', () => {
  const cycle = getOrbitHomeCycleBeats([3, 4, 5, 7], 'beats-per-turn');
  assert.equal(cycle, 420);
  assert.equal(crossedOrbitHome(6.99, 7.01, cycle), false);
  assert.equal(crossedOrbitHome(419.98, 420.02, cycle), true);
  assert.equal(crossedOrbitHome(420.02, 420.05, cycle), false);
  assert.equal(getOrbitHomeCycleBeats([4, 6, 4], 'beats-per-turn'), 12);
  assert.equal(getOrbitHomeCycleBeats([3], 'beats-per-turn'), 3);
});

test('Sweep and turns-per-cycle use their displayed rotation speeds', () => {
  assert.equal(getOrbitHomeCycleBeats([3, 7], 'sweep'), 4.8);
  assert.equal(getOrbitHomeCycleBeats([4, 6], 'sweep'), 2.4);
  assert.equal(getOrbitHomeCycleBeats([4, 6], 'turns-per-cycle', 6), 3);
  assert.equal(crossedOrbitHome(2.39, 2.41, 2.4), true);
});

test('startup, pauses, rewinds, and missing counts cannot fire a return', () => {
  assert.equal(crossedOrbitHome(0, 0.02, 3), false);
  assert.equal(crossedOrbitHome(3, 3, 3), false);
  assert.equal(crossedOrbitHome(12, 0, 3), false);
  assert.equal(crossedOrbitHome(3, 7, null), false);
  assert.equal(crossedOrbitHome(2.9, 9.1, 3), true);
  assert.equal(getOrbitHomeCycleBeats([], 'beats-per-turn'), null);
  assert.equal(getOrbitHomeCycleBeats([0, 3], 'beats-per-turn'), null);
});

test('canvas numbers reverse placement by speed without modifying editing counts', async () => {
  const { getOrbitCanvasNumbers } = await import('../src/lib/orbitReadingAids.ts');
  const counts = [7, 3, 5];
  assert.deepEqual(getOrbitCanvasNumbers(counts, 'beats-per-turn'), [3, 7, 5]);
  assert.deepEqual(counts, [7, 3, 5]);
  assert.deepEqual(getOrbitCanvasNumbers([3, 5], 'beats-per-turn'), [5, 3]);
  assert.deepEqual(getOrbitCanvasNumbers([3, 5, 7], 'beats-per-turn'), [7, 5, 3]);
  assert.deepEqual(getOrbitCanvasNumbers([3, 5, 7], 'sweep'), [3, 5, 7]);
  assert.deepEqual(getOrbitCanvasNumbers([3, 5, 7], 'turns-per-cycle'), [3, 5, 7]);
  assert.deepEqual(getOrbitCanvasNumbers([4], 'beats-per-turn'), [4]);
  assert.deepEqual(getOrbitCanvasNumbers([], 'beats-per-turn'), []);
});

test('Numbers info explains exact full turns until the shared return', async () => {
  const { getOrbitTurnExplanation } = await import('../src/lib/orbitReadingAids.ts');
  assert.deepEqual(getOrbitTurnExplanation([3, 5, 7], 'beats-per-turn'), { sharedBeats: '105', turns: ['35', '21', '15'] });
  assert.deepEqual(getOrbitTurnExplanation([3, 5], 'beats-per-turn'), { sharedBeats: '15', turns: ['5', '3'] });
  assert.deepEqual(getOrbitTurnExplanation([4, 6], 'beats-per-turn'), { sharedBeats: '12', turns: ['3', '2'] });
  assert.deepEqual(getOrbitTurnExplanation([4, 6], 'sweep'), { sharedBeats: null, turns: ['2', '3'] });
  assert.equal(getOrbitTurnExplanation([], 'beats-per-turn'), null);
  assert.equal(getOrbitTurnExplanation([0, 5], 'beats-per-turn'), null);
  const counts = [997, 991, 983, 977, 971, 967];
  const large = getOrbitTurnExplanation(counts, 'beats-per-turn')!;
  counts.forEach((count, index) => assert.equal(BigInt(large.turns[index]) * BigInt(count), BigInt(large.sharedBeats!)));
});
