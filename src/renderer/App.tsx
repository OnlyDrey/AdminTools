import { useEffect, useMemo, useState } from 'react';
import type { Protocol, Session } from '../shared/types';
import { SessionForm } from './components/SessionForm';
import { SftpBrowser } from './components/SftpBrowser';
import { SshTerminal } from './components/SshTerminal';
import { useVault } from './hooks/useVault';

const protocolIcon: Record<Protocol, string> = {
  rdp: '🖥️',
  ssh: '⌨️',
  sftp: '📁'
};

export function App() {
  const { vault, upsertSession, deleteSession, duplicateSession, save, bridgeError } = useVault();
  const [search, setSearch] = useState('');
  const [quickConnect, setQuickConnect] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [activeTabIds, setActiveTabIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Session | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [collapse, setCollapse] = useState({ folders: false, favorites: false, recent: false });

  const sessions = vault?.sessions ?? [];

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      const query = `${session.name} ${session.host} ${session.tags.join(' ')}`.toLowerCase();
      const folderMatch = selectedFolder === 'all' || session.folder === selectedFolder;
      return query.includes(search.toLowerCase()) && folderMatch;
    });
  }, [search, selectedFolder, sessions]);

  const favorites = sessions.filter((item) => item.favorite);
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
        setShowForm(true);
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

  const recentSessions = (vault?.appSettings.recentSessionIds ?? [])
    .map((id) => sessions.find((item) => item.id === id))
    .filter(Boolean) as Session[];

  return (
    <div className="app dark">
      <header className="topbar topbar-3">
        <input
          id="quick-connect"
          value={quickConnect}
          onChange={(e) => setQuickConnect(e.target.value)}
          placeholder="Quick connect (host:port)"
        />
        <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions" />
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}>＋ New Session</button>
      </header>

      <div className="layout">
        <aside className="sidebar nav-tree">
          <button className="group-toggle" onClick={() => setCollapse((s) => ({ ...s, folders: !s.folders }))}>📂 Folders ({folders.length - 1})</button>
          {!collapse.folders && folders.map((folder) => (
            <button key={folder} className={selectedFolder === folder ? 'active nav-item' : 'nav-item'} onClick={() => setSelectedFolder(folder)}>
              <span>{folder}</span>
              <span className="badge">{folder === 'all' ? sessions.length : sessions.filter((s) => s.folder === folder).length}</span>
            </button>
          ))}

          <button className="group-toggle" onClick={() => setCollapse((s) => ({ ...s, favorites: !s.favorites }))}>⭐ Favorites ({favorites.length})</button>
          {!collapse.favorites && favorites.map((session) => (
            <button key={session.id} className="nav-item" onClick={() => openTab(session)}>{protocolIcon[session.protocol]} {session.name}</button>
          ))}

          <button className="group-toggle" onClick={() => setCollapse((s) => ({ ...s, recent: !s.recent }))}>🕘 Recent ({recentSessions.length})</button>
          {!collapse.recent && recentSessions.map((session) => (
            <button key={session.id} className="nav-item" onClick={() => openTab(session)}>{protocolIcon[session.protocol]} {session.name}</button>
          ))}
        </aside>

        <main className="main">
          <section className="card">
            <div className="row between"><h3>Session Tabs</h3></div>
            <div className="tab-strip">
              {activeTabs.length === 0 && <p className="muted">No open tabs yet. Open a session from the list.</p>}
              {activeTabs.map((session) => (
                <button key={session.id} className="tab-pill" onClick={() => openTab(session)}>
                  {protocolIcon[session.protocol]} {session.name}
                  <span onClick={(e) => { e.stopPropagation(); setActiveTabIds((current) => current.filter((id) => id !== session.id)); }}> ×</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="row between">
              <h2>Sessions</h2>
              <p className="muted">{filtered.length} shown</p>
            </div>
            <div className="session-list">
              {filtered.map((session) => (
                <div className="session-row" key={session.id}>
                  <div className="session-primary">
                    <div className="session-icon">{protocolIcon[session.protocol]}</div>
                    <div>
                      <strong>{session.name}</strong>
                      <p className="muted">{session.protocol.toUpperCase()} · {session.host}:{session.port}</p>
                    </div>
                  </div>
                  <div className="row">
                    <button onClick={() => openTab(session)}>Open</button>
                    <details className="menu">
                      <summary>⋮</summary>
                      <div className="menu-panel">
                        <button onClick={() => { setEditing(session); setShowForm(true); }}>Edit</button>
                        <button onClick={() => duplicateSession(session)}>Duplicate</button>
                        {session.protocol === 'rdp' && <button onClick={() => window.api.launchRdp(session)}>Launch RDP</button>}
                        <button onClick={() => window.api.detachSession(session)}>Detach</button>
                        <button onClick={() => deleteSession(session.id)}>Delete</button>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {activeTabs.map((session) => (
            <section key={session.id} className="card">
              <div className="row between">
                <strong>{protocolIcon[session.protocol]} {session.name}</strong>
                <button onClick={() => setActiveTabIds((current) => current.filter((id) => id !== session.id))}>Close tab</button>
              </div>
              {session.protocol === 'ssh' && <SshTerminal title={session.name} />}
              {session.protocol === 'sftp' && <SftpBrowser session={session} />}
              {session.protocol === 'rdp' && (
                <div>
                  <p>RDP sessions launch in system client in MVP.</p>
                  <button onClick={() => window.api.launchRdp(session)}>Reconnect with system RDP client</button>
                </div>
              )}
            </section>
          ))}
        </main>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <SessionForm
              onSave={async (session) => {
                await upsertSession(session);
                setShowForm(false);
                setEditing(undefined);
              }}
              existing={editing}
              onCancel={() => { setShowForm(false); setEditing(undefined); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
