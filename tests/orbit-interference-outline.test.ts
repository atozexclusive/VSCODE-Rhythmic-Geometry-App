import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleInterferenceOutline, INTERFERENCE_TRACE_WEIGHTS } from '../src/lib/orbitInterferenceOutline';
import { createOrbit, resonancePositionAtBeats } from '../src/lib/orbitalEngine';

for (const counts of [[3, 5], [3, 4, 6], [3, 5, 7, 11]]) {
  test(`finished interference outline matches the live trace and closes: ${counts}`, () => {
    const orbits = counts.map((count, i) => createOrbit({pulseCount: count, color: '#77ddcc', radius: 100 + 20 * i, direction: i % 2 ? -1 : 1}));
    const points = sampleInterferenceOutline(orbits);
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    const period = counts.reduce((a, b) => a / gcd(a, b) * b, 1);
    for (const index of [0, 1, Math.floor(points.length / 3), points.length - 1]) {
      const beat = period * index / (points.length - 1);
      const expected = orbits.reduce((sum, orbit, i) => {
        const point = resonancePositionAtBeats(orbit, beat, 0, 0);
        return { x: sum.x + point.x * INTERFERENCE_TRACE_WEIGHTS[i], y: sum.y + point.y * INTERFERENCE_TRACE_WEIGHTS[i] };
      }, {x: 0, y: 0});
      assert.ok(Math.hypot(points[index].x - expected.x, points[index].y - expected.y) < 1e-7);
    }
    assert.ok(Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y) < 1e-7);
    assert.ok(points.length <= 24001);
  });
}

test('outline sampling stays bounded for high prime ratios and requires two sources', () => {
  const orbits = [991, 983, 977, 971].map(pulseCount => createOrbit({pulseCount, radius: 100, direction: 1, color: '#77ddcc'}));
  const points = sampleInterferenceOutline(orbits);
  assert.equal(points.length, 24001);
  assert.ok(points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.deepEqual(sampleInterferenceOutline(orbits.slice(0, 1)), []);
});
