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
  sshOpenShell: (sessionId: string) => ipcRenderer.invoke('ssh:open-shell', sessionId) as Promise<boolean>,
  sshWrite: (sessionId: string, input: string) => ipcRenderer.invoke('ssh:write', sessionId, input) as Promise<boolean>,
  sshDisconnect: (sessionId: string) => ipcRenderer.invoke('ssh:disconnect', sessionId) as Promise<boolean>,
  onSshData: (sessionId: string, callback: (data: string) => void) => {
    const channel = `ssh:data:${sessionId}`;
    const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  sftpConnect: (sessionId: string, payload: Record<string, unknown>) => ipcRenderer.invoke('sftp:connect', sessionId, payload),
  sftpList: (sessionId: string, remotePath: string) => ipcRenderer.invoke('sftp:list', sessionId, remotePath) as Promise<SftpEntry[]>,
  sftpUpload: (sessionId: string, localPath: string, remotePath: string) => ipcRenderer.invoke('sftp:upload', sessionId, localPath, remotePath) as Promise<boolean>,
  sftpDownload: (sessionId: string, remotePath: string, localPath: string) => ipcRenderer.invoke('sftp:download', sessionId, remotePath, localPath) as Promise<boolean>,
  sftpRename: (sessionId: string, fromPath: string, toPath: string) => ipcRenderer.invoke('sftp:rename', sessionId, fromPath, toPath) as Promise<boolean>,
  sftpDelete: (sessionId: string, targetPath: string, isDirectory: boolean) => ipcRenderer.invoke('sftp:delete', sessionId, targetPath, isDirectory) as Promise<boolean>,
  sftpMkdir: (sessionId: string, targetPath: string) => ipcRenderer.invoke('sftp:mkdir', sessionId, targetPath) as Promise<boolean>,
  localfsList: (localPath: string) => ipcRenderer.invoke('localfs:list', localPath) as Promise<SftpEntry[]>,
  localfsMkdir: (targetPath: string) => ipcRenderer.invoke('localfs:mkdir', targetPath) as Promise<boolean>,
  localfsRename: (fromPath: string, toPath: string) => ipcRenderer.invoke('localfs:rename', fromPath, toPath) as Promise<boolean>,
  localfsDelete: (targetPath: string, isDirectory: boolean) => ipcRenderer.invoke('localfs:delete', targetPath, isDirectory) as Promise<boolean>
});
