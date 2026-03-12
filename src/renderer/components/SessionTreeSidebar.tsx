import { useMemo } from 'react';
import type { FolderNode, Session } from '../../shared/types';

interface SessionTreeSidebarProps {
  folders: FolderNode[];
  sessions: Session[];
  expandedFolderIds: string[];
  selectedFolderId?: string;
  onToggleExpand: (folderId: string) => void;
  onSelectFolder: (folderId?: string) => void;
  onNewFolder: (parentId?: string) => void;
  onRenameFolder: (folder: FolderNode) => void;
  onDeleteFolder: (folderId: string) => void;
  onDropSessionToFolder: (sessionId: string, folderId?: string) => void;
}

export function SessionTreeSidebar(props: SessionTreeSidebarProps) {
  const {
    folders,
    sessions,
    expandedFolderIds,
    selectedFolderId,
    onToggleExpand,
    onSelectFolder,
    onNewFolder,
    onRenameFolder,
    onDeleteFolder,
    onDropSessionToFolder
  } = props;

  const byParent = useMemo(() => {
    const map = new Map<string, FolderNode[]>();
    for (const folder of [...folders].sort((a, b) => a.order - b.order)) {
      const key = folder.parentId ?? 'root';
      const next = map.get(key) ?? [];
      next.push(folder);
      map.set(key, next);
    }
    return map;
  }, [folders]);

  const countByFolder = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of sessions) {
      if (!session.folderId) continue;
      map.set(session.folderId, (map.get(session.folderId) ?? 0) + 1);
    }
    return map;
  }, [sessions]);

  const renderNode = (folder: FolderNode, depth: number) => {
    const children = byParent.get(folder.id) ?? [];
    const expanded = expandedFolderIds.includes(folder.id);
    const count = countByFolder.get(folder.id) ?? 0;
    const selected = selectedFolderId === folder.id;
    return (
      <div key={folder.id}>
        <div
          className={selected ? 'tree-item selected' : 'tree-item'}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          draggable
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const sessionId = e.dataTransfer.getData('text/session-id');
            if (sessionId) onDropSessionToFolder(sessionId, folder.id);
          }}
        >
          <button className="tree-expander" onClick={() => onToggleExpand(folder.id)}>{children.length ? (expanded ? '▾' : '▸') : '•'}</button>
          <button className="tree-label" onClick={() => onSelectFolder(folder.id)} title={folder.description}>{folder.icon ?? '📂'} {folder.name}</button>
          <span className="badge">{count}</span>
          <details className="menu">
            <summary>⋮</summary>
            <div className="menu-panel">
              <button onClick={() => onNewFolder(folder.id)}>New subfolder</button>
              <button onClick={() => onRenameFolder(folder)}>Rename</button>
              <button onClick={() => onDeleteFolder(folder.id)}>Delete</button>
            </div>
          </details>
        </div>
        {expanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <aside className="sidebar nav-tree">
      <div className="row between">
        <strong>Folders</strong>
        <button onClick={() => onNewFolder(undefined)}>+ New folder</button>
      </div>
      <div
        className={selectedFolderId ? 'tree-item' : 'tree-item selected'}
        onClick={() => onSelectFolder(undefined)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const sessionId = e.dataTransfer.getData('text/session-id');
          if (sessionId) onDropSessionToFolder(sessionId, undefined);
        }}
      >
        <span className="tree-label">🗂️ All sessions</span>
        <span className="badge">{sessions.length}</span>
      </div>
      {(byParent.get('root') ?? []).map((folder) => renderNode(folder, 0))}
    </aside>
  );
}
