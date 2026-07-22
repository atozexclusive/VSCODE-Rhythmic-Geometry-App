export type CatalogSceneMode = 'orbits' | 'study' | 'riff';
export type CatalogSceneTier = 'free' | 'pro';

export interface CatalogScene {
  id: string;
  name: string;
  description: string;
  mode: CatalogSceneMode;
  image: string;
  accent: string;
  tier: CatalogSceneTier;
  downloadUrl: string;
}

export const RIFF_SCENE_CATALOG: CatalogScene[] = [
  {
    id: 'art-of-dying',
    name: 'Art of Dying',
    description: 'A 5-step phrase in 3/4 over a 16th-note grid.',
    mode: 'riff',
    image: '/scene-captures/riff-library/art-of-dying.png',
    accent: '#FFB454',
    tier: 'free',
    downloadUrl: '/scenes/art-of-dying.json',
  },
  {
    id: 'straws-pulled-at-random',
    name: 'Straws Pulled at Random',
    description: 'A 14-step phrase in 4/4 over a 16th-note grid.',
    mode: 'riff',
    image: '/scene-captures/riff-library/straws-pulled-at-random.png',
    accent: '#A992FF',
    tier: 'free',
    downloadUrl: '/scenes/straws-pulled-at-random.json',
  },
  {
    id: 'pitch-black',
    name: 'Pitch Black',
    description: 'A 10-step phrase in 4/4 with a triplet subdivision.',
    mode: 'riff',
    image: '/scene-captures/riff-library/pitch-black.png',
    accent: '#FF88C2',
    tier: 'pro',
    downloadUrl: '/scenes/pitch-black.json',
  },
  {
    id: 'phantoms',
    name: 'Phantoms',
    description: 'A long 30-step phrase in 4/4 over a 16th-note grid.',
    mode: 'riff',
    image: '/scene-captures/riff-library/phantoms.png',
    accent: '#54E3C2',
    tier: 'pro',
    downloadUrl: '/scenes/phantoms.json',
  },
  {
    id: 'sol-niger-within-2',
    name: 'Sol Niger Within',
    description: 'An 11-step phrase in 4/4 with a triplet subdivision.',
    mode: 'riff',
    image: '/scene-captures/riff-library/sol-niger-within-2.png',
    accent: '#7FD7FF',
    tier: 'pro',
    downloadUrl: '/scenes/sol-niger-within-2.json',
  },
  {
    id: 'perpetual-black-second',
    name: 'Perpetual Black Second',
    description: 'A 14-step phrase in 4/4 over a 16th-note grid.',
    mode: 'riff',
    image: '/scene-captures/riff-library/perpetual-black-second.png',
    accent: '#FF7A7A',
    tier: 'free',
    downloadUrl: '/scenes/perpetual-black-second.json',
  },
  {
    id: 'atropos',
    name: 'Atropos',
    description: 'A 14-step phrase in 4/4 over an eighth-note grid.',
    mode: 'riff',
    image: '/scene-captures/riff-library/atropos.png',
    accent: '#6FA8FF',
    tier: 'free',
    downloadUrl: '/scenes/atropos.json',
  },
  {
    id: 'obzen',
    name: 'ObZen',
    description: 'A 20-step phrase in 4/4 over a 16th-note grid.',
    mode: 'riff',
    image: '/scene-captures/riff-library/obzen.png',
    accent: '#FFD166',
    tier: 'pro',
    downloadUrl: '/scenes/obzen.json',
  },
  {
    id: 'invincible',
    name: 'Invincible',
    description: 'A 9-step phrase in 7/8 over an eighth-note grid.',
    mode: 'riff',
    image: '/scene-captures/riff-library/invincible.png',
    accent: '#FFD166',
    tier: 'pro',
    downloadUrl: '/scenes/invincible.json',
  },
  {
    id: 'entertain-me',
    name: 'Entertain Me',
    description: 'A 35-step phrase in 4/4 over a 16th-note grid.',
    mode: 'riff',
    image: '/scene-captures/riff-library/entertain-me.png',
    accent: '#C9A7FF',
    tier: 'pro',
    downloadUrl: '/scenes/entertain-me.json',
  },
];

export function getCatalogScene(sceneId: string | null): CatalogScene | null {
  if (!sceneId) return null;
  return RIFF_SCENE_CATALOG.find((scene) => scene.id === sceneId) ?? null;
}
