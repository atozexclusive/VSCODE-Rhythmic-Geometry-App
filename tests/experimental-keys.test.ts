import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderStudyInstrument, getStudyInstrumentSample } from '../src/lib/studyInstruments';
import { renderOrbitInstrument, renderOrbitInstrumentLayers, ORBIT_DESIGNED_INSTRUMENTS } from '../src/lib/orbitInstrumentSamples';
import { prepareOrbitInstrument, scheduleDesignedOrbitInstrument, getOrbitInstrumentResources, releaseOrbitInstrumentContext, ORBIT_SAMPLE_CACHE_BYTES, ORBIT_MAX_VOICES } from '../src/lib/orbitInstruments';
import { ORBIT_SOUND_PALETTES, DEFAULT_HARMONY_SETTINGS, createOrbitExportAudioStream, stopAllAudio } from '../src/lib/audioEngine';
import { createOrbit, DEFAULT_ORBITS } from '../src/lib/orbitalEngine';
import { createPolyrhythmSoundSettings, cloneStudy, POLYRHYTHM_PRESETS } from '../src/lib/polyrhythmStudy';
import { preparePolyrhythmAudioRecording, triggerPolyrhythmPulse, silencePolyrhythmAudio } from '../src/lib/polyrhythmAudio';

class Param {
  value = 1;
  setValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
  cancelAndHoldAtTime() {}
}
class Node {
  connections: Node[] = []; gain = new Param(); frequency = new Param(); detune = new Param(); Q = new Param(); playbackRate = new Param();
  threshold = new Param(); knee = new Param(); ratio = new Param(); attack = new Param(); release = new Param();
  buffer: any; type = ''; startedAt = -1; stoppedAt = -1; onended?: () => void;
  connect(node: Node) { this.connections.push(node); } disconnect() {}
  start(at: number) { this.startedAt = at; } stop(at: number) { this.stoppedAt = at; }
  addEventListener(_event: string, listener: () => void) { this.onended = listener; }
}
class Context {
  static latest: Context;
  sampleRate = 48000; currentTime = 2; state = 'running'; allocations = 0; destination = new Node();
  sources: Node[] = []; oscillators: Node[] = []; convolvers: Node[] = [];
  constructor() { Context.latest = this; }
  createBuffer(channels: number, length: number, sampleRate: number) {
    this.allocations++;
    const pcm = Array.from({length: channels}, () => new Float32Array(length));
    return {length, sampleRate, numberOfChannels: channels, getChannelData: (c: number) => pcm[c]};
  }
  createWaveShaper() { return new Node(); }
  createGain() { return new Node(); } createBiquadFilter() { return new Node(); } createDynamicsCompressor() { return new Node(); }
  createChannelSplitter() { return new Node(); } createChannelMerger() { return new Node(); }
  createConvolver() { const n = new Node(); this.convolvers.push(n); return n; }
  createBufferSource() { const n = new Node(); this.sources.push(n); return n; }
  createOscillator() { const n = new Node(); this.oscillators.push(n); return n; }
  createMediaStreamDestination() { return Object.assign(new Node(), {stream: {}}); }
  close() { this.state = 'closed'; return Promise.resolve(); } resume() { return Promise.resolve(); }
}

test('selected experimental instruments preserve the original Orbit menu and Study default', () => {
  assert.deepEqual(ORBIT_DESIGNED_INSTRUMENTS, [['orbit-keys','Nebula Keys'],['dusk-synth','Dusk Synth']]);
  assert.deepEqual(ORBIT_SOUND_PALETTES.slice(0,7).map(p => p[0]), ['standard','soft-pad','warm-pad','bell','pluck','organ','bass']);
  assert.equal(createPolyrhythmSoundSettings({palette:'chorus-keys'}).palette, 'chorus-keys');
  assert.equal(createPolyrhythmSoundSettings().palette, 'study-pulse');
});

