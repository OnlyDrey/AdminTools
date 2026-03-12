import { app, safeStorage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

interface SecureSecretsFile {
  secrets: Record<string, string>;
}

const securePath = () => path.join(app.getPath('userData'), 'credential-secrets.json');

async function loadSecrets(): Promise<SecureSecretsFile> {
  try {
    const raw = await fs.readFile(securePath(), 'utf-8');
    const parsed = JSON.parse(raw) as SecureSecretsFile;
    return { secrets: parsed.secrets ?? {} };
  } catch {
    return { secrets: {} };
  }
}

async function saveSecrets(payload: SecureSecretsFile) {
  await fs.writeFile(securePath(), JSON.stringify(payload, null, 2), 'utf-8');
}

function ensureSecureStorage() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage is unavailable on this machine');
  }
}

export async function setCredentialSecret(secretRef: string, value: string) {
  ensureSecureStorage();
  const secrets = await loadSecrets();
  secrets.secrets[secretRef] = safeStorage.encryptString(value).toString('base64');
  await saveSecrets(secrets);
}

export async function getCredentialSecret(secretRef: string) {
  ensureSecureStorage();
  const secrets = await loadSecrets();
  const encrypted = secrets.secrets[secretRef];
  if (!encrypted) {
    return undefined;
  }
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
}

export async function deleteCredentialSecret(secretRef: string) {
  const secrets = await loadSecrets();
  delete secrets.secrets[secretRef];
  await saveSecrets(secrets);
}
