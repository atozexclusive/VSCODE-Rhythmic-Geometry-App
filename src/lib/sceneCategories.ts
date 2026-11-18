import type { PolyrhythmStudyPreset } from './polyrhythmStudy';
import type { RiffCyclePreset } from './riffCycleStudy';

export function getStudySceneCategory(preset: PolyrhythmStudyPreset): 'grooves' | 'exercises' | 'experiments' {
  if (preset.group === 'grooves') return 'grooves';
  return preset.group === 'advanced' ? 'experiments' : 'exercises';
}

export function getRiffSceneCategory(preset: RiffCyclePreset): 'songs' | 'exercises' | 'experiments' {
  if (preset.catalogTier || preset.id === 'rational-gaze') return 'songs';
  return preset.collection === 'polyrhythm-breakdowns' || preset.id === 'default-riff'
    ? 'exercises' : 'experiments';
}
