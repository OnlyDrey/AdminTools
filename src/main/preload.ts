import { contextBridge, ipcRenderer } from 'electron';
import type { Session, SessionImportExport, SftpEntry, VaultFile } from '../shared/types.js';

contextBridge.exposeInMainWorld('api', {
  loadVault: (masterPassword: string) => ipcRenderer.invoke('vault:load', masterPassword) as Promise<VaultFile>,
  saveVault: (vault: VaultFile) => ipcRenderer.invoke('vault:save', vault),
  decryptSecret: (id: string, password: string) => ipcRenderer.invoke('vault:decrypt-secret', id, password) as Promise<string | undefined>,
  encryptSecret: (id: string, secret: string, password: string) => ipcRenderer.invoke('vault:encrypt-secret', id, secret, password),
  exportSessions: (path: string) => ipcRenderer.invoke('vault:export', path),
  importSessions: (path: string) => ipcRenderer.invoke('vault:import', path) as Promise<SessionImportExport>,
  launchRdp: (session: Session) => ipcRenderer.invoke('rdp:launch', session),
  detachSession: (session: Session) => ipcRenderer.invoke('window:detach', session),
  sshConnect: (sessionId: string, payload: Record<string, unknown>) => ipcRenderer.invoke('ssh:connect', sessionId, payload),
  sftpConnect: (sessionId: string, payload: Record<string, unknown>) => ipcRenderer.invoke('sftp:connect', sessionId, payload),
  sftpList: (sessionId: string, remotePath: string) => ipcRenderer.invoke('sftp:list', sessionId, remotePath) as Promise<SftpEntry[]>
});
