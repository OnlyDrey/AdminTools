import { useState } from 'react';
import type { Session, SftpEntry } from '../../shared/types';

interface SftpBrowserProps {
  session: Session;
}

export function SftpBrowser({ session }: SftpBrowserProps) {
  const [path, setPath] = useState(session.protocol === 'sftp' ? session.remotePath || '/' : '/');
  const [entries, setEntries] = useState<SftpEntry[]>([]);
  const [status, setStatus] = useState('Not connected');

  const connectAndLoad = async () => {
    if (session.protocol !== 'sftp') return;
    setStatus('Connecting...');
    try {
      await window.api.sftpConnect(session.id, {
        host: session.host,
        port: session.port,
        username: session.username
      });
      const list = await window.api.sftpList(session.id, path);
      setEntries(list);
      setStatus(`Loaded ${list.length} entries`);
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="card">
      <h3>SFTP Browser</h3>
      <div className="row">
        <input value={path} onChange={(e) => setPath(e.target.value)} />
        <button onClick={connectAndLoad}>Connect + List</button>
      </div>
      <p className="muted">{status}</p>
      <div className="sftp-list">
        {entries.map((entry) => (
          <div key={`${entry.name}-${entry.modifyTime}`} className="sftp-item">
            <span>{entry.type === 'd' ? '📁' : '📄'} {entry.name}</span>
            <span>{entry.size} B</span>
          </div>
        ))}
      </div>
      <p className="muted">Upload/download/rename/delete are planned in this MVP foundation and easy to extend.</p>
    </div>
  );
}
