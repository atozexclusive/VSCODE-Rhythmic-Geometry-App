import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canMoveSceneFolder, getSceneFolderPath, getSceneFolderParent, mergeSceneLibraryEntries, normalizeSceneFolder, removeSceneFolder, type SceneFolder } from '../src/lib/sceneFolders.ts';

const folders: SceneFolder[] = [
  { id: 'artist', name: 'Meshuggah', parentId: null, updatedAt: '2026-10-15T10:00:00Z' },
  { id: 'song', name: 'Bleed', parentId: 'artist', updatedAt: '2026-10-15T10:00:00Z' },
  { id: 'parts', name: 'Live arrangement', parentId: 'song', updatedAt: '2026-10-15T10:00:00Z' },
];
test('nested artist, song, and arrangement folders retain a complete breadcrumb after JSON storage', () => {
  const restored = JSON.parse(JSON.stringify(folders));
  assert.deepEqual(getSceneFolderPath(restored, 'parts').map((folder) => folder.name), ['Meshuggah', 'Bleed', 'Live arrangement']);
  assert.equal(getSceneFolderParent(restored, 'song'), 'song');
  assert.equal(getSceneFolderParent(restored, 'missing'), null);
});
test('moving folders rejects self, descendant, missing, and cyclic destinations', () => {
  assert.equal(canMoveSceneFolder(folders, 'artist', 'artist'), false);
  assert.equal(canMoveSceneFolder(folders, 'artist', 'parts'), false);
  assert.equal(canMoveSceneFolder(folders, 'song', 'parts'), false);
  assert.equal(canMoveSceneFolder(folders, 'parts', 'artist'), true);
  assert.equal(canMoveSceneFolder(folders, 'parts', null), true);
  assert.equal(canMoveSceneFolder(folders, 'artist', 'missing'), false);
  const cyclic = [{ ...folders[0], parentId: 'song' }, folders[1]];
  assert.equal(canMoveSceneFolder(cyclic, 'parts', 'song'), false);
  assert.equal(getSceneFolderPath(cyclic, 'song').length, 2);
});
test('deleting a song folder preserves its scenes, child folders, and deeper scene membership', () => {
  const scenes = [
    { id: 'intro', folderId: 'song', updatedAt: '2026-10-15T10:00:00Z' },
    { id: 'outro', folderId: 'parts', updatedAt: '2026-10-15T10:00:00Z' },
  ];
  const changed = removeSceneFolder(folders, scenes, 'song', '2026-10-15T11:00:00Z');
  const mergedFolders = mergeSceneLibraryEntries(changed.folders, folders);
  const mergedScenes = mergeSceneLibraryEntries(changed.scenes, scenes);
  assert.ok(mergedFolders.find((entry) => entry.id === 'song')?.deletedAt);
  assert.equal(mergedFolders.find((entry) => entry.id === 'parts')?.parentId, 'artist');
  assert.equal(mergedScenes.find((entry) => entry.id === 'intro')?.folderId, 'artist');
  assert.equal(mergedScenes.find((entry) => entry.id === 'outro')?.folderId, 'parts');
  assert.equal(scenes[0].folderId, 'song');
  assert.equal(folders[2].parentId, 'song');
});
test('deleting a top-level folder moves direct scenes to Saved', () => {
  const changed = removeSceneFolder(folders, [{ id: 'riff', folderId: 'artist', updatedAt: '2026-10-15T10:00:00Z' }], 'artist', '2026-10-15T11:00:00Z');
  assert.equal(changed.scenes[0].folderId, null);
  assert.equal(changed.folders.find((entry) => entry.id === 'song')?.parentId, null);
});
test('cloud tombstones beat stale offline copies and cannot resurrect scenes or folders', () => {
  const old = { id: 'riff', updatedAt: '2026-10-15T10:00:00Z' };
  const deleted = { ...old, deletedAt: '2026-10-15T11:00:00Z', updatedAt: '2026-10-15T11:00:00Z' };
  assert.deepEqual(mergeSceneLibraryEntries([old], [deleted]), [deleted]);
  assert.deepEqual(mergeSceneLibraryEntries([deleted], [old]), [deleted]);
  assert.deepEqual(mergeSceneLibraryEntries([{ ...old, updatedAt: deleted.updatedAt }], [deleted]), [deleted]);
  const restored = { ...old, updatedAt: '2026-10-15T12:00:00Z' };
  assert.deepEqual(mergeSceneLibraryEntries([restored], [deleted]), [restored]);
});
test('older scene records without folder metadata remain valid root scenes; malformed folders are ignored', () => {
  assert.equal(getSceneFolderParent(folders, undefined), null);
  assert.equal(normalizeSceneFolder(null), null);
  assert.equal(normalizeSceneFolder({ id: 'bad', name: '  ' }), null);
  assert.equal(normalizeSceneFolder({ ...folders[0], parentId: 'artist' })?.parentId, null);
});
