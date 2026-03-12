export type Protocol = 'rdp' | 'ssh' | 'sftp';
export type SessionOsType = 'windows' | 'linux' | 'network' | 'hypervisor' | 'server' | 'unknown';
export type CredentialType = 'windows' | 'linux' | 'generic';
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed' | 'auth_failed' | 'timeout';

export interface FolderNode {
  id: string;
  name: string;
  parentId?: string;
  order: number;
  color?: string;
  icon?: string;
  description?: string;
}

export interface SessionTemplate {
  id: string;
  name: string;
  protocol: Protocol;
  defaultPort: number;
  defaultCredentialRef?: string;
  displayMode?: 'fit' | 'actual' | 'stretch' | 'fullscreen';
  osType?: SessionOsType;
  tags?: string[];
  folderId?: string;
  iconMode?: 'auto' | 'custom';
  color?: string;
  notes?: string;
  favorite: boolean;
  order: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  eventType: 'session_connected' | 'session_disconnected' | 'reconnect_attempted' | 'authentication_failed' | 'file_uploaded' | 'file_downloaded' | 'session_created' | 'session_edited' | 'credential_created' | 'credential_updated' | 'credential_deleted' | 'quick_connect_used';
  protocol?: Protocol;
  targetHost?: string;
  sessionName?: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export interface ConnectionDiagnostic {
  host: string;
  protocol: Protocol;
  port: number;
  timestamp: string;
  category: 'auth' | 'network' | 'timeout' | 'remote_close' | 'unsupported' | 'unknown';
  message: string;
}



export interface WorkspaceViewInstance {
  id: string;
  sessionId: string;
  createdAt: string;
}

export interface WorkspacePane {
  id: string;
  tabIds: string[];
  activeTabId?: string;
  size: number;
}

export interface WorkspaceLayout {
  split: 'none' | 'vertical' | 'horizontal';
  panes: WorkspacePane[];
  focusedPaneId?: string;
}

export interface WorkspaceTabState {
  sessionId: string;
  displayMode?: 'fit' | 'actual' | 'stretch' | 'fullscreen';
  toolbarVisible?: boolean;
  ssh?: { fontSize?: number; wrap?: boolean };
  sftp?: { localPath?: string; remotePath?: string };
}

export interface WorkspaceState {
  reopenOnStartup: boolean;
  reconnectOnStartup: boolean;
  restoreActiveTab: boolean;
  restoreSidebar: boolean;
  openTabIds: string[];
  activeTabId?: string;
  detachedSessionIds: string[];
  selectedFolderId?: string;
  expandedFolderIds: string[];
  searchQuery?: string;
  selectedViewId?: string;
  tabState: WorkspaceTabState[];
  viewInstances?: WorkspaceViewInstance[];
  layout?: WorkspaceLayout;
}

export interface SmartView {
  id: string;
  name: string;
  query?: string;
  protocol?: Protocol;
  folderId?: string;
  favoritesOnly?: boolean;
  recentOnly?: boolean;
  tags?: string[];
  connectionState?: ConnectionState;
  color?: string;
  icon?: string;
  pinned: boolean;
  order: number;
}

export interface CredentialProfile {
  id: string;
  name: string;
  username: string;
  domain?: string;
  type: CredentialType;
  tags?: string[];
  favorite: boolean;
  lastUsed?: string;
  secretRef: string;
}

export interface SessionBase {
  id: string;
  name: string;
  protocol: Protocol;
  host: string;
  port: number;
  username: string;
  credentialRef?: string;
  folder?: string;
  folderId?: string;
  order?: number;
  tags: string[];
  favorite: boolean;
  colorLabel?: string;
  notes?: string;
  osType?: SessionOsType;
  iconMode?: 'auto' | 'custom';
  customIcon?: string;
  uploadedIconDataUrl?: string;
  created_at: string;
  updated_at: string;
}

export interface RdpSession extends SessionBase {
  protocol: 'rdp';
  domain?: string;
  resolutionMode: 'system' | 'fixed' | 'fullscreen';
  fullscreen: boolean;
  adminMode: boolean;
  clipboard: boolean;
  driveRedirection: boolean;
  sound: 'local' | 'remote' | 'off';
  gateway?: string;
  extraArgs?: string;
}

export interface SshSession extends SessionBase {
  protocol: 'ssh';
  privateKeyPath?: string;
  passphraseRef?: string;
  jumpHost?: string;
  terminalProfile?: 'default' | 'solarized' | 'high-contrast';
  extraArgs?: string;
}

export interface SftpSession extends SessionBase {
  protocol: 'sftp';
  remotePath?: string;
  localDefaultPath?: string;
  showHiddenFiles: boolean;
  extraArgs?: string;
}

export type Session = RdpSession | SshSession | SftpSession;

export interface AppSettings {
  theme: 'dark' | 'system';
  quickConnectHistory: string[];
  recentSessionIds: string[];
  expandedFolderIds: string[];
  selectedFolderId?: string;
  autoReconnect: boolean;
  retryCount: number;
  retryDelayMs: number;
  workspace: WorkspaceState;
}

export interface SecretEntry {
  id: string;
  cipherText: string;
  iv: string;
  authTag: string;
}

export interface VaultFile {
  schemaVersion: string;
  appSettings: AppSettings;
  sessions: Session[];
  folders: FolderNode[];
  templates: SessionTemplate[];
  smartViews: SmartView[];
  activityLog: ActivityEvent[];
  credentials: CredentialProfile[];
  encryptedSecrets: SecretEntry[];
  kdf: {
    salt: string;
    iterations: number;
    digest: 'sha256';
  };
}

export interface SessionImportExport {
  schemaVersion: string;
  sessions: Session[];
}



export interface RdpEmbeddedCapability {
  available: boolean;
  mode: 'embedded' | 'external';
  reason: string;
  helperPath?: string;
}

export interface RdpLaunchResult {
  status: 'launching' | 'launched' | 'failed';
  mode: 'external-client';
  launchMethod: 'mstsc-rdp-file' | 'unsupported-platform';
  credentialStatus: 'used-saved' | 'used-session-username' | 'missing' | 'unsupported';
  message: string;
  stagedCredentialTarget?: string;
  launchedAt: string;
  warning?: string;
}

export interface SftpEntry {
  name: string;
  type: string;
  size: number;
  modifyTime: number;
}
