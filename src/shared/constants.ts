import type { AppSettings, VaultFile } from './types.js';

export const VAULT_FILE_NAME = 'admintools.vault.json';
export const SCHEMA_VERSION = '1.0.0';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  quickConnectHistory: [],
  recentSessionIds: []
};

export const EMPTY_VAULT: VaultFile = {
  schemaVersion: SCHEMA_VERSION,
  appSettings: DEFAULT_SETTINGS,
  sessions: [],
  encryptedSecrets: [],
  kdf: {
    salt: '',
    iterations: 210000,
    digest: 'sha256'
  }
};
