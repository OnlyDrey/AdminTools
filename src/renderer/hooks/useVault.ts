import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import type { Session, VaultFile } from '../../shared/types';
import { seedSessions } from '../seed';

export function useVault() {
  const [vault, setVault] = useState<VaultFile | null>(null);
  const [masterPassword, setMasterPassword] = useState('admin');
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.api || typeof window.api.loadVault !== 'function') {
      setBridgeError('Preload API is unavailable. Ensure Electron loaded preload.js before renderer startup.');
      return;
    }

    setBridgeError(null);
    window.api.loadVault(masterPassword)
      .then((loaded) => {
        if (loaded.sessions.length === 0) {
          loaded.sessions = seedSessions;
        }
        loaded.appSettings = loaded.appSettings ?? DEFAULT_SETTINGS;
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

  const upsertSession = async (session: Session) => {
    if (!vault) return;
    const exists = vault.sessions.find((item) => item.id === session.id);
    const sessions = exists
      ? vault.sessions.map((item) => (item.id === session.id ? session : item))
      : [...vault.sessions, session];
    await save({ ...vault, sessions });
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

  return { vault, masterPassword, setMasterPassword, bridgeError, save, upsertSession, deleteSession, duplicateSession };
}
