import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGeometryModeOrbits } from '../src/lib/geometry.ts';

const orbits = ['a','b','c','d','e'].map(id => ({id, color:id}));
test('Standard quick menu keeps every orbit', () => {
  assert.deepEqual(getGeometryModeOrbits(orbits,'standard-trace').map(o=>o.id), ['a','b','c','d','e']);
});
for (const mode of ['interference-trace','sweep'] as const) {
  test(`${mode} exposes only active source orbits and grows as sources are added`, () => {
    const pair = {sourceOrbitAId:'d',sourceOrbitBId:'b'};
    assert.deepEqual(getGeometryModeOrbits(orbits,mode,pair).map(o=>o.id),['d','b']);
    assert.deepEqual(getGeometryModeOrbits(orbits,mode,{...pair,sourceOrbitCId:'a'}).map(o=>o.id),['d','b','a']);
    assert.deepEqual(getGeometryModeOrbits(orbits,mode,{...pair,sourceOrbitCId:'a',sourceOrbitDId:'e'}).map(o=>o.id),['d','b','a','e']);
    assert.deepEqual(orbits.map(o=>o.id), ['a','b','c','d','e']);
  });
  test(`${mode} normalizes stale or duplicate source IDs without exposing hidden orbits`, () => {
    assert.deepEqual(getGeometryModeOrbits(orbits,mode,{sourceOrbitAId:'missing',sourceOrbitBId:'missing',sourceOrbitCId:'a',sourceOrbitDId:'e'}).map(o=>o.id),['a','b']);
    assert.deepEqual(getGeometryModeOrbits([],mode),[]);
  });
}
