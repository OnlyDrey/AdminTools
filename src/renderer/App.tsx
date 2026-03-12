import { useEffect, useMemo, useState } from 'react';
import type { ConnectionDiagnostic, ConnectionState, CredentialProfile, FolderNode, Session, SessionTemplate } from '../shared/types';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { CredentialManager } from './components/CredentialManager';
import { RemoteSessionToolbar, type RemoteCommand } from './components/RemoteSessionToolbar';
import { RemoteView } from './components/RemoteView';
import { SessionForm } from './components/SessionForm';
import { SessionTreeSidebar } from './components/SessionTreeSidebar';
import { SftpExplorerView } from './components/SftpExplorerView';
import { SshTerminalView } from './components/SshTerminalView';
import { routeRemoteCommand } from './remoteCommandRouter';
import { getSessionMetaLabel, resolveSessionIcon } from './sessionIcons';
import { useVault } from './hooks/useVault';

export function App() {
  const {
    vault,
    upsertSession,
    deleteSession,
    duplicateSession,
    save,
    bridgeError,
    addActivity,
    upsertFolder,
    deleteFolder,
    reorderSessions,
    upsertTemplate,
    deleteTemplate,
    clearActivity
  } = useVault();

  const [search, setSearch] = useState('');
  const [quickConnect, setQuickConnect] = useState('');
  const [activeTabIds, setActiveTabIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Session | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [credentials, setCredentials] = useState<CredentialProfile[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<Record<string, ConnectionState>>({});
  const [sessionMessages, setSessionMessages] = useState<Record<string, string>>({});
  const [diagnostics, setDiagnostics] = useState<Record<string, ConnectionDiagnostic | undefined>>({});

  const sessions = vault?.sessions ?? [];
  const folders = vault?.folders ?? [];
  const templates = vault?.templates ?? [];
  const selectedFolderId = vault?.appSettings.selectedFolderId;
  const expandedFolderIds = vault?.appSettings.expandedFolderIds ?? [];

  useEffect(() => {
    window.api.listCredentials().then(setCredentials).catch(() => setCredentials([]));
  }, [vault?.schemaVersion]);

  const filtered = useMemo(() => {
    const byFolder = (session: Session) => {
      if (!selectedFolderId) return true;
      return session.folderId === selectedFolderId;
    };
    return sessions.filter((session) => {
      const query = `${session.name} ${session.host} ${session.tags.join(' ')}`.toLowerCase();
      return query.includes(search.toLowerCase()) && byFolder(session);
    });
  }, [search, selectedFolderId, sessions]);

  const visibleSessions = useMemo(() => filtered.slice(0, 250), [filtered]);

  const openTab = async (session: Session) => {
    setSelectedSessionId(session.id);
    setActiveTabIds((current) => (current.includes(session.id) ? current : [...current, session.id]));
    setSessionStatus((current) => ({ ...current, [session.id]: current[session.id] ?? 'idle' }));
    if (vault && !vault.appSettings.recentSessionIds.includes(session.id)) {
      await save({
        ...vault,
        appSettings: {
          ...vault.appSettings,
          recentSessionIds: [session.id, ...vault.appSettings.recentSessionIds].slice(0, 20)
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

  const setState = async (session: Session, next: ConnectionState, message?: string, category: ConnectionDiagnostic['category'] = 'unknown') => {
    setSessionStatus((current) => ({ ...current, [session.id]: next }));
    if (message) {
      setToast(session.id, message);
      setDiagnostics((current) => ({
        ...current,
        [session.id]: {
          host: session.host,
          protocol: session.protocol,
          port: session.port,
          timestamp: new Date().toISOString(),
          category,
          message
        }
      }));
    }
    await addActivity({
      eventType: next === 'connected' ? 'session_connected' : next === 'disconnected' ? 'session_disconnected' : next === 'reconnecting' ? 'reconnect_attempted' : next === 'auth_failed' ? 'authentication_failed' : 'session_edited',
      protocol: session.protocol,
      targetHost: session.host,
      sessionName: session.name,
      status: next === 'failed' || next === 'auth_failed' || next === 'timeout' ? 'error' : next === 'reconnecting' ? 'warning' : 'ok',
      message: message ?? `State -> ${next}`
    });
  };

  const handleToolbarCommand = async (session: Session, command: RemoteCommand) => {
    await routeRemoteCommand(session, command, {
      reconnect: async () => {
        await setState(session, 'reconnecting', 'Reconnect attempted');
        if (session.protocol === 'rdp') {
          await window.api.launchRdp(session).catch(async () => setState(session, 'failed', 'RDP client launch failed', 'network'));
        }
        window.setTimeout(() => {
          setState(session, 'connected', 'Connected');
        }, 350);
      },
      disconnect: async () => {
        await setState(session, 'disconnected', 'Session disconnected');
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
      if (target?.closest('[data-terminal-input="true"]')) return;

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
      if (event.key === 'Enter' && quickConnect.includes(':')) {
        const [host, port] = quickConnect.split(':');
        addActivity({ eventType: 'quick_connect_used', protocol: 'ssh', targetHost: host, status: 'ok', message: `Quick connect used for ${host}:${port}` }).catch(() => undefined);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addActivity, quickConnect]);

  if (bridgeError) {
    return (
      <div className="app dark">
        <main className="main">
          <section className="card">
            <h2>Renderer startup error</h2>
            <p className="muted">{bridgeError}</p>
          </section>
        </main>
      </div>
    );
  }

  const activeTabs = activeTabIds.map((id) => sessions.find((session) => session.id === id)).filter(Boolean) as Session[];
  const recentSessions = (vault?.appSettings.recentSessionIds ?? []).map((id) => sessions.find((item) => item.id === id)).filter(Boolean) as Session[];

  const selectedIndex = visibleSessions.findIndex((s) => s.id === selectedSessionId);

  const moveSessionToFolder = async (sessionId: string, folderId?: string) => {
    if (!vault) return;
    const sessionsNext = vault.sessions.map((session) => (session.id === sessionId ? { ...session, folderId } : session));
    await reorderSessions(sessionsNext);
  };

  return (
    <div className="app dark">
      <header className="topbar topbar-3">
        <input id="quick-connect" value={quickConnect} onChange={(e) => setQuickConnect(e.target.value)} placeholder="Quick connect (host:port)" />
        <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sessions" />
        <div className="row">
          <button onClick={() => setShowActivity(true)}>Activity</button>
          <button onClick={() => setShowTemplates(true)}>Templates</button>
          <button onClick={() => setShowCredentials(true)}>Credentials</button>
          <button onClick={() => { setEditing(undefined); setShowForm(true); }}>＋ New Session</button>
        </div>
      </header>

      <div className="layout">
        <SessionTreeSidebar
          folders={folders}
          sessions={sessions}
          expandedFolderIds={expandedFolderIds}
          selectedFolderId={selectedFolderId}
          onToggleExpand={async (folderId) => {
            if (!vault) return;
            const expanded = expandedFolderIds.includes(folderId) ? expandedFolderIds.filter((id) => id !== folderId) : [...expandedFolderIds, folderId];
            await save({ ...vault, appSettings: { ...vault.appSettings, expandedFolderIds: expanded } });
          }}
          onSelectFolder={async (folderId) => {
            if (!vault) return;
            await save({ ...vault, appSettings: { ...vault.appSettings, selectedFolderId: folderId } });
          }}
          onNewFolder={(parentId) => {
            const name = prompt('Folder name');
            if (!name) return;
            upsertFolder({ id: crypto.randomUUID(), name, parentId, order: folders.filter((f) => f.parentId === parentId).length });
          }}
          onRenameFolder={(folder) => {
            const name = prompt('Rename folder', folder.name);
            if (!name) return;
            upsertFolder({ ...folder, name });
          }}
          onDeleteFolder={(folderId) => {
            if (confirm('Delete folder? Sessions will move to unassigned.')) deleteFolder(folderId);
          }}
          onDropSessionToFolder={moveSessionToFolder}
        />

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
            <div className="row between"><h2>Sessions</h2><p className="muted">{filtered.length} shown</p></div>
            <div
              className="session-list"
              role="listbox"
              tabIndex={0}
              onKeyDown={(event) => {
                if (!visibleSessions.length) return;
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
                  openTab(visibleSessions[selectedIndex]).catch(() => undefined);
                }
              }}
            >
              {visibleSessions.map((session) => (
                <div
                  className={selectedSessionId === session.id ? 'session-row selected' : 'session-row'}
                  key={session.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/session-id', session.id)}
                  onClick={() => setSelectedSessionId(session.id)}
                >
                  <div className="session-primary">
                    <div className="session-icon" title={getSessionMetaLabel(session)}>{resolveSessionIcon(session).startsWith('data:') ? <img className="session-icon-img" src={resolveSessionIcon(session)} alt="session icon" /> : resolveSessionIcon(session)}</div>
                    <div>
                      <strong>{session.name}</strong>
                      <p className="muted">{session.protocol.toUpperCase()} • {session.host}:{session.port}</p>
                      <div className="row session-badges">
                        {session.favorite && <span className="session-chip">Favorite</span>}
                        {session.folderId && <span className="session-chip">{folders.find((f) => f.id === session.folderId)?.name ?? 'Folder'}</span>}
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
                        <button onClick={() => moveSessionToFolder(session.id, undefined)}>Move to root</button>
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
              <RemoteSessionToolbar session={session} status={sessionStatus[session.id] ?? 'idle'} onCommand={(command) => handleToolbarCommand(session, command)} />
              {sessionMessages[session.id] && <p className="muted remote-toast">{sessionMessages[session.id]}</p>}
              {diagnostics[session.id] && <p className="muted">{diagnostics[session.id]?.category}: {diagnostics[session.id]?.message}</p>}
              <RemoteView session={session}>
                {session.protocol === 'ssh' && <SshTerminalView session={session} />}
                {session.protocol === 'sftp' && <SftpExplorerView session={session} />}
                {session.protocol === 'rdp' && <div><p>RDP sessions launch in system client in MVP.</p><button onClick={() => window.api.launchRdp(session)}>Reconnect with system RDP client</button></div>}
              </RemoteView>
            </section>
          ))}
        </main>
      </div>

      {showCredentials && <div className="modal-backdrop" onClick={() => setShowCredentials(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><CredentialManager credentials={credentials} onCreate={async (payload, password) => { const next = await window.api.createCredential(payload, password); setCredentials(next); await addActivity({ eventType: 'credential_created', status: 'ok', message: `Credential created: ${payload.name}` }); }} onUpdate={async (payload, password) => { const next = await window.api.updateCredential(payload, password); setCredentials(next); await addActivity({ eventType: 'credential_updated', status: 'ok', message: `Credential updated: ${payload.name}` }); }} onDelete={async (credentialId) => { const next = await window.api.deleteCredential(credentialId); setCredentials(next); await addActivity({ eventType: 'credential_deleted', status: 'warning', message: 'Credential deleted' }); }} /></div></div>}

      {showActivity && <div className="modal-backdrop" onClick={() => setShowActivity(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><ActivityLogPanel events={vault?.activityLog ?? []} onClear={clearActivity} /></div></div>}

      {showTemplates && <div className="modal-backdrop" onClick={() => setShowTemplates(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><section className="card"><div className="row between"><h3>Templates</h3><button onClick={() => { const name = prompt('Template name'); if (!name) return; upsertTemplate({ id: crypto.randomUUID(), name, protocol: 'ssh', defaultPort: 22, favorite: false, order: templates.length }); }}>+ New template</button></div><div className="session-list">{templates.sort((a,b)=>a.order-b.order).map((template)=><div className="session-row" key={template.id}><div><strong>{template.name}</strong><p className="muted">{template.protocol.toUpperCase()} • {template.defaultPort}</p></div><div className="row"><button onClick={()=>upsertTemplate({...template, favorite: !template.favorite})}>{template.favorite?'★':'☆'}</button><button onClick={()=>deleteTemplate(template.id)}>Delete</button></div></div>)}</div></section></div></div>}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <SessionForm
              onSave={async (session) => {
                const next = editing ? session : { ...session, folderId: selectedFolderId };
                await upsertSession(next);
                setShowForm(false);
                setEditing(undefined);
              }}
              existing={editing}
              credentials={credentials}
              templates={templates}
              onManageCredentials={() => setShowCredentials(true)}
              onRememberCredential={async (payload) => {
                const id = crypto.randomUUID();
                const type = payload.protocol === 'rdp' ? 'windows' : payload.protocol === 'ssh' ? 'linux' : 'generic';
                const next = await window.api.createCredential({ id, name: payload.name, username: payload.username, domain: payload.domain, type, tags: [payload.protocol], favorite: false, lastUsed: undefined }, payload.password);
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
