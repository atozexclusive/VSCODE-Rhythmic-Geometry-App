import { supabase } from './supabase';

export interface StoredSceneRecord {
  id: string;
  user_id: string;
  name: string;
  snapshot: unknown;
  thumbnail_data_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoredExportRecord {
  id: string;
  user_id: string;
  type: string;
  scene_name: string | null;
  snapshot: unknown | null;
  aspect: string | null;
  scale: number | null;
  duration_seconds: number | null;
  storage_path: string | null;
  created_at: string;
}

export async function listSavedSceneRecords(userId: string): Promise<StoredSceneRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('saved_scenes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as StoredSceneRecord[] | null) ?? [];
}

export async function upsertSavedSceneRecord(
  userId: string,
  scene: {
    id: string;
    name: string;
    snapshot: unknown;
    thumbnail_data_url?: string | null;
    updated_at: string;
  },
): Promise<StoredSceneRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('saved_scenes')
    .upsert(
      {
        id: scene.id,
        user_id: userId,
        name: scene.name,
        snapshot: scene.snapshot,
        thumbnail_data_url: scene.thumbnail_data_url ?? null,
        updated_at: scene.updated_at,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as StoredSceneRecord;
}

export async function deleteSavedSceneRecord(userId: string, sceneId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('saved_scenes')
    .delete()
    .eq('user_id', userId)
    .eq('id', sceneId);

  if (error) {
    throw error;
  }
}

export async function listExportRecords(userId: string): Promise<StoredExportRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('export_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    throw error;
  }

  return (data as StoredExportRecord[] | null) ?? [];
}

export async function createExportRecord(
  userId: string,
  record: {
    type: string;
    scene_name?: string | null;
    snapshot?: unknown | null;
    aspect?: string | null;
    scale?: number | null;
    duration_seconds?: number | null;
    storage_path?: string | null;
  },
): Promise<StoredExportRecord> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('export_records')
    .insert({
      user_id: userId,
      type: record.type,
      scene_name: record.scene_name ?? null,
      snapshot: record.snapshot ?? null,
      aspect: record.aspect ?? null,
      scale: record.scale ?? null,
      duration_seconds: record.duration_seconds ?? null,
      storage_path: record.storage_path ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as StoredExportRecord;
}