test('restored keys retain stereo character, smooth boundaries, and unclipped samples', () => {
  for (const frequency of [110,220,880]) {
    for (const channels of [renderStudyInstrument('chorus-keys',frequency,16000), renderOrbitInstrument('orbit-keys',frequency,16000)]) {
      let difference = 0, energy = 0;
      for (let i=0;i<channels[0].length;i++) {
        const [l,r] = [channels[0][i], channels[1][i]];
        assert.ok(Number.isFinite(l) && Number.isFinite(r) && Math.abs(l)<1 && Math.abs(r)<1);
        energy += l*l; difference += (l-r)**2;
      }
      assert.ok(energy>1 && difference>0.001);
      channels.forEach(c => { assert.equal(c[0],0); assert.equal(c.at(-1),0); assert.ok(Math.abs(c[1])<0.001); });
    }
  }
  const layers = renderOrbitInstrumentLayers('orbit-keys',440,16000);
  const full = renderOrbitInstrument('orbit-keys',440,16000);
  for(let c=0;c<2;c++) for(let i=0;i<full[c].length;i++) assert.ok(Math.abs(full[c][i]-layers[c][i]-layers[c+2][i])<1e-7);
});

test('Nebula playback keeps bounded sample memory and voice count while exports preserve future notes', () => {
  const mock = new Context(), ctx = mock as unknown as AudioContext;
  const destination = new Node() as unknown as AudioNode;
  try {
    const first = prepareOrbitInstrument(ctx,'orbit-keys',440,1);
    const before = mock.allocations;
    for(let i=0;i<30;i++) scheduleDesignedOrbitInstrument(ctx,destination,'orbit-keys',440,0.12,2.02,1,i,true);
    assert.equal(mock.allocations,before);
    assert.equal(mock.oscillators.length,0,'prepared first impact uses the full sample');
    assert.equal(mock.sources[0].buffer,first.buffer);
    assert.ok(getOrbitInstrumentResources(ctx).activeVoices<=ORBIT_MAX_VOICES);
    const start = mock.sources.length;
    for(let i=0;i<30;i++) scheduleDesignedOrbitInstrument(ctx,destination,'orbit-keys',440,0.12,5+i*0.2,1,i,false);
    assert.ok(mock.sources.slice(start).every(n=>n.stoppedAt===-1),'future export notes must not be voice-stolen');
    for(let i=0;i<25;i++) prepareOrbitInstrument(ctx,'orbit-keys',55*2**(i/4),1);
    assert.ok(getOrbitInstrumentResources(ctx).cacheBytes<=ORBIT_SAMPLE_CACHE_BYTES);
  } finally { releaseOrbitInstrumentContext(ctx); }
});

test('Chorus Keys export preparation is silent and its first impacts reuse prepared samples', async () => {
  const previousWindow = globalThis.window;
  Object.assign(globalThis,{window:{AudioContext:Context}});
  try {
    const study = cloneStudy(POLYRHYTHM_PRESETS.find(p=>p.id==='three-five')!.study);
    study.soundSettings = createPolyrhythmSoundSettings({palette:'chorus-keys', pitchMode:'free', reverbAmount:0.5});
    study.layers[0].accents[0]=true;
    await preparePolyrhythmAudioRecording(study);
    const ctx = Context.latest;
    assert.equal(ctx.sources.length,0);
    const allocations = ctx.allocations;
    study.layers.forEach((layer,layerIndex)=>triggerPolyrhythmPulse({frequency:layer.pitchHz,gain:layer.gain,accented:layerIndex===0,sound:study.soundSettings,layerIndex,beatCount:layer.beatCount,atTime:3}));
    assert.equal(ctx.allocations,allocations+1,'only the shared reverb impulse can be new');
    assert.ok(ctx.sources.every(s=>s.startedAt===3));
    assert.equal(ctx.convolvers.length,1);
    const first = getStudyInstrumentSample(ctx as unknown as AudioContext,'chorus-keys',188,false);
    const second = getStudyInstrumentSample(ctx as unknown as AudioContext,'chorus-keys',189,false);
    assert.equal(first.buffer,second.buffer);
    assert.ok(Math.abs(second.playbackRate/first.playbackRate-189/188)<1e-12);
    silencePolyrhythmAudio();
    ctx.sources.forEach(s=>s.onended?.());
  } finally { Context.latest.state='closed'; Object.assign(globalThis,{window:previousWindow}); }
});

