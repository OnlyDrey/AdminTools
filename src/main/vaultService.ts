import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EMPTY_VAULT, VAULT_FILE_NAME } from '../shared/constants.js';
import { vaultSchema } from '../shared/schemas.js';
import type { VaultFile } from '../shared/types.js';

const vaultPath = path.join(os.homedir(), VAULT_FILE_NAME);

const b64 = (value: Buffer) => value.toString('base64');
const fromB64 = (value: string) => Buffer.from(value, 'base64');

function deriveKey(masterPassword: string, salt: Buffer, iterations: number) {
  return crypto.pbkdf2Sync(masterPassword, salt, iterations, 32, 'sha256');
}

export async function loadVault(masterPassword: string): Promise<VaultFile> {
  try {
    const raw = await fs.readFile(vaultPath, 'utf-8');
    const parsed = vaultSchema.parse(JSON.parse(raw));
    if (!parsed.kdf.salt) {
      return parsed;
    }
    // Validate password by decrypting first secret when present.
    if (parsed.encryptedSecrets.length > 0) {
      await decryptSecret(parsed, parsed.encryptedSecrets[0].id, masterPassword);
    }
    return parsed;
  } catch {
    const salt = crypto.randomBytes(16);
    const initial = {
      ...EMPTY_VAULT,
      kdf: {
        salt: b64(salt),
        iterations: EMPTY_VAULT.kdf.iterations,
        digest: 'sha256' as const
      }
    };
    await saveVault(initial);
    return initial;
  }
}

export async function saveVault(vault: VaultFile): Promise<void> {
  await fs.writeFile(vaultPath, JSON.stringify(vault, null, 2), 'utf-8');
}

export function encryptSecret(vault: VaultFile, id: string, plainText: string, masterPassword: string) {
  const salt = fromB64(vault.kdf.salt);
  const key = deriveKey(masterPassword, salt, vault.kdf.iterations);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const entry = { id, cipherText: b64(encrypted), iv: b64(iv), authTag: b64(authTag) };
  vault.encryptedSecrets = vault.encryptedSecrets.filter((item) => item.id !== id).concat(entry);
}

export async function decryptSecret(vault: VaultFile, id: string, masterPassword: string) {
  const secret = vault.encryptedSecrets.find((item) => item.id === id);
  if (!secret) {
    return undefined;
  }
  const salt = fromB64(vault.kdf.salt);
  const key = deriveKey(masterPassword, salt, vault.kdf.iterations);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, fromB64(secret.iv));
  decipher.setAuthTag(fromB64(secret.authTag));
  const decrypted = Buffer.concat([
    decipher.update(fromB64(secret.cipherText)),
    decipher.final()
  ]);
  return decrypted.toString('utf-8');
}

export async function exportSessions(vault: VaultFile, exportPath: string) {
  await fs.writeFile(
    exportPath,
    JSON.stringify({ schemaVersion: vault.schemaVersion, sessions: vault.sessions }, null, 2),
    'utf-8'
  );
}

export async function importSessions(vault: VaultFile, filePath: string) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as { sessions?: VaultFile['sessions'] };
  if (!Array.isArray(parsed.sessions)) {
    throw new Error('Invalid import file');
  }
  vault.sessions = parsed.sessions;
}

export function getVaultPath() {
  return vaultPath;
}
