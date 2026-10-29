import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudioPeakGuardCurve } from '../src/lib/audioPeakGuard';
test('export peak guard leaves normal samples unchanged and bounds extreme coincident hits',()=>{
  const curve=createAudioPeakGuardCurve();
  for(let i=0;i<curve.length;i++) {
    const input=i/(curve.length-1)*2-1;
    assert.ok(Math.abs(curve[i])<0.9,'retains headroom for encoded audio');
    if(Math.abs(input)<=0.75) assert.ok(Math.abs(curve[i]-input)<1e-7,'no timbre change below the soft knee');
    if(i>0) assert.ok(curve[i]>=curve[i-1],'no discontinuity or foldback at the ceiling');
    assert.ok(Math.abs(curve[i]+curve[curve.length-1-i])<1e-7,'no DC offset');
  }
});
