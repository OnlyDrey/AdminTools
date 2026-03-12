export type Protocol = 'rdp' | 'ssh' | 'sftp';

export interface SessionBase {
  id: string;
  name: string;
  protocol: Protocol;
  host: string;
  port: number;
  username: string;
  credentialRef?: string;
  folder?: string;
  tags: string[];
  favorite: boolean;
  colorLabel?: string;
  notes?: string;
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

export interface SftpEntry {
  name: string;
  type: string;
  size: number;
  modifyTime: number;
}
