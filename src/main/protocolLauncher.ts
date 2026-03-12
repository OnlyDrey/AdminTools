import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { shell } from 'electron';
import type { RdpSession } from '../shared/types.js';

async function commandExists(command: string): Promise<boolean> {
  const which = os.platform() === 'win32' ? 'where' : 'which';
  return new Promise((resolve) => {
    const proc = spawn(which, [command]);
    proc.on('close', (code) => resolve(code === 0));
  });
}

function spawnDetached(command: string, args: string[] = []) {
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

async function writeRdpFile(session: RdpSession) {
  const filePath = path.join(os.tmpdir(), `admintools-${session.id}.rdp`);
  const body = [
    `full address:s:${session.host}:${session.port}`,
    `username:s:${session.username}`,
    `administrative session:i:${session.adminMode ? 1 : 0}`,
    `redirectclipboard:i:${session.clipboard ? 1 : 0}`,
    `redirectdrives:i:${session.driveRedirection ? 1 : 0}`,
    `audiomode:i:${session.sound === 'local' ? 0 : session.sound === 'remote' ? 1 : 2}`,
    `screen mode id:i:${session.fullscreen ? 2 : 1}`
  ].join('\n');
  await fs.writeFile(filePath, body, 'utf-8');
  return filePath;
}

export async function launchRdp(session: RdpSession) {
  const platform = os.platform();
  if (platform === 'win32') {
    const rdpFile = await writeRdpFile(session);
    spawnDetached('mstsc', [rdpFile]);
    return 'launched:mstsc';
  }

  if (platform === 'linux') {
    if (await commandExists('xfreerdp')) {
      spawnDetached('xfreerdp', [`/v:${session.host}:${session.port}`, `/u:${session.username}`]);
      return 'launched:xfreerdp';
    }
    if (await commandExists('remmina')) {
      spawnDetached('remmina', [`rdp://${session.username}@${session.host}:${session.port}`]);
      return 'launched:remmina';
    }
    await shell.openExternal(`rdp://${session.host}:${session.port}`);
    return 'launched:system-handler';
  }

  if (platform === 'darwin') {
    await shell.openExternal(`rdp://${session.host}:${session.port}`);
    return 'launched:macos-rdp-handler';
  }

  return 'unsupported-platform';
}
