import type { AccountPlan } from './supabase';
import type { GeometryMode } from './geometry';

export type ProFeature =
  | 'save-scenes'
  | 'export'
  | 'random-plus'
  | 'remix'
  | 'scene-editing'
  | 'high-ratios'
  | 'extra-orbits'
  | 'color-editing'
  | 'sound-editing'
  | 'pro-scenes';

export const FREE_SCENE_SAVE_LIMIT = 3;
export const FREE_RATIO_LIMIT = 10;

export function isProPlan(plan: AccountPlan): boolean {
  return plan === 'pro';
}

export function canUseProFeature(plan: AccountPlan, feature: ProFeature): boolean {
  if (isProPlan(plan)) {
    return true;
  }

  return false;
}

export function getOrbitLimitForMode(plan: AccountPlan, mode: GeometryMode): number {
  if (isProPlan(plan)) {
    return mode === 'standard-trace' ? 6 : 4;
  }

  return mode === 'standard-trace' ? 3 : 2;
}

export function getMaxEditableRatio(plan: AccountPlan): number {
  return isProPlan(plan) ? 1000 : FREE_RATIO_LIMIT;
}
