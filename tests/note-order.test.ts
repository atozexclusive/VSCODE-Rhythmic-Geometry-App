import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_ORDER_OPTIONS, getNoteOrderOffset } from '../src/lib/noteOrder';
import { getStudyPitch } from '../src/lib/studyPitch';
import { createPolyrhythmSoundSettings, cloneStudy, POLYRHYTHM_PRESETS } from '../src/lib/polyrhythmStudy';
import { buildPolyrhythmMidiFile } from '../src/lib/polyrhythmMidi';
import { voiceToFrequency, DEFAULT_HARMONY_SETTINGS } from '../src/lib/audioEngine';
const midi = (hz: number) => Math.round(69+12*Math.log2(hz/440));
const pitches = (order: Parameters<typeof getNoteOrderOffset>[0], length=5) => Array.from({length},(_,hit)=>midi(getStudyPitch(220,createPolyrhythmSoundSettings({noteOrder:order,pitchMode:'keyed'}),0,hit)));

test('Standard is the default and preserves existing Study and Orbit pitch behavior', () => {
  assert.equal(NOTE_ORDER_OPTIONS[0][0],'standard');
  assert.equal(createPolyrhythmSoundSettings().noteOrder,'standard');
  for(const pitchMode of ['free','keyed'] as const) {
    const sound=createPolyrhythmSoundSettings({pitchMode,octaveShift:1});
    const original={...sound,noteOrder:undefined};
    for(const hit of [0,1,5,27]) assert.equal(getStudyPitch(220,sound,2,hit),getStudyPitch(220,original,2,hit));
  }
  assert.equal(getStudyPitch(220,createPolyrhythmSoundSettings({pitchMode:'free'}),0),220);
  assert.deepEqual(pitches('standard'),[43,43,43,43,43]);
  const voice={orbitIndex:0,pulseCount:3,radius:90,color:'#00FFAA'};
  assert.equal(voiceToFrequency(voice,DEFAULT_HARMONY_SETTINGS),voiceToFrequency({...voice,hitIndex:97},{...DEFAULT_HARMONY_SETTINGS,noteMotion:'fixed'}));
});

test('Study offers Riff-style note walks with deterministic Random and restarting at the first hit', () => {
  assert.deepEqual(pitches('ascending'),[43,45,47,50,52]);
  assert.deepEqual(pitches('descending'),[52,50,47,45,43]);
  assert.deepEqual(pitches('up-down',9),[43,45,47,50,52,50,47,45,43]);
  assert.deepEqual(pitches('arpeggio'),[43,47,52,47,43]);
  assert.ok(new Set(pitches('random',20)).size>2);
  assert.deepEqual(pitches('random',20),pitches('random',20));
  const restored=createPolyrhythmSoundSettings(JSON.parse(JSON.stringify(createPolyrhythmSoundSettings({noteOrder:'descending'}))));
  assert.equal(restored.noteOrder,'descending');
  assert.equal(getStudyPitch(220,restored,0,0),getStudyPitch(220,restored,0,5));
});

test('Orbit Random follows the same repeatable pitch path for live notes and MIDI callers', () => {
  const harmony={...DEFAULT_HARMONY_SETTINGS,noteMotion:'random' as const,tonePreset:'scale-quantized' as const,mappingMode:'orbit-index' as const};
  const voice={orbitIndex:0,pulseCount:3,radius:90,color:'#00FFAA'};
  const first=Array.from({length:16},(_,hitIndex)=>voiceToFrequency({...voice,hitIndex},harmony));
  const restored=JSON.parse(JSON.stringify(harmony));
  assert.deepEqual(first,Array.from({length:16},(_,hitIndex)=>voiceToFrequency({...voice,hitIndex},restored)));
  assert.ok(new Set(first).size>2);
});

function notes(data: Uint8Array) {
  const out:number[]=[];
  let track=14;
  while(track<data.length) {
    const size=new DataView(data.buffer,data.byteOffset+track+4,4).getUint32(0);let i=track+8;const end=i+size;
    const variable=()=>{let v=0,b;do{b=data[i++];v=(v<<7)|(b&127);}while(b&128);return v;};
    while(i<end) {
      variable();const status=data[i++];
      if(status===255){i++;const n=variable();i+=n;} else {const note=data[i++],velocity=data[i++];if((status&240)===144&&velocity>0)out.push(note);}
    }
    track=end;
  }
  return out;
}

test('Study MIDI note order follows audible hits through rests and rotated steps', () => {
  const study=cloneStudy(POLYRHYTHM_PRESETS.find(p=>p.id==='three-five')!.study);
  study.layers=[{...study.layers[0],beatCount:5,activeSteps:[true,false,true,true,false],accents:[false,false,false,false,false],rotationOffset:144}];
  study.soundSettings=createPolyrhythmSoundSettings({noteOrder:'ascending',pitchMode:'keyed'});
  assert.deepEqual(notes(buildPolyrhythmMidiFile(study,'merged')),[43,45,47]);
  study.soundSettings.noteOrder='standard';
  const explicit=buildPolyrhythmMidiFile(study,'merged');
  delete study.soundSettings.noteOrder;
  assert.deepEqual(buildPolyrhythmMidiFile(study,'merged'),explicit,'Standard preserves existing MIDI output');
});