test('Nebula export uses buffered voices and a controllable dry/wet mix', () => {
  const previous = globalThis.AudioContext;
  Object.assign(globalThis,{AudioContext:Context});
  try {
    createOrbitExportAudioStream({orbits:[createOrbit(DEFAULT_ORBITS[0])],playing:false,speedMultiplier:1,baseBPM:120,elapsedBeats:0,lastTimestamp:-1}, {...DEFAULT_HARMONY_SETTINGS,soundPalette:'orbit-keys',reverbAmount:0},0.5);
    assert.equal(Context.latest.sources.length,2);
    assert.equal(Context.latest.sources[0].buffer.numberOfChannels,4);
    assert.equal(Context.latest.oscillators.length,0);
    assert.equal(Context.latest.convolvers.length,0,'preset ambience uses its own slider-controlled stem');
  } finally { stopAllAudio(); Object.assign(globalThis,{AudioContext:previous}); }
});

test('Velvet Keys and Dusk Synth are distinct, bounded stereo voices with shorter tails', () => {
  assert.equal(createPolyrhythmSoundSettings({palette:'velvet-keys'}).palette,'velvet-keys');
  for(const frequency of [110,220,880]) {
    for(const [fresh,original] of [
      [renderStudyInstrument('velvet-keys',frequency,16000),renderStudyInstrument('chorus-keys',frequency,16000)],
      [renderOrbitInstrument('dusk-synth',frequency,16000),renderOrbitInstrument('orbit-keys',frequency,16000)],
    ]) {
      assert.ok(fresh[0].length<original[0].length,'new sounds leave more space between hits');
      let energy=0,width=0;
      for(let i=0;i<fresh[0].length;i++) {
        const l=fresh[0][i],r=fresh[1][i];
        assert.ok(Number.isFinite(l)&&Number.isFinite(r)&&Math.abs(l)<1&&Math.abs(r)<1);
        energy+=l*l; width+=(l-r)**2;
      }
      assert.ok(energy>1&&width>0.001,'audible stereo body');
      fresh.forEach(c=>{assert.equal(c[0],0);assert.equal(c.at(-1),0);assert.ok(Math.abs(c[1])<0.001);});
    }
  }
  for(const speed of [1,4,12]) {
    const layers=renderOrbitInstrumentLayers('dusk-synth',440,16000,speed);
    const full=renderOrbitInstrument('dusk-synth',440,16000,speed);
    for(let c=0;c<2;c++)for(let i=0;i<full[c].length;i++)assert.ok(Math.abs(layers[c][i]+layers[c+2][i]-full[c][i])<1e-7,'the reverb slider can remove exactly the ambience stem');
  }
});

test('Velvet Keys uses its own prepared samples rather than falling back to Chorus Keys', async () => {
  const previousWindow=globalThis.window;
  Object.assign(globalThis,{window:{AudioContext:Context}});
  try {
    const study=cloneStudy(POLYRHYTHM_PRESETS.find(p=>p.id==='three-five')!.study);
    study.soundSettings=createPolyrhythmSoundSettings({palette:'velvet-keys',pitchMode:'free'});
    await preparePolyrhythmAudioRecording(study);
    const ctx=Context.latest, layer=study.layers[0];
    const sample=getStudyInstrumentSample(ctx as unknown as AudioContext,'velvet-keys',layer.pitchHz,false);
    const before=ctx.allocations;
    triggerPolyrhythmPulse({frequency:layer.pitchHz,gain:layer.gain,sound:study.soundSettings,layerIndex:0,beatCount:layer.beatCount,atTime:3});
    assert.equal(ctx.allocations,before,'first impact reuses prepared PCM');
    assert.equal(ctx.sources[0].buffer,sample.buffer);
    assert.equal(ctx.sources[0].startedAt,3);
    assert.equal(ctx.oscillators.length,0);
    ctx.sources.forEach(source=>source.onended?.());
  } finally {Context.latest.state='closed';Object.assign(globalThis,{window:previousWindow});}
});
