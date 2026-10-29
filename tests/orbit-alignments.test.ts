import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOrbitAlignment } from '../src/lib/orbitReadingAids';

test('alignment cues identify just the matching rings and distinguish the complete return', () => {
  const counts=[3,4,5,7];
  assert.deepEqual(getOrbitAlignment(counts,11.9,12.1,'beats-per-turn'),{beat:12,indices:[0,1],full:false});
  assert.deepEqual(getOrbitAlignment(counts,59.9,60.1,'beats-per-turn'),{beat:60,indices:[0,1,2],full:false});
  assert.deepEqual(getOrbitAlignment(counts,419.9,420.1,'beats-per-turn'),{beat:420,indices:[0,1,2,3],full:true});
  assert.equal(getOrbitAlignment(counts,12.1,12.2,'beats-per-turn'),null);
  assert.deepEqual(getOrbitAlignment(counts,0,0.01,'beats-per-turn'),{beat:0,indices:[0,1,2,3],full:true});
  assert.equal(getOrbitAlignment(counts,20,0,'beats-per-turn'),null);
});

test('alignment detection survives skipped frames and uses Sweep’s actual clock', () => {
  assert.deepEqual(getOrbitAlignment([3,4,5],10,21,'beats-per-turn'),{beat:20,indices:[1,2],full:false});
  const cue=getOrbitAlignment([2,4,3],2.39,2.41,'sweep');
  assert.deepEqual(cue,{beat:2.4,indices:[0,1],full:false});
  assert.deepEqual(getOrbitAlignment([2,4,3],4.79,4.81,'sweep'),{beat:4.8,indices:[0,1,2],full:true});
});
