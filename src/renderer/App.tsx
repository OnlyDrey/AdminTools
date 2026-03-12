import { useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectionDiagnostic, ConnectionState, CredentialProfile, FolderNode, RdpLaunchResult, RdpSession, Session, SessionTemplate, SmartView } from '../shared/types';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { CredentialManager } from './components/CredentialManager';
import { RemoteSessionToolbar, type RemoteCommand } from './components/RemoteSessionToolbar';
import { RemoteView } from './components/RemoteView';
import { RdpSessionPanel } from './components/RdpSessionPanel';
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
    clearActivity,
    updateWorkspace,
    upsertSmartView,
    deleteSmartView
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
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<Record<string, ConnectionState>>({});
  const [sessionMessages, setSessionMessages] = useState<Record<string, string>>({});
  const [diagnostics, setDiagnostics] = useState<Record<string, ConnectionDiagnostic | undefined>>({});
  const [rdpLaunchInfo, setRdpLaunchInfo] = useState<Record<string, RdpLaunchResult | undefined>>({});
  const didRestoreRef = useRef(false);
  const detachedSessionId = useMemo(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash.startsWith('/detached/')) return undefined;
    return hash.split('/')[2];
  }, []);

  const sessions = vault?.sessions ?? [];
  const folders = vault?.folders ?? [];
  const templates = vault?.templates ?? [];
  const selectedFolderId = vault?.appSettings.selectedFolderId;
  const expandedFolderIds = vault?.appSettings.expandedFolderIds ?? [];
  const smartViews = vault?.smartViews ?? [];
  const workspace = vault?.appSettings.workspace;

  useEffect(() => {
    window.api.listCredentials().then(setCredentials).catch(() => setCredentials([]));
  }, [vault?.schemaVersion]);

  const activeView = smartViews.find((v) => v.id === workspace?.selectedViewId);

  const filtered = useMemo(() => {
    const byFolder = (session: Session) => {
      const folderScope = activeView?.folderId ?? selectedFolderId;
      if (!folderScope) return true;
      return session.folderId === folderScope;
    };
    return sessions.filter((session) => {
      const queryText = activeView?.query ?? search;
      const query = `${session.name} ${session.host} ${session.tags.join(' ')}`.toLowerCase();
      if (activeView?.protocol && session.protocol !== activeView.protocol) return false;
      if (activeView?.favoritesOnly && !session.favorite) return false;
      if (activeView?.tags?.length && !activeView.tags.every((tag) => session.tags.includes(tag))) return false;
      return query.includes(queryText.toLowerCase()) && byFolder(session);
    });
  }, [activeView, search, selectedFolderId, sessions]);

  const visibleSessions = useMemo(() => filtered.slice(0, 250), [filtered]);

  const openTab = async (session: Session) => {
    setSelectedSessionId(session.id);
    setActiveTabIds((current) => (current.includes(session.id) ? current : [...current, session.id]));
    setSessionStatus((current) => ({ ...current, [session.id]: current[session.id] ?? 'idle' }));
    updateWorkspace({ openTabIds: Array.from(new Set([...(workspace?.openTabIds ?? []), session.id])), activeTabId: session.id }).catch(() => undefined);
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


  const launchRdpFromTab = async (session: RdpSession) => {
    await setState(session, 'connecting', 'Launching external RDP client…');
    const result = await window.api.launchRdp(session);
    setRdpLaunchInfo((current) => ({ ...current, [session.id]: result }));
    if (result.status === 'failed') {
      await setState(session, 'failed', result.message, 'network');
      return;
    }
    await setState(session, 'connected', result.warning ?? result.message);
  };

  const handleToolbarCommand = async (session: Session, command: RemoteCommand) => {
    await routeRemoteCommand(session, command, {
      reconnect: async () => {
        await setState(session, 'reconnecting', 'Reconnect attempted');
        if (session.protocol === 'rdp') {
          await launchRdpFromTab(session);
          return;
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
        setActiveTabIds((current) => current.filter((id) => id !== session.id));
        setToast(session.id, 'Detached to session window');
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
            <div className="row between"><h3>Smart Views</h3><button onClick={() => updateWorkspace({ selectedViewId: undefined })}>Clear</button></div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {smartViews.sort((a,b)=>a.order-b.order).map((view) => (
                <button key={view.id} className={workspace?.selectedViewId === view.id ? 'active' : ''} onClick={() => updateWorkspace({ selectedViewId: view.id })}>
                  {view.icon ?? '🔎'} {view.name}
                </button>
              ))}
              {smartViews.length === 0 && <p className="muted">No saved views yet.</p>}
            </div>
          </section>
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


  useEffect(() => {
    if (!workspace?.reopenOnStartup) return;
    if (didRestoreRef.current) return;
    const restoredIds = (workspace.openTabIds ?? []).filter((id) => sessions.some((s) => s.id === id));
    if (restoredIds.length === 0) {
      didRestoreRef.current = true;
      return;
    }
    setActiveTabIds(restoredIds);
    if (workspace.restoreActiveTab && workspace.activeTabId) {
      setSelectedSessionId(workspace.activeTabId);
    }
    if (workspace.searchQuery) {
      setSearch(workspace.searchQuery);
    }
    didRestoreRef.current = true;
    if (workspace.reconnectOnStartup) {
      restoredIds.forEach((id, index) => {
        const session = sessions.find((s) => s.id === id);
        if (!session) return;
        window.setTimeout(() => {
          handleToolbarCommand(session, 'reconnect').catch(() => undefined);
        }, 250 * index);
      });
    }
  }, [workspace, sessions]);

  useEffect(() => {
    if (!workspace) return;
    updateWorkspace({ searchQuery: search }).catch(() => undefined);
  }, [search, updateWorkspace, workspace]);



  const renderSessionSurface = (session: Session) => (
    <section key={session.id} className="card remote-session-card">
      <RemoteSessionToolbar session={session} status={sessionStatus[session.id] ?? 'idle'} onCommand={(command) => handleToolbarCommand(session, command)} />
      {sessionMessages[session.id] && <p className="muted remote-toast">{sessionMessages[session.id]}</p>}
      {diagnostics[session.id] && <p className="muted">{diagnostics[session.id]?.category}: {diagnostics[session.id]?.message}</p>}
      <RemoteView session={session}>
        {session.protocol === 'ssh' && <SshTerminalView session={session} />}
        {session.protocol === 'sftp' && <SftpExplorerView session={session} />}
        {session.protocol === 'rdp' && (
          <RdpSessionPanel
            session={session}
            status={sessionStatus[session.id] ?? 'idle'}
            launchInfo={rdpLaunchInfo[session.id]}
            onReconnect={() => handleToolbarCommand(session, 'reconnect').catch(() => undefined)}
            onDisconnect={() => handleToolbarCommand(session, 'disconnect').catch(() => undefined)}
            onDetach={() => handleToolbarCommand(session, 'detach').catch(() => undefined)}
            onSetDisplayMode={(mode) => upsertSession({ ...session, resolutionMode: mode }).catch(() => undefined)}
            onCopyHost={() => navigator.clipboard.writeText(`${session.host}:${session.port}`).catch(() => undefined)}
            onCopyUsername={() => navigator.clipboard.writeText(session.username).catch(() => undefined)}
          />
        )}
      </RemoteView>
    </section>
  );

  if (detachedSessionId) {
    const detachedSession = sessions.find((s) => s.id === detachedSessionId);
    if (!detachedSession) {
      return <div className="app dark"><main className="main"><section className="card"><h3>Detached session not found</h3></section></main></div>;
    }
    return (
      <div className="app dark detached-app">
        <header className="topbar detached-topbar">
          <strong>{detachedSession.name}</strong>
          <span className="muted">{detachedSession.protocol.toUpperCase()} • {sessionStatus[detachedSession.id] ?? 'idle'}</span>
          <button onClick={() => window.api.reattachSession(detachedSession.id)}>Reattach to main window</button>
        </header>
        <main className="main">{renderSessionSurface(detachedSession)}</main>
      </div>
    );
  }

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
          <button onClick={async () => {
            const name = prompt('Smart view name');
            if (!name) return;
            await upsertSmartView({ id: crypto.randomUUID(), name, query: search, folderId: selectedFolderId, pinned: true, order: smartViews.length });
          }}>Save view</button>
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
            await updateWorkspace({ expandedFolderIds: expanded });
          }}
          onSelectFolder={async (folderId) => {
            if (!vault) return;
            await save({ ...vault, appSettings: { ...vault.appSettings, selectedFolderId: folderId } });
            await updateWorkspace({ selectedFolderId: folderId, selectedViewId: undefined });
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
            <div className="row between"><h3>Smart Views</h3><button onClick={() => updateWorkspace({ selectedViewId: undefined })}>Clear</button></div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {smartViews.sort((a,b)=>a.order-b.order).map((view) => (
                <button key={view.id} className={workspace?.selectedViewId === view.id ? 'active' : ''} onClick={() => updateWorkspace({ selectedViewId: view.id })}>
                  {view.icon ?? '🔎'} {view.name}
                </button>
              ))}
              {smartViews.length === 0 && <p className="muted">No saved views yet.</p>}
            </div>
          </section>
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
            <div className="row between">
              <div className="row">
                <button onClick={() => setSelectedSessionIds(visibleSessions.map((s) => s.id))}>Select all</button>
                <button onClick={() => setSelectedSessionIds([])}>Clear selection</button>
                <span className="muted">{selectedSessionIds.length} selected</span>
              </div>
              {selectedSessionIds.length > 0 && (
                <div className="row">
                  <button onClick={() => visibleSessions.filter((s) => selectedSessionIds.includes(s.id)).forEach((s) => openTab(s))}>Connect selected</button>
                  <button onClick={async () => {
                    const tag = prompt('Tag to add');
                    if (!tag || !vault) return;
                    const next = vault.sessions.map((s) => selectedSessionIds.includes(s.id) ? { ...s, tags: Array.from(new Set([...s.tags, tag])) } : s);
                    await reorderSessions(next);
                  }}>Add tag</button>
                  <button onClick={async () => {
                    if (!vault) return;
                    if (!confirm(`Delete ${selectedSessionIds.length} sessions?`)) return;
                    for (const id of selectedSessionIds) await deleteSession(id);
                    setSelectedSessionIds([]);
                  }}>Delete selected</button>
                </div>
              )}
            </div>
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
                  className={selectedSessionIds.includes(session.id) ? 'session-row selected' : selectedSessionId === session.id ? 'session-row selected' : 'session-row'}
                  key={session.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/session-id', session.id)}
                  onClick={(e) => {
                    setSelectedSessionId(session.id);
                    if (e.shiftKey && selectedSessionId) {
                      const start = visibleSessions.findIndex((s) => s.id === selectedSessionId);
                      const end = visibleSessions.findIndex((s) => s.id === session.id);
                      const [a,b] = [Math.min(start,end), Math.max(start,end)];
                      setSelectedSessionIds(Array.from(new Set([...selectedSessionIds, ...visibleSessions.slice(a,b+1).map((s)=>s.id)])));
                    } else if (e.metaKey || e.ctrlKey) {
                      setSelectedSessionIds((current) => current.includes(session.id) ? current.filter((id) => id !== session.id) : [...current, session.id]);
                    } else {
                      setSelectedSessionIds([session.id]);
                    }
                  }}
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
                        {session.protocol === 'rdp' && <button onClick={() => openTab(session)}>Open RDP tab</button>}
                        <button onClick={() => handleToolbarCommand(session, 'detach')}>Detach</button>
                        <button onClick={() => deleteSession(session.id)}>Delete</button>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
              {filtered.length > visibleSessions.length && <p className="muted">Showing first {visibleSessions.length} of {filtered.length} sessions for performance.</p>}
            </div>
          </section>

          {activeTabs.map((session) => renderSessionSurface(session))}
        </main>
      </div>

      {showCredentials && <div className="modal-backdrop" onClick={() => setShowCredentials(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><CredentialManager credentials={credentials} onCreate={async (payload, password) => { const next = await window.api.createCredential(payload, password); setCredentials(next); await addActivity({ eventType: 'credential_created', status: 'ok', message: `Credential created: ${payload.name}` }); }} onUpdate={async (payload, password) => { const next = await window.api.updateCredential(payload, password); setCredentials(next); await addActivity({ eventType: 'credential_updated', status: 'ok', message: `Credential updated: ${payload.name}` }); }} onDelete={async (credentialId) => { const next = await window.api.deleteCredential(credentialId); setCredentials(next); await addActivity({ eventType: 'credential_deleted', status: 'warning', message: 'Credential deleted' }); }} /></div></div>}

      {showActivity && <div className="modal-backdrop" onClick={() => setShowActivity(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><ActivityLogPanel events={vault?.activityLog ?? []} onClear={clearActivity} /><section className="card"><h3>Workspace settings</h3><label className="checkbox-row"><input type="checkbox" checked={workspace?.reopenOnStartup ?? true} onChange={(e)=>updateWorkspace({reopenOnStartup:e.target.checked})} />Reopen previous workspace on startup</label><label className="checkbox-row"><input type="checkbox" checked={workspace?.reconnectOnStartup ?? false} onChange={(e)=>updateWorkspace({reconnectOnStartup:e.target.checked})} />Reconnect previously connected sessions on startup</label><label className="checkbox-row"><input type="checkbox" checked={workspace?.restoreActiveTab ?? true} onChange={(e)=>updateWorkspace({restoreActiveTab:e.target.checked})} />Restore last active tab</label><label className="checkbox-row"><input type="checkbox" checked={workspace?.restoreSidebar ?? true} onChange={(e)=>updateWorkspace({restoreSidebar:e.target.checked})} />Restore sidebar tree state</label></section></div></div>}

      {showTemplates && <div className="modal-backdrop" onClick={() => setShowTemplates(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><section className="card"><div className="row between"><h3>Templates</h3><div className="row"><button onClick={() => { const name = prompt('Template name'); if (!name) return; upsertTemplate({ id: crypto.randomUUID(), name, protocol: 'ssh', defaultPort: 22, favorite: false, order: templates.length }); }}>+ New template</button><button onClick={async () => { const out = prompt('Export full vault path'); if (!out) return; await window.api.exportFullVault(out); }}>Create backup</button><button onClick={async () => { const inp = prompt('Import (merge) vault path'); if (!inp) return; await window.api.importMergeVault(inp); }}>Import merge</button><button onClick={async () => { const inp = prompt('Import (replace) vault path'); if (!inp) return; if (!confirm('Replace current vault with imported file?')) return; await window.api.importReplaceVault(inp); window.location.reload(); }}>Import replace</button></div></div><div className="session-list">{templates.sort((a,b)=>a.order-b.order).map((template)=><div className="session-row" key={template.id}><div><strong>{template.name}</strong><p className="muted">{template.protocol.toUpperCase()} • {template.defaultPort}</p></div><div className="row"><button onClick={()=>upsertTemplate({...template, favorite: !template.favorite})}>{template.favorite?'★':'☆'}</button><button onClick={()=>deleteTemplate(template.id)}>Delete</button></div></div>)}</div></section></div></div>}

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
              onSaveAndConnect={async (session) => {
                const next = editing ? session : { ...session, folderId: selectedFolderId };
                await upsertSession(next);
                await openTab(next);
                setShowForm(false);
                setEditing(undefined);
              }}
              onCancel={() => { setShowForm(false); setEditing(undefined); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
