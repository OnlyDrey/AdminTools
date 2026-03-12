import { z } from 'zod';

const baseSession = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  protocol: z.enum(['rdp', 'ssh', 'sftp']),
  host: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().min(1),
  credentialRef: z.string().optional(),
  folder: z.string().optional(),
  folderId: z.string().optional(),
  order: z.number().int().optional(),
  tags: z.array(z.string()),
  favorite: z.boolean(),
  colorLabel: z.string().optional(),
  notes: z.string().optional(),
  osType: z.enum(['windows', 'linux', 'network', 'hypervisor', 'server', 'unknown']).optional(),
  iconMode: z.enum(['auto', 'custom']).optional(),
  customIcon: z.string().optional(),
  uploadedIconDataUrl: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

const rdpSession = baseSession.extend({
  protocol: z.literal('rdp'),
  domain: z.string().optional(),
  resolutionMode: z.enum(['system', 'fixed', 'fullscreen']),
  fullscreen: z.boolean(),
  adminMode: z.boolean(),
  clipboard: z.boolean(),
  driveRedirection: z.boolean(),
  sound: z.enum(['local', 'remote', 'off']),
  gateway: z.string().optional(),
  extraArgs: z.string().optional()
});

const sshSession = baseSession.extend({
  protocol: z.literal('ssh'),
  privateKeyPath: z.string().optional(),
  passphraseRef: z.string().optional(),
  jumpHost: z.string().optional(),
  terminalProfile: z.enum(['default', 'solarized', 'high-contrast']).optional(),
  extraArgs: z.string().optional()
});

const sftpSession = baseSession.extend({
  protocol: z.literal('sftp'),
  remotePath: z.string().optional(),
  localDefaultPath: z.string().optional(),
  showHiddenFiles: z.boolean(),
  extraArgs: z.string().optional()
});

export const sessionSchema = z.discriminatedUnion('protocol', [rdpSession, sshSession, sftpSession]);

const credentialProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  username: z.string().min(1),
  domain: z.string().optional(),
  type: z.enum(['windows', 'linux', 'generic']),
  tags: z.array(z.string()).optional(),
  favorite: z.boolean(),
  lastUsed: z.string().optional(),
  secretRef: z.string().min(1)
});

const folderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().optional(),
  order: z.number().int(),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional()
});

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  protocol: z.enum(['rdp', 'ssh', 'sftp']),
  defaultPort: z.number().int().positive(),
  defaultCredentialRef: z.string().optional(),
  displayMode: z.enum(['fit', 'actual', 'stretch', 'fullscreen']).optional(),
  osType: z.enum(['windows', 'linux', 'network', 'hypervisor', 'server', 'unknown']).optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().optional(),
  iconMode: z.enum(['auto', 'custom']).optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  favorite: z.boolean(),
  order: z.number().int()
});

const activitySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  eventType: z.enum(['session_connected', 'session_disconnected', 'reconnect_attempted', 'authentication_failed', 'file_uploaded', 'file_downloaded', 'session_created', 'session_edited', 'credential_created', 'credential_updated', 'credential_deleted', 'quick_connect_used']),
  protocol: z.enum(['rdp', 'ssh', 'sftp']).optional(),
  targetHost: z.string().optional(),
  sessionName: z.string().optional(),
  status: z.enum(['ok', 'warning', 'error']),
  message: z.string()
});

export const vaultSchema = z.object({
  schemaVersion: z.string(),
  appSettings: z.object({
    theme: z.enum(['dark', 'system']),
    quickConnectHistory: z.array(z.string()),
    recentSessionIds: z.array(z.string()),
    expandedFolderIds: z.array(z.string()).default([]),
    selectedFolderId: z.string().optional(),
    autoReconnect: z.boolean().default(false),
    retryCount: z.number().int().default(2),
    retryDelayMs: z.number().int().default(1000)
  }),
  sessions: z.array(sessionSchema),
  folders: z.array(folderSchema).default([]),
  templates: z.array(templateSchema).default([]),
  activityLog: z.array(activitySchema).default([]),
  credentials: z.array(credentialProfileSchema).default([]),
  encryptedSecrets: z.array(
    z.object({
      id: z.string(),
      cipherText: z.string(),
      iv: z.string(),
      authTag: z.string()
    })
  ),
  kdf: z.object({
    salt: z.string(),
    iterations: z.number(),
    digest: z.literal('sha256')
  })
});

export const importSchema = z.object({
  schemaVersion: z.string(),
  sessions: z.array(sessionSchema)
});
