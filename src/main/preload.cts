import { contextBridge, ipcRenderer } from 'electron';
import type { CredentialProfile, Session, SessionImportExport, SftpEntry, VaultFile } from '../shared/types.js';

contextBridge.exposeInMainWorld('api', {
  loadVault: (masterPassword: string) => ipcRenderer.invoke('vault:load', masterPassword) as Promise<VaultFile>,
  saveVault: (vault: VaultFile) => ipcRenderer.invoke('vault:save', vault),
  decryptSecret: (id: string, password: string) => ipcRenderer.invoke('vault:decrypt-secret', id, password) as Promise<string | undefined>,
  encryptSecret: (id: string, secret: string, password: string) => ipcRenderer.invoke('vault:encrypt-secret', id, secret, password),
  exportSessions: (path: string) => ipcRenderer.invoke('vault:export', path),
  importSessions: (path: string) => ipcRenderer.invoke('vault:import', path) as Promise<SessionImportExport>,
  listCredentials: () => ipcRenderer.invoke('credentials:list') as Promise<CredentialProfile[]>,
  createCredential: (payload: Omit<CredentialProfile, 'secretRef'>, password: string) => ipcRenderer.invoke('credentials:create', payload, password) as Promise<CredentialProfile[]>,
  updateCredential: (payload: CredentialProfile, password?: string) => ipcRenderer.invoke('credentials:update', payload, password) as Promise<CredentialProfile[]>,
  deleteCredential: (credentialId: string) => ipcRenderer.invoke('credentials:delete', credentialId) as Promise<CredentialProfile[]>,
  resolveCredential: (credentialId: string) => ipcRenderer.invoke('credentials:resolve', credentialId) as Promise<{ id: string; username: string; password: string; domain?: string; type: string } | undefined>,
  launchRdp: (session: Session) => ipcRenderer.invoke('rdp:launch', session),
  detachSession: (session: Session) => ipcRenderer.invoke('window:detach', session),
  sshConnect: (sessionId: string, payload: Record<string, unknown>) => ipcRenderer.invoke('ssh:connect', sessionId, payload),
  sftpConnect: (sessionId: string, payload: Record<string, unknown>) => ipcRenderer.invoke('sftp:connect', sessionId, payload),
  sftpList: (sessionId: string, remotePath: string) => ipcRenderer.invoke('sftp:list', sessionId, remotePath) as Promise<SftpEntry[]>
});
