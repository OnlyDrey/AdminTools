import type { AppSettings, VaultFile } from './types.js';

export const VAULT_FILE_NAME = 'admintools.vault.json';
export const SCHEMA_VERSION = '1.1.0';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  quickConnectHistory: [],
  recentSessionIds: [],
  expandedFolderIds: [],
  selectedFolderId: undefined,
  autoReconnect: false,
  retryCount: 2,
  retryDelayMs: 1000,
  workspace: {
    reopenOnStartup: true,
    reconnectOnStartup: false,
    restoreActiveTab: true,
    restoreSidebar: true,
    openTabIds: [],
    activeTabId: undefined,
    detachedSessionIds: [],
    selectedFolderId: undefined,
    expandedFolderIds: [],
    searchQuery: '',
    selectedViewId: undefined,
    tabState: []
  }
};

export const EMPTY_VAULT: VaultFile = {
  schemaVersion: SCHEMA_VERSION,
  appSettings: DEFAULT_SETTINGS,
  sessions: [],
  folders: [],
  templates: [],
  smartViews: [],
  activityLog: [],
  credentials: [],
  encryptedSecrets: [],
  kdf: {
    salt: '',
    iterations: 210000,
    digest: 'sha256'
  }
};
