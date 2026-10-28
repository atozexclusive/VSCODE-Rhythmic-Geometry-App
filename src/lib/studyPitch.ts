import { NOTE_NAMES, SCALE_PRESETS } from './audioEngine';
import { getNoteOrderOffset } from './noteOrder';
import type { PolyrhythmSoundSettings } from './polyrhythmStudy';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function getStudyPitch(baseFrequency: number, sound: PolyrhythmSoundSettings, layerIndex: number, hitIndex = 0): number {
  const octaveMultiplier = 2 ** sound.octaveShift;
  const standard = !sound.noteOrder || sound.noteOrder === 'standard';
  if (sound.pitchMode === 'free' && standard) {
    return clamp(baseFrequency * (sound.register === 'wide' ? 1.2 : 1) * octaveMultiplier, 45, 2800);
  }
  const scale = SCALE_PRESETS[sound.scaleName];
  const rootSemitone = NOTE_NAMES.indexOf(sound.rootNote);
  const baseMidi = sound.register === 'wide' ? 50 : 43;
  const degreeSource = layerIndex * 2 + getNoteOrderOffset(sound.noteOrder ?? 'standard', hitIndex, scale.intervals.length);
  const degree = degreeSource % scale.intervals.length;
  const octave = Math.floor(degreeSource / scale.intervals.length);
  const midi = clamp(baseMidi + rootSemitone + scale.intervals[degree] + octave * 12 + sound.octaveShift * 12, 20, 104);
  return 440 * 2 ** ((midi - 69) / 12);
}
