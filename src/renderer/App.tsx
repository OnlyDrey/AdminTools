import { useEffect, useMemo, useState } from 'react';
import type { Session } from '../shared/types';
import { SessionForm } from './components/SessionForm';
import { SftpBrowser } from './components/SftpBrowser';
import { SshTerminal } from './components/SshTerminal';
import { useVault } from './hooks/useVault';

export function App() {
  const { vault, upsertSession, deleteSession, duplicateSession, save, bridgeError } = useVault();
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [activeTabIds, setActiveTabIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Session | undefined>();

  const sessions = vault?.sessions ?? [];

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      const query = `${session.name} ${session.host} ${session.tags.join(' ')}`.toLowerCase();
      const folderMatch = selectedFolder === 'all' || session.folder === selectedFolder;
      return query.includes(search.toLowerCase()) && folderMatch;
    });
  }, [search, selectedFolder, sessions]);

  const favorites = filtered.filter((item) => item.favorite);
  const folders = ['all', ...new Set(sessions.map((item) => item.folder).filter(Boolean) as string[])];

  const openTab = (session: Session) => {
    setActiveTabIds((current) => (current.includes(session.id) ? current : [...current, session.id]));
    if (vault && !vault.appSettings.recentSessionIds.includes(session.id)) {
      save({
        ...vault,
        appSettings: {
          ...vault.appSettings,
          recentSessionIds: [session.id, ...vault.appSettings.recentSessionIds].slice(0, 10)
        }
      });
    }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('quick-connect')?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        document.getElementById('search')?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setEditing(undefined);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);


  if (bridgeError) {
    return (
      <div className="app dark">
        <main className="main">
          <section className="card">
            <h2>Renderer startup error</h2>
            <p className="muted">{bridgeError}</p>
            <p className="muted">Check preload path and run <code>npm run dev</code> with generated <code>build/main/preload.cjs</code>.</p>
          </section>
        </main>
      </div>
    );
  }
  const activeTabs = activeTabIds
    .map((id) => sessions.find((session) => session.id === id))
    .filter(Boolean) as Session[];

  return (
    <div className="app dark">
      <header className="topbar">
        <input id="quick-connect" placeholder="Quick connect (host:port)" />
        <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Global search" />
      </header>
      <div className="layout">
        <aside className="sidebar">
          <h3>Folders</h3>
          {folders.map((folder) => (
            <button key={folder} className={selectedFolder === folder ? 'active' : ''} onClick={() => setSelectedFolder(folder)}>
              {folder}
            </button>
          ))}
          <h3>Favorites</h3>
          {favorites.map((session) => (
            <button key={session.id} onClick={() => openTab(session)}>{session.name}</button>
          ))}
          <h3>Recent</h3>
          {(vault?.appSettings.recentSessionIds ?? []).map((id) => {
            const session = sessions.find((item) => item.id === id);
            return session ? <button key={id} onClick={() => openTab(session)}>{session.name}</button> : null;
          })}
        </aside>

        <main className="main">
          <section className="card">
            <div className="row">
              <h2>Sessions</h2>
              <button onClick={() => setEditing(undefined)}>New session</button>
            </div>
            <div className="session-list">
              {filtered.map((session) => (
                <div className="session-item" key={session.id}>
                  <div>
                    <strong>{session.name}</strong>
                    <p className="muted">{session.protocol.toUpperCase()} · {session.host}:{session.port}</p>
                  </div>
                  <div className="row">
                    <button onClick={() => openTab(session)}>Open</button>
                    <button onClick={() => setEditing(session)}>Edit</button>
                    <button onClick={() => duplicateSession(session)}>Duplicate</button>
                    {session.protocol === 'rdp' && <button onClick={() => window.api.launchRdp(session)}>Launch RDP</button>}
                    <button onClick={() => window.api.detachSession(session)}>Detach</button>
                    <button onClick={() => deleteSession(session.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <SessionForm onSave={upsertSession} existing={editing} />

          <section className="card">
            <div className="row"><h3>Session Tabs</h3></div>
            <div className="tabs">
              {activeTabs.map((session) => (
                <div key={session.id} className="tab">
                  <div className="row">
                    <strong>{session.name}</strong>
                    <button onClick={() => setActiveTabIds((current) => current.filter((id) => id !== session.id))}>×</button>
                  </div>
                  {session.protocol === 'ssh' && <SshTerminal title={session.name} />}
                  {session.protocol === 'sftp' && <SftpBrowser session={session} />}
                  {session.protocol === 'rdp' && (
                    <div>
                      <p>RDP sessions launch in the system client in MVP.</p>
                      <button onClick={() => window.api.launchRdp(session)}>Reconnect with system RDP client</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
