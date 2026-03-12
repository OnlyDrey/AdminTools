import { app, BrowserWindow, ipcMain } from 'electron';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CredentialProfile, Session, VaultFile } from '../shared/types.js';
import {
  closeSftp,
  connectSftp,
  connectSsh,
  deleteLocal,
  disconnectSsh,
  listLocal,
  listSftp,
  mkdirLocal,
  openShell,
  renameLocal,
  sftpDelete,
  sftpDownload,
  sftpMkdir,
  sftpRename,
  sftpUpload,
  writeShell
} from './sshService.js';
import {
  decryptSecret,
  encryptSecret,
  exportSessions,
  importSessions,
  loadVault,
  saveVault
} from './vaultService.js';
import { deleteCredentialSecret, getCredentialSecret, setCredentialSecret } from './credentialSecureStore.js';
import { launchRdpSession } from './rdpLaunchService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let inMemoryVault: VaultFile | null = null;
let masterPassword = '';
const detachedWindows = new Map<string, BrowserWindow>();

function createWindow(route = '/') {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const preloadPath = path.join(__dirname, 'preload.cjs');
  if (!fs.existsSync(preloadPath)) {
    console.warn(`[AdminTools] preload file missing at runtime: ${preloadPath}`);
  }
  console.info(`[AdminTools] preload path: ${preloadPath}`);

  const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
  if (!app.isPackaged) {
    win.loadURL(`${devUrl}#${route}`);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: route });
  }
  return win;
}

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('vault:load', async (_event, password: string) => {
  masterPassword = password;
  inMemoryVault = await loadVault(password);
  return inMemoryVault;
});

ipcMain.handle('vault:save', async (_event, vault: VaultFile) => {
  inMemoryVault = vault;
  await saveVault(vault);
});

ipcMain.handle('vault:encrypt-secret', async (_event, id: string, value: string, password: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  encryptSecret(inMemoryVault, id, value, password || masterPassword);
  await saveVault(inMemoryVault);
});

ipcMain.handle('vault:decrypt-secret', async (_event, id: string, password: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  return decryptSecret(inMemoryVault, id, password || masterPassword);
});

ipcMain.handle('vault:export', async (_event, exportPath: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  await exportSessions(inMemoryVault, exportPath);
});

ipcMain.handle('vault:export-full', async (_event, exportPath: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  const safeExport = { ...inMemoryVault, encryptedSecrets: [], credentials: inMemoryVault.credentials.map((c) => ({ ...c, secretRef: 'REQUIRES_REENTRY' })) };
  await fsp.writeFile(exportPath, JSON.stringify(safeExport, null, 2), 'utf-8');
});

ipcMain.handle('vault:export-selected-sessions', async (_event, exportPath: string, sessionIds: string[]) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  const sessions = inMemoryVault.sessions.filter((s) => sessionIds.includes(s.id));
  await fsp.writeFile(exportPath, JSON.stringify({ schemaVersion: inMemoryVault.schemaVersion, sessions }, null, 2), 'utf-8');
});

ipcMain.handle('vault:import', async (_event, filePath: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  await importSessions(inMemoryVault, filePath);
  await saveVault(inMemoryVault);
  return { schemaVersion: inMemoryVault.schemaVersion, sessions: inMemoryVault.sessions };
});

ipcMain.handle('vault:import-merge', async (_event, filePath: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  const vault = inMemoryVault;
  const raw = await fsp.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<VaultFile>;
  const incomingSessions = parsed.sessions ?? [];
  const merged = [...vault.sessions];
  for (const session of incomingSessions) {
    const exists = merged.find((s) => s.id === session.id);
    if (!exists) merged.push(session as Session);
  }
  vault.sessions = merged;
  vault.templates = [...(vault.templates ?? []), ...((parsed.templates ?? []).filter((t) => !(vault.templates ?? []).some((e) => e.id === t.id)))];
  vault.folders = [...(vault.folders ?? []), ...((parsed.folders ?? []).filter((f) => !(vault.folders ?? []).some((e) => e.id === f.id)))];
  inMemoryVault = vault;
  await saveVault(vault);
  return vault;
});

ipcMain.handle('vault:import-replace', async (_event, filePath: string) => {
  const raw = await fsp.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as VaultFile;
  inMemoryVault = parsed;
  await saveVault(parsed);
  return parsed;
});


ipcMain.handle('credentials:list', () => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  return inMemoryVault.credentials ?? [];
});

ipcMain.handle('credentials:create', async (_event, payload: Omit<CredentialProfile, 'secretRef'>, password: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  const secretRef = `cred:${payload.id}`;
  await setCredentialSecret(secretRef, password);
  inMemoryVault.credentials = (inMemoryVault.credentials ?? []).concat({ ...payload, secretRef });
  await saveVault(inMemoryVault);
  return inMemoryVault.credentials;
});

ipcMain.handle('credentials:update', async (_event, payload: CredentialProfile, password?: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  if (password) {
    await setCredentialSecret(payload.secretRef, password);
  }
  inMemoryVault.credentials = (inMemoryVault.credentials ?? []).map((item) => (item.id === payload.id ? payload : item));
  await saveVault(inMemoryVault);
  return inMemoryVault.credentials;
});

