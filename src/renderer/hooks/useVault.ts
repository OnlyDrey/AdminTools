import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import type { ActivityEvent, FolderNode, Session, SessionTemplate, VaultFile } from '../../shared/types';
import { seedSessions } from '../seed';

const ACTIVITY_RETENTION = 500;

function ensureFolders(loaded: VaultFile): FolderNode[] {
  if (loaded.folders.length > 0) return loaded.folders;
  const unique = [...new Set(loaded.sessions.map((s) => s.folder).filter(Boolean))] as string[];
  return unique.map((name, index) => ({ id: crypto.randomUUID(), name, order: index }));
}

export function useVault() {
  const [vault, setVault] = useState<VaultFile | null>(null);
  const [masterPassword, setMasterPassword] = useState('admin');
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.api || typeof window.api.loadVault !== 'function') {
      setBridgeError('Preload API is unavailable. Ensure Electron loaded preload.cjs before renderer startup.');
      return;
    }

    setBridgeError(null);
    window.api.loadVault(masterPassword)
      .then((loaded) => {
        if (loaded.sessions.length === 0) loaded.sessions = seedSessions;
        loaded.appSettings = { ...DEFAULT_SETTINGS, ...(loaded.appSettings ?? {}) };
        loaded.folders = ensureFolders(loaded);
        loaded.templates = loaded.templates ?? [];
        loaded.activityLog = loaded.activityLog ?? [];
        setVault(loaded);
      })
      .catch((error: unknown) => {
        setBridgeError(`Failed to load vault: ${(error as Error).message}`);
      });
  }, [masterPassword]);

  const save = async (next: VaultFile) => {
    setVault(next);
    await window.api.saveVault(next);
  };

  const addActivity = async (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    if (!vault) return;
    const entry: ActivityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    const activityLog = [entry, ...vault.activityLog].slice(0, ACTIVITY_RETENTION);
    await save({ ...vault, activityLog });
  };

  const upsertSession = async (session: Session) => {
    if (!vault) return;
    const exists = vault.sessions.find((item) => item.id === session.id);
    const sessions = exists
      ? vault.sessions.map((item) => (item.id === session.id ? session : item))
      : [...vault.sessions, session];
    await save({ ...vault, sessions });
    await addActivity({ eventType: exists ? 'session_edited' : 'session_created', protocol: session.protocol, targetHost: session.host, sessionName: session.name, status: 'ok', message: exists ? 'Session updated' : 'Session created' });
  };

  const deleteSession = async (sessionId: string) => {
    if (!vault) return;
    await save({ ...vault, sessions: vault.sessions.filter((item) => item.id !== sessionId) });
  };

  const duplicateSession = async (session: Session) => {
    const clone: Session = {
      ...session,
      id: crypto.randomUUID(),
      name: `${session.name} (copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await upsertSession(clone);
  };

  const upsertFolder = async (folder: FolderNode) => {
    if (!vault) return;
    const exists = vault.folders.find((item) => item.id === folder.id);
    const folders = exists ? vault.folders.map((item) => (item.id === folder.id ? folder : item)) : [...vault.folders, folder];
    await save({ ...vault, folders });
  };

  const deleteFolder = async (folderId: string) => {
    if (!vault) return;
    const childFolderIds = vault.folders.filter((f) => f.parentId === folderId).map((f) => f.id);
    const removeSet = new Set([folderId, ...childFolderIds]);
    const folders = vault.folders.filter((f) => !removeSet.has(f.id));
    const sessions = vault.sessions.map((s) => (s.folderId && removeSet.has(s.folderId) ? { ...s, folderId: undefined } : s));
    await save({ ...vault, folders, sessions });
  };

  const reorderFolders = async (folders: FolderNode[]) => {
    if (!vault) return;
    await save({ ...vault, folders });
  };

  const reorderSessions = async (sessions: Session[]) => {
    if (!vault) return;
    await save({ ...vault, sessions });
  };

  const upsertTemplate = async (template: SessionTemplate) => {
    if (!vault) return;
    const exists = vault.templates.find((t) => t.id === template.id);
    const templates = exists ? vault.templates.map((t) => (t.id === template.id ? template : t)) : [...vault.templates, template];
    await save({ ...vault, templates });
  };

  const deleteTemplate = async (templateId: string) => {
    if (!vault) return;
    await save({ ...vault, templates: vault.templates.filter((t) => t.id !== templateId) });
  };

  const clearActivity = async () => {
    if (!vault) return;
    await save({ ...vault, activityLog: [] });
  };

  return {
    vault,
    masterPassword,
    setMasterPassword,
    bridgeError,
    save,
    addActivity,
    upsertSession,
    deleteSession,
    duplicateSession,
    upsertFolder,
    deleteFolder,
    reorderFolders,
    reorderSessions,
    upsertTemplate,
    deleteTemplate,
    clearActivity
  };
}
