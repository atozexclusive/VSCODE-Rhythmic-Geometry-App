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

/** Authored phrases start on the shared tonic, independent of layer ordering. */
export function getStudySequencePitches(sequence: number[][] | undefined, sound: PolyrhythmSoundSettings, hitIndex = 0): number[] | null {
  if (sound.pitchMode !== 'keyed' || !sequence?.length) return null;
  const degrees = sequence[Math.max(0, Math.floor(hitIndex)) % sequence.length];
  if (!degrees?.length) return null;
  const scale = SCALE_PRESETS[sound.scaleName].intervals;
  const root = NOTE_NAMES.indexOf(sound.rootNote);
  return degrees.slice(0, 4).map((degree, index) => {
    const bounded = clamp(Math.round(Number.isFinite(degree) ? degree : 0), -7, 20);
    const note = ((bounded % scale.length) + scale.length) % scale.length;
    const octave = Math.floor(bounded / scale.length);
    const spread = sound.register === 'wide' && (degrees.length > 1 ? index > 0 : hitIndex % 2 === 1) ? 12 : 0;
    const midi = clamp(48 + root + scale[note] + octave * 12 + sound.octaveShift * 12 + spread, 24, 96);
    return 440 * 2 ** ((midi - 69) / 12);
  });
}