ipcMain.handle('credentials:delete', async (_event, credentialId: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  const current = (inMemoryVault.credentials ?? []).find((item) => item.id === credentialId);
  if (current) {
    await deleteCredentialSecret(current.secretRef);
  }
  inMemoryVault.credentials = (inMemoryVault.credentials ?? []).filter((item) => item.id !== credentialId);
  inMemoryVault.sessions = inMemoryVault.sessions.map((session) => (
    session.credentialRef === credentialId ? { ...session, credentialRef: undefined } : session
  ));
  await saveVault(inMemoryVault);
  return inMemoryVault.credentials;
});

ipcMain.handle('credentials:resolve', async (_event, credentialId: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  const credential = (inMemoryVault.credentials ?? []).find((item) => item.id === credentialId);
  if (!credential) {
    return undefined;
  }
  const password = await getCredentialSecret(credential.secretRef);
  if (!password) {
    throw new Error('Credential secret not found');
  }
  credential.lastUsed = new Date().toISOString();
  inMemoryVault.credentials = (inMemoryVault.credentials ?? []).map((item) => (item.id === credential.id ? credential : item));
  await saveVault(inMemoryVault);
  return {
    id: credential.id,
    username: credential.username,
    password,
    domain: credential.domain,
    type: credential.type
  };
});

ipcMain.handle('rdp:launch', async (_event, session: Session) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  if (session.protocol !== 'rdp') {
    throw new Error('Not an RDP session');
  }
  return launchRdpSession(session, inMemoryVault.credentials ?? [], (secretRef) => getCredentialSecret(secretRef));
});

ipcMain.handle('window:detach', (_event, session: Session) => {
  const existing = detachedWindows.get(session.id);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return true;
  }
  const win = createWindow(`/detached/${session.id}`);
  detachedWindows.set(session.id, win);
  win.on('closed', () => {
    detachedWindows.delete(session.id);
  });
  return true;
});

ipcMain.handle('window:reattach', (_event, sessionId: string) => {
  const win = detachedWindows.get(sessionId);
  if (win && !win.isDestroyed()) {
    win.close();
  }
  detachedWindows.delete(sessionId);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
  return true;
});

ipcMain.handle('window:list-detached', () => Array.from(detachedWindows.keys()));

ipcMain.handle('ssh:connect', async (_event, sessionId: string, payload: Parameters<typeof connectSsh>[1]) => {
  await connectSsh(sessionId, payload);
  return true;
});

ipcMain.handle('sftp:connect', async (_event, sessionId: string, payload: Parameters<typeof connectSftp>[1]) => {
  await connectSftp(sessionId, payload);
  return true;
});

ipcMain.handle('sftp:list', async (_event, sessionId: string, remotePath: string) => {
  return listSftp(sessionId, remotePath);
});


ipcMain.handle('ssh:open-shell', async (event, sessionId: string) => {
  await openShell(sessionId, (data) => {
    event.sender.send(`ssh:data:${sessionId}`, data);
  });
  return true;
});

ipcMain.handle('ssh:write', async (_event, sessionId: string, input: string) => {
  await writeShell(sessionId, input);
  return true;
});

ipcMain.handle('ssh:disconnect', async (_event, sessionId: string) => {
  await disconnectSsh(sessionId);
  return true;
});

ipcMain.handle('sftp:upload', async (_event, sessionId: string, localPath: string, remotePath: string) => {
  await sftpUpload(sessionId, localPath, remotePath);
  return true;
});

ipcMain.handle('sftp:download', async (_event, sessionId: string, remotePath: string, localPath: string) => {
  await sftpDownload(sessionId, remotePath, localPath);
  return true;
});

ipcMain.handle('sftp:rename', async (_event, sessionId: string, fromPath: string, toPath: string) => {
  await sftpRename(sessionId, fromPath, toPath);
  return true;
});

ipcMain.handle('sftp:delete', async (_event, sessionId: string, targetPath: string, isDirectory: boolean) => {
  await sftpDelete(sessionId, targetPath, isDirectory);
  return true;
});

ipcMain.handle('sftp:mkdir', async (_event, sessionId: string, targetPath: string) => {
  await sftpMkdir(sessionId, targetPath);
  return true;
});

ipcMain.handle('localfs:list', async (_event, localPath: string) => {
  return listLocal(localPath);
});

ipcMain.handle('localfs:mkdir', async (_event, targetPath: string) => {
  await mkdirLocal(targetPath);
  return true;
});

ipcMain.handle('localfs:rename', async (_event, fromPath: string, toPath: string) => {
  await renameLocal(fromPath, toPath);
  return true;
});

ipcMain.handle('localfs:delete', async (_event, targetPath: string, isDirectory: boolean) => {
  await deleteLocal(targetPath, isDirectory);
  return true;
});


app.on('before-quit', async () => {
  if (inMemoryVault?.sessions) {
    await Promise.all(
      inMemoryVault.sessions
        .filter((session) => session.protocol === 'sftp')
        .map((session) => closeSftp(session.id).catch(() => undefined))
    );
  }
});
