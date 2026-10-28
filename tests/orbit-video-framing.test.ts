import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOrbitVideoFraming } from '../src/lib/orbitVideoFraming';
import { DEFAULT_ORBITS } from '../src/lib/orbitalEngine';

test('two-orbit exports fill the same frame budget as the default four orbits', () => {
  for (const [width, height] of [[1080, 1920], [1920, 1080]]) {
    const twoRadius = Math.max(...DEFAULT_ORBITS.slice(0, 2).map(orbit => orbit.radius));
    const fourRadius = Math.max(...DEFAULT_ORBITS.map(orbit => orbit.radius));
    const two = getOrbitVideoFraming(width, height, twoRadius);
    const four = getOrbitVideoFraming(width, height, fourRadius);
    assert.ok(two.orbitScale > 1.6, 'small patterns must be allowed past the old zoom cap');
    assert.equal(two.targetRadius, four.targetRadius);
    for (const layout of [two, four]) {
      assert.ok(Math.abs(layout.effectiveVisualRadius * layout.orbitScale - layout.targetRadius) < 1e-9);
    }
    assert.ok(twoRadius * two.orbitScale > Math.min(width, height) * 0.4);
  }
});

test('large and interference patterns shrink to fit with their full radius budget', () => {
  for (const radius of [90, 270, 420, 1200]) {
    const layout = getOrbitVideoFraming(1080, 1920, radius);
    assert.ok(Number.isFinite(layout.orbitScale) && layout.orbitScale > 0);
    assert.ok(radius * layout.orbitScale < 540 - 44, 'preserve room outside the artwork');
  }
});
