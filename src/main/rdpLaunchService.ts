import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { CredentialProfile, RdpLaunchResult, RdpSession } from '../shared/types.js';

interface ResolvedCredential {
  username: string;
  password?: string;
  domain?: string;
  source: 'saved' | 'session';
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

function spawnDetached(command: string, args: string[]) {
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

function getTargetHost(session: RdpSession): string {
  return session.port && session.port !== 3389 ? `TERMSRV/${session.host}:${session.port}` : `TERMSRV/${session.host}`;
}

async function stageWindowsCredential(target: string, credential: ResolvedCredential): Promise<{ staged: boolean; warning?: string }> {
  if (!credential.password || !credential.username) {
    return { staged: false, warning: 'Credential password not available for silent sign-in.' };
  }

  try {
    const user = credential.domain ? `${credential.domain}\\${credential.username}` : credential.username;
    await runCommand('cmdkey', [`/generic:${target}`, `/user:${user}`, `/pass:${credential.password}`]);
    return { staged: true };
  } catch {
    return { staged: false, warning: 'Windows blocked secure credential staging. You may be prompted by mstsc.' };
  }
}

async function writeRdpFile(session: RdpSession, credential: ResolvedCredential): Promise<string> {
  const username = credential.username || session.username;
  const fullAddress = session.port && session.port !== 3389 ? `${session.host}:${session.port}` : session.host;
  const body = [
    `full address:s:${fullAddress}`,
    `username:s:${credential.domain ? `${credential.domain}\\` : ''}${username}`,
    `administrative session:i:${session.adminMode ? 1 : 0}`,
    `redirectclipboard:i:${session.clipboard ? 1 : 0}`,
    `redirectdrives:i:${session.driveRedirection ? 1 : 0}`,
    `audiomode:i:${session.sound === 'local' ? 0 : session.sound === 'remote' ? 1 : 2}`,
    `screen mode id:i:${session.fullscreen ? 2 : 1}`
  ].join('\n');

  const filePath = path.join(os.tmpdir(), `admintools-rdp-${session.id}-${Date.now()}.rdp`);
  await fs.writeFile(filePath, body, 'utf-8');
  return filePath;
}

async function resolveCredentialForSession(
  session: RdpSession,
  credentials: CredentialProfile[],
  resolveSecret: (secretRef: string) => Promise<string | undefined>
): Promise<{ credential: ResolvedCredential; credentialStatus: RdpLaunchResult['credentialStatus'] }> {
  if (session.credentialRef) {
    const profile = credentials.find((item) => item.id === session.credentialRef);
    if (!profile) {
      return { credential: { username: session.username, source: 'session' }, credentialStatus: 'missing' };
    }
    const password = await resolveSecret(profile.secretRef);
    return {
      credential: {
        username: profile.username || session.username,
        password,
        domain: profile.domain,
        source: 'saved'
      },
      credentialStatus: password ? 'used-saved' : 'missing'
    };
  }

  return {
    credential: {
      username: session.username,
      domain: session.domain,
      source: 'session'
    },
    credentialStatus: session.username ? 'used-session-username' : 'missing'
  };
}

export async function launchRdpSession(
  session: RdpSession,
  credentials: CredentialProfile[],
  resolveSecret: (secretRef: string) => Promise<string | undefined>
): Promise<RdpLaunchResult> {
  const launchedAt = new Date().toISOString();
  if (os.platform() !== 'win32') {
    return {
      status: 'failed',
      mode: 'external-client',
      launchMethod: 'unsupported-platform',
      credentialStatus: 'unsupported',
      message: 'External mstsc launch is only supported on Windows.',
      launchedAt
    };
  }

  const { credential, credentialStatus } = await resolveCredentialForSession(session, credentials, resolveSecret);
  if (!credential.username) {
    return {
      status: 'failed',
      mode: 'external-client',
      launchMethod: 'mstsc-rdp-file',
      credentialStatus: 'missing',
      message: 'Missing username. Select or update credentials before connecting.',
      launchedAt
    };
  }

  const target = getTargetHost(session);
  const stage = await stageWindowsCredential(target, credential);

  try {
    const rdpFile = await writeRdpFile(session, credential);
    spawnDetached('mstsc', [rdpFile]);
    setTimeout(() => {
      fs.unlink(rdpFile).catch(() => undefined);
      if (stage.staged) {
        runCommand('cmdkey', [`/delete:${target}`]).catch(() => undefined);
      }
    }, 120000);

    return {
      status: 'launched',
      mode: 'external-client',
      launchMethod: 'mstsc-rdp-file',
      credentialStatus,
      message: 'RDP launched via Windows mstsc (external client mode).',
      stagedCredentialTarget: stage.staged ? target : undefined,
      warning: stage.warning,
      launchedAt
    };
  } catch {
    return {
      status: 'failed',
      mode: 'external-client',
      launchMethod: 'mstsc-rdp-file',
      credentialStatus,
      message: 'Failed to launch mstsc with prepared RDP configuration.',
      warning: stage.warning,
      launchedAt
    };
  }
}
