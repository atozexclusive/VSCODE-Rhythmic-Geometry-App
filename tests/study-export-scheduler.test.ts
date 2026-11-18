import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudyExportScheduler } from '../src/lib/studyExportScheduler';

test('all ensemble hits survive delayed drawing frames and retain their audio times', () => {
  let time = 10;
  const played: string[] = [];
  const scheduled: number[] = [];
  const events = [
    ...Array.from({ length: 32 }, (_, i) => ({ seconds: i / 16, play: (at: number) => { played.push(`hat-${i}`); scheduled.push(at); } })),
    ...[0.25, 0.75, 1.25, 1.75].map((seconds, i) => ({ seconds, play: (at: number) => { played.push(`snare-${i}`); scheduled.push(at); } })),
    ...[0, 0.5, 1, 1.5].map((seconds, i) => ({ seconds, play: (at: number) => { played.push(`kick-${i}`); scheduled.push(at); } })),
  ];
  const queue = createStudyExportScheduler(events, 10.3, () => time);
  assert.equal(queue.pump(), false);
  assert.equal(played.length, 0, 'leaves the preroll silent');
  // Audio scheduling continues without any canvas frames being drawn.
  for (time = 10.1; time < 12.5; time += 0.025) queue.pump();
  assert.equal(played.length, 40);
  assert.equal(new Set(played).size, 40, 'no lost or doubled hits');
  assert.ok(scheduled.includes(10.55), 'snare keeps its exact beat time');
  assert.equal(queue.pump(), true);
});
