import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'ssh2';
import SftpClient from 'ssh2-sftp-client';
import type { SftpEntry } from '../shared/types.js';

interface SftpListEntry {
  name: string;
  type: string;
  size: number;
  modifyTime: number;
}

type ShellWriter = (data: string) => void;

const sshConnections = new Map<string, Client>();
const sftpConnections = new Map<string, SftpClient>();
const shellStreams = new Map<string, { write: (data: string) => void; close: () => void }>();

export async function connectSsh(
  id: string,
  config: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
  }
) {
  return new Promise<void>((resolve, reject) => {
    const client = new Client();
    client
      .on('ready', () => {
        sshConnections.set(id, client);
        resolve();
      })
      .on('error', reject)
      .on('close', () => {
        sshConnections.delete(id);
        const shell = shellStreams.get(id);
        shell?.close();
        shellStreams.delete(id);
      })
      .connect(config);
  });
}

export async function openShell(id: string, onData: ShellWriter) {
  const client = sshConnections.get(id);
  if (!client) {
    throw new Error('SSH session not connected');
  }

  return new Promise<void>((resolve, reject) => {
    client.shell((err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      stream.on('data', (data: Buffer) => onData(data.toString('utf-8')));
      stream.stderr.on('data', (data: Buffer) => onData(data.toString('utf-8')));
      stream.on('close', () => {
        shellStreams.delete(id);
      });

      shellStreams.set(id, {
        write: (data: string) => stream.write(data),
        close: () => stream.close()
      });
      resolve();
    });
  });
}

export async function writeShell(id: string, input: string) {
  const stream = shellStreams.get(id);
  if (!stream) {
    throw new Error('SSH shell is not open');
  }
  stream.write(input);
}

export async function disconnectSsh(id: string) {
  const shell = shellStreams.get(id);
  shell?.close();
  shellStreams.delete(id);
  const client = sshConnections.get(id);
  client?.end();
  sshConnections.delete(id);
}

export async function connectSftp(
  id: string,
  config: {
    host: string;
    port: number;
    username: string;
    password?: string;
  }
) {
  const sftp = new SftpClient();
  await sftp.connect(config);
  sftpConnections.set(id, sftp);
}

export async function listSftp(id: string, remotePath: string): Promise<SftpEntry[]> {
  const sftp = sftpConnections.get(id);
  if (!sftp) {
    throw new Error('SFTP session not connected');
  }
  const list = (await sftp.list(remotePath)) as SftpListEntry[];
  return list.map((entry: SftpListEntry) => ({
    name: entry.name,
    type: entry.type,
    size: entry.size,
    modifyTime: entry.modifyTime
  }));
}

export async function sftpUpload(id: string, localPath: string, remotePath: string) {
  const sftp = sftpConnections.get(id);
  if (!sftp) throw new Error('SFTP session not connected');
  await sftp.fastPut(localPath, remotePath);
}

export async function sftpDownload(id: string, remotePath: string, localPath: string) {
  const sftp = sftpConnections.get(id);
  if (!sftp) throw new Error('SFTP session not connected');
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await sftp.fastGet(remotePath, localPath);
}

export async function sftpRename(id: string, fromPath: string, toPath: string) {
  const sftp = sftpConnections.get(id);
  if (!sftp) throw new Error('SFTP session not connected');
  await sftp.rename(fromPath, toPath);
}

export async function sftpDelete(id: string, targetPath: string, isDirectory: boolean) {
  const sftp = sftpConnections.get(id);
  if (!sftp) throw new Error('SFTP session not connected');
  if (isDirectory) {
    await sftp.rmdir(targetPath, true);
  } else {
    await sftp.delete(targetPath);
  }
}

export async function sftpMkdir(id: string, targetPath: string) {
  const sftp = sftpConnections.get(id);
  if (!sftp) throw new Error('SFTP session not connected');
  await sftp.mkdir(targetPath, true);
}

export async function listLocal(localPath: string): Promise<SftpEntry[]> {
  const dirents = await fs.readdir(localPath, { withFileTypes: true });
  const rows = await Promise.all(
    dirents.map(async (dirent) => {
      const full = path.join(localPath, dirent.name);
      const stat = await fs.stat(full);
      return {
        name: dirent.name,
        type: dirent.isDirectory() ? 'd' : '-',
        size: stat.size,
        modifyTime: stat.mtimeMs
      } as SftpEntry;
    })
  );
  return rows;
}

export async function mkdirLocal(targetPath: string) {
  await fs.mkdir(targetPath, { recursive: true });
}

export async function renameLocal(fromPath: string, toPath: string) {
  await fs.rename(fromPath, toPath);
}

export async function deleteLocal(targetPath: string, isDirectory: boolean) {
  if (isDirectory) {
    await fs.rm(targetPath, { recursive: true, force: true });
  } else {
    await fs.unlink(targetPath);
  }
}

export async function closeSftp(id: string) {
  const sftp = sftpConnections.get(id);
  if (sftp) {
    await sftp.end();
    sftpConnections.delete(id);
  }
}
