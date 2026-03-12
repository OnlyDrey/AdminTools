import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CredentialProfile, Session, VaultFile } from '../shared/types.js';
import { launchRdp } from './protocolLauncher.js';
import {
  closeSftp,
  connectSftp,
  connectSsh,
  listSftp
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let inMemoryVault: VaultFile | null = null;
let masterPassword = '';

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

ipcMain.handle('vault:import', async (_event, filePath: string) => {
  if (!inMemoryVault) throw new Error('Vault not loaded');
  await importSessions(inMemoryVault, filePath);
  await saveVault(inMemoryVault);
  return { schemaVersion: inMemoryVault.schemaVersion, sessions: inMemoryVault.sessions };
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
  if (session.protocol !== 'rdp') {
    throw new Error('Not an RDP session');
  }
  return launchRdp(session);
});

ipcMain.handle('window:detach', (_event, session: Session) => {
  createWindow(`/detached/${session.id}`);
  return true;
});

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

app.on('before-quit', async () => {
  if (inMemoryVault?.sessions) {
    await Promise.all(
      inMemoryVault.sessions
        .filter((session) => session.protocol === 'sftp')
        .map((session) => closeSftp(session.id).catch(() => undefined))
    );
  }
});
