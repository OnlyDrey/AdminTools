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
  tags: z.array(z.string()),
  favorite: z.boolean(),
  colorLabel: z.string().optional(),
  notes: z.string().optional(),
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

export const vaultSchema = z.object({
  schemaVersion: z.string(),
  appSettings: z.object({
    theme: z.enum(['dark', 'system']),
    quickConnectHistory: z.array(z.string()),
    recentSessionIds: z.array(z.string())
  }),
  sessions: z.array(sessionSchema),
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
