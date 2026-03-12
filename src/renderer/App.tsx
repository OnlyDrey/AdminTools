import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ConnectionDiagnostic,
  ConnectionState,
  CredentialProfile,
  FolderNode,
  RdpEmbeddedCapability,
  RdpLaunchResult,
  RdpSession,
  Session,
  SessionTemplate,
  SmartView,
  WorkspaceLayout,
  WorkspacePane,
  WorkspaceViewInstance
} from '../shared/types';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { CredentialManager } from './components/CredentialManager';
import { RdpSessionPanel } from './components/RdpSessionPanel';
import { RemoteSessionToolbar, type RemoteCommand } from './components/RemoteSessionToolbar';
import { RemoteView } from './components/RemoteView';
import { SessionForm } from './components/SessionForm';
import { SessionTreeSidebar } from './components/SessionTreeSidebar';
import { SftpExplorerView } from './components/SftpExplorerView';
import { SshTerminalView } from './components/SshTerminalView';
import { useVault } from './hooks/useVault';
import { routeRemoteCommand } from './remoteCommandRouter';
import { getSessionMetaLabel, resolveSessionIcon } from './sessionIcons';

const defaultLayout: WorkspaceLayout = {
  split: 'none',
  panes: [{ id: 'pane-main', tabIds: [], size: 1 }],
  focusedPaneId: 'pane-main'
};

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
    upsertSmartView
  } = useVault();

  const [search, setSearch] = useState('');
  const [quickConnect, setQuickConnect] = useState('');
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
  const [rdpCapability, setRdpCapability] = useState<RdpEmbeddedCapability | undefined>();
  const didRestoreRef = useRef(false);

  const sessions = vault?.sessions ?? [];
  const folders = vault?.folders ?? [];
  const templates = vault?.templates ?? [];
  const selectedFolderId = vault?.appSettings.selectedFolderId;
  const expandedFolderIds = vault?.appSettings.expandedFolderIds ?? [];
  const smartViews = vault?.smartViews ?? [];
  const workspace = vault?.appSettings.workspace;

  const layout = workspace?.layout ?? defaultLayout;
  const viewInstances = workspace?.viewInstances ?? [];
  const focusedPaneId = layout.focusedPaneId ?? layout.panes[0]?.id;

  useEffect(() => {
    window.api.listCredentials().then(setCredentials).catch(() => setCredentials([]));
    window.api.getRdpEmbeddedCapability().then(setRdpCapability).catch(() => setRdpCapability(undefined));
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
        [session.id]: { host: session.host, protocol: session.protocol, port: session.port, timestamp: new Date().toISOString(), category, message }
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

  const persistWorkspace = async (patch: Partial<typeof workspace>) => {
    await updateWorkspace(patch as any);
  };

  const getView = (viewId: string) => viewInstances.find((v) => v.id === viewId);
  const getSessionForView = (viewId?: string) => {
    if (!viewId) return undefined;
    const view = getView(viewId);
    if (!view) return undefined;
    return sessions.find((s) => s.id === view.sessionId);
  };

  const openSessionInPane = async (session: Session, paneId = focusedPaneId) => {
    if (!paneId) return;
    const viewId = crypto.randomUUID();
    const view: WorkspaceViewInstance = { id: viewId, sessionId: session.id, createdAt: new Date().toISOString() };
    const nextViews = [...viewInstances, view];
    const nextPanes = layout.panes.map((pane) => pane.id === paneId ? { ...pane, tabIds: [...pane.tabIds, viewId], activeTabId: viewId } : pane);
    await persistWorkspace({ viewInstances: nextViews, layout: { ...layout, panes: nextPanes, focusedPaneId: paneId } });
    setSessionStatus((current) => ({ ...current, [session.id]: current[session.id] ?? 'idle' }));
    if (vault && !vault.appSettings.recentSessionIds.includes(session.id)) {
      await save({ ...vault, appSettings: { ...vault.appSettings, recentSessionIds: [session.id, ...vault.appSettings.recentSessionIds].slice(0, 20) } });
    }
  };

  const splitFocusedPane = async (direction: 'vertical' | 'horizontal', session?: Session) => {
    const sourcePane = layout.panes.find((p) => p.id === focusedPaneId) ?? layout.panes[0];
    if (!sourcePane) return;
    const newPaneId = crypto.randomUUID();
    let nextViews = [...viewInstances];
    const newTabIds: string[] = [];
    if (session) {
      const v: WorkspaceViewInstance = { id: crypto.randomUUID(), sessionId: session.id, createdAt: new Date().toISOString() };
      nextViews = [...nextViews, v];
      newTabIds.push(v.id);
    }
    const panes = layout.panes.map((p) => p.id === sourcePane.id ? { ...p, size: p.size / 2 } : p);
    panes.push({ id: newPaneId, tabIds: newTabIds, activeTabId: newTabIds[0], size: sourcePane.size / 2 });
    await persistWorkspace({ viewInstances: nextViews, layout: { split: direction, panes, focusedPaneId: newPaneId } });
    if (session) setSessionStatus((current) => ({ ...current, [session.id]: current[session.id] ?? 'idle' }));
  };

  const closeView = async (pane: WorkspacePane, viewId: string) => {
    const nextViews = viewInstances.filter((v) => v.id !== viewId);
    const nextPanes = layout.panes.map((p) => {
      if (p.id !== pane.id) return p;
      const tabIds = p.tabIds.filter((id) => id !== viewId);
      return { ...p, tabIds, activeTabId: tabIds.includes(p.activeTabId ?? '') ? p.activeTabId : tabIds[0] };
    }).filter((p) => p.tabIds.length > 0 || layout.panes.length === 1);
    const normalized = nextPanes.length ? nextPanes : [{ id: 'pane-main', tabIds: [], size: 1 }];
    await persistWorkspace({ viewInstances: nextViews, layout: { ...layout, panes: normalized, focusedPaneId: normalized[0].id } });
  };

  const closePane = async (paneId: string) => {
    if (layout.panes.length <= 1) return;
    const pane = layout.panes.find((p) => p.id === paneId);
    if (!pane) return;
    const remove = new Set(pane.tabIds);
    const nextViews = viewInstances.filter((v) => !remove.has(v.id));
    const nextPanes = layout.panes.filter((p) => p.id !== paneId);
    const equalSize = 1 / nextPanes.length;
    await persistWorkspace({ viewInstances: nextViews, layout: { ...layout, panes: nextPanes.map((p) => ({ ...p, size: equalSize })), focusedPaneId: nextPanes[0]?.id } });
  };

  const launchRdpFromTab = async (session: RdpSession) => {
    await setState(session, 'connecting', 'Launching RDP…');
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
        window.setTimeout(() => { setState(session, 'connected', 'Connected'); }, 250);
      },
      disconnect: async () => setState(session, 'disconnected', 'Session disconnected'),
      detach: async () => {
        await window.api.detachSession(session);
        setToast(session.id, 'Detached to session window');
      },
      feedback: (message) => setToast(session.id, message)
    });
  };

  useEffect(() => {
    if (!workspace?.reopenOnStartup || didRestoreRef.current) return;
    didRestoreRef.current = true;
    if (workspace.searchQuery) setSearch(workspace.searchQuery);
  }, [workspace]);

  useEffect(() => {
    if (!workspace) return;
    updateWorkspace({ searchQuery: search }).catch(() => undefined);
  }, [search, updateWorkspace, workspace]);

  const moveSessionToFolder = async (sessionId: string, folderId?: string) => {
    if (!vault) return;
    const sessionsNext = vault.sessions.map((session) => (session.id === sessionId ? { ...session, folderId } : session));
    await reorderSessions(sessionsNext);
  };

  const renderSessionSurface = (session: Session, viewId: string) => (
    <section key={viewId} className="remote-session-pane">
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
      {session.protocol === 'rdp' && (
        <p className="muted rdp-mode-note">
          RDP mode: {rdpCapability?.available ? 'Embedded helper detected (experimental)' : 'External client mode'}.
          {rdpCapability ? ` ${rdpCapability.reason}` : ''}
        </p>
      )}
    </section>
  );

  if (bridgeError) {
    return <div className="app dark"><main className="main"><section className="card"><h2>Renderer startup error</h2><p className="muted">{bridgeError}</p></section></main></div>;
  }

  return (
    <div className="app dark polished">
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
          <section className="card compact-card">
            <div className="row between"><h2>Sessions</h2><p className="muted">{filtered.length} shown</p></div>
            <div className="session-list compact-list">
              {visibleSessions.map((session) => (
                <div className={selectedSessionId === session.id ? 'session-row selected' : 'session-row'} key={session.id} onClick={() => { setSelectedSessionId(session.id); setSelectedSessionIds([session.id]); }}>
                  <div className="session-primary">
                    <div className="session-icon" title={getSessionMetaLabel(session)}>{resolveSessionIcon(session).startsWith('data:') ? <img className="session-icon-img" src={resolveSessionIcon(session)} alt="session icon" /> : resolveSessionIcon(session)}</div>
                    <div>
                      <strong>{session.name}</strong>
                      <p className="muted">{session.protocol.toUpperCase()} • {session.host}:{session.port}</p>
                    </div>
                  </div>
                  <div className="row">
                    <button onClick={(e) => { e.stopPropagation(); openSessionInPane(session).catch(() => undefined); }}>Open</button>
                    <button onClick={(e) => { e.stopPropagation(); splitFocusedPane('vertical', session).catch(() => undefined); }}>Split right</button>
                    <button onClick={(e) => { e.stopPropagation(); splitFocusedPane('horizontal', session).catch(() => undefined); }}>Split down</button>
                    {session.protocol === 'ssh' && <button onClick={(e) => { e.stopPropagation(); openSessionInPane(session).catch(() => undefined); }}>Duplicate view</button>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card workspace-shell">
            <div className="row between workspace-actions">
              <h3>Workspace</h3>
              <div className="row">
                <button onClick={() => splitFocusedPane('vertical').catch(() => undefined)}>Split right</button>
                <button onClick={() => splitFocusedPane('horizontal').catch(() => undefined)}>Split down</button>
                <button onClick={() => persistWorkspace({ layout: defaultLayout, viewInstances: [] }).catch(() => undefined)}>Reset layout</button>
              </div>
            </div>

            <div className={layout.split === 'horizontal' ? 'pane-grid horizontal' : 'pane-grid'}>
              {layout.panes.map((pane) => {
                const activeViewId = pane.activeTabId ?? pane.tabIds[0];
                const activeSession = getSessionForView(activeViewId);
                return (
                  <article
                    key={pane.id}
                    className={focusedPaneId === pane.id ? 'workspace-pane focused' : 'workspace-pane'}
                    style={{ flex: pane.size }}
                    onClick={() => persistWorkspace({ layout: { ...layout, focusedPaneId: pane.id } }).catch(() => undefined)}
                  >
                    <div className="pane-tab-strip">
                      {pane.tabIds.map((tabId) => {
                        const session = getSessionForView(tabId);
                        if (!session) return null;
                        return (
                          <button key={tabId} className={tabId === activeViewId ? 'tab-pill active' : 'tab-pill'} onClick={(e) => {
                            e.stopPropagation();
                            const panes = layout.panes.map((p) => p.id === pane.id ? { ...p, activeTabId: tabId } : p);
                            persistWorkspace({ layout: { ...layout, panes, focusedPaneId: pane.id } }).catch(() => undefined);
                          }}>
                            {session.name}
                            <span onClick={(e) => { e.stopPropagation(); closeView(pane, tabId).catch(() => undefined); }}> ×</span>
                          </button>
                        );
                      })}
                      <button className="pane-close" disabled={layout.panes.length <= 1} onClick={(e) => { e.stopPropagation(); closePane(pane.id).catch(() => undefined); }}>Close pane</button>
                    </div>
                    <div className="pane-content">
                      {activeSession && activeViewId ? renderSessionSurface(activeSession, activeViewId) : <p className="muted">No session in this pane. Open from session list.</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {showCredentials && <div className="modal-backdrop" onClick={() => setShowCredentials(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><CredentialManager credentials={credentials} onCreate={async (payload, password) => { const next = await window.api.createCredential(payload, password); setCredentials(next); }} onUpdate={async (payload, password) => { const next = await window.api.updateCredential(payload, password); setCredentials(next); }} onDelete={async (credentialId) => { const next = await window.api.deleteCredential(credentialId); setCredentials(next); }} /></div></div>}
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
              onSaveAndConnect={async (session) => {
                const next = editing ? session : { ...session, folderId: selectedFolderId };
                await upsertSession(next);
                await openSessionInPane(next);
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
