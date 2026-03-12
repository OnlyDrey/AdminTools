import { useEffect, useMemo, useState } from 'react';
import type { CredentialProfile, Session } from '../shared/types';
import { CredentialManager } from './components/CredentialManager';
import { RemoteSessionToolbar, type RemoteCommand } from './components/RemoteSessionToolbar';
import { SessionForm } from './components/SessionForm';
import { RemoteView } from './components/RemoteView';
import { SftpExplorerView } from './components/SftpExplorerView';
import { SshTerminalView } from './components/SshTerminalView';
import { useVault } from './hooks/useVault';
import { routeRemoteCommand } from './remoteCommandRouter';
import { getSessionMetaLabel, resolveSessionIcon } from './sessionIcons';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function App() {
  const { vault, upsertSession, deleteSession, duplicateSession, save, bridgeError } = useVault();
  const [search, setSearch] = useState('');
  const [quickConnect, setQuickConnect] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [activeTabIds, setActiveTabIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Session | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [collapse, setCollapse] = useState({ folders: false, favorites: false, recent: false });
  const [credentials, setCredentials] = useState<CredentialProfile[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<Record<string, ConnectionStatus>>({});
  const [sessionMessages, setSessionMessages] = useState<Record<string, string>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const sessions = vault?.sessions ?? [];

  useEffect(() => {
    window.api.listCredentials().then(setCredentials).catch(() => setCredentials([]));
  }, [vault?.schemaVersion]);

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      const query = `${session.name} ${session.host} ${session.tags.join(' ')}`.toLowerCase();
      const folderMatch = selectedFolder === 'all' || session.folder === selectedFolder;
      return query.includes(search.toLowerCase()) && folderMatch;
    });
  }, [search, selectedFolder, sessions]);

  const visibleSessions = useMemo(() => filtered.slice(0, 250), [filtered]);

  const favorites = sessions.filter((item) => item.favorite);
  const folders = ['all', ...new Set(sessions.map((item) => item.folder).filter(Boolean) as string[])];

  const openTab = (session: Session) => {
    setSelectedSessionId(session.id);
    setActiveTabIds((current) => (current.includes(session.id) ? current : [...current, session.id]));
    setSessionStatus((current) => ({ ...current, [session.id]: current[session.id] ?? 'connected' }));
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

  const setToast = (sessionId: string, message: string) => {
    setSessionMessages((current) => ({ ...current, [sessionId]: message }));
    window.setTimeout(() => {
      setSessionMessages((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
    }, 2200);
  };

  const handleToolbarCommand = async (session: Session, command: RemoteCommand) => {
    await routeRemoteCommand(session, command, {
      reconnect: async () => {
        setSessionStatus((current) => ({ ...current, [session.id]: 'connecting' }));
        if (session.protocol === 'rdp') {
          await window.api.launchRdp(session).catch(() => undefined);
        }
        window.setTimeout(() => {
          setSessionStatus((current) => ({ ...current, [session.id]: 'connected' }));
        }, 350);
        setToast(session.id, 'Reconnect triggered');
      },
      disconnect: async () => {
        setSessionStatus((current) => ({ ...current, [session.id]: 'disconnected' }));
        setToast(session.id, 'Session marked as disconnected');
      },
      detach: async () => {
        await window.api.detachSession(session);
        setToast(session.id, 'Detached to new window');
      },
      feedback: (message) => setToast(session.id, message)
    });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-terminal-input="true"]')) {
        return;
      }
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

  const selectedIndex = visibleSessions.findIndex((s) => s.id === selectedSessionId);

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
        <div className="row">
          <button onClick={() => setShowCredentials(true)}>Settings · Credentials</button>
          <button onClick={() => { setEditing(undefined); setShowForm(true); }}>＋ New Session</button>
        </div>
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
            <button key={session.id} className="nav-item" title={getSessionMetaLabel(session)} onClick={() => openTab(session)}>{resolveSessionIcon(session).startsWith('data:') ? <img className="session-icon-img" src={resolveSessionIcon(session)} alt="session icon" /> : resolveSessionIcon(session)} {session.name}</button>
          ))}

          <button className="group-toggle" onClick={() => setCollapse((s) => ({ ...s, recent: !s.recent }))}>🕘 Recent ({recentSessions.length})</button>
          {!collapse.recent && recentSessions.map((session) => (
            <button key={session.id} className="nav-item" title={getSessionMetaLabel(session)} onClick={() => openTab(session)}>{resolveSessionIcon(session).startsWith('data:') ? <img className="session-icon-img" src={resolveSessionIcon(session)} alt="session icon" /> : resolveSessionIcon(session)} {session.name}</button>
          ))}
        </aside>

        <main className="main">
          <section className="card">
            <div className="row between"><h3>Session Tabs</h3></div>
            <div className="tab-strip">
              {activeTabs.length === 0 && <p className="muted">No open tabs yet. Open a session from the list.</p>}
              {activeTabs.map((session) => (
                <button key={session.id} className="tab-pill" title={getSessionMetaLabel(session)} onClick={() => openTab(session)}>
                  {resolveSessionIcon(session).startsWith('data:') ? <img className="session-icon-img" src={resolveSessionIcon(session)} alt="session icon" /> : resolveSessionIcon(session)} {session.name}
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
            <div
              className="session-list"
              role="listbox"
              tabIndex={0}
              aria-label="Sessions"
              onKeyDown={(event) => {
                if (visibleSessions.length === 0) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  const nextIndex = selectedIndex < 0 ? 0 : Math.min(selectedIndex + 1, visibleSessions.length - 1);
                  setSelectedSessionId(visibleSessions[nextIndex].id);
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  const nextIndex = selectedIndex < 0 ? 0 : Math.max(selectedIndex - 1, 0);
                  setSelectedSessionId(visibleSessions[nextIndex].id);
                }
                if (event.key === 'Enter' && selectedIndex >= 0) {
                  event.preventDefault();
                  openTab(visibleSessions[selectedIndex]);
                }
              }}
            >
              {visibleSessions.map((session) => (
                <div
                  className={selectedSessionId === session.id ? 'session-row selected' : 'session-row'}
                  key={session.id}
                  role="option"
                  aria-selected={selectedSessionId === session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                >
                  <div className="session-primary">
                    <div className="session-icon" title={getSessionMetaLabel(session)}>{resolveSessionIcon(session).startsWith('data:') ? <img className="session-icon-img" src={resolveSessionIcon(session)} alt="session icon" /> : resolveSessionIcon(session)}</div>
                    <div>
                      <strong>{session.name}</strong>
                      <p className="muted" title={getSessionMetaLabel(session)}>{session.protocol.toUpperCase()} • {session.host}:{session.port}</p>
                      <div className="row session-badges">
                        {session.favorite && <span className="session-chip">Favorite</span>}
                        {session.folder && <span className="session-chip">{session.folder}</span>}
                        {session.tags.slice(0, 2).map((tag) => <span key={tag} className="session-chip">{tag}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <button onClick={() => openTab(session)}>Connect</button>
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
              {filtered.length > visibleSessions.length && <p className="muted">Showing first {visibleSessions.length} of {filtered.length} sessions for performance.</p>}
            </div>
          </section>

          {activeTabs.map((session) => (
            <section key={session.id} className="card remote-session-card">
              <RemoteSessionToolbar
                session={session}
                status={sessionStatus[session.id] ?? 'connected'}
                onCommand={(command) => handleToolbarCommand(session, command)}
              />
              {sessionMessages[session.id] && <p className="muted remote-toast">{sessionMessages[session.id]}</p>}
              <RemoteView session={session}>
                {session.protocol === 'ssh' && <SshTerminalView session={session} />}
                {session.protocol === 'sftp' && <SftpExplorerView session={session} />}
                {session.protocol === 'rdp' && (
                  <div>
                    <p>RDP sessions launch in system client in MVP.</p>
                    <button onClick={() => window.api.launchRdp(session)}>Reconnect with system RDP client</button>
                  </div>
                )}
              </RemoteView>
            </section>
          ))}
        </main>
      </div>

      {showCredentials && (
        <div className="modal-backdrop" onClick={() => setShowCredentials(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <CredentialManager
              credentials={credentials}
              onCreate={async (payload, password) => {
                const next = await window.api.createCredential(payload, password);
                setCredentials(next);
              }}
              onUpdate={async (payload, password) => {
                const next = await window.api.updateCredential(payload, password);
                setCredentials(next);
              }}
              onDelete={async (credentialId) => {
                const next = await window.api.deleteCredential(credentialId);
                setCredentials(next);
              }}
            />
          </div>
        </div>
      )}

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
              credentials={credentials}
              onManageCredentials={() => setShowCredentials(true)}
              onRememberCredential={async (payload) => {
                const id = crypto.randomUUID();
                const type = payload.protocol === 'rdp' ? 'windows' : payload.protocol === 'ssh' ? 'linux' : 'generic';
                const next = await window.api.createCredential({
                  id,
                  name: payload.name,
                  username: payload.username,
                  domain: payload.domain,
                  type,
                  tags: [payload.protocol],
                  favorite: false,
                  lastUsed: undefined
                }, payload.password);
                setCredentials(next);
                return id;
              }}
              onCancel={() => { setShowForm(false); setEditing(undefined); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
