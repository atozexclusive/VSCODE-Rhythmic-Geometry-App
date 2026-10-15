import { useRef, useState, type ReactNode } from 'react';
import { ChevronRight, Folder, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { canMoveSceneFolder, getSceneFolderParent, getSceneFolderPath, type SceneFolder } from '../lib/sceneFolders';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

export interface LibraryScene {
  id: string;
  name: string;
  description: string;
  folderId?: string | null;
  deletedAt?: string;
}

export interface SceneLibraryActions {
  onRenameScene: (id: string, name: string) => void;
  onMoveScene: (id: string, folderId: string | null) => void;
  onDeleteScene: (id: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onMoveFolder: (id: string, parentId: string | null) => void;
  onDeleteFolder: (id: string) => void;
}

interface Props<T extends LibraryScene> extends SceneLibraryActions {
  scenes: T[];
  folders: SceneFolder[];
  activeSceneId?: string | null;
  onLoadScene: (id: string) => void;
  renderThumbnail: (scene: T) => ReactNode;
}

type LibraryDialog =
  | { type: 'create'; parentId: string | null }
  | { type: 'rename' | 'move' | 'delete'; kind: 'scene' | 'folder'; id: string; name: string; parentId: string | null };

const actionItemClass = 'min-h-8 cursor-pointer gap-2 rounded-lg px-2 text-[11px] text-white/75 focus:bg-white/10 focus:text-white';

function LibraryActions({ name, onMove, onRename, onDelete }: { name: string; onMove: () => void; onRename: () => void; onDelete: () => void }) {
  const pendingAction = useRef<(() => void) | null>(null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Options for ${name}`} title="Scene options" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/15 text-white/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={5} onCloseAutoFocus={(event) => {
        const action = pendingAction.current;
        pendingAction.current = null;
        if (action) { event.preventDefault(); action(); }
      }} className="z-[100] w-40 rounded-xl border-white/15 bg-[#181b24]/95 p-1 text-white shadow-xl backdrop-blur-xl">
        <DropdownMenuItem className={actionItemClass} onSelect={() => { pendingAction.current = onMove; }}><Folder size={13} />Add to folder</DropdownMenuItem>
        <DropdownMenuItem className={actionItemClass} onSelect={() => { pendingAction.current = onRename; }}><Pencil size={13} />Rename</DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem className={`${actionItemClass} text-rose-300 focus:text-rose-200`} onSelect={() => { pendingAction.current = onDelete; }}><Trash2 size={13} />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function SavedSceneLibrary<T extends LibraryScene>({ scenes, folders, activeSceneId, onLoadScene, renderThumbnail, ...actions }: Props<T>) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<LibraryDialog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const activeFolders = folders.filter((folder) => !folder.deletedAt);
  const currentId = getSceneFolderParent(activeFolders, currentFolderId);
  const path = getSceneFolderPath(activeFolders, currentId);
  const childFolders = activeFolders.filter((folder) => getSceneFolderParent(activeFolders, folder.parentId) === currentId).sort((a, b) => a.name.localeCompare(b.name));
  const visibleScenes = scenes.filter((scene) => !scene.deletedAt && getSceneFolderParent(activeFolders, scene.folderId) === currentId);
  const folderOptions = activeFolders
    .filter((folder) => dialog?.type !== 'move' || dialog.kind !== 'folder' || canMoveSceneFolder(activeFolders, dialog.id, folder.id))
    .map((folder) => ({ id: folder.id, label: getSceneFolderPath(activeFolders, folder.id).map((entry) => entry.name).join(' / ') }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const openDialog = (next: LibraryDialog) => {
    setName(next.type === 'create' ? '' : next.name);
    setDestinationId(next.parentId);
    setError('');
    setDialog(next);
    setDialogOpen(true);
  };
  const title = dialog?.type === 'create' ? 'New folder' : dialog?.type === 'rename' ? 'Rename' : dialog?.type === 'move' ? 'Add to folder' : 'Delete';
  const submit = () => {
    if (!dialog) return;
    const trimmed = name.trim();
    if ((dialog.type === 'create' || dialog.type === 'rename') && !trimmed) { setError('Enter a name.'); return; }
    try {
      if (dialog.type === 'create') actions.onCreateFolder(trimmed, dialog.parentId);
      else if (dialog.type === 'rename') {
        if (dialog.kind === 'scene') actions.onRenameScene(dialog.id, trimmed);
        else actions.onRenameFolder(dialog.id, trimmed);
      } else if (dialog.type === 'move') {
        if (dialog.kind === 'scene') actions.onMoveScene(dialog.id, destinationId);
        else actions.onMoveFolder(dialog.id, destinationId);
      } else {
        if (dialog.kind === 'scene') actions.onDeleteScene(dialog.id);
        else actions.onDeleteFolder(dialog.id);
      }
      setDialogOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'That change could not be saved.');
    }
  };

  return (
    <div data-scene-library className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <nav aria-label="Scene folders" className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-white/55">
          <button type="button" onClick={() => setCurrentFolderId(null)} className="rounded px-1 py-1 hover:text-sky-200" aria-current={!currentId ? 'page' : undefined}>Saved</button>
          {path.map((folder) => <span key={folder.id} className="inline-flex min-w-0 items-center gap-1"><ChevronRight size={10} /><button type="button" onClick={() => setCurrentFolderId(folder.id)} className="max-w-[140px] truncate rounded px-1 py-1 hover:text-sky-200" aria-current={currentId === folder.id ? 'page' : undefined}>{folder.name}</button></span>)}
        </nav>
        <button type="button" onClick={() => openDialog({ type: 'create', parentId: currentId })} className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-sky-200/15 bg-sky-200/5 px-2 text-[9px] text-sky-200/80"><FolderPlus size={12} />New folder</button>
      </div>

      {childFolders.map((folder) => {
        const sceneCount = scenes.filter((scene) => !scene.deletedAt && scene.folderId === folder.id).length;
        const folderCount = activeFolders.filter((entry) => entry.parentId === folder.id).length;
        const subject = { kind: 'folder' as const, id: folder.id, name: folder.name, parentId: folder.parentId };
        return <div key={folder.id} className="flex items-center gap-2 rounded-xl border border-sky-200/10 bg-sky-200/[.035] p-2">
          <button type="button" aria-label={`Open folder ${folder.name}`} onClick={() => setCurrentFolderId(folder.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <Folder size={20} className="shrink-0 text-sky-200/65" /><span className="min-w-0 flex-1"><span className="block truncate text-[11px] text-white/80">{folder.name}</span><span className="text-[9px] text-white/40">{sceneCount} scene{sceneCount === 1 ? '' : 's'}{folderCount ? ` · ${folderCount} folder${folderCount === 1 ? '' : 's'}` : ''}</span></span><ChevronRight size={13} className="text-white/35" />
          </button>
          <LibraryActions name={folder.name} onMove={() => openDialog({ type: 'move', ...subject })} onRename={() => openDialog({ type: 'rename', ...subject })} onDelete={() => openDialog({ type: 'delete', ...subject })} />
        </div>;
      })}

      {visibleScenes.map((scene) => {
        const active = scene.id === activeSceneId;
        const subject = { kind: 'scene' as const, id: scene.id, name: scene.name, parentId: scene.folderId ?? null };
        return <div key={scene.id} className="flex items-stretch gap-2 rounded-xl border p-2" style={{ borderColor: active ? 'rgba(114,241,184,.24)' : 'rgba(255,255,255,.1)', background: active ? 'linear-gradient(180deg,rgba(114,241,184,.08),rgba(255,255,255,.03))' : 'rgba(255,255,255,.025)' }}>
          <button type="button" aria-label={`Load scene ${scene.name}`} onClick={() => onLoadScene(scene.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {renderThumbnail(scene)}
            <span className="min-w-0 flex-1"><span className="block break-words font-mono text-[10px] uppercase tracking-[.1em]" style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,.84)' }}>{scene.name}</span><span className="mt-1 block text-[9px] leading-snug text-white/45">{scene.description}</span></span>
          </button>
          <div className="flex shrink-0 flex-col items-end justify-between gap-1">
            <LibraryActions name={scene.name} onMove={() => openDialog({ type: 'move', ...subject })} onRename={() => openDialog({ type: 'rename', ...subject })} onDelete={() => openDialog({ type: 'delete', ...subject })} />
            <button type="button" onClick={() => onLoadScene(scene.id)} className="h-6 rounded-lg border border-white/10 px-2 font-mono text-[8px] uppercase tracking-wide" style={{ color: active ? '#72F1B8' : 'rgba(255,255,255,.65)' }}>{active ? 'Loaded' : 'Load'}</button>
          </div>
        </div>;
      })}

      {!visibleScenes.length && !childFolders.length ? <div className="rounded-xl border border-white/10 px-3 py-5 text-center text-[10px] leading-relaxed text-white/40">{currentId ? 'This folder is empty. Add scenes using their three-dot menu.' : 'Save a scene or create a folder to start your library.'}</div> : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="z-[110] w-[calc(100%-2rem)] max-w-sm gap-3 rounded-2xl border-white/15 bg-[#171a23] p-4 text-white shadow-2xl">
          <DialogTitle className="pr-6 text-sm font-medium">{title}</DialogTitle>
          <DialogDescription className="text-[11px] leading-relaxed text-white/50">
            {dialog?.type === 'create' ? `Create a folder ${path.length ? `inside ${path[path.length - 1].name}` : 'in Saved scenes'}.` : dialog?.type === 'delete' ? `Delete “${dialog.name}”?${dialog.kind === 'folder' ? ' Its scenes and subfolders will move up one level.' : ' You can undo this after deleting.'}` : dialog?.type === 'move' ? `Choose a folder for “${dialog.name}”.` : `Choose a new name for “${dialog?.name ?? ''}”.`}
          </DialogDescription>
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            {dialog?.type === 'create' || dialog?.type === 'rename' ? <label className="block space-y-1 text-[10px] text-white/60">Name<input autoFocus maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-base text-white outline-none focus:border-sky-200/60" /></label> : null}
            {dialog?.type === 'move' ? <label className="block space-y-1 text-[10px] text-white/60">Folder<select autoFocus value={destinationId ?? ''} onChange={(event) => setDestinationId(event.target.value || null)} className="h-10 w-full rounded-lg border border-white/15 bg-[#222631] px-2 text-base text-white outline-none focus:border-sky-200/60"><option value="">Saved scenes (no folder)</option>{folderOptions.map((folder) => <option key={folder.id} value={folder.id}>{folder.label}</option>)}</select></label> : null}
            {error ? <p role="alert" className="text-[11px] text-rose-300">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-1"><button type="button" className="h-8 rounded-lg border border-white/10 px-3 text-[11px] text-white/60" onClick={() => setDialogOpen(false)}>Cancel</button><button type="submit" className={`h-8 rounded-lg border px-3 text-[11px] ${dialog?.type === 'delete' ? 'border-rose-300/25 bg-rose-300/10 text-rose-200' : 'border-sky-200/25 bg-sky-200/10 text-sky-200'}`}>{dialog?.type === 'create' ? 'Create folder' : dialog?.type === 'delete' ? 'Delete' : dialog?.type === 'move' ? 'Move here' : 'Save name'}</button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
