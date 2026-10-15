export interface SceneFolder {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: string;
  deletedAt?: string;
}

export interface FolderScene {
  id: string;
  folderId?: string | null;
  updatedAt: string;
  deletedAt?: string;
}

export const RIFF_FOLDERS_STORAGE_KEY = 'rhythmic-geometry-riff-scene-folders-v1';
export const STUDY_FOLDERS_STORAGE_KEY = 'rhythmic-geometry-study-scene-folders-v1';

export function normalizeSceneFolder(value: unknown): SceneFolder | null {
  if (!value || typeof value !== 'object') return null;
  const folder = value as Partial<SceneFolder>;
  if (typeof folder.id !== 'string' || !folder.id || typeof folder.name !== 'string' || !folder.name.trim() || typeof folder.updatedAt !== 'string') return null;
  return {
    id: folder.id,
    name: folder.name.trim(),
    parentId: typeof folder.parentId === 'string' && folder.parentId !== folder.id ? folder.parentId : null,
    updatedAt: folder.updatedAt,
    ...(typeof folder.deletedAt === 'string' ? { deletedAt: folder.deletedAt } : {}),
  };
}

function loadSceneFolders(storageKey: string): SceneFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(value) ? value.map(normalizeSceneFolder).filter((folder): folder is SceneFolder => folder !== null) : [];
  } catch {
    return [];
  }
}

export const loadRiffSceneFolders = () => loadSceneFolders(RIFF_FOLDERS_STORAGE_KEY);
export const loadStudySceneFolders = () => loadSceneFolders(STUDY_FOLDERS_STORAGE_KEY);

export function getSceneFolderPath(folders: SceneFolder[], id: string | null): SceneFolder[] {
  const path: SceneFolder[] = [];
  const seen = new Set<string>();
  let current = id;
  while (current && !seen.has(current)) {
    seen.add(current);
    const folder = folders.find((entry) => entry.id === current && !entry.deletedAt);
    if (!folder) break;
    path.unshift(folder);
    current = folder.parentId;
  }
  return path;
}

export function getSceneFolderParent(folders: SceneFolder[], parentId?: string | null): string | null {
  return folders.some((folder) => folder.id === parentId && !folder.deletedAt) ? parentId! : null;
}

export function canMoveSceneFolder(folders: SceneFolder[], id: string, parentId: string | null): boolean {
  if (parentId === null) return true;
  if (!folders.some((folder) => folder.id === parentId && !folder.deletedAt)) return false;
  const seen = new Set<string>([id]);
  let current: string | null = parentId;
  while (current) {
    if (seen.has(current)) return false;
    seen.add(current);
    current = folders.find((folder) => folder.id === current)?.parentId ?? null;
  }
  return true;
}

// Tombstones participate in the same merge as live entries, preventing offline
// browsers from bringing back a deleted scene or folder during account sync.
export function mergeSceneLibraryEntries<T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], account: T[]): T[] {
  const entries = new Map(account.map((entry) => [entry.id, entry]));
  for (const entry of local) {
    const existing = entries.get(entry.id);
    if (!existing || entry.updatedAt > existing.updatedAt || (entry.updatedAt === existing.updatedAt && (entry.deletedAt || !existing.deletedAt))) entries.set(entry.id, entry);
  }
  return [...entries.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// Deleting a folder keeps its contents: direct children move up one level.
export function removeSceneFolder<T extends FolderScene>(folders: SceneFolder[], scenes: T[], id: string, updatedAt: string) {
  const folder = folders.find((entry) => entry.id === id && !entry.deletedAt);
  if (!folder) return { folders: [] as SceneFolder[], scenes: [] as T[] };
  const parentId = getSceneFolderParent(folders, folder.parentId);
  return {
    folders: [
      { ...folder, deletedAt: updatedAt, updatedAt },
      ...folders.filter((entry) => !entry.deletedAt && entry.parentId === id).map((entry) => ({ ...entry, parentId, updatedAt })),
    ],
    scenes: scenes.filter((entry) => !entry.deletedAt && entry.folderId === id).map((entry) => ({ ...entry, folderId: parentId, updatedAt })),
  };
}
