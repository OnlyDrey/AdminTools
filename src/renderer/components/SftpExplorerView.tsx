import { useEffect, useMemo, useState } from 'react';
import type { Session, SftpEntry } from '../../shared/types';

interface SftpExplorerViewProps {
  session: Session;
}

type SortKey = 'name' | 'size' | 'modified';

const joinPath = (base: string, name: string) => `${base.replace(/\/$/, '')}/${name}`.replace('//', '/');
const parentPath = (input: string) => input.split('/').slice(0, -1).join('/') || '/';

function sortEntries(entries: SftpEntry[], sortKey: SortKey) {
  const copy = [...entries];
  if (sortKey === 'size') return copy.sort((a, b) => a.size - b.size);
  if (sortKey === 'modified') return copy.sort((a, b) => a.modifyTime - b.modifyTime);
  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

export function SftpExplorerView({ session }: SftpExplorerViewProps) {
  const [localPath, setLocalPath] = useState(process.env.HOME ?? '/');
  const [remotePath, setRemotePath] = useState(session.protocol === 'sftp' ? (session.remotePath || '/') : '/');
  const [localEntries, setLocalEntries] = useState<SftpEntry[]>([]);
  const [remoteEntries, setRemoteEntries] = useState<SftpEntry[]>([]);
  const [status, setStatus] = useState('Ready');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedLocal, setSelectedLocal] = useState<SftpEntry | null>(null);
  const [selectedRemote, setSelectedRemote] = useState<SftpEntry | null>(null);
  const [connected, setConnected] = useState(false);

  const sortedLocal = useMemo(() => sortEntries(localEntries, sortKey), [localEntries, sortKey]);
  const sortedRemote = useMemo(() => sortEntries(remoteEntries, sortKey), [remoteEntries, sortKey]);

  const connect = async () => {
    if (session.protocol !== 'sftp') return;
    const resolved = session.credentialRef ? await window.api.resolveCredential(session.credentialRef) : undefined;
    await window.api.sftpConnect(session.id, {
      host: session.host,
      port: session.port,
      username: resolved?.username ?? session.username,
      password: resolved?.password
    });
    setConnected(true);
  };

  const refresh = async () => {
    setStatus('Refreshing...');
    try {
      if (!connected) {
        await connect();
      }
      const [local, remote] = await Promise.all([
        window.api.localfsList(localPath),
        window.api.sftpList(session.id, remotePath)
      ]);
      setLocalEntries(local);
      setRemoteEntries(remote);
      setStatus(`Loaded ${local.length} local / ${remote.length} remote entries`);
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPath, remotePath]);

  const localTarget = selectedLocal ? joinPath(localPath, selectedLocal.name) : '';
  const remoteTarget = selectedRemote ? `${remotePath.replace(/\/$/, '')}/${selectedRemote.name}` : '';

  return (
    <div className="sftp-explorer card">
      <div className="row between">
        <h3>SFTP Explorer</h3>
        <div className="row">
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="name">Sort: Name</option>
            <option value="size">Sort: Size</option>
            <option value="modified">Sort: Modified</option>
          </select>
          <button onClick={() => refresh().catch(() => undefined)}>Refresh</button>
        </div>
      </div>
      <p className="muted">{status}</p>

      <div className="sftp-panels">
        <section>
          <div className="row between">
            <strong>Local</strong>
            <button onClick={() => setLocalPath(parentPath(localPath))}>Up</button>
          </div>
          <input value={localPath} onChange={(e) => setLocalPath(e.target.value)} />
          <div className="sftp-list">
            {sortedLocal.map((entry) => (
              <button
                key={`${entry.name}-${entry.modifyTime}`}
                className={selectedLocal?.name === entry.name ? 'sftp-item selected' : 'sftp-item'}
                onClick={() => setSelectedLocal(entry)}
                onDoubleClick={() => entry.type === 'd' && setLocalPath(joinPath(localPath, entry.name))}
              >
                <span>{entry.type === 'd' ? '📁' : '📄'} {entry.name}</span>
                <span>{entry.size} B</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="row between">
            <strong>Remote</strong>
            <button onClick={() => setRemotePath(remotePath.split('/').slice(0, -1).join('/') || '/')}>Up</button>
          </div>
          <input value={remotePath} onChange={(e) => setRemotePath(e.target.value)} />
          <div className="sftp-list">
            {sortedRemote.map((entry) => (
              <button
                key={`${entry.name}-${entry.modifyTime}`}
                className={selectedRemote?.name === entry.name ? 'sftp-item selected' : 'sftp-item'}
                onClick={() => setSelectedRemote(entry)}
                onDoubleClick={() => entry.type === 'd' && setRemotePath(`${remotePath.replace(/\/$/, '')}/${entry.name}`)}
              >
                <span>{entry.type === 'd' ? '📁' : '📄'} {entry.name}</span>
                <span>{entry.size} B</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="row sftp-actions-wrap">
        <button disabled={!selectedLocal} onClick={async () => {
          if (!selectedLocal) return;
          const remote = `${remotePath.replace(/\/$/, '')}/${selectedLocal.name}`;
          await window.api.sftpUpload(session.id, localTarget, remote);
          await refresh();
          setStatus(`Uploaded ${selectedLocal.name}`);
        }}>Upload →</button>
        <button disabled={!selectedRemote} onClick={async () => {
          if (!selectedRemote) return;
          const local = joinPath(localPath, selectedRemote.name);
          await window.api.sftpDownload(session.id, remoteTarget, local);
          await refresh();
          setStatus(`Downloaded ${selectedRemote.name}`);
        }}>← Download</button>
        <button disabled={!selectedRemote} onClick={async () => {
          if (!selectedRemote) return;
          const next = prompt('Rename to', selectedRemote.name);
          if (!next) return;
          await window.api.sftpRename(session.id, remoteTarget, `${remotePath.replace(/\/$/, '')}/${next}`);
          await refresh();
        }}>Rename remote</button>
        <button disabled={!selectedRemote} onClick={async () => {
          if (!selectedRemote) return;
          const overwrite = confirm('Delete selected remote entry?');
          if (!overwrite) return;
          await window.api.sftpDelete(session.id, remoteTarget, selectedRemote.type === 'd');
          await refresh();
        }}>Delete remote</button>
        <button onClick={async () => {
          const name = prompt('Remote folder name');
          if (!name) return;
          await window.api.sftpMkdir(session.id, `${remotePath.replace(/\/$/, '')}/${name}`);
          await refresh();
        }}>New remote folder</button>
      </div>
    </div>
  );
}
